# Layout, touch, and visual system

## Contents
1. Safe areas
2. Screen structure
3. Spacing and alignment
4. Typography and font scaling
5. Color and dark mode
6. Touch targets and press areas
7. Thumb zone
8. Screen sizes and orientation
9. NativeWind specifics
10. Things to avoid

## 1. Safe areas

Use `react-native-safe-area-context`. The `SafeAreaView` exported from `react-native` itself is iOS only and deprecated, so do not import it from there.

- Wrap the app once in `SafeAreaProvider` (Expo Router does this for you).
- Prefer `useSafeAreaInsets()` and apply insets as padding where they are needed, because it works with scroll views, absolute bars, and sheets:

```tsx
const insets = useSafeAreaInsets();

<ScrollView
  contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
  contentInsetAdjustmentBehavior="automatic"
/>

<View style={{ paddingBottom: Math.max(insets.bottom, 16) }} className="border-t border-border bg-background px-4 pt-3">
  <Button onPress={save}><Text>Save changes</Text></Button>
</View>
```

- Screens with a native header and a tab bar already have top and bottom insets handled by the navigator. Do not add them a second time. Screens with `headerShown: false` or full screen modals must handle the top inset themselves.
- Backgrounds and images may extend edge to edge. Text and controls may not.
- Bottom pinned buttons use `Math.max(insets.bottom, 16)` so they have padding on devices without a home indicator too.
- Android is edge to edge by default on recent versions, so the bottom inset matters there as well.
- Landscape adds left and right insets. Apply `insets.left` and `insets.right` if the app allows rotation.

## 2. Screen structure

A predictable skeleton for most screens:

1. Native header: title, back, at most one or two actions on the right
2. Scrollable content with consistent horizontal padding
3. Optional pinned bottom area for the primary action
4. Tab bar on top level screens only

- Use the navigator's native header instead of a hand built one. It gives correct height, back gesture, large titles on iOS, and screen reader behavior for free.
- Screen horizontal padding: `px-4` (16) as the default, the same on every screen.
- Almost every screen should scroll, even if its content fits on your test device. Smaller phones, larger fonts, and the keyboard all reduce the space. Use `ScrollView` for static content and a list component for collections.
- One primary action per screen. If it must always be visible, pin it at the bottom above the safe area. Otherwise put it at the end of the content.
- Group content into sections with a small heading and 24 to 32 between sections.

## 3. Spacing and alignment

- Use the 4 point scale: 4, 8, 12, 16, 24, 32. No arbitrary values.
- Spacing shows grouping: 4 to 8 inside a row or control, 12 to 16 between related items, 24 to 32 between sections.
- Use `gap-*` on the parent instead of margins on children.
- One left edge per screen. Headings, text, inputs, and list content all start at the same x position (usually 16).
- Left align text. Center only short standalone content such as empty states and onboarding.
- Right align numbers and amounts in rows, with `tabular-nums` (`style={{ fontVariant: ["tabular-nums"] }}` if the class is unavailable).
- In rows use `flex-row items-center`. Give the text block `flex-1` and, where truncation is needed, `min-w-0`. Give icons and trailing elements `shrink-0`.
- React Native's default flex direction is column and every `View` is a flex container. Do not carry web assumptions about `block` and `inline` layout.
- Full width buttons are normal and expected on phones. On tablets cap content width (`max-w-xl self-center w-full`).

## 4. Typography and font scaling

- Body text 16 to 17. Secondary text 14 to 15. Minimum 12, used only for captions and metadata. Phones are held farther from the eye than you expect, and the 14 that works on desktop is small here.
- Limit to about four sizes and two or three weights per screen.
- Titles: use the native header title, plus at most one large heading in content.
- Line height about 1.3 to 1.5 times the font size (`leading-6` with `text-base`).
- Hierarchy through size, weight, and `text-muted-foreground`, not through many colors.

Font scaling:
- Users set a system font size, and many set it large. React Native scales `Text` automatically. Never set `allowFontScaling={false}` to protect a layout.
- Do not put text inside fixed height containers. Use `min-h-*` and padding so containers grow.
- Where growth would break a tightly constrained element (tab bar labels, badges, a header title), cap it with `maxFontSizeMultiplier={1.3}` instead of disabling scaling.
- Test the largest accessibility size. Rows should wrap or stack, not clip. A row with left and right content may need to become two lines.
- Use `numberOfLines` with `ellipsizeMode="tail"` to truncate on purpose, and make the full text reachable elsewhere.
- Every string must be inside a `Text` component. A bare string in a `View` crashes.

## 5. Color and dark mode

