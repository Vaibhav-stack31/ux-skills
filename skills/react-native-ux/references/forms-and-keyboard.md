# Forms and the keyboard

Typing on a phone is slow and error prone, and the keyboard covers about half the screen. Good mobile forms ask for less, pick the right keyboard, let autofill do the work, and keep the focused field and the submit button visible.

## Contents
1. Layout
2. Labels and help
3. Input configuration
4. Keyboard avoidance
5. Moving between fields and dismissing
6. Choosing controls
7. Validation
8. Submitting
9. Reference implementation

## 1. Layout

- One column, full width inputs, labels above.
- Input height at least 48. Text inside at 16 or larger.
- Ask for the minimum. Every field removed helps more on mobile than anywhere else. Prefill from what the app already knows (profile, location with permission, last used values).
- Split long forms into steps of three to six fields with a progress indicator. Keep data when going back.
- Group related fields under small headings, with more space between groups than within them.
- The form scrolls. Do not assume it fits.
- The submit button is full width, at the end of the form or pinned above the keyboard.

## 2. Labels and help

- Every input has a visible label above it. A placeholder is not a label: it vanishes on typing and has low contrast.
- Connect the label for screen readers with `accessibilityLabel` on the input (or `accessibilityLabelledBy` with the label's `nativeID` on Android).
- Mark optional fields with "(optional)" when most are required.
- Help text sits under the input in muted text and is always visible.
- State format rules before the user types ("At least 8 characters").

## 3. Input configuration

The right props give the right keyboard and working autofill. This is the largest single improvement available for mobile forms.

- **Email**: `keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress"`
- **Password (sign in)**: `secureTextEntry autoComplete="current-password" textContentType="password"`
- **Password (new)**: `secureTextEntry autoComplete="new-password" textContentType="newPassword"`
- **One time code**: `keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode"` (enables SMS code autofill)
- **Phone**: `keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber"`
- **Name**: `autoCapitalize="words" autoComplete="name" textContentType="name"`
- **Whole numbers**: `keyboardType="number-pad"`. **Decimals**: `keyboardType="decimal-pad"`, and accept both comma and dot as the decimal separator.
- **Address**: `autoComplete="street-address"`, `"postal-code"`, and matching `textContentType` values
- **URL**: `keyboardType="url" autoCapitalize="none" autoCorrect={false}`
- **Search**: `returnKeyType="search"` and `clearButtonMode="while-editing"` on iOS
- **Usernames, codes, ids**: `autoCapitalize="none" autoCorrect={false} spellCheck={false}`

Also:
- Provide a show or hide toggle for password fields, with an accessible label.
- Allow paste everywhere.
- Accept input in common formats and normalize in code (spaces in phone and card numbers, trailing spaces in emails).
- Use `autoFocus` on the first field only when the screen's sole purpose is that form, and never on a screen the user is still reading.
- Set `multiline` with a minimum height for long text, and `textAlignVertical="top"` on Android.

## 4. Keyboard avoidance

The focused input and the submit action must stay visible. Check what the project has installed and use it consistently.

**If `react-native-keyboard-controller` is installed** (preferred, consistent on both platforms):

```tsx
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";

<View className="flex-1 bg-background">
  <KeyboardAwareScrollView
    bottomOffset={24}
    keyboardShouldPersistTaps="handled"
    contentContainerStyle={{ padding: 16, gap: 16 }}
  >
    {/* fields */}
  </KeyboardAwareScrollView>
  <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
    <View style={{ paddingBottom: Math.max(insets.bottom, 16) }} className="border-t border-border bg-background px-4 pt-3">
      <Button onPress={submit}><Text>Continue</Text></Button>
    </View>
  </KeyboardStickyView>
</View>
```

**With core React Native only**:

```tsx
<KeyboardAvoidingView
  style={{ flex: 1 }}
  behavior={Platform.OS === "ios" ? "padding" : undefined}
  keyboardVerticalOffset={headerHeight}
>
  <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 16 }}>
    {/* fields and submit button */}
  </ScrollView>
</KeyboardAvoidingView>
```

- `keyboardVerticalOffset` must equal the height of anything above the view (the header), from `useHeaderHeight()`. A wrong offset is the usual cause of inputs still being covered.
- On Android the window resizes by default, so `behavior` is normally left undefined there. Adding padding on top causes a double shift.
- `ScrollView` also accepts `automaticallyAdjustKeyboardInsets` on iOS, which is enough for simple forms.
- Inputs inside bottom sheets need the sheet library's own input component or keyboard settings (for example `BottomSheetTextInput` with `@gorhom/bottom-sheet`).
- Chat style screens keep the composer attached to the top of the keyboard and the message list scrolled to the newest message.

## 5. Moving between fields and dismissing

- The return key advances through the form: `returnKeyType="next"` and `onSubmitEditing={() => nextRef.current?.focus()}` on each field, with `submitBehavior="submit"` (or `blurOnSubmit={false}` on older versions) so the keyboard does not flicker closed between fields.
- The last field uses `returnKeyType="done"` or `"go"` and submits the form.
- `keyboardShouldPersistTaps="handled"` on the scroll view. Without it, the first tap on a button only closes the keyboard and the user has to tap twice.
- Let users dismiss the keyboard by dragging the scroll view (`keyboardDismissMode="on-drag"` or `"interactive"` on iOS) or by tapping outside inputs.
- Number pads have no return key on iOS. Provide a "Done" control (a keyboard toolbar or accessory view) or submit automatically when the expected length is reached, as with codes.
- After a successful submit, dismiss the keyboard (`Keyboard.dismiss()`).

## 6. Choosing controls

Typing is the most expensive input on a phone. Prefer taps.

- 2 to 4 options: segmented control or a row of selectable chips
- 5 to 15 options: a bottom sheet list or the native picker
- Many options: a full screen searchable list that returns the choice
- On or off with immediate effect: `Switch`
- Dates and times: the native date picker (`@react-native-community/datetimepicker` or the project's equivalent), which users already know
- Quantities: a stepper with minus and plus buttons of at least 48
- Location, photos, contacts: offer the device capability, request permission at the moment it is needed with a sentence explaining why, and provide a manual fallback if it is declined
- Selected state must be visible without relying on color alone (a check mark or filled indicator)

## 7. Validation

- Validate a field when it loses focus, then live once it has shown an error. Validate everything on submit. Do not show errors while the user is still typing for the first time.
- Show the error under its field in the destructive color with clear text, and mark the input border. Announce it for screen readers (see `accessibility.md`).
- On a failed submit, scroll to and focus the first invalid field.
- Messages say what to fix: "Enter a phone number with area code", not "Invalid".
- Map field errors from the server back onto the matching fields. Show other failures in a banner at the top of the form or above the submit button.
- Never clear the form on error.
- Use the same schema as the server (zod or similar) where possible.

## 8. Submitting

- The submit button stays enabled until pressed. While the request is in flight it is disabled and shows a spinner with a progressive label ("Saving...").
- Ignore repeated taps while pending.
- On success: dismiss the keyboard, confirm (toast, haptic, or the visible result), and navigate forward. Use `router.replace` or reset the stack after a create so Back does not return to the filled form.
- On failure: keep all values, show the error, re-enable the button. If offline, say so specifically.
- Leaving a dirty form by back button or swipe asks for confirmation (`usePreventRemove` in React Navigation), but only when there are real changes.
- Long forms save drafts locally so an interruption (a phone call, the app being closed in the background) does not lose work.

## 9. Reference implementation

react-hook-form with zod, using project components where they exist.

```tsx
const schema = z.object({
  email: z.string().trim().email("Enter an email address like name@example.com"),
  password: z.string().min(8, "Use at least 8 characters"),
});
type Values = z.infer<typeof schema>;

export default function SignInScreen() {
  const passwordRef = useRef<TextInput>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { control, handleSubmit, setError, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const signIn = useMutation({
    mutationFn: api.auth.signIn,
    onSuccess: () => { Keyboard.dismiss(); router.replace("/(tabs)"); },
    onError: (err: ApiError) => setError("root", { message: err.message }),
  });
  const submit = handleSubmit((values) => { if (!signIn.isPending) signIn.mutate(values); });

  return (
    <KeyboardAwareScrollView
      bottomOffset={24}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: 16, gap: 16 }}
    >
      {errors.root && (
        <View accessibilityRole="alert" className="rounded-lg border border-destructive bg-destructive/10 p-3">
          <Text className="text-base text-destructive">{errors.root.message}</Text>
        </View>
      )}

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <View className="gap-1.5">
            <Text nativeID="email-label" className="text-sm font-medium text-foreground">Email</Text>
            <Input
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              accessibilityLabel="Email"
              accessibilityLabelledBy="email-label"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => passwordRef.current?.focus()}
              aria-invalid={!!errors.email}
              className="min-h-12 text-base"
            />
            {errors.email && <Text className="text-sm text-destructive">{errors.email.message}</Text>}
          </View>
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <View className="gap-1.5">
            <Text nativeID="password-label" className="text-sm font-medium text-foreground">Password</Text>
            <View className="flex-row items-center gap-2">
              <Input
                ref={passwordRef}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                accessibilityLabel="Password"
                accessibilityLabelledBy="password-label"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={submit}
                aria-invalid={!!errors.password}
                className="min-h-12 flex-1 text-base"
              />
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                className="size-12 items-center justify-center rounded-md active:bg-muted"
              >
                {showPassword ? <EyeOff size={20} className="text-foreground" /> : <Eye size={20} className="text-foreground" />}
              </Pressable>
            </View>
            {errors.password && <Text className="text-sm text-destructive">{errors.password.message}</Text>}
          </View>
        )}
      />

      <Button onPress={submit} disabled={signIn.isPending} className="min-h-12">
        {signIn.isPending && <ActivityIndicator />}
        <Text>{signIn.isPending ? "Signing in..." : "Sign in"}</Text>
      </Button>
    </KeyboardAwareScrollView>
  );
}
```
