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
import https from "node:https";
import http from "node:http";
import fs from "node:fs";

import { config, mailConfigured, dbConfigured, ROOT } from "./config.js";
import { connectDB, closeDB, isReady, getDatabase } from "./db.js";
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
    const dbType = config.databaseType === "mssql" ? "Azure SQL" : "MongoDB";
    console.error(`[contact] ${dbType} unavailable — wrote to logs/enquiries.jsonl`);
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
    const db = await getDatabase();

    if (config.databaseType === "mssql") {
      doc = await db.createEnquiry(record);
    } else {
      // MongoDB path - use Mongoose
      const { default: Enquiry } = await import("./models/Enquiry.js");
      doc = await Enquiry.create(record);
    }
  } catch (err) {
    appendFallback({ ...record, createdAt: new Date().toISOString(), stored: "file", dbError: err.message });
    console.error(`[contact] save failed: ${err.message}`);
    return res.status(202).json({
      ok: true,
      queued: true,
      message: "Thanks — your message is safe. I'll be in touch shortly.",
    });
  }

  const docRef = doc.ref || String(doc._id).slice(-6).toUpperCase();
  console.log(`[contact] stored ${docRef} from ${doc.email}`);

  // 3. Notify out of band so the visitor isn't waiting on SMTP.
  enqueue(doc._id);

  return res.status(201).json({
    ok: true,
    reference: docRef,
    message: "Thanks — your message landed. I'll reply within one business day.",
  });
});

/* ── health ──────────────────────────────────────────── */
app.get("/api/health", (_req, res) => {
  const dbType = config.databaseType === "mssql" ? "Azure SQL" : "MongoDB";
  res.json({
    ok: true,
    uptime: Math.round(process.uptime()),
    db: {
      type: dbType,
      configured: dbConfigured(),
      connected: isReady()
    },
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
let server;
const protocol = process.env.USE_HTTPS === "true" ? "https" : "http";
const certPath = process.env.SSL_CERT_PATH || path.join(ROOT, "server", "certs", "cert.pem");
const keyPath = process.env.SSL_KEY_PATH || path.join(ROOT, "server", "certs", "key.pem");
const dbType = config.databaseType === "mssql" ? "Azure SQL" : "MongoDB";

// Try to use HTTPS if certificates are available or USE_HTTPS is explicitly set
if (protocol === "https" && fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  const httpsOptions = {
    cert: fs.readFileSync(certPath, "utf8"),
    key: fs.readFileSync(keyPath, "utf8"),
  };
  server = https.createServer(httpsOptions, app).listen(config.port, () => {
    console.log(`\n  Portfolio server → https://localhost:${config.port}`);
    console.log(`  Enquiries        → ${config.mail.to}`);
    console.log(`  Database         → ${dbType} (${dbConfigured() ? "configured" : "NOT configured"})`);
    console.log(`  SMTP             → ${mailConfigured() ? "configured" : "NOT configured (set SMTP_USER / SMTP_PASS)"}`);
    console.log(`  SSL Enabled      → Yes (${certPath})\n`);
  });
} else {
  server = app.listen(config.port, () => {
    console.log(`\n  Portfolio server → http://localhost:${config.port}`);
    console.log(`  Enquiries        → ${config.mail.to}`);
    console.log(`  Database         → ${dbType} (${dbConfigured() ? "configured" : "NOT configured"})`);
    console.log(`  SMTP             → ${mailConfigured() ? "configured" : "NOT configured (set SMTP_USER / SMTP_PASS)"}\n`);
  });
}

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
