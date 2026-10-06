# ux-skills

Two UX skills for Claude Code.

- `mern-web-ux`: React web apps on the MERN stack with Tailwind and shadcn/ui
- `react-native-ux`: React Native and Expo apps with NativeWind

Each works in build mode (rules applied while writing UI) and audit mode (a review with a severity ranked report and a scanner script).

## Install as a plugin

```bash
claude plugin marketplace add YOUR_GITHUB_USER/ux-skills
claude plugin install ux-skills@ux-skills-marketplace
```

## Install with npm

Into the current project (`.claude/skills`):

```bash
npx claude-ux-skills
```

For every project (`~/.claude/skills`):

```bash
npx claude-ux-skills --global
```

Options: `--only web`, `--only app`, `--remove`.

## Try it locally without installing

```bash
claude --plugin-dir .
```

## Before publishing

Replace `YOUR_NAME` and `YOUR_GITHUB_USER` in `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`, and choose an npm package name that is free in `package.json`.
