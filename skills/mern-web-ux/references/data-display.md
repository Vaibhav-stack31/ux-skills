# Tables, lists, cards, and collections

## Contents
1. Choosing table, list, or cards
2. Tables
3. Lists
4. Cards
5. Search, filter, sort
6. Pagination and infinite scroll
7. Empty states
8. Loading and refreshing collections
9. Detail views and key value data

## 1. Choosing table, list, or cards

- **Table**: items share the same attributes and users compare across rows or scan a column (orders, users, invoices, logs).
- **List**: one main attribute per item with a little supporting detail, read top to bottom (messages, notifications, tasks, search results).
- **Cards in a grid**: items are visual or differ in shape, and browsing matters more than comparing (products, projects with thumbnails, templates).

Do not use cards for data that users need to compare. A grid of cards with five fields each is a table that is harder to read.

## 2. Tables

### Column alignment
- Text: left aligned.
- Numbers, currency, quantities, durations: right aligned with `tabular-nums` and the same number of decimals in every row, so magnitudes can be compared by eye.
- Dates: left aligned, one consistent format.
- Status: left aligned badge with a text label.
- Checkbox and icon only columns: centered, fixed narrow width.
- Row actions: last column, right aligned.
- Every header is aligned the same way as the cells below it.

### Columns and content
- Put the identifying column first (name, title, order number). Make it a real link to the detail page.
- Order the remaining columns by importance. Columns that do not fit should be hidden on smaller screens before the important ones are squeezed.
- Keep ids, amounts, and dates on one line with `whitespace-nowrap`. Truncate long names with `max-w-*` and `truncate`, with the full value in `title`.
- Empty cells show a muted "None" or hyphen.
- Header labels are short nouns in sentence case. Give an actions column a visually hidden header: `<TableHead><span className="sr-only">Actions</span></TableHead>`.
- Units go in the header ("Size (MB)"), not repeated in every cell.

### Density and visual treatment
- Row height 40 to 52px. Dense data tools use the low end; consumer screens use the high end.
- Light horizontal dividers only. Vertical borders and heavy zebra striping add noise. Add a hover background (`hover:bg-muted/50`) so the eye can track a row.
- Sticky header (`sticky top-0 bg-background z-10`) when the table scrolls vertically.

### Row actions
- One or two frequent actions may sit inline as icon buttons with `aria-label`. Everything else goes in a "more" menu (`DropdownMenu`) whose trigger is labelled with the row, for example `aria-label={`Actions for ${row.name}`}`.
- Destructive items go last in the menu, separated, styled with the destructive variant.
- If clicking a row opens the detail view, the first cell still contains a real link so keyboard users, screen readers, and "open in new tab" work. Buttons and checkboxes inside the row must stop the click from triggering navigation.

### Selection and bulk actions
- Checkbox in the first column, with a header checkbox that selects the current page and shows an indeterminate state for partial selection.
- When anything is selected, show a bar with the count and the bulk actions ("3 selected", Delete, Export, Clear).
- If the result set spans pages, offer "Select all 134".

### Sorting
- Sortable headers are buttons inside the `th`, with an arrow icon showing direction, and `aria-sort="ascending"`, `"descending"`, or `"none"` on the `th`.
- Choose a meaningful default (usually newest first) and show it as the active sort.
- Sort on the server when the data is paginated. Sorting only the visible page is misleading.

### Responsive tables
Pick one deliberately. Never let a table overflow the page.
1. **Horizontal scroll**: wrap in `overflow-x-auto` (shadcn `Table` already does). Keep the first column sticky so rows stay identifiable. Good for wide numeric data.
2. **Hide columns**: `hidden md:table-cell` on lower priority columns, with the full data available in the detail view.
3. **Switch to a list**: below `md`, render each row as a stacked item (name and status on the first line, two key fields under it, actions in a menu). Best for phone use.

### Reference: TanStack Table with shadcn

```tsx
<div className="rounded-md border">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead aria-sort={sort === "name" ? dir : "none"}>
          <Button variant="ghost" size="sm" className="-ml-3" onClick={() => toggleSort("name")}>
            Customer <ArrowUpDown aria-hidden="true" />
          </Button>
        </TableHead>
        <TableHead>Status</TableHead>
        <TableHead className="hidden md:table-cell">Created</TableHead>
        <TableHead className="text-right">Amount</TableHead>
        <TableHead className="w-10"><span className="sr-only">Actions</span></TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {rows.map((o) => (
        <TableRow key={o.id}>
          <TableCell className="max-w-64">
            <Link to={`/orders/${o.id}`} className="block truncate font-medium hover:underline" title={o.customer}>
              {o.customer}
            </Link>
          </TableCell>
          <TableCell><StatusBadge status={o.status} /></TableCell>
          <TableCell className="hidden whitespace-nowrap text-muted-foreground md:table-cell">
            {formatDate(o.createdAt)}
          </TableCell>
          <TableCell className="text-right tabular-nums whitespace-nowrap">
            {formatCurrency(o.amount)}
          </TableCell>
          <TableCell>
            <RowActions order={o} />
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>
```

## 3. Lists

Each item has a predictable anatomy, in this order:
1. Optional leading element: avatar, icon, thumbnail, or checkbox
2. Primary text: `font-medium`, one line, truncated
3. Secondary text: `text-sm text-muted-foreground`, one or two lines
4. Trailing element: timestamp, count, badge, or an action

