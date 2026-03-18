#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

// Check if pnpm is being used
const userAgent = process.env.npm_config_user_agent || "";
if (!userAgent.startsWith("pnpm")) {
  console.error("Please use pnpm to install dependencies. Run: npm install -g pnpm");
  process.exit(1);
}

// Remove lock files
const filesToRemove = ["package-lock.json", "yarn.lock"];
filesToRemove.forEach((file) => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`Removed ${file}`);
    } catch (err) {
      console.warn(`Could not remove ${file}:`, err.message);
    }
  }
});

console.log("✓ Preinstall checks passed");
