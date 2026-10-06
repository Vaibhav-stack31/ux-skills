# ux-skills

```
 _   ___  __  ____  _  _____ _     _     ____
| | | \ \/ / / ___|| |/ /_ _| |   | |   / ___|
| | | |\  /  \___ \| ' / | || |   | |   \___ \
| |_| |/  \   ___) | . \ | || |___| |___ ___) |
 \___/_/\_\ |____/|_|\_\___|_____|_____|____/
```

UX skills for AI coding agents. They catch the problems that generated UI usually has: missing states, small tap targets, bad forms, poor accessibility.

## Skills

- `web-app-ux`: UX rules and audit for React web apps (plain React, MERN and Next.js, Tailwind, shadcn/ui). Next.js App Router is supported, including route files, Server Actions, and URL state.
- `react-native-ux`: UX rules and audit for React Native and Expo apps (NativeWind).
- `ux-audit`: a dedicated audit command. It picks the right skill for your stack and runs its audit.

## Install with npx skills

Works with Claude Code, Codex, Cursor, Antigravity and other agents.

```bash
npx skills add Vaibhav-stack31/ux-skills
```

## Install as a Claude Code plugin

```bash
claude plugin marketplace add Vaibhav-stack31/ux-skills
claude plugin install ux-skills@ux-skills-marketplace
```

## Install with the npx installer

Into the current project (`.claude/skills`):

```bash
npx Vaibhav-stack31/ux-skills
```

For every project (`~/.claude/skills`):

```bash
npx Vaibhav-stack31/ux-skills --global
```

Flags:

- `--global`: install into `~/.claude/skills`.
- `--only web|app|audit`: install one skill only.
- `--remove`: remove the skills instead of installing.
- `--quiet`: skip the banner.
- `--help`: show usage.

Set `NO_COLOR=1` to turn off color.

## Run an audit

Ask Claude Code:

```
audit the UX
audit the UX in src/pages/Checkout
```

`ux-audit` reads `package.json`. `react-native` or `expo` uses `react-native-ux`. `react-dom` or `next` uses `web-app-ux`. A monorepo with both gets one report per folder. It runs the scanner, reviews each screen, and writes a severity ranked report. It only reports. Ask for fixes if you want them.

You can also run a scanner by hand:

```bash
node skills/web-app-ux/scripts/ux-scan.mjs <path-to-client-src>
node skills/react-native-ux/scripts/ux-scan.mjs <path-to-app-src>
```

## Update

- npx skills: run `npx skills add Vaibhav-stack31/ux-skills` again.
- Plugin: `claude plugin marketplace update ux-skills-marketplace`, then `claude plugin update ux-skills@ux-skills-marketplace`.
- npx installer: run `npx Vaibhav-stack31/ux-skills` again. It replaces the old copy.

## Upgrading

Version 1.2.0 renamed the web skill from `mern-web-ux` to `web-app-ux`. Remove the old copy so two versions do not load together.

**npx skills** (commands from `npx skills --help`):

```bash
npx skills remove mern-web-ux -y
npx skills add Vaibhav-stack31/ux-skills
```

Add `-g` to the remove command if you installed globally, and `-g` to the add command too. Run `npx skills update` later to pick up new versions.

**Claude Code plugin** (commands from `claude plugin --help`). The plugin name did not change, so refresh and update:

```bash
claude plugin marketplace update ux-skills-marketplace
claude plugin update ux-skills@ux-skills-marketplace
```

Add `--scope project` (or `user`) to the update command if the plugin is installed at one scope only.

**This repo's npx installer** cleans up the old name by itself:

```bash
npx Vaibhav-stack31/ux-skills            # this project
npx Vaibhav-stack31/ux-skills --global   # all projects
```

**Copied by hand.** Delete the old folder, then copy in the new one from `skills/web-app-ux`:

- Project: delete `.claude/skills/mern-web-ux`, copy to `.claude/skills/web-app-ux`.
- Home folder: delete `~/.claude/skills/mern-web-ux`, copy to `~/.claude/skills/web-app-ux`.

Start a new session so the renamed skill loads.

## Try it locally without installing

```bash
claude --plugin-dir .
```

## License

MIT