```tsx
<ul role="list" className="divide-y rounded-md border">
  {items.map((m) => (
    <li key={m.id}>
      <Link to={`/members/${m.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring">
        <Avatar className="shrink-0">
          <AvatarImage src={m.avatarUrl} alt="" />
          <AvatarFallback>{initials(m.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{m.name}</p>
          <p className="truncate text-sm text-muted-foreground">{m.email}</p>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">{m.role}</span>
      </Link>
    </li>
  ))}
</ul>
```

- Use real `ul` and `li` so assistive technology announces the item count.
- `min-w-0 flex-1` on the text block and `shrink-0` on the leading and trailing elements keep long names from breaking the row.
- The whole row is the click target, minimum 44px tall.
- Separate items with either dividers or spacing, not both.
- If a row has its own buttons, the row cannot also be one big link. Make the primary text the link and keep buttons as siblings.
- Group long lists with headings (by date, by letter, by status) and consider sticky group headers.
- Virtualize (TanStack Virtual) once a list can exceed a few hundred rendered items.
- Reordering by drag needs a keyboard alternative ("Move up" and "Move down" in the item menu).

## 4. Cards

- Use a consistent internal structure across sibling cards: media, title, supporting text, metadata, actions, always in the same positions.
- Equal heights per row; clamp descriptions with `line-clamp-2` and pin the footer with `mt-auto`.
- One clear click target. Make the title a link and stretch it over the card with a pseudo element (`after:absolute after:inset-0` on the link, `relative` on the card), then raise secondary buttons with `relative z-10`.
- At most one or two actions per card. More goes in a menu.
- Do not nest cards. Do not put a card around a single table or form just for the border.
- Images have a fixed aspect ratio so the grid does not jump while loading.

## 5. Search, filter, sort

- Place the toolbar directly above the collection: search on the left, filters next to it, view options and sort on the right.
- Search: `type="search"`, a search icon, an accessible label, a clear button when not empty, debounced about 300ms. Show the result count ("12 results").
- Filters: show active filters as removable chips and provide "Clear all". Users must always be able to see why the list is shorter than expected.
- Apply filters immediately on desktop. On mobile, put filters in a `Sheet` with an "Apply" button that shows the result count.
- Store search, filters, sort, and page in the URL query string (`useSearchParams` or the router's equivalent). Refresh, back, and shared links must reproduce the same view.
- Changing a filter or search resets to page 1.
- Keep the previous results on screen (dimmed) while new ones load, instead of flashing a skeleton on each keystroke.

## 6. Pagination and infinite scroll

- **Pagination** for anything task oriented (admin tables, search results, records). It gives a sense of position, lets users return to a spot, and keeps the footer reachable.
- **Infinite scroll or "Load more"** for feeds that are browsed, not searched. Prefer an explicit "Load more" button: it keeps the footer reachable and works with a keyboard.
- Show the range and total: "Showing 21 to 40 of 134".
- Previous and Next are always present and disabled at the ends. Show page numbers when the total is known.
- Offer a page size choice (10, 20, 50) for data heavy tables and remember it.
- Paginate on the server once a collection can exceed about 100 items. See `mern-data-ux.md`.
- After paging, scroll to the top of the collection and keep focus sensible.
- Deleting the last item on a page moves the user to the previous page instead of showing an empty one.

## 7. Empty states

There are three different empty situations and each needs its own message. Treating them the same is a common failure.

1. **First use, nothing created yet**: explain what will appear here and give the primary action.
2. **No results for the current search or filters**: say so, echo the query, and offer to clear filters. Do not show the "create your first" message here.
3. **Error loading**: this is not an empty state. Show the error with retry.

```tsx
// first use
<Empty>
  <EmptyHeader>
    <EmptyMedia variant="icon"><FolderOpen aria-hidden="true" /></EmptyMedia>
    <EmptyTitle>No projects yet</EmptyTitle>
    <EmptyDescription>Projects group your tasks and files. Create one to get started.</EmptyDescription>
  </EmptyHeader>
  <EmptyContent>
    <Button onClick={openCreate}>Create project</Button>
  </EmptyContent>
</Empty>

// filtered
<Empty>
  <EmptyHeader>
    <EmptyTitle>No projects match "{query}"</EmptyTitle>
    <EmptyDescription>Try a different search or remove some filters.</EmptyDescription>
  </EmptyHeader>
  <EmptyContent>
    <Button variant="outline" onClick={clearFilters}>Clear filters</Button>
  </EmptyContent>
</Empty>
```

If `Empty` is not installed, build the same structure: centered block, optional icon, short title, one sentence, one action. Keep the page header and toolbar visible around it. If the user lacks permission to create, say who can, instead of showing a button that fails.

## 8. Loading and refreshing collections

- First load: skeleton rows or cards that match the real layout (same row height, same column widths), about 5 to 8 of them. This avoids layout shift when data arrives. Delay it by about 200ms so fast responses show no loader (see `actions-and-feedback.md`, section 2).
- Refetch, page change, filter change: keep the old data visible and dim it (`opacity-60`), using `placeholderData: keepPreviousData` in TanStack Query. Add `aria-busy="true"` on the container.
- Background refresh: no visible loading unless the data changes.
- After a create, update, or delete: update the list immediately (optimistic update or cache invalidation). The user should never have to refresh to see their own change.
- New item created: make it visible (scroll to it or put it first) and briefly highlight it.

## 9. Detail views and key value data

- Use a definition list for attribute and value pairs: `<dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-[12rem_1fr]">` with `dt` in `text-sm text-muted-foreground` and `dd` as the value.
- Labels left aligned in a fixed width column, values left aligned next to them. On mobile, stack label above value.
- Group attributes into sections with headings. Put the most used ones first.
- Page header shows the item's name, its status, and the primary action, with secondary actions in a menu.
- Provide a way back to the list that restores the previous filters and page.
