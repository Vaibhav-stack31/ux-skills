# Buttons, feedback, loading, errors, and offline

## Contents
1. Buttons and pressables
2. Press feedback
3. Loading patterns
4. Success feedback and toasts
5. Errors
6. Offline and poor networks
7. Destructive actions and undo
8. Optimistic updates
9. Permissions
10. Disabled states

## 1. Buttons and pressables

### Hierarchy
- **Primary**: filled, one per screen, for the action the screen exists for. Usually full width and placed low.
- **Secondary**: outline or tonal, for alternatives.
- **Tertiary**: text only, for low emphasis actions such as "Skip" or "Cancel".
- **Destructive**: the destructive style appears on the confirmation, not on the first tap, so red does not dominate the screen.

### Labels and size
- Verb plus noun, sentence case, one to three words: "Add to cart", "Send message". Avoid "Submit", "OK", "Yes".
- Height at least 48. Text 16 or larger, medium or semibold weight.
- Labels never wrap or truncate at default font size. If a label does not fit, shorten the wording.
- Two buttons side by side share equal width and height. On narrow screens or with long labels, stack them with the primary on top.
- Icon only buttons are for universally understood actions (close, back, search, more, share). They always carry an `accessibilityLabel`.
- A floating action button is for the single most common creation action on a screen. One per screen, bottom right, above the tab bar and safe area, and not covering the last list row.

