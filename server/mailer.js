/**
 * Mail transport + templates.
 *
 * Provider-agnostic: set MAIL_SERVICE=gmail (needs a Google App Password)
 * or a generic SMTP_HOST/SMTP_PORT/SMTP_SECURE trio.
 */
import nodemailer from "nodemailer";
import { config, mailConfigured } from "./config.js";

let transporter = null;

export function getTransport() {
  if (transporter) return transporter;
  if (!mailConfigured()) return null;

  const auth = { user: config.mail.user, pass: config.mail.pass };

  transporter = config.mail.service
    ? nodemailer.createTransport({ service: config.mail.service, auth })
    : nodemailer.createTransport({
        host: config.mail.host,
        port: config.mail.port,
        secure: config.mail.secure, // true for 465, false for 587 (STARTTLS)
        auth,
      });

  return transporter;
}

/** Verify credentials without sending anything. */
export async function verifyTransport() {
  const tx = getTransport();
  if (!tx) throw new Error("SMTP is not configured (set SMTP_USER, SMTP_PASS and MAIL_SERVICE or SMTP_HOST).");
  await tx.verify();
  return true;
}

const esc = (s = "") =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Strip CR/LF so user input can never inject extra mail headers. */
const headerSafe = (s = "") => String(s).replace(/[\r\n]+/g, " ").trim();

const fmtDate = (d) =>
  new Date(d).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });

/* ────────────────────────────────────────────────────────
   1. Notification to the site owner
   ──────────────────────────────────────────────────────── */
export function buildNotification(enquiry) {
  const ref = String(enquiry._id ?? "local").slice(-6).toUpperCase();
  const when = fmtDate(enquiry.createdAt || Date.now());
  const rows = [
    ["Name", enquiry.name],
    ["Email", enquiry.email],
    ["Company", enquiry.company || "—"],
    ["Budget", enquiry.budget || "—"],
    ["Received", when],
    ["Reference", ref],
  ];

  const text = [
    `New project enquiry — ${enquiry.name}`,
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    "Message:",
    enquiry.message,
    "",
    `Reply directly to this email to reach ${enquiry.email}.`,
    enquiry.meta?.ip ? `\nIP: ${enquiry.meta.ip}` : "",
  ].join("\n");

  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#1c1d20;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f5f5f5">
  <div style="max-width:560px;margin:0 auto">
    <p style="margin:0 0 8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#787878">New enquiry</p>
    <h1 style="margin:0 0 24px;font-size:26px;font-weight:500;line-height:1.2;color:#f5f5f5">${esc(enquiry.name)} wants to start a project</h1>
    <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:15px">
      ${rows
        .map(
          ([k, v]) => `<tr>
        <td style="padding:10px 12px 10px 0;color:#90a8a8;white-space:nowrap;vertical-align:top;border-bottom:1px solid #484848">${esc(k)}</td>
        <td style="padding:10px 0;color:#f5f5f5;border-bottom:1px solid #484848">${
          k === "Email" ? `<a href="mailto:${esc(v)}" style="color:#c0c0c0">${esc(v)}</a>` : esc(v)
        }</td>
      </tr>`,
        )
        .join("")}
    </table>
    <p style="margin:24px 0 8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#787878">Message</p>
    <div style="padding:16px;border:1px solid #484848;border-radius:12px;font-size:16px;line-height:1.66;white-space:pre-wrap">${esc(enquiry.message)}</div>
    <p style="margin:24px 0 0;font-size:14px;color:#787878">Hit reply to answer ${esc(enquiry.name)} directly.</p>
  </div>
</body></html>`;

  return {
    to: config.mail.to,
    from: `"Portfolio enquiries" <${config.mail.from}>`,
    replyTo: `${headerSafe(enquiry.name)} <${headerSafe(enquiry.email)}>`,
    subject: `New project enquiry — ${headerSafe(enquiry.name)}${enquiry.budget ? ` (${headerSafe(enquiry.budget)})` : ""} [${ref}]`,
    text,
    html,
  };
}

/* ────────────────────────────────────────────────────────
   2. Auto-reply to the visitor
   ──────────────────────────────────────────────────────── */
export function buildAutoReply(enquiry) {
  const first = String(enquiry.name).trim().split(/\s+/)[0] || "there";

  const text = [
    `Hi ${first},`,
    "",
    "Thanks for reaching out — your message landed safely and I read every one myself.",
    "You'll hear back from me within one business day.",
    "",
    "For reference, here's what you sent:",
    "",
    enquiry.message,
    "",
    "— Naveen Suthar",
    config.mail.to,
  ].join("\n");

  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#1c1d20;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f5f5f5">
  <div style="max-width:520px;margin:0 auto">
    <p style="margin:0 0 8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#787878">Message received</p>
    <h1 style="margin:0 0 16px;font-size:26px;font-weight:500;line-height:1.2">Thanks, ${esc(first)} —<br>I'll be in touch shortly.</h1>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.66;color:#f5f5f5">Your message landed safely and I read every one myself. Expect a reply within one business day.</p>
    <p style="margin:24px 0 8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#787878">What you sent</p>
    <div style="padding:16px;border:1px solid #484848;border-radius:12px;font-size:15px;line-height:1.66;color:#90a8a8;white-space:pre-wrap">${esc(enquiry.message)}</div>
    <p style="margin:24px 0 0;font-size:15px;line-height:1.66;color:#f5f5f5">— Naveen Suthar<br>
      <a href="mailto:${esc(config.mail.to)}" style="color:#c0c0c0">${esc(config.mail.to)}</a></p>
  </div>
</body></html>`;

  return {
    to: `${headerSafe(enquiry.name)} <${headerSafe(enquiry.email)}>`,
    from: `"Naveen Suthar" <${config.mail.from}>`,
    replyTo: config.mail.to,
    subject: "Thanks — I've got your message",
    text,
    html,
  };
}

/** Send one message. Throws on SMTP failure so the caller can retry. */
export async function send(message) {
  const tx = getTransport();
  if (!tx) throw new Error("SMTP is not configured");
  return tx.sendMail(message);
}

export default { getTransport, verifyTransport, send, buildNotification, buildAutoReply };
