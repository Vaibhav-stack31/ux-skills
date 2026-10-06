# Layout, alignment, and visual system

## Contents
1. Spacing
2. Alignment
3. Typography
4. Color
5. Page structure
6. Responsive behavior
7. Overflow and long content
8. Things to avoid

## 1. Spacing

Use the Tailwind scale only (multiples of 4px). Arbitrary values such as `p-[13px]` are almost always a sign that something else is misaligned.

Spacing communicates grouping. Items that belong together sit closer than items that do not. A reliable ladder:

- 4 to 8px (`gap-1`, `gap-2`): inside a control, icon to label, label to input
- 12 to 16px (`gap-3`, `gap-4`): between related fields or items in a group
- 24 to 32px (`gap-6`, `gap-8`): between groups or cards
- 48 to 64px (`gap-12`, `gap-16`): between page sections

The space inside a group must be smaller than the space around it. If a label is as far from its own input as from the previous input, the form reads as a wall.

Prefer `gap-*` on a flex or grid parent over margins on children. It keeps spacing consistent when items are added, removed, or conditionally rendered, and avoids stray margins on the first or last item.

Padding inside containers: cards and panels `p-4` on mobile, `p-6` from `md` up. Page gutters `px-4 sm:px-6 lg:px-8`.

## 2. Alignment

- Pick one left edge per section and put the heading, description, fields, and buttons on it. Mixed indents are the most common reason a screen "looks off".
- Left align body text, labels, and form fields. Centered paragraphs and centered forms are harder to scan because each line starts at a different x position.
- Center only short standalone content: empty states, auth cards, confirmation screens.
- Right align numeric columns and use `tabular-nums` so digits line up.
- In a row of mixed items, align vertically with `items-center` for controls and `items-baseline` for text of different sizes.
- Icon next to text: `inline-flex items-center gap-2`. Match icon size to text: 16px (`size-4`) with `text-sm`, 20px (`size-5`) with `text-base`. Add `shrink-0` to icons so long labels do not squash them.
- Buttons in a row share the same height. Do not mix `size="sm"` and default in one group.
- In grids of cards, make the cards equal height (`grid` does this by default) and pin card actions to the bottom with `flex flex-col` and `mt-auto`.

## 3. Typography

Limit the set. A typical app screen needs four sizes and two weights:

- `text-2xl font-semibold tracking-tight`: page title (one `h1` per page)
- `text-lg font-semibold` or `text-base font-medium`: section titles
- `text-sm`: default for dense app UI (tables, forms, navigation)
- `text-xs text-muted-foreground`: metadata only, never for content the user must read
- `text-base`: long form reading content

Rules:
- Never go below 12px. Avoid `text-[10px]` and `text-[11px]`.
- Inputs must render at 16px or larger on mobile or iOS Safari zooms the page on focus. shadcn's `Input` uses `text-base md:text-sm` for this reason; keep it.
- Keep reading text to 45 to 75 characters per line: `max-w-prose` or `max-w-2xl`.
- Hierarchy comes from size, weight, and color together. Use `text-muted-foreground` for secondary text instead of making it smaller.
- Use `text-balance` on headings and `text-pretty` on paragraphs to avoid orphaned words.
- Sentence case for headings, buttons, and labels ("Create project"). Avoid ALL CAPS except very short overline labels with letter spacing.
- Use `font-medium` for emphasis in UI. Reserve `font-bold` for rare cases.

## 4. Color

- Use semantic tokens: `bg-background`, `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border`, `bg-primary text-primary-foreground`, `bg-destructive`, `ring`. They adapt to dark mode and to theme changes. Raw palette classes (`bg-blue-500`, `text-gray-400`) do not.
- One accent color for primary actions and selected states. If everything is colored, nothing stands out.
- Status colors (success, warning, error, info) always come with an icon or text label. About 1 in 12 men cannot reliably tell red from green.
- Contrast: 4.5:1 for normal text, 3:1 for large text (24px, or 18.66px bold) and for UI boundaries such as input borders and icons that carry meaning. `text-muted-foreground` on `bg-muted` is a common failure, so check it.
- Do not use opacity to make text lighter over varying backgrounds; contrast becomes unpredictable.
- If the project supports dark mode, every new color must work in both. Tokens make this automatic.
- Borders and dividers: one border color, 1px. Prefer spacing over lines; add a divider only when spacing alone does not separate groups.
- Shadows: one or two elevation levels. Use shadow for things that float (popovers, dialogs, dropdowns), not for every card.
- Radius: use the project's `rounded-*` token consistently. A nested element's radius should be smaller than its container's.

