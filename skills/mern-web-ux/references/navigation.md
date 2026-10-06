# Navigation and app structure

## Contents
1. App shell
2. Showing where the user is
3. Links versus buttons
4. Tabs, breadcrumbs, back
5. Mobile navigation
6. Where users land after actions
7. Routes every app needs

## 1. App shell

- **Sidebar** for apps with more than about five destinations or with grouped sections. **Top bar** for apps with two to five destinations.
- Keep navigation in the same place with the same items on every page. Navigation that changes between pages forces users to relearn it.
- Order items by frequency of use, not alphabetically. Group related items under short headings.
- Each item has an icon and a text label. Icon only navigation is acceptable only as a collapsed state with tooltips.
- Account, settings, and sign out live in a user menu, conventionally at the bottom of the sidebar or the top right.
- Limit depth to two levels in the sidebar. Deeper structure belongs inside the page (tabs, sub pages).
- Add a "Skip to content" link as the first focusable element (see `accessibility.md`).
- The main content area scrolls; the shell stays fixed.

## 2. Showing where the user is

- The active navigation item is visibly different (background and weight, not color alone) and has `aria-current="page"`. With React Router use `NavLink` and its `isActive` state. In Next.js see `nextjs.md` section 8.
- A parent item stays highlighted while the user is on its child pages.
- Every page has one `h1` that matches the navigation label that led to it.
- Set `document.title` per route in the form "Page name | App name". Tabs and history entries named only "App" are unusable.
- On route change, move focus to the page heading or main region and scroll to the top, unless the user navigated back, in which case restore scroll.

## 3. Links versus buttons

- Going somewhere is a link: `<Link to>` or `<a href>`. It supports open in new tab, copy link, and middle click.
- Doing something is a `<button>`.
- A link that should look like a button uses the button styles on the link element (`<Button asChild><Link to="/new">New project</Link></Button>` with Radix, or the `render` prop with Base UI).
- Never use `<a href="#">` or an `onClick` on a `div` for either purpose.
- External links open in the same tab unless leaving would lose work. If they open a new tab, indicate it with an icon and add `rel="noreferrer"`.
- Link text describes the destination: "View invoice INV-204", not "Click here".

## 4. Tabs, breadcrumbs, back

- **Tabs** switch views inside one page. Reflect the active tab in the URL so refresh and sharing work.
- **Breadcrumbs** when the hierarchy is three or more levels deep. Each ancestor is a link; the current page is plain text with `aria-current="page"`. Collapse the middle on mobile.
- **Back links** on detail pages go to the logical parent ("Back to orders") and restore the list's previous filters, page, and scroll position. Do not rely only on `history.back()`, because the user may have arrived from a shared link.
- The browser back button must always work. Never trap it, and make sure it closes an open dialog or sheet if that dialog was opened via a route.

## 5. Mobile navigation

- Below `lg`, replace the sidebar with a menu button that opens a `Sheet`. The button has `aria-label="Open menu"` and the sheet closes after a destination is chosen.
- If the app has three to five top level destinations and is used heavily on phones, a fixed bottom tab bar is easier to reach than a hamburger menu.
- Keep the page title and the primary action visible in the top bar.
- Tap targets at least 44px tall with 8px or more between them.
- Account for the safe area with `pb-[env(safe-area-inset-bottom)]` on fixed bottom bars.

## 6. Where users land after actions

Decide this for every mutation. Being left on a stale form after saving is a common dead end.

- **Create**: go to the new item's page, or back to the list with the new item visible and highlighted. Confirm with a toast.
- **Edit**: stay on the page with a confirmation, or return to the detail view if editing happened on a separate page.
- **Delete**: go to the parent list. Never leave the user on a page for something that no longer exists.
- **Login**: return to the page the user originally asked for, not always the dashboard.
- **Logout**: go to the login page and clear cached data.
- **Cancel**: return to where the user came from without side effects.
- **Multi step flows**: end on a clear completion screen with the next sensible action.

Use `navigate(path, { replace: true })` after a create so that Back does not return to the filled form and submit a duplicate. In Next.js see `nextjs.md` section 8.

## 7. Routes every app needs

- A 404 page for unknown routes and for records that do not exist, with a link back to a known place.
- A no permission page that says the user lacks access and how to get it.
- A route level error boundary with retry.
- Protected routes that show a loading state while the session is checked. Flashing the login page for a signed in user, or protected content for a signed out one, both look broken.
- A sensible index route: land signed in users on the page they use most.
