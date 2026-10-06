# The data layer and UX (Express, MongoDB, React)

Much of what users feel as "bad UX" is caused below the UI: an API that returns everything at once, errors with no usable message, lists that do not update after a change. A good screen needs the backend to cooperate. Read this when writing or changing API routes, Mongoose models, or data fetching code.

## Contents
1. Response shapes
2. List endpoints
3. Error responses
4. Fetching on the client
5. Mutations and optimistic updates
6. Search
7. Auth and sessions
8. Enabling undo and conflict handling
9. Uploads and long operations

## 1. Response shapes

Keep one shape for the whole API so the client can handle every response the same way. If the project already has a convention, follow it. Otherwise:

```js
// success, single resource
{ "data": { "id": "...", "name": "Apollo" } }

// success, list
{ "data": [ ... ], "meta": { "page": 2, "limit": 20, "total": 134 } }

// error
{ "error": { "code": "VALIDATION_FAILED", "message": "Check the highlighted fields.", "fields": { "email": "This email is already in use." } } }
```

- Return `id` as a string, not `_id`, and ISO 8601 dates. Format dates and numbers in the UI, never on the server.
- A create or update returns the full updated resource so the client can put it in the cache without refetching.
- Return only the fields the screen needs (`.select()` and `.lean()` in Mongoose). Large payloads are slow screens.

## 2. List endpoints

Any collection that can grow must support pagination, sorting, and filtering on the server. Sending everything and slicing in the browser works in the demo and fails in production.

```js
// GET /api/projects?page=2&limit=20&sort=-createdAt&q=apollo&status=active
router.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const sort = ALLOWED_SORTS.has(req.query.sort) ? req.query.sort : "-createdAt";

    const filter = { owner: req.user.id };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.q) filter.name = { $regex: escapeRegex(req.query.q), $options: "i" };

    const [data, total] = await Promise.all([
      Project.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
      Project.countDocuments(filter),
    ]);

    res.json({ data: data.map(toDTO), meta: { page, limit, total } });
  } catch (err) {
    next(err);
  }
});
```

- `total` lets the UI show "21 to 40 of 134" and page numbers.
- Cap `limit` and whitelist `sort` fields.
- Add indexes for every field used to filter or sort. An unindexed sort is the usual reason a table takes seconds to load.
- For feeds with infinite scroll, use cursor pagination (`?after=<id>`), which stays correct when new items arrive, and return `meta.nextCursor`.
- A stable default sort (with `_id` as a tiebreaker) prevents items from appearing twice or skipping between pages.

## 3. Error responses

The UI can only show a helpful error if the API sends one.

- Use correct status codes: 400 malformed request, 401 not signed in, 403 not allowed, 404 not found, 409 conflict (duplicate, stale update), 422 validation failed, 429 rate limited, 500 server fault.
- `message` is written for end users in plain language. `code` is a stable machine readable string the client can switch on.
- Validation errors include `fields`, keyed by the same names the form uses, so they can be shown under the right inputs.
- Never send stack traces, Mongoose error dumps, or database details to the client.

```js
// one central error handler, registered last
app.use((err, req, res, next) => {
  if (err.name === "ValidationError") {
    const fields = Object.fromEntries(
      Object.entries(err.errors).map(([key, e]) => [key, e.message]),
    );
    return res.status(422).json({ error: { code: "VALIDATION_FAILED", message: "Check the highlighted fields.", fields } });
  }
  if (err.code === 11000) {
    const key = Object.keys(err.keyPattern ?? {})[0] ?? "value";
    return res.status(409).json({ error: { code: "DUPLICATE", message: `That ${key} is already in use.`, fields: { [key]: `This ${key} is already in use.` } } });
  }
  if (err.name === "CastError") {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "We could not find that item." } });
  }
  if (err.status && err.expose) {
    return res.status(err.status).json({ error: { code: err.code ?? "ERROR", message: err.message } });
  }
  console.error(err);
  res.status(500).json({ error: { code: "SERVER_ERROR", message: "Something went wrong on our side. Please try again." } });
});
```

- Write Mongoose validator messages as user facing sentences, since they travel to the form.
- Validate with the same schema on both sides where possible (zod shared between client and server).

## 4. Fetching on the client

Use one API wrapper so errors are normalized in a single place:

```ts
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public fields?: Record<string, string>) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      ...init,
    });
  } catch {
    throw new ApiError(0, "NETWORK", "You appear to be offline. Check your connection and try again.");
  }
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const e = body?.error;
    throw new ApiError(res.status, e?.code ?? "ERROR", e?.message ?? "Something went wrong. Please try again.", e?.fields);
  }
  return body as T;
}
```

