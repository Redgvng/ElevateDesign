import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const markdownFiles = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      walk(fullPath);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".md")) {
      markdownFiles.push(fullPath);
    }
  }
}

walk(root);

const brokenLinks = [];
const markdownLinkPattern = /\[[^\]]+\]\(([^)]+)\)/g;

for (const file of markdownFiles) {
  const text = fs.readFileSync(file, "utf8");
  let match;

  while ((match = markdownLinkPattern.exec(text)) !== null) {
    const rawHref = match[1].trim();
    if (/^(https?:|mailto:|#)/.test(rawHref)) continue;

    const href = rawHref.split("#")[0];
    if (!href) continue;

    const resolved = path.resolve(path.dirname(file), href);
    if (!fs.existsSync(resolved)) {
      brokenLinks.push(`${path.relative(root, file)} -> ${rawHref}`);
    }
  }
}

if (brokenLinks.length > 0) {
  console.error("Broken Markdown links:");
  for (const link of brokenLinks) console.error(`- ${link}`);
  process.exit(1);
}

console.log(`OK ${markdownFiles.length} Markdown files checked`);
