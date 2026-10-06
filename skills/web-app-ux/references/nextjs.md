# Next.js

The other references assume a client side app: React Router, TanStack Query, Express. In Next.js the same UX rules hold, but many are met by framework conventions instead. This file maps each rule to the Next.js way. It does not repeat the rules.

## Contents
1. Detect the setup and the version
2. Pages Router
3. The five states with route files
4. Server and client components
5. Forms with Server Actions
6. Optimistic updates
7. URL state
8. Navigation
9. Images
10. API side
11. Auth
12. Common mistakes

## 1. Detect the setup and the version

Next.js changes often, and names move between versions. Do not write version specific APIs from memory.
1. Read `next` in `package.json` and note the major and minor version. Also note `react`.
2. Look for an `app/` folder (App Router) or a `pages/` folder (Pages Router). Check `src/app` too. Some projects have both.
3. Open the official docs for that version before using any API below (nextjs.org/docs, pick the matching version). Prefer what an existing file in the project already does.

Names that have changed between versions, so always check:
- The retry prop `error.tsx` receives (`reset` in older versions, `retry` in recent docs).
- The request interception file (`middleware.ts` in older versions, `proxy.ts` in recent docs).
- `params` and `searchParams` are promises in recent versions, so they are awaited.
- The `Image` prop that preloads an above the fold image (`priority` in older versions, `preload` in recent docs).
- Caching defaults and Cache Components, which change what is static and what streams.

The App Router is the main path in this file.

## 2. Pages Router

The client side patterns in the other references apply as they are: TanStack Query or SWR, react-hook-form, `useRouter` from `next/router`. Loading and error states are your own components, not route files. Use `next/link`, `next/image`, and `next/head` or the project's head helper. Sections 7 to 9 still help where they do not name an App Router file.

## 3. The five states with route files

In the App Router, each state has a file. A route with none of them freezes on navigation and crashes on errors.

- **loading.tsx**: shown at once on navigation while the page streams in. It wraps `page.tsx` in a Suspense boundary. It does not wrap the `layout.tsx` of the same folder, so slow data in a layout is not covered. Fetch in the page, or put a Suspense boundary around the slow part of the layout.
- **error.tsx**: a client component with a visible retry button. Say what happened in plain words, never `error.message`, because server errors can carry internal detail. Log `error.digest` if the project has logging.
- **not-found.tsx**: shown for `notFound()` and for unknown URLs. Say what was not found and link to the list or home. Call `notFound()` before any slow await, so the server can still send a real 404 status.
- **global-error.tsx**: the last resort. It must render its own `html` and `body`.

Skeleton rules from `actions-and-feedback.md` apply to `loading.tsx`: the skeleton matches the final layout, and it is delayed about 200ms. Fast navigations then show no loader. Reuse the project's delayed skeleton wrapper if one exists.

```tsx
// app/projects/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" className="opacity-0 [animation:delayed-in_150ms_ease-out_200ms_forwards]">
      <Skeleton className="mb-6 h-8 w-48" />
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="mb-2 h-12 w-full" />
      ))}
    </div>
  );
}
```

Use Suspense boundaries so one slow section does not block the page. Render the header and filters at once, and wrap only the slow list or chart in `<Suspense fallback={<ListSkeleton />}>`. A boundary closer to the slow data is better than one `loading.tsx` over the whole page.

Keep old content visible on refetch. Navigations in the App Router are transitions, so the old screen stays until the new one is ready. When a filter or page change should dim the list instead of replacing it with a skeleton, wrap the `router.replace` in `useTransition` and use `isPending` for `opacity-60` and `aria-busy`. For links, `useLinkStatus` can show pending state on the clicked link (check the installed version supports it).

## 4. Server and client components

Fetch on the server by default. A server component can read the database or call the API directly, with no loading flag, no waterfall from the browser, and no client bundle cost. Keep `"use client"` on the smallest component that needs state, effects, or browser APIs, such as the search box or the dialog, not on the whole page.

Use a client component with a query library when the data is driven by the user after load:
- Search as you type with results that update on every keystroke.
- Optimistic updates that must be rolled back.
- Polling or live data.
- Infinite scroll.

You can seed the client cache with data fetched on the server so the first paint is not empty. The rules in `mern-data-ux.md` section 4 (keep previous data, retry, one cache) then apply unchanged.

## 5. Forms with Server Actions

Use `useActionState` in a client component. It gives the last result, a form action, and a `pending` flag. The action returns expected errors as values. It does not throw them, because thrown errors go to `error.tsx` and wipe the form.

