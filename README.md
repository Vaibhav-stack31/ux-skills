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

- `mern-web-ux`: UX rules and audit for React web apps (MERN, Tailwind, shadcn/ui).
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
npx claude-ux-skills
```

For every project (`~/.claude/skills`):

```bash
npx claude-ux-skills --global
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

`ux-audit` reads `package.json`. `react-native` or `expo` uses `react-native-ux`. `react-dom` uses `mern-web-ux`. A monorepo with both gets one report per folder. It runs the scanner, reviews each screen, and writes a severity ranked report. It only reports. Ask for fixes if you want them.

You can also run a scanner by hand:

```bash
node skills/mern-web-ux/scripts/ux-scan.mjs <path-to-client-src>
node skills/react-native-ux/scripts/ux-scan.mjs <path-to-app-src>
```

## Update

- npx skills: run `npx skills add Vaibhav-stack31/ux-skills` again.
- Plugin: `claude plugin marketplace update ux-skills-marketplace`, then `claude plugin update ux-skills@ux-skills-marketplace`.
- npx installer: run `npx claude-ux-skills@latest` again. It replaces the old copy.

## Try it locally without installing

```bash
claude --plugin-dir .
```

## License

MIT
