/**
 * Delivery algorithm.
 *
 *   1. STORE   the enquiry in MongoDB first — a lead is never lost even
 *              if the mail server is down. If Mongo itself is down we
 *              append to logs/enquiries.jsonl as a last resort.
 *   2. NOTIFY  immediately, out of band (the HTTP response does not wait
 *              on SMTP, which can take seconds).
 *   3. RETRY   on failure with exponential backoff — 1m, 2m, 4m, 8m, 16m
 *              by default — scheduled in-process AND persisted as
 *              `mail.nextAttemptAt` so a restart resumes where it left off.
 *   4. SWEEP   every 2 minutes: pick up anything still pending whose
 *              nextAttemptAt has passed (covers crashes and cold starts).
 *   5. GIVE UP after MAIL_MAX_ATTEMPTS → status "failed", lastError kept
 *              for triage via `npm run list`.
 */
import fs from "node:fs";
import path from "node:path";
import { config, mailConfigured, ROOT } from "./config.js";
import { isReady } from "./db.js";
import Enquiry from "./models/Enquiry.js";
import { send, buildNotification, buildAutoReply } from "./mailer.js";

const FALLBACK_DIR = path.join(ROOT, "logs");
const FALLBACK_FILE = path.join(FALLBACK_DIR, "enquiries.jsonl");

/** Append-only backup used when MongoDB is unavailable. */
export function appendFallback(record) {
  try {
    fs.mkdirSync(FALLBACK_DIR, { recursive: true });
    fs.appendFileSync(FALLBACK_FILE, `${JSON.stringify(record)}\n`, "utf8");
    return true;
  } catch (err) {
    console.error(`[queue] fallback write failed: ${err.message}`);
    return false;
  }
}

/** delay = base * 2^(attempt-1) — 1m, 2m, 4m, 8m, 16m … */
export const backoffMs = (attempt) => config.retry.baseDelayMs * 2 ** Math.max(0, attempt - 1);

const timers = new Map();

function scheduleRetry(id, delay) {
  const key = String(id);
  clearTimeout(timers.get(key));
  const t = setTimeout(() => {
    timers.delete(key);
    deliver(id).catch((err) => console.error(`[queue] retry crashed: ${err.message}`));
  }, Math.min(delay, 2 ** 31 - 1));
  t.unref?.();
  timers.set(key, t);
}

/**
 * Attempt delivery for one stored enquiry. Safe to call repeatedly —
 * it no-ops once the enquiry is notified or has exhausted its attempts.
 */
export async function deliver(id) {
  if (!isReady()) return { ok: false, reason: "db-unavailable" };

  const doc = await Enquiry.findById(id);
  if (!doc) return { ok: false, reason: "not-found" };
  if (doc.status === "notified") return { ok: true, reason: "already-sent" };
  if (doc.status === "failed") return { ok: false, reason: "given-up" };

  if (!mailConfigured()) {
    doc.mail.lastError = "SMTP is not configured";
    doc.mail.nextAttemptAt = null;
    await doc.save();
    console.warn(`[queue] ${doc.ref} stored but not emailed — SMTP is not configured.`);
    return { ok: false, reason: "mail-unconfigured" };
  }

  doc.mail.attempts += 1;
  doc.mail.lastAttemptAt = new Date();

  try {
    const info = await send(buildNotification(doc));

    doc.status = "notified";
    doc.mail.notifiedAt = new Date();
    doc.mail.messageId = info?.messageId || "";
    doc.mail.lastError = "";
    doc.mail.nextAttemptAt = null;
    await doc.save();

    console.log(`[queue] ${doc.ref} emailed to ${config.mail.to} (attempt ${doc.mail.attempts})`);

    // Courtesy auto-reply — best effort, never blocks or fails the notification.
    if (config.mail.autoReply && !doc.mail.autoReplySent) {
      try {
        await send(buildAutoReply(doc));
        doc.mail.autoReplySent = true;
        await doc.save();
      } catch (err) {
        console.warn(`[queue] ${doc.ref} auto-reply failed: ${err.message}`);
      }
    }

    return { ok: true };
  } catch (err) {
    const exhausted = doc.mail.attempts >= config.retry.maxAttempts;
    doc.mail.lastError = String(err?.message || err).slice(0, 500);

    if (exhausted) {
      doc.status = "failed";
      doc.mail.nextAttemptAt = null;
      await doc.save();
      console.error(
        `[queue] ${doc.ref} FAILED after ${doc.mail.attempts} attempts: ${doc.mail.lastError}`,
      );
      return { ok: false, reason: "exhausted" };
    }

    const wait = backoffMs(doc.mail.attempts);
    doc.mail.nextAttemptAt = new Date(Date.now() + wait);
    await doc.save();
    scheduleRetry(doc._id, wait);
    console.warn(
      `[queue] ${doc.ref} attempt ${doc.mail.attempts} failed (${doc.mail.lastError}) — retrying in ${Math.round(wait / 1000)}s`,
    );
    return { ok: false, reason: "retrying" };
  }
}

/** Kick off delivery without making the HTTP client wait for SMTP. */
export function enqueue(id) {
  setImmediate(() => {
    deliver(id).catch((err) => console.error(`[queue] deliver crashed: ${err.message}`));
  });
}

/** Periodic catch-up for anything a restart or crash left behind. */
export async function sweep() {
  if (!isReady() || !mailConfigured()) return 0;
  const due = await Enquiry.find({
    status: "pending",
    $or: [{ "mail.nextAttemptAt": null }, { "mail.nextAttemptAt": { $lte: new Date() } }],
  })
    .sort({ createdAt: 1 })
    .limit(25)
    .select("_id");

  for (const { _id } of due) await deliver(_id);
  if (due.length) console.log(`[queue] sweep processed ${due.length} pending enquir${due.length === 1 ? "y" : "ies"}`);
  return due.length;
}

let sweeper = null;

export function startSweeper() {
  if (sweeper) return;
  sweeper = setInterval(() => {
    sweep().catch((err) => console.error(`[queue] sweep crashed: ${err.message}`));
  }, config.retry.sweepEveryMs);
  sweeper.unref?.();
  // One pass shortly after boot so a restart recovers quickly.
  setTimeout(() => sweep().catch(() => {}), 5000).unref?.();
}

export function stopSweeper() {
  clearInterval(sweeper);
  sweeper = null;
  for (const t of timers.values()) clearTimeout(t);
  timers.clear();
}

export default { enqueue, deliver, sweep, startSweeper, stopSweeper, appendFallback, backoffMs };
