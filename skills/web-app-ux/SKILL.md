---
name: web-app-ux
description: UX quality rules for React web UIs, covering plain React, MERN stack, and Next.js apps (React, Next.js, Tailwind CSS, shadcn/ui, Express, MongoDB). Use this whenever building, editing, restyling, or reviewing any web UI, including pages, dashboards, forms, tables, lists, cards, buttons, modals, navigation, layout, alignment, spacing, loading and error states, responsive behavior, or accessibility. Also use it when the user asks to audit, review, polish, or fix UX or UI, says something looks off, misaligned, cluttered, or "AI generated", or asks for any frontend feature even if they never mention UX. Not for React Native apps (use react-native-ux for those).
---

# Web App UX

Generated UI usually looks finished and still fails real users. The reason is consistent: it is built for the happy path with perfect sample data. Real users arrive with zero records or ten thousand, slow networks, long names, small screens, keyboards, and mistakes. This skill exists so that every screen you build or review survives those conditions.

Treat the rules here as the way a senior product designer would review your work. Where a rule gives a reason, use the reason to judge cases the rule does not cover.

## 1. Choose the mode

- **Build mode**: the user wants new UI or changes to existing UI. Follow sections 2 to 5, then run the done checklist in section 6.
- **Audit mode**: the user wants a review, or says something feels wrong. Read `references/audit.md` and follow it. It includes a scanner script and a report format.
- **Audit and fix**: audit first, report findings, then fix in severity order.

## 2. Read the project before writing UI

Consistency with the app that already exists matters more than any ideal pattern, because users learn an interface once and expect it to behave the same everywhere. Before writing code, check:

- `components.json` and the `components/ui` folder: which shadcn/ui components are installed, and whether the base is Radix or Base UI. Run `npx shadcn@latest info` when available.
- `package.json`: whether `next` is installed and which version. In a Next.js project read `references/nextjs.md` first, then check whether it uses the App Router (`app/` folder) or the Pages Router (`pages/` folder). Also check the Tailwind version (v4 configures tokens in CSS with `@theme`, v3 uses `tailwind.config.js`), router, data layer (TanStack Query, SWR, RTK Query, plain fetch), form library, toast library.
- The global CSS file: the color, radius, and font tokens that already exist.
- Two or three existing pages: how they do page headers, spacing, forms, tables, and empty states. Copy those patterns.

shadcn/ui changes often. When unsure about a component's API, run `npx shadcn@latest docs <component>` or read the file in `components/ui` instead of trusting memory. Prefer an installed component over hand rolled markup. Newer installs include `Field`, `Empty`, `Spinner`, `Item`, `InputGroup`, and `ButtonGroup`; older ones use `Form`, `FormField`, and `FormMessage`. Use whichever the project has.

If the project does not use shadcn/ui or Tailwind, the UX rules still apply. Express them with whatever the project uses.

## 3. Think through the screen before coding

Answer these in a few lines before writing JSX. Skipping this step is the main cause of screens that look fine and work badly.

1. Who uses this screen, and what is the one job they came to do?
2. What is the single primary action?
3. What data appears, and what does it look like at 0 items, 1 item, and 1,000 items? What is the longest realistic value for each text field?
4. What can fail (network, validation, permissions, conflicts), and what does the user see and do in each case?
5. Where does the user land after success?
6. How does it work at 360px wide, and with only a keyboard?

If the answers depend on product decisions you cannot infer from the code or the request, ask the user instead of guessing.

## 4. The ten rules

These apply to every screen. Each one targets a failure that generated UI makes repeatedly.

1. **Every data view handles five states**: loading, empty, error, overflow (long text, many items, missing fields), and success. A screen that only renders the success state is unfinished.
2. **Every action gives feedback**: acknowledge within 100ms, show pending state on the control that was used, block double submission, and confirm success or explain failure. Silence after a click reads as "broken".
3. **One primary action per view.** One filled button. Everything else is outline, ghost, or inside a menu. Several loud buttons means the user has to do the prioritizing you skipped.
4. **Forgive mistakes.** Offer undo for cheap reversible actions, confirm destructive ones with specific wording, keep form input after a failed submit, and warn before discarding unsaved changes.
5. **Use the token system.** Spacing from the scale, colors from semantic tokens (`bg-background`, `text-muted-foreground`, `border`, `primary`, `destructive`), a small set of text sizes. One-off values like `mt-[13px]` or `bg-blue-500` in a tokenized project create visual noise and break dark mode.
6. **Align to shared edges.** Content in a section shares one left edge. Text is left aligned, numbers are right aligned, and centered text is reserved for short standalone moments such as empty states.
7. **Keyboard and screen reader operable.** Real `<button>` and `<a>` elements, visible focus, labels on every input, accessible names on icon buttons.
8. **Responsive from 360px up.** Design mobile first. Nothing scrolls sideways except content inside an intentional scroll container.
9. **Shareable state lives in the URL.** Filters, search, sort, page, and active tab should survive refresh, back, and link sharing.
10. **Restraint.** No gradients, glass effects, emoji, pulsing badges, or landing page heroes on a working screen unless the user asked for them. A scrim behind text on an image is not decoration, and restraint never means hiding what the user needs to decide. Decoration that does not help the task competes with the content that does.

