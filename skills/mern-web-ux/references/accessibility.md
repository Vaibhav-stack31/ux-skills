# Accessibility

Accessibility here is not a separate feature. Most of these rules also fix keyboard use, mobile use, and general clarity for everyone. The target is WCAG 2.2 level AA.

## Contents
1. Semantics
2. Keyboard and focus
3. Names and labels
4. Contrast and color
5. Target size
6. Dynamic updates
7. Motion
8. Zoom and reflow
9. Quick test

## 1. Semantics

Use the element that already means what you need. Native elements bring keyboard support, focus, and screen reader roles without extra code.

- Actions: `<button>`. Navigation: `<a href>`. Never a clickable `div` or `span`.
- Landmarks: one `<header>`, one `<nav>` per navigation region (labelled with `aria-label` if there are several), one `<main>`, optional `<aside>` and `<footer>`.
- Headings: one `h1` per page, then `h2`, `h3` in order without skipping levels. Choose heading level by structure and set the size with classes.
- Lists of things: `ul` or `ol` with `li`. Key value pairs: `dl`. Tabular data: `table` with `th scope="col"`.
- Forms: `<form>`, `<label>`, `<fieldset>` and `<legend>` for groups of radios or checkboxes.
- Use ARIA only when no native element fits. An incorrect role is worse than none.
- shadcn components built on Radix or Base UI already implement the correct roles and keyboard behavior for dialogs, menus, tabs, selects, and comboboxes. Use them instead of building these from `div`s.

## 2. Keyboard and focus

- Everything that works with a mouse works with Tab, Shift+Tab, Enter, Space, Escape, and arrow keys where appropriate.
- Focus is always visible. Never remove the outline without a replacement: pair any `outline-none` with `focus-visible:ring-2 focus-visible:ring-ring` or the project's equivalent. The focus indicator needs 3:1 contrast against its surroundings.
- Tab order follows the visual order. Do not use positive `tabIndex` values. Use `tabIndex={0}` only on custom interactive elements and `tabIndex={-1}` for elements that receive focus by script.
- Dialogs trap focus while open and return it to the trigger on close. Menus and popovers close on Escape.
- After a route change, move focus to the main heading or the `main` element. After deleting an item, move focus to the next item or the list heading, not to the top of the document.
- Provide a skip link:

```tsx
<a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:ring-2 focus:ring-ring">
  Skip to content
</a>
```

- Content that appears on hover must also appear on focus and be dismissible with Escape.
- Sticky headers must not cover the focused element; add `scroll-mt-*` or `scroll-padding-top` where needed.

## 3. Names and labels

- Every input has a `<label>` linked by `htmlFor` and `id`. If a visible label is truly impossible (a search box with an icon), use `aria-label`.
- Icon only buttons need `aria-label` that names the action and, in repeated rows, the object: `aria-label="Delete invoice INV-204"`.
- Decorative icons get `aria-hidden="true"`.
- Images that convey information need `alt` text describing the content. Decorative images use `alt=""`. An avatar next to the person's name is decorative.
- Help text and error messages are linked to the input with `aria-describedby`. Invalid inputs have `aria-invalid="true"`.
- Required fields have the `required` attribute or `aria-required="true"` in addition to any visual marker.
- The accessible name starts with the visible text, so voice control users can say what they see.
- Set `lang` on the `html` element.

## 4. Contrast and color

- Normal text: 4.5:1 against its background. Large text (24px, or 18.66px bold): 3:1.
- UI components and meaningful graphics (input borders, icons, focus rings, chart lines): 3:1.
- Placeholder text also needs 4.5:1 if it carries information, which is another reason not to rely on it.
- Disabled controls are exempt, but should still be distinguishable.
- Never use color as the only signal. Errors have an icon or text, links in body text are underlined, statuses have labels, charts use patterns or direct labels.
- Check both light and dark themes.

## 5. Target size

- Minimum 24 by 24 CSS pixels for any pointer target (WCAG 2.2 AA), including spacing around small targets.
- Aim for 44 by 44 on touch layouts. A 16px icon button needs padding to reach that.
- Keep at least 8px between adjacent targets so the wrong one is not hit.
- Make the label of a checkbox or radio clickable, not only the box.

## 6. Dynamic updates

Screen readers do not notice visual changes unless told.

- Toasts: Sonner announces them through a live region. Do not put critical information only in a toast.
- Form errors that appear after submit: render the summary or the first error with `role="alert"`.
- Async results ("12 results", "Saved"): a visually hidden `aria-live="polite"` region that receives the text.
- Loading regions: `aria-busy="true"` while loading.
- Do not move focus unexpectedly. Changing a select or typing in a field must not navigate or submit by itself.
- Session timeouts warn the user and allow extending.

## 7. Motion

- Keep transitions short (150 to 250ms) and purposeful: showing where something came from or went.
- Respect reduced motion. Tailwind: `motion-safe:animate-*` and `motion-reduce:transition-none`. Large movement, parallax, and auto playing animation must stop under `prefers-reduced-motion`.
- Nothing flashes more than three times per second.
- Auto advancing carousels and auto dismissing content need a pause control, or should not auto advance.

## 8. Zoom and reflow

- The page works at 200% browser zoom and at 320px width without horizontal scrolling of the page (data tables may scroll within their own container).
- Use `rem` based sizes (Tailwind's defaults) so text scales with the user's font size setting.
- Do not disable pinch zoom (`user-scalable=no` or `maximum-scale=1` in the viewport meta tag).
- Containers must grow with their text. Avoid fixed heights on anything that holds text.

## 9. Quick test

When you can run the app, or when describing what the user should check:

1. Put the mouse away. Tab through the whole screen. Can you see where you are, reach everything, operate everything, and get out of every dialog?
2. Zoom the browser to 200%. Does anything overlap or get cut off?
3. Narrow the window to 360px. Any sideways scrolling?
4. Read only the headings and the button and link labels. Do they make sense out of context?
5. Run an automated check (axe DevTools or Lighthouse). It finds roughly a third of issues, so it complements the steps above and does not replace them.
