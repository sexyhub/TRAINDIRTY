import { cp, mkdir } from "fs/promises";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const src = resolve(repoRoot, "artifacts/workout-tracker/dist/public");
const dest = resolve(repoRoot, "public");

await mkdir(dest, { recursive: true });
await cp(src, dest, { recursive: true });
console.log("Frontend files copied to public/");
