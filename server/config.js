/**
 * Environment configuration.
 * Everything is driven by .env so the same code runs against
 * MongoDB Atlas (cloud) or a local mongod, and any SMTP provider.
 */
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(ROOT, ".env") });

const bool = (v, fallback = false) =>
  v === undefined ? fallback : /^(1|true|yes|on)$/i.test(String(v).trim());
const int = (v, fallback) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
};

export const config = {
  env: process.env.NODE_ENV || "development",
  port: int(process.env.PORT, 3000),
  useHttps: process.env.USE_HTTPS === "true" || false,

  // ── SSL/TLS ───────────────────────────────────────────
  ssl: {
    certPath: process.env.SSL_CERT_PATH || "",
    keyPath: process.env.SSL_KEY_PATH || "",
  },

  // ── database ──────────────────────────────────────────
  databaseType: (process.env.DATABASE_TYPE || "mongodb").toLowerCase(),
  mongoUri: process.env.MONGODB_URI || "",
  dbName: process.env.MONGODB_DB || "portfolio",

  // ── Azure SQL ─────────────────────────────────────────
  azureSql: {
    server: process.env.AZURE_SQL_SERVER || "",
    database: process.env.AZURE_SQL_DATABASE || "",
    user: process.env.AZURE_SQL_USER || "",
    password: process.env.AZURE_SQL_PASSWORD || "",
    port: int(process.env.AZURE_SQL_PORT, 1433),
  },

  // ── mail ──────────────────────────────────────────────
  mail: {
    // Where enquiries are delivered.
    to: process.env.MAIL_TO || "naveensuthar496@gmail.com",
    // Envelope sender. For Gmail this MUST be the authenticated account.
    from: process.env.MAIL_FROM || process.env.SMTP_USER || "",
    service: (process.env.MAIL_SERVICE || "").trim().toLowerCase(),
    host: process.env.SMTP_HOST || "",
    port: int(process.env.SMTP_PORT, 587),
    secure: bool(process.env.SMTP_SECURE, false),
    user: process.env.SMTP_USER || "",
    pass: (process.env.SMTP_PASS || "").replace(/\s+/g, ""), // Gmail shows app pwds in groups of 4
    autoReply: bool(process.env.MAIL_AUTOREPLY, true),
  },

  // ── delivery retry algorithm ──────────────────────────
  retry: {
    maxAttempts: int(process.env.MAIL_MAX_ATTEMPTS, 5),
    baseDelayMs: int(process.env.MAIL_RETRY_BASE_MS, 60_000), // 1m, doubling
    sweepEveryMs: int(process.env.MAIL_SWEEP_MS, 120_000), // background retry tick
  },

  // ── abuse protection ──────────────────────────────────
  rateLimit: {
    windowMs: int(process.env.RATE_WINDOW_MS, 15 * 60_000),
    max: int(process.env.RATE_MAX, 5),
  },
};

/** Is a real SMTP transport configured? */
export const mailConfigured = () =>
  Boolean(config.mail.user && config.mail.pass && (config.mail.service || config.mail.host));

/** Is a database configured? */
export const dbConfigured = () => {
  const dbType = config.databaseType;
  if (dbType === "mssql") {
    return Boolean(config.azureSql.server && config.azureSql.database && config.azureSql.user && config.azureSql.password);
  }
  return Boolean(config.mongoUri);
};
