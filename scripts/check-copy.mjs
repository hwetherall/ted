import { readFile, readdir } from "node:fs/promises";
import { extname, join } from "node:path";

const allowed = new Set([".ts", ".tsx", ".css", ".md", ".json", ".sql"]);
const ignored = new Set([".git", ".next", "node_modules", "coverage"]);
const failures = [];

async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await visit(path);
    } else if (allowed.has(extname(entry.name))) {
      const source = await readFile(path, "utf8");
      if (source.includes("\u2014")) failures.push(path);
    }
  }
}

await visit(process.cwd());
if (failures.length) {
  console.error(`Em dash found in:\n${failures.join("\n")}`);
  process.exit(1);
}
