#!/usr/bin/env node
// Makes the EMERGENCY_LOGIN_PASSWORD_HASH value for the break-glass sign-in
// (lib/emergencyAccess.ts). The password is read from the terminal, not argv,
// so it doesn't land in shell history.
//
//   node scripts/emergency-login-hash.mjs
//
// Paste the printed line into the Vercel env var. Format must match
// lib/emergencyPassword.server.ts.

import { randomBytes, scryptSync } from "node:crypto";
import { createInterface } from "node:readline";

const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
rl._writeToOutput = () => {}; // hide what's typed
process.stdout.write("Emergency password (16+ characters): ");
rl.question("", (password) => {
  rl.close();
  process.stdout.write("\n");
  if (password.length < 16) {
    console.error("❌ Use at least 16 characters.");
    process.exit(1);
  }
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, 64);
  console.log(`scrypt:${salt.toString("hex")}:${key.toString("hex")}`);
});