The pieces, mapped to the rules in `forms.md`:
- **Pending**: `pending` from `useActionState` disables the submit button and changes its label. This also blocks a double submit.
- **Field errors**: the action returns `fields`, keyed by input `name`. Show each under its field with `aria-invalid` and `aria-describedby`.
- **Keep input**: React clears an uncontrolled form after an action finishes. Return the submitted values and use them as `defaultValue`.
- **Form level error**: a message for failures that belong to no field, shown in an `Alert` above the buttons.
- **Success**: for an edit, return `{ ok: true }` and show a toast. For a create, call `redirect` to the new item.
- **Focus**: after a failed submit, move focus to the first invalid field (an effect that runs on the new state).

Share one zod schema. Put it in a plain module that has no `"use server"` or `"use client"`. The action runs it as the real check. The client runs it on blur for early feedback.

```ts
// lib/project-schema.ts
import { z } from "zod";

export const projectSchema = z.object({
  name: z.string().trim().min(1, "Enter a project name").max(50, "Use 50 characters or fewer"),
  email: z.string().trim().email("Enter an email address like name@example.com"),
});

export type ProjectState = {
  values?: Record<string, string>;
  error?: { code: string; message: string; fields?: Record<string, string> };
};

// first message per field, keyed by input name
export function fieldErrors(error: z.ZodError) {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) fields[String(issue.path[0])] ??= issue.message;
  return fields;
}
```

```ts
// app/projects/actions.ts
"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { projectSchema, fieldErrors, type ProjectState } from "@/lib/project-schema";

export async function createProject(_prev: ProjectState, formData: FormData): Promise<ProjectState> {
  const values = Object.fromEntries(formData) as Record<string, string>;
  // check the session here too: an action is a public endpoint
  const parsed = projectSchema.safeParse(values);
  if (!parsed.success) {
    return { values, error: { code: "VALIDATION_FAILED", message: "Check the highlighted fields.", fields: fieldErrors(parsed.error) } };
  }

  let id: string;
  try {
    id = (await db.projects.create(parsed.data)).id;
  } catch (err) {
    if (isDuplicate(err)) {
      return { values, error: { code: "DUPLICATE", message: "That name is already in use.", fields: { name: "This name is already in use." } } };
    }
    console.error(err); // log it, never return it
    return { values, error: { code: "SERVER_ERROR", message: "Something went wrong on our side. Please try again." } };
  }

  revalidatePath("/projects");
  redirect(`/projects/${id}`); // outside try/catch: redirect works by throwing
}
```

```tsx
// app/projects/new/project-form.tsx
"use client";
import { useActionState, useState } from "react";
import { createProject } from "../actions";
import { projectSchema, fieldErrors } from "@/lib/project-schema";

export function ProjectForm() {
  const [state, action, pending] = useActionState(createProject, {});
  const [early, setEarly] = useState<Record<string, string>>({});
  const fields = { ...early, ...state.error?.fields };

  // early feedback on blur, with the same schema the action uses
  function check(e: React.FocusEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    const r = projectSchema.shape[name as "name" | "email"].safeParse(value);
    setEarly((p) => ({ ...p, [name]: r.success ? "" : r.error.issues[0].message }));
  }

  return (
    <form action={action} noValidate className="max-w-xl">
      <FieldGroup>
        {state.error && !state.error.fields && (
          <Alert variant="destructive" role="alert">
            <AlertTitle>Could not create the project</AlertTitle>
            <AlertDescription>{state.error.message}</AlertDescription>
          </Alert>
        )}
        <Field data-invalid={!!fields.name}>
          <FieldLabel htmlFor="project-name">Project name</FieldLabel>
          <Input id="project-name" name="name" defaultValue={state.values?.name} onBlur={check}
            aria-invalid={!!fields.name} aria-describedby="name-error" />
          {fields.name && <FieldError id="name-error">{fields.name}</FieldError>}
        </Field>
        <Field data-invalid={!!fields.email}>
          <FieldLabel htmlFor="owner-email">Owner email</FieldLabel>
          <Input id="owner-email" name="email" type="email" autoComplete="email" inputMode="email"
            defaultValue={state.values?.email} onBlur={check}
            aria-invalid={!!fields.email} aria-describedby="email-error" />
          {fields.email && <FieldError id="email-error">{fields.email}</FieldError>}
        </Field>
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending && <Spinner aria-hidden="true" />}
            {pending ? "Creating..." : "Create project"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => history.back()}>Cancel</Button>
        </div>
      </FieldGroup>
    </form>
  );
}
```

Notes:
- The submit button stays enabled until the submit is in flight, as in `forms.md`.
- With react-hook-form, call the action from `handleSubmit` and map the returned `fields` with `setError`.
- A Server Action is a public endpoint. Check the session and permission inside it, even if the page is protected.
- Where the user lands: after create, go to the new item. After edit, stay and toast. After delete, go to the list. See `navigation.md` section 6.

## 6. Optimistic updates

Use `useOptimistic` for instant changes such as toggling done, adding a comment, or reordering. Apply the change at once, call the action, and let the real data replace it. React drops the optimistic value when the action settles, so a failed action rolls back by itself. A silent rollback is still a bug. When the action returns an error, show a toast that says what failed and offers retry ("Could not save. Your change was undone. Try again.").

