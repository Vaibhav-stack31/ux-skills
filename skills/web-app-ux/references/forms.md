# Forms

Forms are where users do the work and where most abandonment happens. The goal is that a user can fill the form once, without guessing, and never lose what they typed.

## Contents
1. Layout
2. Labels and help text
3. Choosing the right control
4. Input attributes
5. Validation
6. Submitting
7. Reference implementation
8. Special cases

## 1. Layout

- One column. Multi column forms break the top to bottom reading path and cause skipped fields. The exception is short, closely related pairs (first and last name, city and postcode) on wide screens.
- Order fields the way a person would say them aloud. Put easy fields first.
- Group related fields under a heading (`FieldSet` and `FieldLegend`, or a plain `fieldset` and `legend`), with more space between groups than within them.
- Size inputs to hint at the expected length. A postcode field should not be as wide as an address field. The form container itself stays around `max-w-xl`.
- Ask only for what is needed now. Every extra field lowers completion.
- Do not ask for what the app already knows or can work out. Prefill from the account, default country, currency, and timezone from the locale, fill city from the postcode, detect the card type from the number. Let the user correct any of it. The app absorbs the complexity so the user does not have to.
- Long forms: split into steps of three to six related fields. Show the position and the step names ("Step 2 of 4: Shipping"), allow going back without losing data, and save drafts so the user can resume later.
- Before the final submit of a multi step form, show a review step that summarizes every answer with an edit link per section. Users should not have to remember what they entered three steps ago.

Button placement:
- Page forms: buttons left aligned under the last field, on the same edge as the inputs. Primary first, then Cancel.
- Dialogs and sheets: buttons in the footer, right aligned, primary last (shadcn `DialogFooter` handles the order and stacks them on mobile).
- Keep destructive actions (Delete account) away from Save, visually separated, usually at the bottom in their own section.

## 2. Labels and help text

- Every input has a visible label above it. Top labels work at every width and are the fastest to scan.
- A placeholder is not a label. It disappears on typing, has low contrast, and is not reliably read by assistive technology. Use placeholders only for format examples, and only when helpful.
- Link label and input with `htmlFor` and `id` so clicking the label focuses the field and screen readers announce it.
- Mark the minority. If most fields are required, mark the optional ones with "(optional)" in the label. If most are optional, mark the required ones.
- Help text goes below the input, always visible, in `text-sm text-muted-foreground`, and is linked with `aria-describedby`. Do not hide instructions in a tooltip.
- State constraints before the user hits them: "At least 8 characters" under a password field, not only as an error afterward.

## 3. Choosing the right control

- 2 to 5 mutually exclusive options: radio group, so all options are visible
- 6 to 15 options: `Select`
- More than 15, or user needs to search: `Combobox` (shadcn `Command` in a `Popover`)
- Multiple choices from a short list: checkboxes
- A setting that takes effect immediately: `Switch`
- A choice that is submitted with the form: checkbox, not a switch
- Yes or no where neither should be preselected: two radio buttons
- Dates: a date picker that also accepts typed input. For birth dates, three selects or a typed field are faster than paging a calendar back decades.
- Numbers used for counting: number input with a stepper. Numbers that are really codes (phone, card, postcode, OTP): text input with `inputMode="numeric"`, because `type="number"` drops leading zeros and reacts to scroll.
- Long text: `Textarea` that grows with content, with a visible character count if there is a limit

Give selects and radio groups a sensible default when one option is clearly the most common.

A default never opts the user into something they did not choose. Marketing emails, data sharing, paid add ons, and agreement to terms or privacy policies always start unchecked. See `actions-and-feedback.md` section 9.

## 4. Input attributes

Correct attributes give users the right mobile keyboard and working autofill. Missing them is invisible on a desktop and painful on a phone.

- Email: `type="email" autoComplete="email" inputMode="email"`, plus `autoCapitalize="none"` and `spellCheck={false}`
- New password: `type="password" autoComplete="new-password"`
- Login password: `type="password" autoComplete="current-password"`
- Name: `autoComplete="name"` (or `given-name`, `family-name`)
- Phone: `type="tel" autoComplete="tel"`
- One time code: `inputMode="numeric" autoComplete="one-time-code"`
- Address: `street-address`, `address-level2`, `postal-code`, `country-name`
- Search: `type="search"` with `enterKeyHint="search"`
- URL: `type="url" inputMode="url"`

Also:
- Allow paste everywhere, including passwords and codes.
- Provide a show or hide toggle on password fields. A confirm password field is unnecessary when the toggle exists.
- Trim whitespace before validating. Accept common formats (spaces in phone and card numbers) and normalize them in code instead of rejecting them.
- Show long numbers and codes in groups so they are easy to read and check: card numbers in fours, phone numbers in the local pattern, IBANs in fours, one time codes and reference numbers in threes or fours. Group them when displaying, and optionally while typing, but store them without spaces.
- Use `autoFocus` on the first field only when the form is the sole purpose of the view, such as a dialog or a login page.

## 5. Validation