### Use `Pressable`
Build custom pressables with `Pressable` (or the project's `Button`). `TouchableOpacity` still works but is legacy, and `TouchableWithoutFeedback` gives the user no response at all. A plain `View` or `Text` with `onPress` has no feedback, no role, and usually too small a target.

## 2. Press feedback

Every pressable responds visibly the moment it is touched. Without this the app feels broken or slow, and users tap again.

- NativeWind: `active:opacity-80` for filled buttons, `active:bg-muted` for rows and ghost buttons.
- Android: `android_ripple={{ color: "rgba(0,0,0,0.1)" }}` gives the native ripple. Add `overflow-hidden` on rounded containers so the ripple is clipped.
- Selected and toggled states are distinct from pressed states and persist.
- Feedback appears within 100ms. If the action then takes time, switch to a pending state.

## 3. Loading patterns

You cannot know how long a request will take when writing the code, and on mobile it varies enormously between Wi-Fi and a weak cellular signal. So do not choose the indicator by guessed duration. Choose it by what is loading. These four cases cover nearly everything:

1. **A content area loading for the first time with nothing cached** (list, detail screen, dashboard section): a skeleton that matches the final layout.
2. **An action triggered by a control** (save, send, delete, toggle): pending state on that control. `ActivityIndicator` inside the button, progressive label ("Saving..."), disabled, same size. Ignore further taps.
3. **Content already on screen being refreshed** (pull to refresh, return to the screen, app back in the foreground, filter or sort change): keep the existing content visible. The only indicator is the pull to refresh spinner when the user pulled, or a footer spinner when loading more. No skeleton.
4. **A long job** (upload, import, sync): determinate progress with a description, the option to cancel, and the ability to keep using the app. Long uploads continue if the user leaves the screen.

Delay every skeleton and every standalone spinner by about 200ms. A fast response then shows no loader at all, and only a slow one shows the skeleton. Without the delay the skeleton flashes on fast connections. Button pending states are the exception: show those immediately, because the user needs to know the tap registered.

```tsx
// Renders nothing for the first 200ms.
export function Delayed({ ms = 200, children }: { ms?: number; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return show ? <>{children}</> : null;
}

if (isPending) return <Delayed><OrderListSkeleton /></Delayed>;
```

Skeleton rules:
- Match the real layout: same row height, avatar and text positions, and enough rows to fill the screen. Nothing should jump when data arrives.
- Use a skeleton only for case 1. If cached data exists, show it immediately and refresh in the background.
- Show it where the content will appear, inside the normal screen frame, so the header and back still work. Never a full screen blocking spinner over an otherwise usable screen.
- Use a subtle pulse or shimmer, and stop it under reduced motion.
- If the shape of the content is unknown or very small, use an `ActivityIndicator` instead. Do not show both.
- Give every request a timeout. A skeleton that never resolves must become an error with "Try again".
- Screen readers should hear that loading started and finished (see `accessibility.md`).

## 4. Success feedback and toasts

- If the result is visible (the item appears, the screen changes), that is sufficient, optionally with a success haptic.
- Otherwise show a short toast or snackbar: one line, about 3 to 4 seconds, above the tab bar and safe area, not covering the primary button. Use the project's toast library.
- Include "Undo" on toasts for reversible actions and extend the duration.
- Do not use toasts for errors that need action, for validation messages, or for anything the user must read carefully.
- Do not use a modal alert to say "Success". It forces a pointless tap.
- One toast at a time. Replace instead of stacking.

## 5. Errors

Place the error at the cause, in plain words, with a next step.

- **Field errors**: under the field. See `forms-and-keyboard.md`.
- **Action failed**: an inline message near the button or a banner at the top of the screen, with the user's input intact. A toast with "Retry" is acceptable for actions triggered from a list row.
- **Screen failed to load**: a centered message with a "Try again" button, inside the normal screen frame so the header and back still work.
- **Partial failure**: show what loaded and mark the part that failed with its own retry.
- **Not found or no access**: say which, and offer a way back.
- **Session expired**: go to sign in, then return to where the user was.
- **Crashes in rendering**: an error boundary per screen or navigator with a friendly message and a restart option, instead of a blank screen.

Wording: "We could not load your orders. Check your connection and try again." Never raw error text, codes alone, or "Something went wrong" with no action.

## 6. Offline and poor networks

Mobile connections drop constantly. Plan for it instead of treating it as an exception.

- Detect connectivity with `@react-native-community/netinfo` (or `expo-network`) and show a small persistent banner while offline. Remove it when the connection returns.
- Show cached data when offline, marked as possibly out of date, instead of an error screen.
- Requests have timeouts. Slow is treated as failed after a sensible limit, with retry offered.
- Actions attempted offline either queue and sync later with a visible "pending" marker, or are blocked with a clear explanation. They never fail silently and never discard input.
- Retry automatically for reads with backoff. Do not auto retry non idempotent writes.
- TanStack Query's `onlineManager` and `focusManager` can be wired to NetInfo and AppState so data refetches on reconnect and when the app returns to the foreground.
- Keep data use modest: paginate, request sized images, and avoid refetching unchanged data.

## 7. Destructive actions and undo

Match friction to consequence.

1. **Reversible** (archive, remove from a list, mark as read): act immediately and show a toast with "Undo". Faster and safer than a confirmation.
2. **Hard to reverse** (delete a record): a native alert or action sheet with a destructive styled button.
3. **Catastrophic** (delete an account): a dedicated screen that states the consequences and requires typing a confirmation word or reauthenticating.

```tsx
Alert.alert(
  `Delete "${trip.name}"?`,
  "This removes the trip and its 12 photos. This cannot be undone.",
  [
    { text: "Cancel", style: "cancel" },
    { text: "Delete trip", style: "destructive", onPress: () => remove.mutate(trip.id) },
  ],
);
```

- The title names the action and the object. The body states the consequence. Buttons are "Cancel" and the specific verb, never "Yes" and "No".
- Keep destructive controls away from frequent ones, and out of the easiest thumb position.
- Swipe to delete either asks for confirmation or offers undo.

## 8. Optimistic updates

For quick, low risk, reversible actions (like, favorite, toggle, reorder, mark done), update the screen at once and reconcile with the server afterwards. On a phone with a slow connection this makes the difference between an app that feels instant and one that feels stuck.

- On failure, revert the change and tell the user with a toast.
- Pair with a light haptic at the moment of the tap.
- Do not use for payments, sends that cannot be recalled, or anything where showing a false success would mislead.
- With TanStack Query: `onMutate` to snapshot and update the cache, `onError` to restore, `onSettled` to invalidate.

## 9. Permissions

- Ask at the moment the feature is used, never on first launch in a batch.
- Before the system prompt, explain in one sentence what the permission enables. The system prompt can be shown only once on iOS, so a declined prompt is expensive.
- If declined, keep the app usable with a manual alternative (type an address instead of using location, pick a file instead of using the camera).
- If the feature truly needs a permission that was denied, explain and offer a button that opens the app's system settings (`Linking.openSettings()`).
- Push notification permission is requested after the user has seen value, with a clear statement of what they will receive.

## 10. Disabled states

- A disabled control needs a visible reason nearby. Tooltips do not exist on touch, so use helper text under the control.
- Prefer leaving the primary button enabled and explaining what is missing when it is pressed.
- Hide actions the user can never perform. Show as disabled, with a reason, those that are temporarily unavailable.
- Disabled styling must still be legible. Set `accessibilityState={{ disabled: true }}` so screen readers announce it.