When the list lives in a client query cache, use the library's optimistic mutation instead (`mern-data-ux.md` section 5).

## 7. URL state

Search, filters, sort, page, and tab live in the query string. The server page reads `searchParams` (awaited in recent versions) and fetches the right data. A small client component updates the URL.

- Read with the page `searchParams` prop in server components. Use `useSearchParams` only in client components, and wrap them in `<Suspense>`, or a static build can fail.
- Write with `router.replace` while typing, so each keystroke does not add a history entry. Use `push` for discrete choices such as page or tab, so Back works.
- Debounce search about 300ms before updating the URL. Keep the input value in local state so typing is never blocked, and set `q` with `router.replace` inside `startTransition` so `isPending` can dim the list.
- Start from the current params, change one key, and reset `page` to 1 when search or a filter changes.


Use `pending` to dim the list in the page (section 3) so old results stay visible while new ones load.

## 8. Navigation

- Navigation is `next/link` (`Link`). Actions are buttons. A `Link` styled as a button is fine for navigation. Do not wrap a button in a link or use `router.push` in an `onClick` for plain navigation, because middle click and open in new tab break.
- Active link: compare `usePathname()` with the link target in a client component, set `aria-current="page"`, and style it with weight and background, not color alone.
- Page titles: export `metadata` or `generateMetadata` from each `page.tsx` or `layout.tsx`, with a title template in the root layout ("Projects | App"). Every route needs its own title, because screen readers and tabs announce it. `generateMetadata` runs before the page renders, so keep it fast.
- Back links that keep list filters: link back with the saved query string (`/projects?${query}`), or use `router.back()` when the user came from the list. Do not link to a bare `/projects` and lose the filters.
- Redirect after create so Back does not return to the filled form: `redirect` to the new item. Check in the docs for the installed version whether `redirect` pushes or replaces by default, and whether it accepts a replace type.

## 9. Images

Use `next/image` (`Image`), not a bare `img`, for content images.

- Always set `alt` (`alt=""` for decoration). Reserve space so layout does not shift: give `width` and `height`, or use `fill` inside a parent that has `relative` and a fixed size or an `aspect-*` class.
- Set `sizes` for any responsive or `fill` image, such as `sizes="(min-width: 1024px) 33vw, 100vw"`. Without it the browser downloads a larger file than needed.
- Preload only the one above the fold hero or first card image. Check the installed version for the prop name (`priority` or `preload`).
- Remote hosts must be allowed in `next.config`. Missing avatars get an initials fallback, not a broken image.

## 10. API side

The response and error shape in `mern-data-ux.md` sections 1 and 3 is the same in Next.js. Only the plumbing changes.

- **Server Actions**: return the shape as a value, as in section 5: `error: { code, message, fields }`. Do not throw expected errors.
- **Route handlers** (`route.ts`): return `NextResponse.json({ data })` or `NextResponse.json({ error }, { status })`. Use the same status codes: 400, 401, 403, 404, 409, 422, 429, 500. Handlers called from client components and mobile apps need this shape.
- **Server components** do not need the HTTP shape. Call the data function directly. On not found call `notFound()`. On failure let the error reach `error.tsx`.
- Never return stack traces, ORM errors, or raw `error.message` from a database or a library. Log them on the server and return a plain sentence with a stable `code`.

## 11. Auth

- No flash of protected or login content: decide on the server. Check the session in the page or a data access function and `redirect` before any markup is sent. Do not render the page and then redirect from a `useEffect`.
- A layout is not a safe place for the only check, because layouts do not re-render on every navigation. Check close to the data, and again in every Server Action and route handler.
- A request interception file (`proxy.ts` or `middleware.ts`, by version) can do a quick cookie check and redirect early. Treat it as a first filter, not the only guard.
- Return to the original page after sign in: when redirecting to login, pass the path as a `next` query param (`/login?next=/projects/42`). After sign in, redirect to it. Accept only paths that start with a single `/` and not `//`, so the param cannot send users to another site.

## 12. Common mistakes

- **`"use client"` at the top of a whole page or layout** for one button. It moves data fetching to the browser and grows the bundle. Move the interactive part into its own small component.
- **No `loading.tsx`** (or Suspense) on a route that fetches. Clicks seem to do nothing until the data arrives.
- **No `error.tsx` and no `not-found.tsx`.** Failures show a generic crash page.
- **Hydration mismatch** from `new Date()`, `Math.random()`, or locale formatting that differs between server and browser. Format dates with a fixed locale and time zone, use `useId` for ids, and move random values into an effect.
- **Browser storage read during render** (`localStorage`, `window`, `document`). It breaks on the server and causes a flash of the wrong state. Read it in an effect, or store the preference in a cookie and read it on the server.
- **Trusting the client in a Server Action.** Validate with the schema and check permissions in the action every time.
