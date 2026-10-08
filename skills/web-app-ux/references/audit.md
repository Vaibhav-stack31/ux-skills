# UX audit procedure

Use this when the user asks for a review, an audit, a polish pass, or says the UI feels wrong.

## Contents
1. Scope
2. Run the scanner
3. Review each screen
4. Severity scale
5. Report format
6. Fixing

## 1. Scope

Find out what is being audited: the whole app, one flow, or specific files. If the user did not say and the app is large, start with the highest traffic flow (sign in, the main list, the main create or edit form) and say that is what you did.

List the routes and the component behind each one. That list is your checklist.

## 2. Run the scanner

```bash
node <skill-dir>/scripts/ux-scan.mjs <path-to-client-src>
```

Add `--json` for machine readable output. The scanner is a set of static heuristics. It finds likely problems fast (clickable divs, missing labels, missing alt text, removed focus outlines, hand built modals that leave the page behind them scrollable or reachable, data views without loading or error handling, arbitrary values, custom buttons without hover or focus styles, static elements that look clickable, tight body line height, extra font families, harsh shadows, raised surfaces that vanish in dark mode, text over images without a scrim). It produces false positives and it cannot see layout, flow, or copy problems. Confirm each finding by reading the code, and never treat a clean scan as a pass.

## 3. Review each screen

Read the component code for each screen and walk through these questions. The scanner cannot answer them.

**Purpose and hierarchy**
- Is it obvious within a few seconds what this screen is for and what to do first?
- Is there exactly one primary action, placed where users look for it?
- Does visual weight match importance, or is everything equally loud?

**States** (see `data-display.md`, `actions-and-feedback.md`)
- What renders while loading, when empty, when filtered to nothing, on error?
- What happens with a 200 character name, a missing image, a null field, 1,000 rows?

**Actions and feedback**
- Does every button and form show pending, success, and failure?
- Can any action be fired twice?
- Are destructive actions confirmed or undoable?
- Where does the user land afterwards?
- With a dialog or sheet open, can the page behind it still scroll, be clicked, or be reached with Tab or a screen reader?

**Forms** (see `forms.md`)
- Visible linked labels? Correct input types and autocomplete?
- When and where do errors appear? Is input preserved?

**Layout and consistency** (see `layout-and-visual.md`)
- One left edge? Numbers right aligned? Spacing from the scale?
- Do similar things look and behave the same across screens (button order, date formats, terms)?
- Does it hold up at 360px?

**Navigation** (see `navigation.md`)
- Is the current location shown? Do refresh, back, and shared links work?

**Accessibility** (see `accessibility.md`)
- Keyboard reachable, visible focus, named controls, sufficient contrast?

**Next.js** (see `nextjs.md`, only if `next` is installed)
- Does each data route have a `loading.tsx` or a Suspense boundary, plus `error.tsx` and `not-found.tsx` above it?
- Is `"use client"` limited to small interactive components, not whole pages or layouts?
- Do Server Actions return field errors and keep input, show pending, and check permissions themselves?
- Are search, filters, sort, and page in the URL, and are titles set per route?
- Any hydration risks (dates, random values, browser storage read during render)?
- Auth decided on the server with no flash, and a return to the original page after sign in?

**Data layer** (see `mern-data-ux.md`)
- Is the list paginated on the server? Are API errors usable by the UI?

**Language**
- Are labels and messages plain, specific, and consistent? Any developer terms, raw errors, or placeholder text left in?

If you can run the app and have browser tools, also do the quick test at the end of `accessibility.md`. If you cannot, say so in the report.

## 4. Severity scale

- **Critical**: blocks a task or loses data. Examples: a form that clears on error, a delete with no confirmation, a flow that cannot be completed by keyboard, a screen that breaks on mobile.
- **High**: causes frequent errors, confusion, or abandonment. Examples: no loading or error state, placeholder only labels, submit can be double fired, no feedback after saving.
- **Medium**: slows users down or looks unprofessional. Examples: inconsistent alignment, unclear button labels, filters not kept in the URL, missing empty state.
- **Low**: polish. Examples: arbitrary spacing values, inconsistent date formats, decorative clutter.

Rate by impact on the user's task, not by how easy the fix is.

## 5. Report format

Keep the report short enough to act on. Group by severity, most severe first.

```markdown
# UX audit: [scope]

## Summary
[Two or three sentences: overall state, the most important problems, what was and was not checked.]

## Findings

### Critical
1. **[Short title]**
   Where: `src/pages/Orders.tsx:42`
   Problem: [what happens, from the user's point of view]
   Fix: [the specific change]

### High
...

### Medium
...

### Low
...

## What works well
[Brief. Only real strengths worth keeping.]

## Suggested order of work
[Numbered list. Group fixes that touch the same files.]
```

Rules for findings:
- Describe the effect on the user, not only the code smell. "Users on phones cannot reach the Save button" is more useful than "missing responsive classes".
- Give a file and line for each finding.
- When the same problem repeats across many files, report it once with the list of locations and propose a shared fix (for example a common `DataState` or `PageHeader` component).
- Do not pad the report. Ten real findings are better than forty trivial ones.

## 6. Fixing

- If the user asked only for an audit, deliver the report and ask which findings to fix.
- If the user asked to audit and fix, fix Critical and High first, in the order listed, then report what changed and what remains.
- Prefer fixing a pattern once in a shared component over patching each screen.
- Do not redesign what was not asked for. Keep the existing visual identity and correct the UX failures within it.
- After fixing, rerun the scanner and go through the done checklist in `SKILL.md`.