Timing:
1. Do not validate while the user is still typing a field for the first time.
2. Validate a field when it loses focus (`mode: "onBlur"` in react-hook-form).
3. Once a field has shown an error, revalidate on every change so the error clears the moment it is fixed (`reValidateMode: "onChange"`).
4. Validate everything on submit.

Display:
- Show the error directly under its field, in the destructive color with an icon or clear wording so it does not rely on color. Set `aria-invalid` on the input and link the message with `aria-describedby`.
- On a failed submit, move focus to the first invalid field. For long forms, also show a summary at the top with links to each problem.
- Never clear the form on error. Never clear the password field on a failed login unless security policy requires it.

Wording:
- Say what is wrong and how to fix it: "Enter an email address like name@example.com", not "Invalid input".
- Do not blame: avoid "You entered an invalid...".
- Be specific about limits: "Must be 50 characters or fewer (currently 63)".

Server errors:
- Field level errors from the API (duplicate email, taken username) are mapped onto the matching field with `form.setError`. See `mern-data-ux.md` for the response shape.
- Errors that are not tied to a field (network failure, server error) appear in an alert at the top of the form or above the buttons, with the form contents intact.

Use the same schema (zod or similar) on client and server so rules cannot drift. In Next.js, forms use Server Actions; see `nextjs.md` section 5.

## 6. Submitting

- Keep the submit button enabled. A disabled submit gives no explanation of what is missing, and disabled buttons are invisible to many keyboard and screen reader users. Let the user press it and show them what to fix. The exception is while a submit is in flight.
- While submitting: disable the button, show a spinner with a progressive label ("Saving..."), and keep the button width stable so the layout does not jump.
- Pressing Enter in a single line field submits the form. This works automatically when you use a real `<form>` with `onSubmit` and a `type="submit"` button.
- Give non submit buttons inside a form `type="button"`, otherwise they submit it.
- On success: confirm it (toast or inline) and move the user forward. After creating something, go to the new item. After editing, stay in place with a confirmation.
- On failure: keep every value, show the error, re-enable the button.
- Warn before leaving with unsaved changes (router blocker plus `beforeunload`), but only if the form is actually dirty.
- For settings pages, either save each control on change with visible confirmation, or use one explicit Save. Do not mix both on one page.

## 7. Reference implementation

react-hook-form, zod, and the shadcn `Field` components. If the project has the older `Form` components, use the same structure with `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormDescription`, and `FormMessage`.

```tsx
const schema = z.object({
  name: z.string().trim().min(1, "Enter a project name").max(50, "Use 50 characters or fewer"),
  email: z.string().trim().email("Enter an email address like name@example.com"),
});
type Values = z.infer<typeof schema>;

export function ProjectForm({ onDone }: { onDone: (id: string) => void }) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "" },
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const create = useMutation({
    mutationFn: api.projects.create,
    onSuccess: (project) => {
      toast.success("Project created");
      onDone(project.id);
    },
    onError: (err: ApiError) => {
      // field errors from the server go back onto their fields
      Object.entries(err.fields ?? {}).forEach(([key, message]) =>
        form.setError(key as keyof Values, { message }),
      );
      if (!err.fields) form.setError("root", { message: err.message });
    },
  });

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((values) => create.mutate(values))}
      className="max-w-xl"
    >
      <FieldGroup>
        {form.formState.errors.root && (
          <Alert variant="destructive" role="alert">
            <AlertCircle aria-hidden="true" />
            <AlertTitle>Could not create the project</AlertTitle>
            <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
          </Alert>
        )}

        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="project-name">Project name</FieldLabel>
              <Input
                {...field}
                id="project-name"
                autoComplete="off"
                aria-invalid={fieldState.invalid}
              />
              <FieldDescription>Shown to everyone on your team.</FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="owner-email">Owner email</FieldLabel>
              <Input
                {...field}
                id="owner-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <div className="flex gap-2">
          <Button type="submit" disabled={create.isPending}>
            {create.isPending && <Spinner aria-hidden="true" />}
            {create.isPending ? "Creating..." : "Create project"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => history.back()}>
            Cancel
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
```

What this covers: visible linked labels, blur then change validation, plain language messages, server field errors mapped to fields, a form level error that keeps input, a pending button that cannot double submit, and `noValidate` so the browser's own bubbles do not compete with yours.

## 8. Special cases

- **Search and filter inputs**: not a form submit. Debounce by about 300ms, show a clear button, reflect the value in the URL. See `data-display.md`.
- **Inline edit**: click to edit, Enter saves, Escape cancels, and show saving and saved states.
- **File upload**: accept drag and drop and click, state allowed types and size before upload, show per file progress, allow removal, and report errors per file.
- **Login**: one page, email then password, a visible "Forgot password?" link, and a generic error ("Email or password is incorrect") so accounts cannot be probed.
- **Forms in dialogs**: keep them short (up to about five fields). Longer forms belong on a page or in a side `Sheet`. Closing a dirty dialog asks for confirmation.
