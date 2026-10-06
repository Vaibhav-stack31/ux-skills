# Lists, tables, cards, and collections

## Contents
1. Choosing the component
2. List item anatomy
3. List setup
4. Pull to refresh and pagination
5. Tables on mobile
6. Cards and grids
7. Search, filter, sort
8. Empty states
9. Loading collections
10. Images

## 1. Choosing the component

- **`FlashList`** (if installed) or **`FlatList`**: any collection that can grow or exceeds about 20 items. These render only what is on screen.
- **`SectionList`** or FlashList with sticky headers: grouped data (contacts by letter, transactions by date).
- **`ScrollView` with `.map()`**: only for short, fixed content such as a settings screen with a known handful of rows. Using it for real data causes slow first render, memory growth, and dropped frames.

Never nest a vertical virtualized list inside a vertical `ScrollView`. Put the surrounding content into the list's `ListHeaderComponent` and `ListFooterComponent` instead.

## 2. List item anatomy

A consistent row structure makes a list scannable:

1. Optional leading element: avatar, icon, or thumbnail, fixed size
2. Primary text: one line, medium weight, truncated
3. Secondary text: one or two lines, muted
4. Trailing element: value, time, badge, or chevron

```tsx
function MemberRow({ member, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${member.name}, ${member.role}`}
      className="min-h-16 flex-row items-center gap-3 px-4 py-3 active:bg-muted"
    >
      <Avatar source={member.avatarUrl} name={member.name} className="size-10 shrink-0" />
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-base font-medium text-foreground">{member.name}</Text>
        <Text numberOfLines={1} className="text-sm text-muted-foreground">{member.email}</Text>
      </View>
      <Text className="shrink-0 text-sm text-muted-foreground">{member.role}</Text>
      <ChevronRight size={20} className="shrink-0 text-muted-foreground" />
    </Pressable>
  );
}
```

- The whole row is one press target with a pressed state. Minimum height 48, typically 56 to 72.
- Text block gets `flex-1 min-w-0`; leading and trailing elements get `shrink-0`. Without this a long name pushes the trailing content off screen.
- A chevron signals "this opens something" on iOS. Android rows usually omit it. Either is acceptable if applied consistently.
- At most one secondary action in a row (a switch, a checkbox, or a "more" button). Further actions go behind a long press menu, swipe actions, or the detail screen.
- Swipe actions (delete, archive) are shortcuts. The same actions must also be available some other way, because swipes are not discoverable and are hard for some users.
- Separators: a hairline inset to align with the text, or spacing between rows. Not both.
- At large font sizes, let the row grow taller and let the trailing text move below instead of clipping.

## 3. List setup

```tsx
<FlashList
  data={items}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <MemberRow member={item} onPress={() => open(item.id)} />}
  ItemSeparatorComponent={Separator}
  ListHeaderComponent={header}
  ListEmptyComponent={isPending ? <ListSkeleton /> : <EmptyMembers />}
  ListFooterComponent={isFetchingNextPage ? <FooterSpinner /> : null}
  onEndReached={hasNextPage ? fetchNextPage : undefined}
  onEndReachedThreshold={0.5}
  refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
  contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
  keyboardShouldPersistTaps="handled"
  keyboardDismissMode="on-drag"
/>
```

- Keys must be stable ids. Index keys cause wrong rows to update and break animations.
- `ListEmptyComponent` is required on every list.
- Keep `renderItem` cheap: a memoized row component, no inline heavy computation, stable callbacks.
- Give images fixed dimensions so rows do not change height after loading.
- FlashList v1 needs `estimatedItemSize`; v2 does not. Check the installed version. With `FlatList`, add `getItemLayout` when rows have a fixed height.
- Bottom padding goes on the content container and includes the safe area inset, so the last row clears the home indicator and any floating button.
- When a floating action button overlaps the list, add enough bottom padding that the last row can scroll clear of it.
- Tapping the active tab or the status bar should scroll to top. Use `useScrollToTop` from React Navigation.
- Preserve scroll position when returning from a detail screen. Stack navigation does this unless the list is remounted.

## 4. Pull to refresh and pagination

### Pull to refresh

Every screen that shows server data supports pull to refresh, not only lists. Users expect the gesture, and it is the standard way to recover when data looks stale or a load failed. This includes detail screens, profiles, dashboards, and home screens built on a plain `ScrollView`.

Add it to:
- Lists and feeds
- Detail screens whose data can change (an order and its status, a profile, a balance)
- Dashboards and home screens that combine several requests
- Empty states and error states of those screens, so the user can retry by pulling

Leave it off:
- Forms and edit screens, where an accidental pull could disturb input
- Static content (about, help text, settings that are stored on the device)
- Screens whose content is entirely local
- Chat style screens that are inverted or update in real time

```tsx
// a non list screen
const { data, refetch } = useQuery({ queryKey: ["order", id], queryFn: () => api.orders.get(id) });
const [refreshing, setRefreshing] = useState(false);

const onRefresh = useCallback(async () => {
  setRefreshing(true);
  try {
    await refetch();
  } finally {
    setRefreshing(false);
  }
}, [refetch]);

<ScrollView
  refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
  contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16, flexGrow: 1 }}
>
  {/* content, or the empty or error state */}
