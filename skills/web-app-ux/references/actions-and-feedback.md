# Buttons, feedback, dialogs, and errors

## Contents
1. Buttons
2. Loading feedback
3. Success feedback and toasts
4. Errors
5. Dialogs, sheets, popovers
6. Destructive actions and undo
7. Disabled and unavailable actions
8. Menus, tooltips, badges
9. Honest design

## 1. Buttons

### Hierarchy
Map importance to variant and keep the mapping the same across the app:

- `default` (filled): the one primary action of the view
- `outline` or `secondary`: other important actions
- `ghost`: low emphasis actions, toolbar and row actions, Cancel
- `destructive`: the confirming button of a destructive action. Use it inside the confirmation, not on the first click in a list where a red button on every row is alarming.
- `link`: navigation that sits inside text

One filled button per view. In a dialog, the dialog counts as its own view.

### Labels
- Verb plus noun, sentence case: "Create project", "Save changes", "Send invite", "Delete file".
- Avoid "Submit", "OK", "Yes", "Click here". The label should make sense if it is the only thing read.
- The same action has the same label everywhere.
- Keep labels to one to three words. If the label needs a sentence, the surrounding UI is not doing its job.

### Size and layout
- One size per context. Default size for page actions and forms, `sm` for dense toolbars and table rows.
- Minimum hit area 24 by 24px for pointer use and 44 by 44px on touch layouts. Icon buttons in dense tables can stay visually small if spacing around them prevents mis-taps.
- Icon plus label: icon first, `gap-2`, icon marked `aria-hidden="true"`.
- Icon only buttons need `aria-label` and should have a tooltip. Use icon only buttons solely for universally understood icons (close, search, more, edit, delete, copy). When in doubt, add the text.
- Button groups: `gap-2` between buttons. Order follows the placement rules in `forms.md`. Keep the order consistent across the app.
- On mobile, primary actions in forms and dialogs go full width (`w-full sm:w-auto`).
- Do not use a button for navigation or a link for an action. Navigation is an `<a>` or router `Link` (with `asChild` or `render` on the shadcn `Button`); actions are `<button>`.

### States
Every button needs: default, hover, focus visible, active, disabled, and pending. shadcn provides the first five. You add pending.

Each state must look different from the others:
- **Hover**: a small background shift (`hover:bg-primary/90`, `hover:bg-accent`). Hover never reveals the only copy of an action.
- **Focus visible**: a ring (`focus-visible:ring-2 focus-visible:ring-ring`), shown for keyboard focus only.
- **Active**: pressed slightly further than hover, so a click feels registered.
- **Disabled**: `disabled:opacity-50 disabled:pointer-events-none`, plus a reason nearby (see section 7).
- **Pending**: spinner and progressive label, as below.

A custom styled `<button>` or `role="button"` element that is not the project's `Button` must define hover, focus visible, and disabled styles itself.


```tsx
<Button disabled={isPending} onClick={save}>
  {isPending && <Spinner aria-hidden="true" />}
  {isPending ? "Saving..." : "Save changes"}
</Button>
```

Give the button a stable width if the label change would shift neighbors (`min-w-32`).

## 2. Loading feedback

You cannot know how long a request will take when writing the code, and it varies per user and connection. So do not choose the indicator by guessed duration. Choose it by what is loading. These four cases cover nearly everything:

1. **A content region loading for the first time** (table, list, cards, detail view, dashboard widget): a skeleton that matches the final layout.
2. **An action triggered by a control** (save, delete, toggle, send): pending state on that control. Spinner inside the button, progressive label ("Saving..."), disabled, same width. Nothing else on the page changes.
3. **Content that is already on screen and is being refetched** (page change, filter, sort, search, background refresh, return to a cached view): keep the existing content visible and dim it. No skeleton.
4. **A long job** (upload, import, export, report generation): a progress indicator with real information (percentage, step names, or "This usually takes about a minute"), and let the user leave and come back. Never block the whole screen on a long job.

Delay every skeleton and every standalone spinner by about 200ms. A fast response then shows no loader at all, and only a slow one shows the skeleton. Without the delay, the skeleton flashes on fast connections and the app feels slower than it is. Button pending states are the exception: show those immediately, because the user needs to know the click registered.

```tsx
// Renders nothing for the first 200ms, then fades the skeleton in.
// Tailwind v4: put the keyframes in the global CSS. v3: add them in tailwind.config.js.
// @keyframes delayed-in { from { opacity: 0 } to { opacity: 1 } }
export function Delayed({ children }: { children: React.ReactNode }) {
  return (
    <div className="opacity-0 [animation:delayed-in_150ms_ease-out_200ms_forwards]" aria-busy="true">
      {children}
    </div>
  );
}

if (isPending) return <Delayed><OrdersTableSkeleton /></Delayed>;
```

A CSS delay is preferable to a `setTimeout` with state because it needs no extra render and cannot leak. If the project already has a delayed loader helper, use that.

