# Navigation, modals, sheets, and gestures

## Contents
1. Structure
2. Headers
3. Back behavior
4. Tabs
5. Modals, sheets, dialogs
6. Gestures
7. Haptics
8. Transitions and motion
9. Where users land after actions
10. Deep links and state restoration

## 1. Structure

Use the platform's standard building blocks through Expo Router or React Navigation:

- **Bottom tabs** for three to five top level destinations.
- **A native stack inside each tab** for drilling into detail. Each tab keeps its own history.
- **Modal presentation** for self contained tasks that interrupt the flow (compose, create, pick).
- **Drawer** only when there are more top level destinations than fit in tabs, and mostly on Android or tablets.

Use the native stack navigator (`@react-navigation/native-stack`, the default in Expo Router), not the JavaScript stack. It provides real platform transitions, the iOS back swipe, large titles, and correct behavior with the keyboard and screen readers.

Keep the hierarchy shallow. If reaching common content takes more than three levels, restructure.

## 2. Headers

- Use the navigator's native header. Configure it with screen options instead of building one from views.
- Every screen has a short title that names where the user is. The title of a detail screen is the item's name.
- The left side belongs to back or close. The right side holds at most two actions; put more in an overflow menu.
- Header buttons need the same 44 to 48 minimum target and an `accessibilityLabel` when they are icons.
- Text actions in headers use verbs ("Save", "Done", "Edit"). Disable "Save" until there is something to save, since header actions have no room for explanations.
- On iOS, large titles suit top level screens and collapse on scroll. Search belongs in the header via `headerSearchBarOptions`.
- If the header is hidden for a custom design, the screen must handle the top safe area inset, provide its own back affordance, and keep the back gesture working.

## 3. Back behavior

Back must be predictable. It is the user's undo for navigation.

- iOS: a back button on the top left and an edge swipe from the left. Do not disable the swipe (`gestureEnabled: false`) except to protect unsaved work, and do not place horizontally swipeable content against the left edge where it will fight the gesture.
- Android: the system back button or gesture. It closes the keyboard first, then any open sheet, menu, or modal, then goes to the previous screen, and from a tab root goes to the first tab or leaves the app. Handle custom overlays with `BackHandler` or the library's own handling so back closes them instead of leaving the screen behind them.
- Modals show "Cancel" or a close icon on the top left (iOS convention) and can be swiped down. If the modal holds unsaved input, confirm before discarding.
- Use `usePreventRemove` to confirm leaving a dirty form. Apply it only when there are changes.
- Back returns to the previous screen in the same state: same scroll position, same filters, same input.

## 4. Tabs

- Three to five tabs. Each has an icon and a short text label. Icons alone are ambiguous.
- The active tab is clearly distinguished by more than color where possible (filled versus outlined icon, or weight).
- Tabs are for navigation only. A tab must not trigger an action or open a modal, with the well known exception of a center "create" button, used sparingly.
- Tapping the active tab pops that tab's stack to its root, and tapping again scrolls to top.
- Switching tabs preserves each tab's state.
- Keep the tab bar visible on top level screens. Hide it on focused tasks pushed on top (checkout, compose, full screen media) by placing those screens outside the tab navigator.
- Badges on tabs show counts that the user can clear by acting. Do not use them as decoration.
- Top tabs (swipeable) suit sibling views of the same content (for example "Upcoming" and "Past"), limited to two to four.

## 5. Modals, sheets, dialogs

Choose by how much the task interrupts.

- **Bottom sheet**: the default for choices, filters, short forms, and contextual actions. It keeps context visible and puts controls in thumb reach. Include a drag handle, allow swipe down and backdrop tap to dismiss, and give long content its own scroll inside the sheet. Use `@gorhom/bottom-sheet` or the project's sheet component, or the native form sheet presentation in the native stack.
- **Full screen modal**: multi field creation or editing flows. "Cancel" on the left, the primary action on the right or at the bottom.
- **Alert dialog** (`Alert.alert` or the project's dialog): short confirmations and blocking errors. `Alert.alert` gives the correct native look. Buttons use specific verbs, and destructive options use `style: "destructive"` with "Cancel" as `style: "cancel"`.
- **Action sheet**: a list of actions for one item (share, edit, delete). Destructive options are last and marked destructive.
- **Popover or menu**: short lists of options attached to a button. Prefer native context menus where the project has them.

Rules:
- One overlay at a time. Do not stack a dialog on a sheet on a modal.
- Every overlay can be dismissed by an obvious control, and by Android back.
- Overlays respect safe areas and the keyboard.
- Do not use a modal to announce success. Use a toast, a haptic, or the visible result.
- Do not interrupt with permission prompts, rating requests, or promotions in the middle of a task.

## 6. Gestures

- Standard gestures first: tap, scroll, pull to refresh, swipe back, swipe to dismiss a sheet, long press for a context menu, pinch to zoom on images and maps.
- Every gesture has a visible alternative. Swipe to delete also exists in an edit mode or a menu. Long press actions also exist on the detail screen. Gestures are invisible and some users cannot perform them.
- Do not override system gestures (edge swipes, the home indicator area, the notification pull down).
- Avoid conflicts: a horizontal carousel inside a horizontally swipeable tab view, or a draggable item inside a scroll view, need deliberate handling with `react-native-gesture-handler`.
- Swipe actions on rows reveal labelled buttons, and a full swipe performs only a reversible action.
- Drag to reorder needs a visible drag handle and a non drag alternative.

## 7. Haptics

Haptics confirm that something registered, without the user looking. Use `expo-haptics` if installed, and use it sparingly so it keeps its meaning.

- Light impact: toggling a switch, selecting an item, snapping a picker
- Medium impact: completing a drag, triggering pull to refresh, a long press menu opening
- Success, warning, and error notifications: the result of a meaningful action (payment succeeded, form failed)
- Not on every tap, not on scroll, and not for ordinary navigation

Haptics accompany visual feedback and never replace it. Some devices have none, and users can turn them off.

## 8. Transitions and motion

- Use the navigator's native transitions. Custom screen transitions feel foreign and often drop frames.
- Animate with `react-native-reanimated` or layout animations that run on the UI thread, so they stay smooth while JavaScript is busy.
- Keep durations short: 150 to 300ms for most UI changes.
- Motion should explain a change (where a sheet came from, which item was removed). Remove animation that only decorates.
- Respect reduced motion: check `useReducedMotion()` from Reanimated or `AccessibilityInfo.isReduceMotionEnabled()`, and replace movement with a fade or no animation.
- Never block interaction until an animation finishes.

## 9. Where users land after actions

- **Create**: the new item's screen or the list with the new item visible. Replace the create screen in the stack so Back does not return to the filled form.
- **Edit and save**: back to the detail screen showing the updated values.
- **Delete**: pop to the list, with the item gone and an undo toast where possible.
- **Sign in**: the screen the user was trying to reach, or the main tab. Reset the stack so Back does not return to sign in.
- **Sign out**: the sign in screen, with cached data cleared and the stack reset.
- **Finishing a flow** (checkout, onboarding): a clear completion screen with one next action, and the flow's screens removed from history.

## 10. Deep links and state restoration

- Give every screen that represents a thing (an order, a profile) a route that can be opened directly from a link or a push notification. Expo Router does this from the file structure.
- A screen opened from a deep link still needs a sensible back destination (the parent list or home), not a dead end.
- Opening a link while signed out leads to sign in and then to the intended screen.
- When the app returns from the background, refresh stale data quietly and keep the user where they were. Do not reset to the home screen.
- Preserve in progress input across backgrounding. The operating system may end the app at any time.