</ScrollView>
```

- `refreshing` reflects a refresh the user started, kept in its own state as above. Binding it to a library flag such as `isRefetching` makes the spinner appear on every background refetch, which looks like the app is acting on its own.
- Always stop the spinner in `finally`, including on failure, and then show the error. A spinner that never ends is worse than the stale data.
- A screen fed by several queries refreshes all of them in one pull (`Promise.all`, or invalidate the shared query key).
- Keep the current content on screen while refreshing. No skeleton.
- `flexGrow: 1` on the content container keeps the gesture working when content is shorter than the screen, including empty and error states.
- If the screen has no scroll container yet, wrap it in a `ScrollView` so the gesture is possible.
- Android needs `colors` and `progressBackgroundColor` on `RefreshControl` to match the theme, and iOS uses `tintColor`. Check both in dark mode.

### Pagination

- Infinite scroll is the default for feeds and long lists on mobile. Show a footer spinner while loading more, an inline retry row if loading more fails, and nothing (or a quiet end marker) when there is no more.
- Guard `onEndReached` against firing repeatedly while a page is already loading.
- Use cursor based pagination from the API for feeds so new items do not cause duplicates.
- For finite, task oriented data where position matters (search results the user returns to), consider a "Load more" button instead of automatic loading.

## 5. Tables on mobile

Wide tables do not work on phones. Choose an alternative on purpose.

1. **Rows with two lines** (preferred): each record becomes a list row with the identifier as primary text, one or two key attributes as secondary text, and the most important value on the right. Tapping opens a detail screen with every field.
2. **Stacked key value cards**: for records where four to six fields must be visible at once. Label on the left in muted text, value on the right, one pair per line.
3. **Horizontal scroll with a fixed first column**: only for truly tabular numeric data (standings, timetables, financial statements) where comparing down a column matters. Make the scroll obvious by letting a column be partly cut off at the edge.

In all cases: right align numbers with tabular figures, keep units in labels, show "None" or a hyphen for missing values, and offer sort and filter through a sheet instead of tappable column headers.

## 6. Cards and grids

- Use cards for visual or heterogeneous items (products, photos, places). Use rows for uniform text data.
- Two columns on phones for image led cards (`numColumns={2}`); one column for cards with more text. Derive the column count from `useWindowDimensions()` for tablets.
- Give every card in a grid the same structure and image aspect ratio so rows align.
- The whole card is one press target with a pressed state. Do not hide secondary buttons in corners smaller than 48.
- Do not nest cards, and do not wrap ordinary list rows in individual shadowed cards. It wastes width and adds noise.
- Horizontal carousels: let the next item peek at the edge to show there is more, use snapping, and never make a carousel the only way to reach important content.

## 7. Search, filter, sort

- Place search at the top of the list. On iOS, the native header search bar (`headerSearchBarOptions`) gives standard behavior. Otherwise use an input with a search icon, a clear button, and `returnKeyType="search"`.
- Debounce queries by about 300ms and cancel stale requests.
- Keep the keyboard from blocking results: `keyboardDismissMode="on-drag"` on the results list.
- Filters and sort open in a bottom sheet, with an "Apply" button that states the result count ("Show 24 results") and a "Reset" option.
- Show active filters as removable chips under the search bar, in a horizontal scroller if there are many. The filter button shows a count badge when filters are active.
- Show recent searches or suggestions before the user types, instead of an empty screen.

## 8. Empty states

Three different situations, three different messages.

1. **Nothing yet (first use)**: a short title, one sentence on what will appear here, and a button for the primary action.
2. **No results for the search or filters**: say so, echo the query, offer "Clear filters".
3. **Failed to load**: an error with "Try again". This is not an empty state.

```tsx
function EmptyOrders({ onCreate }: { onCreate: () => void }) {
  return (
    <View className="flex-1 items-center justify-center gap-2 px-8 py-16">
      <PackageOpen size={40} className="text-muted-foreground" />
      <Text className="text-center text-lg font-semibold text-foreground">No orders yet</Text>
      <Text className="text-center text-base text-muted-foreground">
        Orders you place will show up here.
      </Text>
      <Button onPress={onCreate} className="mt-4">
        <Text>Start an order</Text>
      </Button>
    </View>
  );
}
```

For the empty component to center vertically, the list needs `contentContainerStyle={{ flexGrow: 1 }}`. Pull to refresh should still work on an empty list.

## 9. Loading collections

- First load: skeleton rows that match the real row layout (same height, same avatar and text positions). Show enough to fill the screen. Delay it by about 200ms so fast responses show no loader (see `feedback-and-states.md`, section 3).
- Refresh: the pull to refresh spinner only; keep the existing rows visible.
- Loading more: footer spinner.
- Returning to a screen with cached data: show the cached rows immediately and refresh in the background.
- After the user creates, edits, or deletes an item, the list reflects it immediately without a manual refresh.

## 10. Images

- Use `expo-image` (or the project's image library) for caching, placeholders, and transitions. The core `Image` has weak caching.
- Always set width and height or an aspect ratio. An image without dimensions renders at zero size or causes layout jumps.
- Provide a placeholder (blurhash or a neutral background) and a fallback for failed loads. Avatars fall back to initials.
- `contentFit="cover"` for thumbnails and avatars; `"contain"` for logos and product images that must not be cropped.
- Request appropriately sized images from the server. Loading full resolution photos into a list of thumbnails causes memory pressure and scroll stutter.
- Informative images get an `accessibilityLabel`. Decorative ones are hidden from screen readers.
