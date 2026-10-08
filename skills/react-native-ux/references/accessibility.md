# Accessibility

Both platforms ship a screen reader (VoiceOver on iOS, TalkBack on Android), system font scaling, and reduced motion. A meaningful share of users rely on at least one of them. Most of this costs a few props per component.

## Contents
1. Roles, labels, state
2. Grouping and order
3. Announcing changes
4. Focus management
5. Font scaling
6. Contrast and color
7. Target size
8. Motion
9. Quick test

## 1. Roles, labels, state

Every interactive element tells the screen reader what it is, what it is called, and what state it is in.

```tsx
<Pressable
  onPress={toggle}
  accessibilityRole="button"
  accessibilityLabel="Add to favorites"
  accessibilityState={{ selected: isFavorite }}
  hitSlop={12}
>
  <Heart size={24} className={isFavorite ? "text-primary" : "text-muted-foreground"} />
</Pressable>
```

- `accessibilityRole`: `button`, `link`, `header`, `image`, `search`, `switch`, `checkbox`, `radio`, `tab`, `alert`, `progressbar`, and others. Recent React Native versions also accept the web style `role` and `aria-*` props. Follow the project's existing style.
- `accessibilityLabel`: required on icon only buttons, on inputs, and anywhere the visible text is not enough. Keep it short, do not include the role ("Close", not "Close button"), and include the object in repeated rows ("Delete photo 3").
- `accessibilityHint`: only when the result of the action is not obvious from the label.
- `accessibilityState`: `disabled`, `selected`, `checked`, `expanded`, `busy`. Update it as the state changes.
- `accessibilityValue`: for sliders, progress, and steppers.
- Section titles get `accessibilityRole="header"` so users can jump between sections.
- Text links use `accessibilityRole="link"`.
- If a button has visible text, the label should match it or start with it.

## 2. Grouping and order

- A row that is one press target should be read as one item. `Pressable` groups its children by default (`accessible={true}`); give it a single combined label when the automatic reading is awkward: `accessibilityLabel={`${order.name}, ${order.status}, ${price}`}`.
- Do not nest pressables inside an accessible parent, or the inner ones become unreachable. If a row has its own buttons, make the row container non accessible and expose the main content and each button as separate items, or offer the extra actions through `accessibilityActions`.
- Decorative images and icons are hidden: `accessible={false}` and `importantForAccessibility="no"` on Android, `accessibilityElementsHidden` on iOS, or `aria-hidden`.
- Reading order follows the view order in the tree. Keep the code order the same as the visual order, and avoid absolute positioning that reorders content visually.
- When an overlay is open, content behind it must be hidden from the screen reader. Native modals and well built sheet libraries do this. For custom overlays set `accessibilityViewIsModal` on iOS and `importantForAccessibility="no-hide-descendants"` on the background for Android. Set `aria-modal` or `accessibilityViewIsModal` on the overlay container itself, and clear the background setting when the overlay closes.
- Swipe actions and long press menus are exposed through `accessibilityActions` and `onAccessibilityAction`, so screen reader users can reach them.

## 3. Announcing changes

A screen reader user does not see a spinner appear, a toast slide in, or an error show up under a field.

- For transient messages (toast text, "Saved", "3 results"): `AccessibilityInfo.announceForAccessibility("Changes saved")`.
- For regions that update in place on Android: `accessibilityLiveRegion="polite"` (or `"assertive"` for errors).
- Form errors: announce the first error after a failed submit and move focus to that field.
- Loading: mark the container with `accessibilityState={{ busy: true }}` and announce when content is ready if the wait was long.
- Check that the project's toast library announces its messages. If not, announce them yourself.

## 4. Focus management

- When a new screen opens, the navigator moves screen reader focus to it. For custom transitions and overlays, set focus with `AccessibilityInfo.setAccessibilityFocus(findNodeHandle(ref.current))`.
- When a sheet or modal closes, focus returns to the control that opened it.
- After deleting a row, focus moves to the next row, not to the top of the screen.
- External keyboards and switch control are used with phones and tablets. Pressables are focusable by default; keep a visible focus style on web and tablet targets.

## 5. Font scaling

- Leave `allowFontScaling` enabled everywhere.
- Containers grow with their text: `min-h-*` and padding, not fixed heights.
- Cap growth only where the layout cannot adapt, using `maxFontSizeMultiplier` (about 1.3 to 1.5 for tab labels and badges). Body text is never capped.
- At large sizes, rows with content on both sides may need to stack. Test at the largest accessibility size on iOS and the largest font and display size on Android.
- Icons that carry meaning should scale with the text beside them, or be large enough already.
- Scale spacing that depends on text with `PixelRatio.getFontScale()` or `useWindowDimensions().fontScale` when needed.

## 6. Contrast and color

- 4.5:1 for body text, 3:1 for large text (about 18 regular or 14 bold and above) and for meaningful icons, input borders, and focus indicators.
- Check both light and dark themes, and remember phones are used in bright sunlight.
- Placeholder text is usually too faint to rely on. Real information goes in labels and help text.
- Never rely on color alone: errors have text and an icon, selected items have a check or a filled state, charts have labels.
- Do not put text on images without a scrim or solid backing.

## 7. Target size

- 44 by 44pt minimum on iOS, 48 by 48dp on Android. Use 48 for both.
- Use `hitSlop` or padding to enlarge small visuals, and keep 8 or more between targets.
- The label of a checkbox, radio, or switch row is part of the target: make the whole row pressable.

## 8. Motion

- Read the system setting with `useReducedMotion()` (Reanimated) or `AccessibilityInfo.isReduceMotionEnabled()` and its change event.
- Under reduced motion: replace slides, zooms, and parallax with a fade or an instant change. Stop looping animations and auto playing carousels.
- Nothing flashes more than three times per second.
- Time limited content (auto dismissing toasts with actions, auto advancing slides) either lasts long enough, can be paused, or is reachable elsewhere.

## 9. Quick test

When you can run the app, or when telling the user what to check:

1. Turn on VoiceOver (iOS) or TalkBack (Android). Swipe through the screen. Is every control announced with a name and role, in a sensible order? Can the main task be completed?
2. Set the system font size to the largest setting. Does anything clip, overlap, or become unreachable?
3. Switch to dark mode. Is everything visible and legible?
4. Turn on reduced motion. Do animations calm down?
5. Use the app one handed with your thumb. Are the main actions reachable and easy to hit?
6. Turn on airplane mode and use the main flow. Does the app explain what is happening?

The Accessibility Inspector in Xcode and the Accessibility Scanner app on Android find missing labels, small targets, and low contrast automatically. They complement the manual steps and do not replace them.
