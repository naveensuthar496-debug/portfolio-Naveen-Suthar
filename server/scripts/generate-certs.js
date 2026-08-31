#!/usr/bin/env node
/**
 * Generate self-signed SSL certificates for development.
 * Run this script once to create cert.pem and key.pem in server/certs/
 */
import { execSync } from "child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const certsDir = path.join(__dirname, "..", "certs");

// Create certs directory if it doesn't exist
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
}

const certPath = path.join(certsDir, "cert.pem");
const keyPath = path.join(certsDir, "key.pem");

// Skip if certificates already exist
if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  console.log("✓ SSL certificates already exist at:");
  console.log(`  Cert: ${certPath}`);
  console.log(`  Key:  ${keyPath}`);
  process.exit(0);
}

console.log("Generating self-signed SSL certificates...");

try {
  // Generate a self-signed certificate valid for 365 days
  const cmd = `openssl req -x509 -newkey rsa:2048 -nodes -out "${certPath}" -keyout "${keyPath}" -days 365 -subj "/CN=localhost"`;
  execSync(cmd, { stdio: "inherit" });

  console.log("\n✓ SSL certificates generated successfully!");
  console.log(`  Cert: ${certPath}`);
  console.log(`  Key:  ${keyPath}`);
  console.log("\nTo enable HTTPS, set USE_HTTPS=true in your .env file");
} catch (error) {
  console.error("✗ Failed to generate certificates. Make sure OpenSSL is installed.");
  console.error(`  On Windows: choco install openssl`);
  console.error(`  On macOS: brew install openssl`);
  console.error(`  On Linux: sudo apt-get install openssl`);
  process.exit(1);
}
