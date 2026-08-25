/**
 * npm run check:mail — verify SMTP credentials, then send one real
 * sample enquiry email to MAIL_TO so you can see the formatting.
 */
import { config, mailConfigured } from "../config.js";
import { verifyTransport, send, buildNotification } from "../mailer.js";

const line = (label, value) => console.log(`  ${label.padEnd(14)} ${value}`);

if (!mailConfigured()) {
  console.error("\n  SMTP is not configured. Set SMTP_USER, SMTP_PASS and MAIL_SERVICE (or SMTP_HOST) in .env\n");
  process.exit(1);
}

console.log("\n  Checking mail…");
line("Transport", config.mail.service || `${config.mail.host}:${config.mail.port}`);
line("Account", config.mail.user);
line("Deliver to", config.mail.to);

try {
  await verifyTransport();
  line("Credentials", "ok");
} catch (err) {
  console.error(`\n  SMTP rejected the login: ${err.message}`);
  console.error("\n  For Gmail you need an App Password, not your normal password:");
  console.error("   1. Turn on 2-Step Verification at myaccount.google.com/security");
  console.error("   2. Create one at myaccount.google.com/apppasswords");
  console.error("   3. Paste the 16 characters into SMTP_PASS (spaces are fine)\n");
  process.exit(1);
}

const sample = {
  _id: "0000000000000000000test",
  name: "Sample Visitor",
  email: "sample.visitor@example.com",
  company: "Example Studio",
  budget: "2L - 5L",
  message:
    "This is a test of the enquiry pipeline.\n\nIf this email looks right, the live form will look identical.",
  createdAt: new Date(),
  meta: { ip: "127.0.0.1" },
};

const info = await send(buildNotification(sample));
line("Send", `ok (${info.messageId})`);
console.log(`\n  Sample enquiry delivered to ${config.mail.to}. Check the inbox (and spam on the first run).\n`);
process.exit(0);
