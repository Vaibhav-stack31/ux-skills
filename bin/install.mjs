#!/usr/bin/env node
// Copies the bundled skills into a Claude Code skills folder.
//   npx Vaibhav-stack31/ux-skills            -> ./.claude/skills   (this project)
//   npx Vaibhav-stack31/ux-skills --global   -> ~/.claude/skills   (all projects)
//   npx Vaibhav-stack31/ux-skills --only web | app | audit  (web = web-app-ux)
//   npx Vaibhav-stack31/ux-skills --remove [--global]
//   npx Vaibhav-stack31/ux-skills --quiet    (no banner)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);

if (flag("--help") || flag("-h")) {
  console.log("Usage: npx Vaibhav-stack31/ux-skills [--global] [--only web|app|audit] [--remove] [--quiet]");
  process.exit(0);
}

const WIDTH = 72;
const color = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code, s) => (color ? `\x1b[${code}m${s}\x1b[0m` : s);

const BANNER = String.raw`
 _   ___  __  ____  _  _____ _     _     ____
| | | \ \/ / / ___|| |/ /_ _| |   | |   / ___|
| | | |\  /  \___ \| ' / | || |   | |   \___ \
| |_| /  \   ___) | . \ | || |___| |___ ___) |
 \___/_/\_\ |____/|_|\_\___|_____|_____|____/
`.split("\n").filter(Boolean);

const box = (lines) => {
  const edge = "+" + "-".repeat(WIDTH - 2) + "+";
  const row = (s) => {
    const t = s.length > WIDTH - 4 ? "..." + s.slice(s.length - (WIDTH - 7)) : s;
    return "| " + t.padEnd(WIDTH - 4) + " |";
  };
  return [edge, ...lines.map(row), edge].join("\n");
};

const source = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "skills");
const base = flag("--global") ? os.homedir() : process.cwd();
const target = path.join(base, ".claude", "skills");
const all = ["web-app-ux", "react-native-ux", "ux-audit"];
const only = value("--only");
const map = { web: "web-app-ux", app: "react-native-ux", audit: "ux-audit" };
if (only && !map[only]) {
  console.error(`Unknown --only value "${only}". Use web, app or audit.`);
  process.exit(1);
}
const pick = only ? [map[only]] : all;
const removing = flag("--remove");
const OLD_NAMES = { "mern-web-ux": "web-app-ux" }; // renamed skills, cleaned up so both copies never load

if (!flag("--quiet")) {
  console.log(paint("36", BANNER.join("\n")));
  console.log("\n  UX skills for Claude Code\n");
}

const replaced = [];
for (const [old, now] of Object.entries(OLD_NAMES)) {
  const stale = path.join(target, old);
  if (pick.includes(now) && fs.existsSync(stale)) {
    fs.rmSync(stale, { recursive: true, force: true });
    replaced.push(`Replaced old ${old} with ${now}.`);
  }
}

for (const name of pick) {
  const to = path.join(target, name);
  fs.rmSync(to, { recursive: true, force: true }); // replace an older copy cleanly
  if (!removing) {
    fs.mkdirSync(target, { recursive: true });
    fs.cpSync(path.join(source, name), to, { recursive: true });
  }
}

if (replaced.length) console.log(replaced.join("\n") + "\n");
const head = removing ? "REMOVED" : "INSTALLED";
console.log(box([head, "", ...pick.map((n) => `* ${n}`), "", `Where: ${target}`]));
if (!removing) {
  console.log("\nNext steps:");
  console.log("  1. Start a new Claude Code session to load the skills.");
  console.log("  2. Build UI as usual. The skills apply on their own.");
  console.log('  3. Say "audit the UX" to run a report.');
  if (only && only !== "audit") console.log("  Tip: add --only audit to get the audit command.");
}