## 5. Page structure

A consistent page skeleton removes most layout decisions:

```tsx
<main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
  <header className="flex flex-wrap items-start justify-between gap-4">
    <div className="min-w-0">
      <h1 className="text-2xl font-semibold tracking-tight text-balance">Projects</h1>
      <p className="text-sm text-muted-foreground">Everything your team is working on.</p>
    </div>
    <Button>
      <Plus aria-hidden="true" /> New project
    </Button>
  </header>

  <section className="mt-6">{/* toolbar: search, filters */}</section>
  <section className="mt-4">{/* content */}</section>
</main>
```

- Title on the left, primary action on the top right, where users look for it. On narrow screens it wraps under the title because of `flex-wrap`.
- Choose a max width by content type: forms and reading `max-w-2xl`, settings `max-w-3xl`, dashboards and tables `max-w-6xl` or `max-w-7xl`. Full bleed text on a wide monitor is unreadable.
- Put the most important content in the top left region; people scan in an F pattern.
- Do not wrap everything in cards. A card is for a self contained unit among siblings. A single form on a page does not need a card, and cards inside cards add borders without adding meaning.
- Dashboards: lead with the two to four numbers that matter, then the list that needs attention. Do not fill space with charts nobody asked for.

## 6. Responsive behavior

Write the mobile layout first with no prefix, then add `sm:`, `md:`, `lg:` for wider screens.

- Check 360px (small phone), 768px (tablet), 1280px (laptop).
- Grids: `grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3`. For cards with unknown counts use `grid-cols-[repeat(auto-fill,minmax(16rem,1fr))]`.
- Toolbars: `flex flex-wrap items-center gap-2` so controls wrap instead of overflowing.
- Sidebars collapse into a `Sheet` below `lg`. See `navigation.md`.
- Tables need a deliberate mobile plan. See `data-display.md`.
- Use `min-h-dvh` or `h-dvh`, not `h-screen`. On mobile browsers `100vh` is taller than the visible area and hides content under the browser bar.
- Touch targets on touch layouts should be at least 44 by 44px. Small controls can keep their visual size and gain a larger hit area with padding.
- Hover is not available on touch. Never hide an action or information behind hover only.
- Use container queries (`@container` with `@md:` variants) for components that live in both wide and narrow slots, such as a card that appears in a sidebar and in a main column.
- Sticky elements (table headers, save bars) need a solid background and a z-index from a small fixed set, for example 10 for sticky, 40 for overlays, 50 for dialogs.

## 7. Overflow and long content

Sample data is short. Real data is not. Decide for every text slot what happens when the value is long.

- Single line truncation: `truncate` on the text element. Inside a flex row the parent of that text needs `min-w-0`, otherwise the text refuses to shrink and pushes the layout wide. This is the most common overflow bug.
- Multi line clamp: `line-clamp-2` for descriptions in cards and lists.
- Truncated text needs a way to see the full value: a `title` attribute, a tooltip, or a detail view.
- Long unbroken strings (URLs, emails, ids): `break-all` or `break-words`.
- Never truncate values that users compare or copy (amounts, ids, dates). Give those columns enough width and truncate the name column instead.
- Missing values: show a muted placeholder such as "None" or a hyphen, not an empty cell.
- Dates: one format across the app. Relative time ("3 hours ago") for recent items with the absolute date in a `title`; absolute dates for anything older than a week.
- Numbers: format with `Intl.NumberFormat`, including currency and compact notation for large counts.
- Images and avatars: fixed aspect ratio (`aspect-square`, `aspect-video`), `object-cover`, and a fallback (initials or icon) when the image is missing or fails.

## 8. Things to avoid

These are the visual habits that make an interface read as machine generated and get in the way of use:

- Purple to blue gradients, glass blur panels, glow shadows
- Emoji as icons or in headings
- A hero section with a tagline on an internal tool screen
- Every section inside a card, with an icon in a tinted circle on top
- Badges and pills on everything; pulsing "live" dots without live data
- Three stat cards with invented metrics above the real content
- Centered everything
- Text that repeats what the heading already says
- Animations on page load that delay access to content

If the user asks for a specific look, follow it. Otherwise default to plain, dense enough, and quiet.
