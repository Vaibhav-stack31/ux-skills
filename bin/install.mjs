#!/usr/bin/env node
// Copies the bundled skills into a Claude Code skills folder.
//   npx claude-ux-skills            -> ./.claude/skills   (this project)
//   npx claude-ux-skills --global   -> ~/.claude/skills   (all projects)
//   npx claude-ux-skills --only web | --only app
//   npx claude-ux-skills --remove [--global]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);

if (flag("--help") || flag("-h")) {
  console.log("Usage: claude-ux-skills [--global] [--only web|app] [--remove]");
  process.exit(0);
}

const source = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "skills");
const base = flag("--global") ? os.homedir() : process.cwd();
const target = path.join(base, ".claude", "skills");
const pick = { web: ["mern-web-ux"], app: ["react-native-ux"] }[value("--only")] ?? ["mern-web-ux", "react-native-ux"];

for (const name of pick) {
  const to = path.join(target, name);
  if (flag("--remove")) {
    fs.rmSync(to, { recursive: true, force: true });
    console.log(`Removed ${to}`);
    continue;
  }
  fs.rmSync(to, { recursive: true, force: true }); // replace an older copy cleanly
  fs.mkdirSync(target, { recursive: true });
  fs.cpSync(path.join(source, name), to, { recursive: true });
  console.log(`Installed ${name} to ${to}`);
}
if (!flag("--remove")) console.log("Start a new Claude Code session to load the skills.");
