import path from "path";
import { fileURLToPath } from "url";
import { build as esbuild } from "esbuild";
import { rm, readFile, copyFile, mkdir } from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times without risking some
// packages that are not bundle compatible
const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cookie-parser",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "openid-client",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  const distDir = path.resolve(__dirname, "dist");
  await rm(distDir, { recursive: true, force: true });

  const pkgPath = path.resolve(__dirname, "package.json");
  const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter(
    (dep) =>
      !allowlist.includes(dep) &&
      !(pkg.dependencies?.[dep]?.startsWith("workspace:")),
  );

  const sharedOptions = {
    platform: "node" as const,
    bundle: true,
    format: "cjs" as const,
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info" as const,
  };

  console.log("building server (Replit)...");
  await esbuild({
    ...sharedOptions,
    entryPoints: [path.resolve(__dirname, "src/index.ts")],
    outfile: path.resolve(distDir, "index.cjs"),
  });

  const handlerOut = path.resolve(distDir, "handler.cjs");
  console.log("building handler (Vercel)...");
  await esbuild({
    ...sharedOptions,
    entryPoints: [path.resolve(__dirname, "src/app.ts")],
    outfile: handlerOut,
  });

  // Copy handler.cjs into the repo-root api/ directory so Vercel can
  // package it alongside api/index.js as a self-contained serverless function.
  const apiDir = path.resolve(__dirname, "..", "..", "api");
  await mkdir(apiDir, { recursive: true });
  await copyFile(handlerOut, path.resolve(apiDir, "handler.cjs"));
  console.log("handler.cjs copied to api/");
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