Skeleton rules:
- Match the final layout: same row height, column widths, avatar and text positions, and about as many rows as will fit (5 to 8 for a table). Nothing should jump when data arrives.
- Use a skeleton only for case 1. Never for refetches, and never for an action.
- If the shape of the content is unknown or very small, use a spinner instead, with an accessible name (`role="status"` and `aria-label="Loading"`), or `aria-hidden` when adjacent text already says what is happening.
- Do not show a skeleton and a spinner together.
- Give every request a timeout. A skeleton that never resolves must become an error with retry.

Aim to respond within about 400ms. Below that, the app feels like it keeps pace with the user; anything that can take longer gets one of the patterns above. Do not add artificial delays to make something feel more substantial.

Load the page shell (navigation, header, title) immediately and load data regions independently, so one slow request does not hold back the whole screen.

Optimistic updates: for actions that almost always succeed and are easy to reverse (toggle, like, rename, reorder, mark as done), update the UI immediately and roll back with a message on failure. Do not use optimistic updates for payments, deletes without undo, or anything where a brief false success is harmful. Implementation is in `mern-data-ux.md`.

## 3. Success feedback and toasts

Every completed action needs a visible result. Choose the lightest feedback that is noticeable:

1. The change itself is visible where the user is looking (the row appears, the toggle flips): no extra message needed.
2. Inline confirmation next to the control ("Saved" beside the button, fading after a few seconds): good for settings.
3. Toast (sonner): for results that are not visible in place, such as after navigation or a background action.
4. Full confirmation screen: for significant completions (order placed, account created).

Toast rules:
- Short: one line, past tense ("Invite sent"). Optional one action such as "Undo" or "View".
- Auto dismiss after about 4 to 6 seconds; longer when there is an action. Pausing on hover is standard in sonner.
- Do not use a toast for form validation errors, for anything the user must act on, or for information they need to refer back to. A toast disappears; those messages belong inline.
- Do not stack several toasts for one action.
- Position consistently, away from primary controls (bottom right on desktop, top or bottom center on mobile).

## 4. Errors

Place the error as close as possible to its cause:

- **Field errors**: under the field. See `forms.md`.
- **Action errors** (a save or delete failed): toast with the reason and a "Retry" action when the user is no longer looking at the control, or inline next to it when they are.
- **Section errors** (one panel failed to load): an inline alert inside that panel with a "Try again" button. The rest of the page keeps working.
- **Page errors** (the main resource failed): a full region message with retry and a way out.
- **Unexpected render errors**: a React error boundary per route, and ideally per major panel, so one broken widget does not blank the app.

Message content:
1. What happened, in plain words: "Could not save your changes."
2. Why, if known and useful: "The connection was lost."
3. What to do: "Check your connection and try again." plus a button.

Never show raw error objects, stack traces, status codes alone, or "Something went wrong" with no next step. Never show `undefined`, `null`, `NaN`, or `[object Object]`.

Specific cases every app needs:
- **404**: a page that says the item does not exist or was removed, with a link back to the list.
- **403**: say the user does not have access and who to ask. Do not show a blank page or a login loop.
- **401 or expired session**: send to login and return to the same URL afterward. Preserve unsaved input when possible.
- **Offline**: detect it, say so, and retry automatically when the connection returns.
- **409 conflict**: "This was changed by someone else", with options to reload or overwrite.
- **429**: "Too many attempts. Try again in a minute."

```tsx
function PanelError({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
  return (
    <Alert variant="destructive" role="alert">
      <AlertCircle aria-hidden="true" />
      <AlertTitle>Could not load orders</AlertTitle>
      <AlertDescription>
        {error.message}
        <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      </AlertDescription>
    </Alert>
  );
}
```

## 5. Dialogs, sheets, popovers

Overlays interrupt. Use them only when interruption is the point.

- **Dialog**: a short, focused task that must be finished or dismissed before continuing (confirm, quick create with up to about five fields).
- **AlertDialog**: a decision the user must make, mainly destructive confirmations. It does not close on outside click.
- **Sheet** (side panel): longer forms, details, or filters while keeping the page context.
- **Popover**: small non blocking controls attached to a trigger (date picker, filter options).
- **Full page**: anything long, multi step, or worth linking to.

Rules:
- A dialog has a title that names the task, an obvious close button, and closes on Escape. Radix and Base UI handle focus trapping and focus return; do not break them by rendering custom overlays.
- A modal (Dialog, AlertDialog, Sheet, Drawer) blocks the page behind it until it closes:
  - **Scroll is locked.** The page behind does not scroll, on wheel, touch, or keyboard. The lock keeps the scrollbar gap so the page does not shift sideways.
  - **Clicks are blocked.** A backdrop covers the whole viewport and catches every click and tap, so nothing behind it can be pressed. Clicking the backdrop either closes the dialog or does nothing (AlertDialog); it never reaches the page.
  - **Keyboard and screen readers are blocked.** Everything outside the modal is `inert` (or `aria-hidden` plus a focus trap), and the dialog has `role="dialog"` with `aria-modal="true"`. Tab never lands behind the backdrop.
  - **Everything is restored on close.** Scroll unlocks at the same position, `inert` is removed, and focus returns to the trigger.
