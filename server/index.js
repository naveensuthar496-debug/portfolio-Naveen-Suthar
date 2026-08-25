/**
 * Portfolio server.
 *
 *   GET  /              → the static site (index.html, assets/…)
 *   POST /api/contact   → store the enquiry in MongoDB, then email it
 *   GET  /api/health    → db + smtp readiness, for uptime checks
 */
import express from "express";
import rateLimit from "express-rate-limit";
import path from "node:path";

import { config, mailConfigured, dbConfigured, ROOT } from "./config.js";
import { connectDB, closeDB, isReady } from "./db.js";
import Enquiry from "./models/Enquiry.js";
import { validateEnquiry, looksLikeSpam, BUDGETS } from "./validate.js";
import { enqueue, startSweeper, stopSweeper, appendFallback } from "./queue.js";

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1); // correct client IP behind Render/Railway/Nginx

app.use(express.json({ limit: "32kb" }));
app.use(express.urlencoded({ extended: false, limit: "32kb" }));

/* ── static site ─────────────────────────────────────── */
app.use(
  express.static(ROOT, {
    extensions: ["html"],
    setHeaders(res, filePath) {
      if (/\.(webp|png|jpe?g|svg|woff2?)$/i.test(filePath)) {
        res.setHeader("Cache-Control", "public, max-age=604800");
      }
    },
  }),
);

/* ── enquiry endpoint ────────────────────────────────── */
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: "Too many messages from this address. Please try again a little later.",
  },
});

app.post("/api/contact", limiter, async (req, res) => {
  // 0. Drop obvious bots silently — a 200 keeps them from probing.
  const spam = looksLikeSpam(req.body);
  if (spam) {
    console.warn(`[contact] discarded (${spam})`);
    return res.status(200).json({ ok: true, discarded: true });
  }

  // 1. Validate.
  const { ok, errors, data } = validateEnquiry(req.body);
  if (!ok) {
    return res.status(422).json({ ok: false, error: "Please check the highlighted fields.", errors });
  }

  const record = {
    ...data,
    meta: {
      ip: req.ip || "",
      userAgent: String(req.get("user-agent") || "").slice(0, 400),
      referer: String(req.get("referer") || "").slice(0, 400),
      source: "start-a-project",
    },
  };

  // 2. Store first — a lead survives even a total mail outage.
  if (!isReady()) await connectDB();

  if (!isReady()) {
    const saved = appendFallback({ ...record, createdAt: new Date().toISOString(), stored: "file" });
    console.error("[contact] MongoDB unavailable — wrote to logs/enquiries.jsonl");
    return res.status(saved ? 202 : 503).json({
      ok: saved,
      queued: saved,
      message: saved
        ? "Thanks — your message is safe. I'll be in touch shortly."
        : undefined,
      error: saved ? undefined : "Something went wrong on my end. Please email me directly.",
    });
  }

  let doc;
  try {
    doc = await Enquiry.create(record);
  } catch (err) {
    appendFallback({ ...record, createdAt: new Date().toISOString(), stored: "file", dbError: err.message });
    console.error(`[contact] save failed: ${err.message}`);
    return res.status(202).json({
      ok: true,
      queued: true,
      message: "Thanks — your message is safe. I'll be in touch shortly.",
    });
  }

  console.log(`[contact] stored ${doc.ref} from ${doc.email}`);

  // 3. Notify out of band so the visitor isn't waiting on SMTP.
  enqueue(doc._id);

  return res.status(201).json({
    ok: true,
    reference: doc.ref,
    message: "Thanks — your message landed. I'll reply within one business day.",
  });
});

/* ── health ──────────────────────────────────────────── */
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    uptime: Math.round(process.uptime()),
    db: { configured: dbConfigured(), connected: isReady() },
    mail: { configured: mailConfigured(), to: config.mail.to },
    budgets: BUDGETS,
  });
});

/* ── SPA-less fallback: unknown /api → JSON, everything else → index ── */
app.use("/api", (_req, res) => res.status(404).json({ ok: false, error: "Not found" }));
app.use((_req, res) => res.sendFile(path.join(ROOT, "index.html")));

/* eslint-disable-next-line no-unused-vars */
app.use((err, _req, res, _next) => {
  console.error(`[server] ${err.stack || err.message}`);
  res.status(500).json({ ok: false, error: "Something went wrong on my end." });
});

/* ── boot ────────────────────────────────────────────── */
const server = app.listen(config.port, () => {
  console.log(`\n  Portfolio server → http://localhost:${config.port}`);
  console.log(`  Enquiries        → ${config.mail.to}`);
  console.log(`  MongoDB          → ${dbConfigured() ? "configured" : "NOT configured (set MONGODB_URI)"}`);
  console.log(`  SMTP             → ${mailConfigured() ? "configured" : "NOT configured (set SMTP_USER / SMTP_PASS)"}\n`);
});

await connectDB();
startSweeper();

/* ── graceful shutdown ───────────────────────────────── */
let closing = false;
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    if (closing) return;
    closing = true;
    console.log(`\n[server] ${signal} — shutting down`);
    stopSweeper();
    server.close();
    await closeDB();
    process.exit(0);
  });
}

export default app;
