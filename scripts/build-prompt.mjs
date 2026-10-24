// Regenerate hangong-prompt.js from assets/hangong-prompt.md.
// Run after editing the markdown:  node scripts/build-prompt.mjs
// The middleware hot-reloads within a second, no restart needed.
import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const text = readFileSync(join(root, "assets/hangong-prompt.md"), "utf8")
writeFileSync(
  join(root, "hangong-prompt.js"),
  "// generated from assets/hangong-prompt.md — regenerate with: node scripts/build-prompt.mjs\n" +
    "export const PROMPT = " + JSON.stringify(text) + "\n",
)
console.log("hangong-prompt.js regenerated:", text.length, "chars")