Prefer TanStack Query (or the project's existing data library) over `useEffect` plus `useState`. It provides the loading, error, refetch, cache, and deduplication behavior that hand written fetching always gets partly wrong.

```tsx
const { data, isPending, isError, error, refetch, isPlaceholderData } = useQuery({
  queryKey: ["projects", { page, q, status, sort }],
  queryFn: ({ signal }) => api<ProjectList>(`/projects?${params}`, { signal }),
  placeholderData: keepPreviousData,
});

if (isPending) return <ProjectTableSkeleton />;
if (isError) return <ErrorBlock message={error.message} onRetry={refetch} />;
if (data.meta.total === 0) return hasFilters ? <NoResults onClear={clear} /> : <NoProjectsYet />;
return <ProjectTable rows={data.data} dimmed={isPlaceholderData} />;
```

- The query key includes every parameter, so each view is cached separately and going back is instant.
- `signal` cancels stale requests, which prevents an older, slower response from overwriting a newer one.
- `keepPreviousData` keeps the old page visible while the next loads.
- Handle all four branches (pending, error, empty, data) in that order, every time.
- Retry only idempotent requests, and do not retry 4xx responses.
- If the project uses plain `useEffect` fetching and migrating is out of scope, still implement the same four branches, an `AbortController`, and a guard against setting state after unmount.

## 5. Mutations and optimistic updates

Standard mutation: pending state on the button, invalidate or update the cache on success, show the error on failure.

```tsx
const qc = useQueryClient();
const rename = useMutation({
  mutationFn: (v: { id: string; name: string }) => api(`/projects/${v.id}`, { method: "PATCH", body: JSON.stringify({ name: v.name }) }),
  onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
});
```

Optimistic update for quick, reversible changes:

```tsx
const toggleDone = useMutation({
  mutationFn: (t: Task) => api(`/tasks/${t.id}`, { method: "PATCH", body: JSON.stringify({ done: !t.done }) }),
  onMutate: async (t) => {
    await qc.cancelQueries({ queryKey: ["tasks"] });
    const previous = qc.getQueryData<Task[]>(["tasks"]);
    qc.setQueryData<Task[]>(["tasks"], (old = []) => old.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)));
    return { previous };
  },
  onError: (_err, _t, ctx) => {
    qc.setQueryData(["tasks"], ctx?.previous);
    toast.error("Could not update the task. Your change was undone.");
  },
  onSettled: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
});
```

- Always roll back and tell the user when an optimistic change fails.
- Make create endpoints safe against double submission: disable the button while pending, and for important operations accept an idempotency key.
- After a mutation the user must see their change without refreshing.

## 6. Search

- Debounce input by about 300ms before querying, and cancel in flight requests.
- For small collections a case insensitive regex on an indexed field is fine. Escape user input before building a regex.
- For larger collections use a MongoDB text index or Atlas Search. A leading wildcard regex cannot use an index and gets slow.
- Trim the query, ignore case, and treat an empty query as "no search".
- Return quickly with partial fields for typeahead (limit 5 to 10), and a separate full results endpoint.

## 7. Auth and sessions

- On 401 from any request, redirect to login with the current path as a return parameter, then send the user back there after signing in.
- Refresh tokens silently where the design allows, so users are not signed out mid task.
- While the session is being checked on first load, show a neutral loading state. Do not flash the login page or protected content.
- On 403, show a no permission message. Do not redirect to login, because signing in again will not help.
- Hide or disable actions the current user cannot perform, using permissions returned by the API. The server still enforces them.

## 8. Enabling undo and conflict handling

- **Undo** needs a reversible operation. Use soft delete (`deletedAt` field, filtered out of normal queries) or an archive status, with a restore endpoint. The toast's "Undo" calls restore. Purge old soft deleted records with a scheduled job or a TTL index.
- **Conflicts**: when two people can edit the same record, send `updatedAt` (or a version number) with the update and return 409 if it does not match. The UI then tells the user the record changed and offers to reload or overwrite. Silent last write wins loses work.
- **Timestamps**: enable `timestamps: true` on schemas so the UI can show "Updated 3 hours ago" and sort by recency.

## 9. Uploads and long operations

- Validate file type and size on the client before uploading and again on the server. Tell the user the limits up front.
- Show upload progress (use `XMLHttpRequest` or a library that exposes progress; `fetch` does not report upload progress in most browsers).
- For operations longer than a few seconds (imports, exports, report generation), return 202 with a job id immediately, then poll or use server sent events, and show progress. Let the user leave the page and be notified when it is done.
- Set server and client timeouts, and show a specific message when one is hit.