- Use semantic tokens (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, `text-primary-foreground`, `bg-destructive`) defined as CSS variables in the project theme. Raw palette colors and hex values break dark mode.
- If the app supports dark mode, every screen must be checked in both. Follow the system setting by default (`useColorScheme`), with an optional in app override.
- Set the status bar style to match the background (`expo-status-bar` or the navigator's option) so the clock and battery icons stay visible.
- Contrast: 4.5:1 for text, 3:1 for large text and for meaningful icons and control borders. Phones are used outdoors in sunlight, so low contrast gray text fails even sooner than on desktop.
- One accent color for primary actions and selected states.
- Status colors come with an icon or label, never color alone.
- Avoid pure black backgrounds with pure white text in dark mode; use the theme's slightly softened values to reduce glare and smearing on OLED screens.
- Shadows: iOS uses shadow properties and Android uses elevation, and they look different. Prefer borders or background contrast for separation, and use shadow only for elements that float.

## 6. Touch targets and press areas

- Minimum 44 by 44pt (iOS guideline) and 48 by 48dp (Android guideline). Use 48 as the shared minimum: `min-h-12 min-w-12`.
- A small icon keeps its visual size and gains area through padding or `hitSlop`:

```tsx
<Pressable
  onPress={onClose}
  hitSlop={12}
  accessibilityRole="button"
  accessibilityLabel="Close"
  className="size-10 items-center justify-center rounded-full active:bg-muted"
>
  <X size={20} className="text-foreground" />
</Pressable>
```

- Keep at least 8 between adjacent targets. `hitSlop` areas must not overlap.
- List rows are one target across the full width, at least 48 tall, commonly 56 to 72 with two lines of text.
- Text links inside paragraphs are hard to tap. Prefer a button or a full width row for anything important.
- Keep targets away from the very bottom edge on iOS, where the home gesture lives, and from screen edges used for back swipes.

## 7. Thumb zone

Most people hold a phone in one hand and use the thumb.

- Easy: the lower middle of the screen. Hard: the top corners.
- Put the primary action low: a pinned bottom button, a floating action button above the tab bar, or the end of a short form.
- Put navigation between top level sections in a bottom tab bar.
- Reserve the top of the screen for titles, status, and infrequent actions (settings, share).
- Put destructive actions where they cannot be hit by accident: not next to the primary button, and not in the easiest spot.
- Prefer bottom sheets over centered dialogs for choices and short forms, because their controls sit within reach.

## 8. Screen sizes and orientation

- Check a small phone (about 360 by 640), a large phone (about 430 wide), and a tablet if the app supports one.
- Use `useWindowDimensions()` for size dependent layout. `Dimensions.get()` does not update on rotation, split screen, or foldables.
- Use flex and percentages instead of fixed pixel widths. A row of three fixed 120 wide cards will not fit on a small phone.
- On tablets, cap the content width or switch to a two pane layout. Do not stretch a phone layout across the full width.
- If the app is portrait only, lock the orientation in configuration instead of leaving landscape broken.
- Grids: use `numColumns` on the list and derive it from the width.

## 9. NativeWind specifics

These differ from Tailwind on the web and are common sources of bugs.

- **No style inheritance.** Text styles set on a `View` do not reach the `Text` inside it. Put `text-*` and `font-*` classes on the `Text` itself. Kits like React Native Reusables provide a `Text` component and a context for this; use theirs if present.
- **No hover on touch.** Use `active:` for pressed states (`active:opacity-70`, `active:bg-muted`). Keep `hover:` only for web targets.
- **Platform variants**: `ios:` and `android:` prefixes, and `web:` for universal apps.
- **Dark mode**: `dark:` variants work, but semantic tokens backed by CSS variables are less repetitive and less error prone.
- **Not every web utility exists.** No `grid` in older versions, limited `position` values, and `space-x-*` behaves differently; `gap-*` on flex containers is reliable.
- **Third party components** accept `className` only if they pass `style` through. If a class has no effect, the component may need `cssInterop` (v4), or the style must be passed via `style` or `contentContainerClassName`.
- **Scroll containers**: padding for scroll content goes on `contentContainerClassName` (or `contentContainerStyle`), not `className`, or the last items will be cut off.
- **Dynamic class names** must be complete strings. Building them by string concatenation (`"bg-" + color`) will not be picked up by the compiler. Map values to full class names.
- **Safe area utilities** (`pt-safe`, `pb-safe`) exist in NativeWind when the safe area provider is set up. Use them if the project already does; otherwise use the insets hook.
- Version differences: v4 is configured in `tailwind.config.js`; v5 is configured in CSS with `@theme` and follows Tailwind v4 class names. Follow the project's version.

## 10. Things to avoid

- Web layouts on a phone: sidebars, wide tables, hover menus, tiny text links, centered dialogs for everything
- Custom headers and custom back buttons that break the native back gesture
- Gradients, glass blur, glow shadows, emoji used as icons
- Cards inside cards, a badge on everything
- Splash style hero sections on working screens
- Long entrance animations that delay content
- Mixed icon sets and mixed icon sizes. Pick one set and one or two sizes (20 and 24)
- Text over images without a scrim to keep it readable
