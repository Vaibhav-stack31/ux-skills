---
name: react-native-ux
description: UX quality rules for React Native and Expo mobile apps styled with NativeWind (Tailwind for React Native). Use this whenever building, editing, restyling, or reviewing any mobile screen or component, including lists, forms, buttons, tab bars, headers, modals, bottom sheets, alignment, spacing, safe areas, keyboard handling, loading and error states, gestures, or accessibility. Also use it when the user asks to audit, review, polish, or fix mobile UX or UI, says a screen feels off, cramped, janky, or "AI generated", or asks for any app feature even if they never mention UX. Not for React web apps (use web-app-ux for those).
---

# React Native UX

Generated mobile UI often looks like a web page squeezed onto a phone: small tap targets, content under the notch, inputs hidden by the keyboard, lists that stutter, no feedback on press, and nothing for slow or failed networks. A phone is used one handed, on the move, on unreliable connections, by people who have set their own font size. This skill exists so that every screen you build or review works under those conditions and feels native on both iOS and Android.

Treat the rules here as the way a senior mobile designer would review your work. Where a rule gives a reason, use the reason to judge cases the rule does not cover.

## 1. Choose the mode

- **Build mode**: new screens or changes. Follow sections 2 to 5, then the done checklist in section 6.
- **Audit mode**: a review, or a complaint that something feels wrong. Read `references/audit.md` and follow it. It includes a scanner script and a report format.
- **Audit and fix**: audit, report, then fix in severity order.

## 2. Read the project before writing UI

Match what exists. Users learn an app once and expect it to behave the same on every screen. Check:

- `package.json`: Expo or bare React Native, React Native version, navigation (Expo Router or React Navigation), NativeWind version, list library (FlashList or FlatList), data layer, form library, and whether `react-native-safe-area-context`, `react-native-keyboard-controller`, `react-native-reanimated`, `react-native-gesture-handler`, `expo-haptics`, and `expo-image` are installed.
- NativeWind version matters. v4 uses `tailwind.config.js` and Tailwind v3 syntax. v5 uses Tailwind v4 with CSS based configuration (`@theme` in the global CSS file) and requires the New Architecture. Check which one the project has and follow its syntax. Do not upgrade it unasked.
- The component folder (often `components/ui`, commonly from React Native Reusables, the shadcn style kit for React Native): use the existing `Button`, `Text`, `Input`, and so on instead of raw primitives.
- The theme: color tokens in the global CSS or Tailwind config, and how dark mode is handled.
- Two or three existing screens: header style, screen padding, list item layout, how forms and empty states look.

If the project does not use NativeWind, the UX rules still apply. Express them with `StyleSheet` or whatever the project uses.

## 3. Think through the screen before coding

Answer these in a few lines first.

1. What is the one job of this screen, and what is its primary action?
2. Can the primary action be reached with a thumb, one handed?
3. What does the data look like at 0, 1, and 1,000 items, with the longest realistic text, and at the largest system font size?
4. What happens offline, on a slow connection, and when a request fails?
5. Where is the keyboard when each input is focused, and can the user still see the input and reach the submit button?
6. How does the user get here and get back, including the Android back button and the iOS back swipe?

If the answers depend on product decisions you cannot infer, ask the user instead of guessing.

## 4. The ten rules

1. **Respect safe areas.** Nothing interactive or important sits under the status bar, notch, Dynamic Island, home indicator, or Android navigation bar. Use `react-native-safe-area-context`.
2. **Touch targets are at least 44 by 44pt on iOS and 48 by 48dp on Android.** Use 48 as the shared minimum, with 8 or more between targets. Extend small visuals with padding or `hitSlop`.
3. **Every press gives immediate feedback**: a pressed state on the control, then a pending state for anything asynchronous. Block double taps on submits.
4. **Every data screen handles five states**: loading, empty, error, overflow (long text, large fonts, many items), and success. Add offline where it matters. Every screen that shows server data can be refreshed by pulling down, whether it is a list or not.
5. **The keyboard never hides the focused input or the submit button**, and it can always be dismissed.
6. **Long or growing collections are virtualized lists** (`FlashList` or `FlatList`), never `ScrollView` with `.map()`.
7. **Primary actions live in the thumb zone** (lower half of the screen). The top corners are the hardest area to reach.
8. **Follow platform conventions**: native stack navigation and gestures, bottom tabs for top level destinations, system back behavior, platform appropriate pickers and sheets.
9. **Support the user's settings**: font scaling, dark mode, reduced motion, and screen readers (VoiceOver and TalkBack).
10. **Restraint.** No gradients, glass effects, emoji icons, or decorative animation unless asked. A phone screen has no room for content that does not help the task.

Write copy in plain language: buttons are a verb plus a noun ("Add address"), and errors say what happened and what to do next. Mobile copy is shorter than web copy.

## 5. Read the reference for what you are building

Read only what the task needs.

- `references/layout-and-touch.md`: safe areas, screen structure, spacing, alignment, typography and font scaling, color and dark mode, touch targets, thumb zone, NativeWind specifics. Read for any new screen or when something "looks off".
- `references/lists-and-data.md`: list items, FlashList and FlatList setup, pull to refresh, pagination, tables on mobile, cards, search and filters, empty states, images.
- `references/forms-and-keyboard.md`: inputs, keyboard types and autofill, keyboard avoidance, validation, submitting, pickers.
- `references/navigation-and-gestures.md`: stacks, tabs, headers, modals, bottom sheets, back behavior, gestures, haptics, deep links.
- `references/feedback-and-states.md`: buttons and press states, loading patterns, toasts, errors, offline, destructive actions, optimistic updates.
- `references/accessibility.md`: screen reader props, focus order, contrast, scaling, motion.
- `references/audit.md`: review procedure, severity scale, report template, scanner usage.

## 6. Done checklist

Check every item against the code before saying the work is complete.

**Layout**
- [ ] Safe area insets applied at top and bottom; nothing under the notch or home indicator
- [ ] Consistent screen padding and one left edge; spacing from the scale
- [ ] Works on a small phone (about 360 wide) and does not stretch awkwardly on a tablet
- [ ] Text still fits at large system font sizes; no fixed heights on text containers

**Touch**
- [ ] Every target at least 48 by 48 including `hitSlop`
- [ ] Pressed state on every pressable; primary action reachable by thumb

**States**
- [ ] First load shows a skeleton that matches the layout, delayed about 200ms; refreshes keep the old content visible
- [ ] Empty, filtered empty, and error with retry
- [ ] Pull to refresh on every screen that shows server data (lists, detail screens, dashboards), but not on forms
- [ ] Sensible behavior offline or on failure; user input never lost

**Forms**
- [ ] Visible label on every input; correct keyboard type, autofill hints, and return key
- [ ] Focused input and submit button stay above the keyboard; tapping outside dismisses it
- [ ] Submit shows pending and cannot be double tapped; errors appear next to the field

**Lists**
- [ ] Virtualized list with stable keys, an empty component, and a footer loader when paginating
- [ ] Rows are one tap target with clear primary and secondary text

**Navigation**
- [ ] Back works by header button, iOS swipe, and Android back
- [ ] Screen has a title; the user lands somewhere sensible after each action

**Access**
- [ ] Pressables have `accessibilityRole` and, when icon only, `accessibilityLabel`
- [ ] Contrast at least 4.5:1; dark mode checked; meaning never by color alone
- [ ] Animations respect reduced motion

When reporting completed work, state in one or two lines which states and edge cases you handled, and anything you could not verify without running the app on a device. Layout on real devices cannot be confirmed from code alone, so say what the user should check on iOS and Android.