Write copy in plain language: buttons are a verb plus a noun ("Create project", not "Submit"), and error messages say what happened and what to do next.

## 5. Read the reference for what you are building

Read only what the task needs. Each file is self contained.

- `references/nextjs.md`: how the rules are met in Next.js (route files for states, Server Actions for forms, URL state, auth). Read this first in any Next.js project.
- `references/layout-and-visual.md`: spacing, alignment, typography, color, depth and dark mode, signifiers (what looks clickable), page structure, responsive layout, text over images. Read for any new page or when something "looks off".
- `references/forms.md`: field layout, labels, validation timing, error messages, submit behavior, input types. Read for any form, including small ones in dialogs.
- `references/data-display.md`: tables, lists, cards, pagination, sorting, filtering, search, empty states. Read for anything that renders a collection.
- `references/actions-and-feedback.md`: buttons, loading patterns, toasts, dialogs, destructive actions, undo, error display. Read for any interactive flow.
- `references/navigation.md`: app shell, sidebar, breadcrumbs, tabs, links versus buttons, mobile nav, redirects after actions.
- `references/accessibility.md`: semantics, focus, contrast, target size, motion, announcements.
- `references/mern-data-ux.md`: how the Express and MongoDB side must behave so the UI can be good (pagination, error shape, optimistic updates, search). Read when touching API routes or data fetching.
- `references/audit.md`: review procedure, severity scale, report template, scanner usage.
- `references/ux-laws.md`: the 30 Laws of UX mapped to the rules in this skill, plus how to resolve the places where they pull in different directions. Read when a principle is named or a design decision needs a reason.

## 6. Done checklist

Check every item against the code before saying the work is complete. If an item does not apply, skip it; if it applies and fails, fix it.

**States**
- [ ] First load shows a skeleton that matches the final layout, delayed about 200ms; refetches keep the old content visible; actions show pending on the control
- [ ] Empty state explains what belongs here and offers the next action
- [ ] "No results" for filters or search is different from "nothing created yet" and offers a way to clear
- [ ] Error state says what went wrong and offers retry
- [ ] Long text truncates or wraps on purpose; missing values show a placeholder, never `undefined` or blank gaps

**Actions**
- [ ] One primary button per view; labels are verb plus noun
- [ ] Submit and mutation buttons show pending state and cannot be double fired
- [ ] Success is confirmed (toast, inline message, or visible change) and the user lands somewhere sensible
- [ ] Destructive actions use a confirmation with specific wording, or provide undo
- [ ] Values and statuses use the user's words, not enums or internal names
- [ ] No up front tours; significant flows end on a completion screen; unfinished work is easy to resume
- [ ] Buttons show distinct hover, active, focus visible, disabled, and pending states
- [ ] Clickable things look clickable (button styling, underlined links, hover and pointer on clickable rows); static things do not

**Forms**
- [ ] Every input has a visible label that is linked to it
- [ ] Correct `type`, `inputMode`, and `autoComplete`
- [ ] Errors appear next to the field, in plain language, and input is preserved
- [ ] Nothing asked that the app already knows; long forms in steps of three to six fields with "Step N of M" and a review step
- [ ] No preselected opt ins, no guilt wording on decline options, full price shown before the last step

**Layout**
- [ ] Shared left edge; numbers right aligned with `tabular-nums`
- [ ] Spacing and colors come from tokens; no arbitrary values
- [ ] One focal point per view; every color has a role, and interactive states are shades of the same accent
- [ ] One sans-serif font family; body text at about 1.5 line height, tighter only on headings; tracking tightened only on large headings
- [ ] Raised surfaces use lighter tokens (`bg-card`, `bg-popover`) and a border, so depth shows in dark mode; light mode shadows are soft
- [ ] Text over an image has a gradient scrim or blurred backing and passes 4.5:1
- [ ] Works at 360px, 768px, and 1280px with no page level horizontal scroll

**Access**
- [ ] Everything reachable and operable by keyboard with visible focus
- [ ] Open modals block the page behind them: scroll locked, clicks caught by the backdrop, background `inert`, focus trapped and returned on close
- [ ] Icon only buttons have `aria-label`; images have `alt`
- [ ] Text contrast at least 4.5:1; meaning never carried by color alone

When reporting completed work, state in one or two lines which states and edge cases you handled, and anything you could not verify without running the app.
