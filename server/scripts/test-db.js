/**
 * npm run check:db — verify the MongoDB connection and the Enquiry model.
 * Writes a throwaway document, reads it back, deletes it.
 */
import { config, dbConfigured } from "../config.js";
import { connectDB, closeDB, isReady } from "../db.js";
import Enquiry from "../models/Enquiry.js";

const line = (label, value) => console.log(`  ${label.padEnd(14)} ${value}`);

if (!dbConfigured()) {
  console.error("\n  MONGODB_URI is not set. Copy .env.example to .env and fill it in.\n");
  process.exit(1);
}

console.log("\n  Checking MongoDB…");
line("URI", config.mongoUri.replace(/\/\/([^:]+):[^@]+@/, "//$1:***@"));
line("Database", config.dbName);

const connected = await connectDB();
if (!connected || !isReady()) {
  console.error("\n  Could not connect. Common causes:");
  console.error("   • Atlas: your current IP is not in Network Access → IP Access List");
  console.error("   • Atlas: wrong password, or special characters not URL-encoded");
  console.error("   • Local: mongod is not running\n");
  process.exit(1);
}

const probe = await Enquiry.create({
  name: "Connection probe",
  email: "probe@example.com",
  message: "Automated check from npm run check:db — safe to ignore.",
  meta: { source: "check:db" },
});
line("Write", `ok (${probe.ref})`);

const found = await Enquiry.findById(probe._id).lean();
line("Read", found ? "ok" : "FAILED");

await Enquiry.deleteOne({ _id: probe._id });
line("Cleanup", "ok");

const total = await Enquiry.countDocuments();
line("Enquiries", `${total} stored`);

console.log("\n  MongoDB is ready.\n");
await closeDB();
process.exit(0);
