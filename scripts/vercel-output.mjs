import { cp, mkdir, writeFile } from "fs/promises";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const out = resolve(root, ".vercel/output");

await mkdir(resolve(out, "static"), { recursive: true });
await mkdir(resolve(out, "functions/api/index.func"), { recursive: true });

await cp(resolve(root, "public"), resolve(out, "static"), { recursive: true });

await cp(
  resolve(root, "api/handler.cjs"),
  resolve(out, "functions/api/index.func/handler.cjs"),
);
await cp(
  resolve(root, "api/index.js"),
  resolve(out, "functions/api/index.func/index.js"),
);

await writeFile(
  resolve(out, "functions/api/index.func/.vc-config.json"),
  JSON.stringify({
    runtime: "nodejs20.x",
    handler: "index.js",
    launcherType: "Nodejs",
  }),
);

await writeFile(
  resolve(out, "config.json"),
  JSON.stringify({
    version: 3,
    routes: [
      { src: "/api/(.*)", dest: "/api/index" },
      { handle: "filesystem" },
      { src: "/(.*)", dest: "/index.html" },
    ],
  }),
);

console.log(".vercel/output/ assembled successfully");
