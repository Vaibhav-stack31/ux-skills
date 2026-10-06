---
name: ux-audit
description: Run a UX audit on a React web or React Native app. Use this when the user says "audit", "UX audit", "review the UX", "UX check", "check the UI", "review this screen", or asks what is wrong with the UX or UI. It picks the right sibling skill for the stack and follows its audit procedure. Report only unless the user asks for fixes.
---

# UX Audit

This skill holds no rules. It only picks the right skill and runs its audit.

## 1. Scope

If the user gave a path or scope, audit only that. Otherwise audit the whole project.

## 2. Detect the stack

Read the nearest `package.json` for the audited path.

- `react-native` or `expo` in dependencies: use the sibling skill `react-native-ux`.
- `react-dom` in dependencies: use the sibling skill `mern-web-ux`.
- A monorepo with both: find each package folder, then run the matching skill on each folder on its own. Give one report per folder.
- Neither found: say so and ask which stack to use.

## 3. Find the sibling skill

All skills install side by side, so look for `../react-native-ux/` or `../mern-web-ux/` relative to this skill folder.

If the folder is missing, stop. Tell the user which skill to install, for example `npx skills add Vaibhav-stack31/ux-skills` or `npx Vaibhav-stack31/ux-skills`.

## 4. Follow the audit procedure

Open `../<sibling>/references/audit.md` and follow it fully. That includes:

- Running `../<sibling>/scripts/ux-scan.mjs` on the scoped path.
- Reviewing each screen as the procedure says.
- Writing the report in the format the procedure defines.

## 5. Report only

Do not change code. Fix only when the user asks. When they do, follow the Fixing section of the same `audit.md`.
