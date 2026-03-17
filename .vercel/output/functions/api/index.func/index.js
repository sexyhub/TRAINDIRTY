// Vercel serverless function entry point.
// handler.cjs is copied here by the build step (vercel.json buildCommand).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { default: app } = require("./handler.cjs");
module.exports = app;
