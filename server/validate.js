/**
 * Input validation for the enquiry form.
 * Returns { ok, data, errors } — never throws.
 */

const MAX = { name: 120, email: 254, company: 160, budget: 60, message: 5000 };

// Deliberately permissive: catches typos, does not try to out-guess RFC 5322.
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

/** Drop control characters, keeping tab / newline / carriage return. */
const stripControl = (s) =>
  Array.from(s)
    .filter((ch) => {
      const c = ch.codePointAt(0);
      if (c === 9 || c === 10 || c === 13) return true;
      return c > 31 && c !== 127;
    })
    .join("");

/** Single-line field: strip control chars, collapse whitespace runs. */
const clean = (v, max) =>
  typeof v === "string" ? stripControl(v).replace(/\s+/g, " ").trim().slice(0, max) : "";

/** Multi-line field: same, but paragraph breaks survive (max one blank line). */
const cleanMultiline = (v, max) =>
  typeof v === "string"
    ? stripControl(v)
        .replace(/\r\n?/g, "\n")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
        .slice(0, max)
    : "";

export const BUDGETS = ["Under 50k", "50k - 2L", "2L - 5L", "5L+", "Not sure yet"];

export function validateEnquiry(body = {}) {
  const errors = {};

  const name = clean(body.name, MAX.name);
  const email = clean(body.email, MAX.email).toLowerCase();
  const company = clean(body.company, MAX.company);
  const budget = clean(body.budget, MAX.budget);
  const message = cleanMultiline(body.message, MAX.message);

  if (name.length < 2) errors.name = "Please enter your name.";
  if (!email) errors.email = "Please enter your email.";
  else if (!EMAIL_RE.test(email)) errors.email = "That email doesn't look right.";
  if (message.length < 10) errors.message = "Tell me a little more — at least 10 characters.";
  if (budget && !BUDGETS.includes(budget)) errors.budget = "Pick one of the listed ranges.";

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    data: { name, email, company, budget, message },
  };
}

/**
 * Honeypot + timing checks. Bots fill hidden fields and submit instantly;
 * a human needs a couple of seconds to type a real message.
 */
export function looksLikeSpam(body = {}) {
  if (clean(body.website, 200)) return "honeypot";
  const elapsed = Number(body.elapsed);
  if (Number.isFinite(elapsed) && elapsed >= 0 && elapsed < 1500) return "too-fast";
  return null;
}

export default { validateEnquiry, looksLikeSpam, BUDGETS };
