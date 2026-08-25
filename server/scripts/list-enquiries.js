/**
 * npm run list — print stored enquiries newest-first.
 *
 *   npm run list                 latest 20
 *   npm run list -- --all        every enquiry
 *   npm run list -- --status=failed
 *   npm run list -- --retry      re-attempt everything not yet notified
 */
import { config } from "../config.js";
import { connectDB, closeDB, isReady } from "../db.js";
import Enquiry from "../models/Enquiry.js";
import { deliver } from "../queue.js";

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};

if (!(await connectDB()) || !isReady()) {
  console.error("\n  Could not reach MongoDB. Run: npm run check:db\n");
  process.exit(1);
}

const status = opt("status");
const query = status ? { status } : {};
const limit = flag("all") ? 0 : Number(opt("limit")) || 20;

const docs = await Enquiry.find(query).sort({ createdAt: -1 }).limit(limit).lean();

const counts = await Enquiry.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]);
const tally = counts.map((c) => `${c._id}: ${c.n}`).join("   ") || "none";

console.log(`\n  ${await Enquiry.countDocuments()} enquiries in ${config.dbName}.enquiries   (${tally})`);
console.log(`  ${"─".repeat(72)}`);

if (!docs.length) console.log("  Nothing to show yet.\n");

for (const d of docs) {
  const ref = String(d._id).slice(-6).toUpperCase();
  const when = new Date(d.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const mark = { notified: "sent", pending: "PENDING", failed: "FAILED" }[d.status] || d.status;

  console.log(`\n  [${ref}]  ${when}   ${mark}`);
  console.log(`  ${d.name} <${d.email}>${d.company ? `  ·  ${d.company}` : ""}${d.budget ? `  ·  ${d.budget}` : ""}`);
  console.log(`  ${d.message.replace(/\n/g, "\n  ")}`);
  if (d.status !== "notified") {
    console.log(`  attempts: ${d.mail?.attempts ?? 0}${d.mail?.lastError ? `  ·  ${d.mail.lastError}` : ""}`);
  }
}

if (flag("retry")) {
  const stuck = await Enquiry.find({ status: { $ne: "notified" } }).select("_id status");
  console.log(`\n  ${"─".repeat(72)}\n  Retrying ${stuck.length}…`);
  for (const s of stuck) {
    // A previously exhausted enquiry needs its counter reset to be retryable.
    if (s.status === "failed") {
      await Enquiry.updateOne(
        { _id: s._id },
        { $set: { status: "pending", "mail.attempts": 0, "mail.nextAttemptAt": null } },
      );
    }
    const r = await deliver(s._id);
    console.log(`   ${String(s._id).slice(-6).toUpperCase()} → ${r.ok ? "sent" : r.reason}`);
  }
}

console.log("");
await closeDB();
process.exit(0);