- Radix and Base UI Dialog, AlertDialog, and Sheet, and the vaul `Drawer` in shadcn, do all of this. A native `<dialog>` blocks clicks, keyboard, and screen readers only when opened with `showModal()`, not `show()` or the `open` attribute, and it never locks scroll, so add `html:has(dialog:modal) { overflow: hidden; }`. A hand built overlay must do all four itself; prefer replacing it with the project's `Dialog`.
- Popovers, dropdowns, tooltips, and toasts are non modal. They leave the page usable, so do not lock scroll or add a full screen backdrop for them.
- Do not open a dialog from a dialog. Replace the content or move the flow to a page.
- Do not show a dialog on page load without being asked (welcome modals, promos).
- Content taller than the viewport scrolls inside the dialog body while the title and footer stay visible.
- On mobile, dialogs become near full screen or a bottom sheet (`Drawer`), with buttons stacked full width.
- Closing a dialog with unsaved input asks for confirmation, or keeps the draft.
- If the dialog content is worth sharing or returning to, drive it from the URL.

## 6. Destructive actions and undo

Choose by cost of the mistake:

- **Cheap and reversible** (archive, remove from list, mark done): do it immediately and show a toast with "Undo". This is faster and safer than a confirmation, because people click through confirmations by habit. Implement with soft delete or a delayed commit.
- **Costly or irreversible** (delete project, remove member, cancel subscription): `AlertDialog` with specific wording.
- **Catastrophic** (delete workspace, drop data): require typing the resource name to enable the confirm button.

Confirmation wording:
- Title names the action and the object: "Delete project Apollo?"
- Body states the consequence: "This permanently deletes 42 tasks and 3 files. This cannot be undone."
- Buttons name the outcome: "Cancel" and "Delete project". Never "Yes" and "No", and never "OK".
- Default focus on Cancel.

```tsx
<AlertDialog open={open} onOpenChange={setOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete project {project.name}?</AlertDialogTitle>
      <AlertDialogDescription>
        This permanently deletes {project.taskCount} tasks. This cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel disabled={del.isPending}>Cancel</AlertDialogCancel>
      <Button variant="destructive" disabled={del.isPending} onClick={() => del.mutate(project.id)}>
        {del.isPending ? "Deleting..." : "Delete project"}
      </Button>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

Never use `window.confirm` or `window.alert`. They cannot be styled, block the thread, and are suppressed in some contexts.

## 7. Disabled and unavailable actions

- A disabled control must explain itself. Add helper text nearby or a tooltip on a focusable wrapper ("You need admin access to delete").
- If an action is never available to this user, hide it. If it is temporarily unavailable, disable it with the reason.
- Disabled elements are skipped by keyboard focus and often have low contrast, so users may not even discover them. Prefer leaving a button enabled and explaining on click when the reason is something the user can fix.
- Use `aria-disabled="true"` instead of `disabled` when the control should stay focusable so its explanation can be read.

## 8. Menus, tooltips, badges

- **Dropdown menus**: up to about seven items, grouped with separators, most used first, destructive last. Items are verbs. Show keyboard shortcuts when they exist.
- **Tooltips**: supplementary only. Never the only place for information the user needs, because they do not appear on touch and are slow to discover. Required for icon only buttons. Do not put interactive content in a tooltip; use a popover.
- **Badges**: for status and counts. Use a small fixed vocabulary of statuses with consistent colors across the app, always with a text label. A badge is not a button; if it is clickable, style it as one.
- **Tabs**: for switching between views of the same object at the same level. Two to six tabs, short labels, active tab reflected in the URL. Do not use tabs as steps in a process.
- **Accordions**: for content most users will not need. Do not hide primary content in them.

## 9. Honest design

Interfaces can exploit predictable biases in how people decide. Do not.

- **No preselected opt ins.** Marketing, data sharing, paid add ons, and consent checkboxes start unchecked.
- **No confirmshaming.** The decline option is a plain, neutral label ("No thanks", "Not now", "Skip"), never guilt ("No, I don't want to save money"). It is visible and easy to hit, not a faint text link hidden under the primary button.
- **No hidden costs.** Show the full price, including fees, taxes, and renewal terms, before the final step.
- **No fake urgency or scarcity.** Countdown timers, "Only 2 left", and "12 people are viewing this" appear only when true.
- **Leaving is as easy as joining.** Cancelling, unsubscribing, and deleting an account take no more steps than signing up, and do not require a phone call or a chat.
- **No disguised content.** Ads, sponsored items, and upsells are labelled as such and do not look like the user's own data or the app's controls.
- **Important messages look important, not promotional.** Warnings and required actions appear inline next to what they affect, in the normal UI style. Content that looks like a banner or an ad gets ignored.
