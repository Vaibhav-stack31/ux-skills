# UX audit procedure

Use this when the user asks for a review, an audit, a polish pass, or says the app feels wrong.

## Contents
1. Scope
2. Run the scanner
3. Review each screen
4. Severity scale
5. Report format
6. Fixing

## 1. Scope

Find out what is being audited: the whole app, one flow, or specific files. If the user did not say and the app is large, start with the main flow (sign in, the home tab, the main list, the main create or edit form) and say that is what you did.

List the routes (the `app/` folder in Expo Router, or the navigator definitions) and the component behind each. That list is your checklist.

## 2. Run the scanner

```bash
node <skill-dir>/scripts/ux-scan.mjs <path-to-app-source>
```

Add `--json` for machine readable output. The scanner is a set of static heuristics. It quickly finds likely problems: pressables without roles or labels, small touch targets, `ScrollView` with `.map()`, lists without empty components, inputs without keyboard configuration or keyboard avoidance, disabled font scaling, the deprecated core `SafeAreaView`, text classes on `View`, hand built overlays that let taps, the screen reader, or Android back reach the screen behind them, `Modal` without `onRequestClose`, and data screens without loading or error handling. It produces false positives, and it cannot see layout, flow, or copy. Confirm each finding by reading the code, and never treat a clean scan as a pass.

## 3. Review each screen

Read the code for each screen and walk through these questions.

**Purpose and hierarchy**
- Is it clear within a few seconds what the screen is for?
- Is there one primary action, reachable by thumb?

**Layout** (see `layout-and-touch.md`)
- Safe areas handled once, top and bottom?
- One left edge, consistent screen padding, spacing from the scale?
- Does it survive a small phone and the largest font size?

**Touch and feedback** (see `feedback-and-states.md`)
- All targets at least 48? Pressed states on everything?
- Pending state on async actions? Double tap protected?

**States**
- Loading, empty, filtered empty, error with retry?
- What happens offline or on timeout? Is input ever lost?
- Long names, missing images, null fields, 1,000 rows?

**Lists** (see `lists-and-data.md`)
- Virtualized? Stable keys? Pagination with footer states?
- Pull to refresh on every screen that shows server data, including detail screens and dashboards on a plain ScrollView?
- Is a wide table being forced onto a phone?

**Forms** (see `forms-and-keyboard.md`)
- Visible labels? Right keyboard and autofill for each field? Return key flow?
- Can the user see the focused field and the submit button with the keyboard open? Can they dismiss the keyboard?

**Navigation** (see `navigation-and-gestures.md`)
- Native header and back gesture intact? Android back closes overlays first?
- With a modal or sheet open, can anything behind it be tapped, scrolled, or reached by the screen reader?
- Where does the user land after create, save, and delete?

**Accessibility** (see `accessibility.md`)
- Roles and labels, grouping, contrast, dark mode, reduced motion?

**Platform fit**
- Does anything behave like a web page (hover, tiny links, centered dialogs for everything, custom back buttons)?
- Are iOS and Android differences handled where they matter (keyboard behavior, ripple, back)?

**Language**
- Short, plain, specific labels and messages? Any raw errors or placeholder text?

Code review cannot confirm real device behavior. State clearly what needs checking on a device and list the steps from the quick test in `accessibility.md`.

## 4. Severity scale

- **Critical**: blocks a task or loses data. Examples: the keyboard covers the only submit button, content sits under the notch and cannot be tapped, a form clears on error, back is broken, a delete has no confirmation or undo.
- **High**: causes frequent errors or abandonment. Examples: tap targets too small, no loading or error state, no press feedback, `ScrollView` with `.map()` over large data, placeholder only labels, text clipped at large font sizes.
- **Medium**: slows users down or looks unprofessional. Examples: wrong keyboard type, no pull to refresh, missing empty state, inconsistent padding, primary action out of thumb reach.
- **Low**: polish. Examples: arbitrary spacing, mixed icon sizes, decorative clutter.

Rate by impact on the user's task, not by ease of fixing.

## 5. Report format

```markdown
# Mobile UX audit: [scope]

## Summary
[Two or three sentences: overall state, the most important problems, what was and was not checked, and what needs device testing.]

## Findings

### Critical
1. **[Short title]**
   Where: `app/(tabs)/orders.tsx:42`
   Problem: [what happens, from the user's point of view]
   Platforms: [iOS, Android, or both]
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

## Check on a device
[Short list of things that cannot be confirmed from code.]
```

Rules for findings:
- Describe the effect on the user: "On small iPhones the Save button is hidden behind the keyboard" is more useful than "missing KeyboardAvoidingView".
- Give a file and line for each finding.
- When the same problem repeats across many screens, report it once with the locations and propose a shared fix (a common `Screen` wrapper, `ListRow`, or `FormField` component).
- Do not pad the report.

## 6. Fixing

- If the user asked only for an audit, deliver the report and ask which findings to fix.
- If the user asked to audit and fix, fix Critical and High first, in order, then report what changed and what remains.
- Prefer one shared component fix over patching each screen.
- Do not add native dependencies (keyboard controller, bottom sheet, FlashList) without asking. They require a new native build and are the user's decision. Use what is installed, and recommend additions separately.
- Do not redesign what was not asked for. Keep the visual identity and fix the UX failures within it.
- After fixing, rerun the scanner and go through the done checklist in `SKILL.md`.
