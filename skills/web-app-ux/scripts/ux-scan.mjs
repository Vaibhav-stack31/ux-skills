#!/usr/bin/env node
// Heuristic UX scanner for React web code (Tailwind, shadcn/ui).
// Usage: node ux-scan.mjs <dir-or-file> [--json]
// Understands Next.js App Router route files (loading, error, not-found).
// No dependencies. Findings are hints to verify, not verdicts.
import fs from "node:fs";
import path from "node:path";

const SKIP_FILE = /components[\\/]ui[\\/]/; // vendored shadcn primitives

const ASYNC = /\buse(Query|SWR|InfiniteQuery|SuspenseQuery)\s*[(<]|\bfetch\(|\baxios\b|\bapi\s*[.(<]/;
const MAPS_JSX = /\.map\(\s*(?:async\s*)?\(?[^)]*\)?\s*=>\s*[({]?\s*(?:return\s*)?</;

// Hand built modals: a dialog role, a native <dialog>, or a class string with fixed, inset-0, and a backdrop color.
const DIALOG_MARKUP = /role=["'](?:alert)?dialog["']|aria-modal=|<dialog[\s>]/;
const BACKDROP_CLASS = /\bbg-(?:black|white|background|foreground|(?:gray|slate|zinc|neutral|stone)-\d+)\/\d+|\bbg-opacity-\d+|\bbackdrop-/;
const isBackdropClass = (s) => /\bfixed\b/.test(s) && /\binset-0\b/.test(s) && BACKDROP_CLASS.test(s);
const overlayIndex = (s) => {
  const d = s.search(DIALOG_MARKUP);
  if (d !== -1) return d;
  const m = [...s.matchAll(/["'`]([^"'`\n]+)["'`]/g)].find((x) => isBackdropClass(x[1]));
  return m ? m.index : -1;
};
const hasCustomOverlay = (s) => overlayIndex(s) !== -1;
const MODAL_LIB = /from\s+["'][^"']*(?:components\/ui\/(?:dialog|alert-dialog|sheet|drawer)|@radix-ui\/react-(?:alert-)?dialog|@base-ui[^"']*|@headlessui\/react|vaul|react-aria(?:-components)?|@mui\/material[^"']*|@chakra-ui[^"']*|@mantine[^"']*|antd)["']/;
const BACKGROUND_BLOCKED = /\binert\b|\.showModal\(|FocusTrap|focus-trap|FocusLock|focus-lock|FocusScope|useFocusTrap/;
const SCROLL_LOCKED = /document\.(?:body|documentElement)\.style\.overflow|document\.(?:body|documentElement)\.classList\.(?:add|toggle)\([^)]*overflow-hidden|RemoveScroll|remove-scroll|useScrollLock|useLockBodyScroll|useBodyScrollLock|body-scroll-lock|disableBodyScroll|lockScroll|dialog:modal|dialog\[open\]/;

const TAG_RULES = [
  { id: "clickable-non-button", sev: "high", tags: ["div", "span", "li", "p", "td", "section", "img", "svg"],
    test: (a) => has(a, "onClick") && !has(a, "role"),
    msg: "onClick on a non interactive element. Use <button> or <a> so it is focusable and works with a keyboard." },
  { id: "clickable-row", sev: "medium", tags: ["tr", "TableRow"],
    test: (a) => has(a, "onClick"),
    msg: "Clickable table row. Make sure the first cell also contains a real link so keyboard and new tab work." },
  { id: "img-alt", sev: "high", tags: ["img", "Image"],
    test: (a) => !has(a, "alt") && !/\{\s*\.\.\./.test(a),
    msg: "Image without alt. Describe it, or use alt=\"\" if decorative." },
  { id: "icon-button-name", sev: "high", tags: ["Button", "button"],
    test: (a) => /size=["'{]+["']?icon/.test(a) && !has(a, "aria-label", "aria-labelledby", "title"),
    msg: "Icon only button without aria-label (ignore if it contains sr-only text)." },
  { id: "anchor-without-href", sev: "medium", tags: ["a"],
    test: (a) => (!has(a, "href") && !/\{\s*\.\.\./.test(a)) || /href=["']#["']/.test(a),
    msg: "Anchor without a real href. Use a button for actions and a real URL for navigation." },
  { id: "input-without-label", sev: "medium", tags: ["input", "Input", "textarea", "Textarea"],
    test: (a) => !has(a, "id", "aria-label", "aria-labelledby") && !/\{\s*\.\.\./.test(a) && !/type=["'](hidden|submit|button|checkbox|radio|file)["']/.test(a),
    msg: "Input with no id or aria-label, so it is probably not linked to a visible label." },
  { id: "input-autocomplete", sev: "low", tags: ["input", "Input"],
    test: (a) => /type=["'](email|password|tel)["']/.test(a) && !has(a, "autoComplete"),
    msg: "Email, password, or phone input without autoComplete. Autofill and password managers depend on it." },
  { id: "button-type", sev: "low", tags: ["button"],
    test: (a) => !has(a, "type") && !/\{\s*\.\.\./.test(a),
    msg: "Native <button> without type. Inside a form it will submit; add type=\"button\" or type=\"submit\"." },
];

const LINE_RULES = [
  { id: "focus-removed", sev: "high", re: /\boutline-none\b|outline:\s*(none|0)\b/, unless: /focus-visible:|focus:ring|focus:outline|focus-within:/,
    msg: "Focus outline removed with no visible replacement on the same element." },
  { id: "positive-tabindex", sev: "medium", re: /tabIndex=\{?["']?[1-9]/,
    msg: "Positive tabIndex breaks the natural tab order." },
  { id: "native-dialog", sev: "medium", re: /(?<![.\w])(?:window\.)?(?:alert|confirm|prompt)\(/,
    msg: "Native alert, confirm, or prompt. Use AlertDialog, Dialog, or a toast with specific wording." },
  { id: "low-contrast-text", sev: "medium", re: /\btext-(gray|slate|zinc|neutral|stone)-(200|300|400)\b/, unless: /dark:text-|\bdark\b/,
    msg: "Light gray text. Check it reaches 4.5:1 contrast; prefer text-muted-foreground." },
  { id: "tiny-text", sev: "medium", re: /\btext-\[(?:[0-9]|1[01])px\]|font-size:\s*(?:[0-9]|1[01])px/,
    msg: "Text smaller than 12px." },
  { id: "viewport-height", sev: "low", re: /\b(min-)?h-screen\b/,
    msg: "h-screen uses 100vh, which is cut off by mobile browser bars. Use min-h-dvh or h-dvh." },
  { id: "arbitrary-spacing", sev: "low", re: /\b(?:p[xytblr]?|m[xytblr]?|gap(?:-[xy])?|space-[xy]|top|left|right|bottom|inset)-\[\d+(?:px|rem)\]/,
    msg: "Arbitrary spacing value. Use the spacing scale so alignment stays consistent." },
  { id: "hardcoded-color", sev: "low", re: /\b(?:bg|text|border|ring|fill|stroke)-\[#[0-9a-fA-F]{3,8}\]/,
    msg: "Hard coded hex color. Use a semantic token so themes and dark mode work." },
  { id: "raw-palette-color", sev: "low", re: /\b(?:bg|text|border)-(?:red|blue|green|purple|indigo|pink|violet|emerald|amber|yellow|orange|teal|cyan|sky|rose|fuchsia|lime)-\d{2,3}\b/,
    msg: "Raw palette color. In a tokenized project use semantic tokens (primary, destructive, muted)." },
  { id: "decoration", sev: "low", re: /\bbg-(?:gradient|linear)-to-|\bbackdrop-blur|\banimate-(?:pulse|bounce|ping)\b/, unless: /Skeleton|skeleton/,
    msg: "Decorative effect (gradient, blur, or looping animation). Keep it only if it serves the task." },
  { id: "hover-only", sev: "medium", re: /\b(?:hidden|invisible|opacity-0)\b[^"'`]*\bgroup-hover:(?:block|flex|inline-flex|visible|opacity-100)\b/, unless: /group-focus-within:|focus-within:|focus:/,
    msg: "Content revealed on hover only. It is unreachable by touch and keyboard; also reveal on focus or keep it visible." },
];

// Next.js App Router. ctx = { appRoot, isPage, isClient, hasLoading, hasError }.
// A server component inside a route folder is covered when loading.* or error.* sits in the
// same folder or any parent route folder up to the app root.
const NEXT_RULES = [
  { id: "next-page-without-loading", sev: "medium",
    test: (s, c) => c.appRoot && c.isPage && /export\s+default\s+async\s+function/.test(s) && !c.hasLoading && !/<Suspense\b/.test(s),
    msg: "Async page with no loading.tsx above it and no Suspense. Navigation will feel frozen while it fetches." },
  { id: "next-form-action-without-pending", sev: "high",
    test: (s) => [...openTags(s)].some((t) => t.name === "form" && /\baction=\{/.test(t.attrs)) && !/useActionState|useFormStatus|useTransition|\bisPending\b|\bpending\b/.test(s),
    msg: "Form submits to a Server Action but the file has no pending state. Use useActionState or useFormStatus so the button shows progress and cannot be double fired." },
  { id: "next-use-client-page", sev: "low",
    test: (s, c) => c.appRoot && c.isPageOrLayout && c.isClient,
    msg: "\"use client\" at the top of a page or layout. Check that the whole route needs to be a client component; move the interactive part into a small component." },
];

const FILE_RULES = [
  { id: "async-without-loading", sev: "high",
    test: (s, c) => !(c.appRoot && !c.isClient && (c.hasLoading || c.isPage)) && ASYNC.test(s) && !/isLoading|isPending|isFetching|\bloading\b|Skeleton|Spinner|Suspense|status\s*===/.test(s),
    msg: "Fetches data but shows no loading state." },
  { id: "async-without-error", sev: "high",
    test: (s, c) => !(c.appRoot && !c.isClient && c.hasError) && ASYNC.test(s) && !/isError|\berror\b|\bcatch\b|ErrorBoundary|onError/.test(s),
    msg: "Fetches data but has no error handling the user can see." },
  { id: "collection-without-empty", sev: "medium",
    test: (s) => ASYNC.test(s) && MAPS_JSX.test(s) && !/\.length\s*(?:===|==|!==|<|>)|!\s*\w+(?:\?\.|\.)[\w.?]*length|total\s*(?:===|==)\s*0|<Empty|EmptyState|NoResults|isEmpty/.test(s),
    msg: "Renders a fetched collection with no visible empty state." },
  { id: "mutation-without-pending", sev: "high",
    test: (s) => /useMutation\s*[(<]|onSubmit=/.test(s) && !/isPending|isSubmitting|isLoading|\bsubmitting\b|\bloading\b|\bpending\b|disabled=/.test(s),
    msg: "Submits or mutates with no pending state, so it can be fired twice and gives no feedback." },
  { id: "raw-table-overflow", sev: "medium",
    test: (s) => /<table[\s>]/.test(s) && !/overflow-x-auto|overflow-auto|ScrollArea/.test(s),
    msg: "Raw <table> without a horizontal scroll container. It will overflow on small screens." },
  { id: "modal-background-reachable", sev: "high",
    test: (s) => hasCustomOverlay(s) && !MODAL_LIB.test(s) && !BACKGROUND_BLOCKED.test(s),
    at: (s) => lineAt(s, Math.max(0, overlayIndex(s))),
    msg: "Hand built modal with no inert background or focus trap. Tab and screen readers can reach the page behind it. Use the project's Dialog, open a native <dialog> with showModal(), or set inert on the rest of the page and trap focus." },
  { id: "modal-no-scroll-lock", sev: "medium",
    test: (s) => (hasCustomOverlay(s) || /\.showModal\(/.test(s)) && !MODAL_LIB.test(s) && !SCROLL_LOCKED.test(s),
    at: (s) => lineAt(s, Math.max(0, overlayIndex(s), s.search(/\.showModal\(/))),
    msg: "Hand built modal with no scroll lock. The page behind it still scrolls. Use the project's Dialog, or lock body scroll while open and restore it on close." },
  { id: "effect-fetching", sev: "low",
    test: (s) => /useEffect\(/.test(s) && /\bfetch\(|\baxios\b/.test(s) && !/AbortController|signal/.test(s),
    msg: "Fetching in useEffect without cancellation. Stale responses can overwrite newer ones; prefer the project's query library." },
];

// engine
const args = process.argv.slice(2);
const asJson = args.includes("--json");
const root = path.resolve(args.find((a) => !a.startsWith("--")) || ".");
const IGNORE = new Set(["node_modules", "dist", "build", ".next", ".expo", ".git", "coverage", "android", "ios", "public", "vendor", ".turbo", "out"]);
const EXT = new Set([".jsx", ".tsx", ".js", ".ts"]);
const CAP = 12; // findings shown per rule in text mode

function walk(dir, out = []) {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (IGNORE.has(e.name) || e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (EXT.has(path.extname(e.name)) && !/\.(test|spec|stories|d)\.[jt]sx?$/.test(e.name)) out.push(p);
  }
  return out;
}

const lineAt = (src, idx) => src.slice(0, idx).split("\n").length;

// Yields opening JSX tags as { name, attrs, index }. Tracks braces and quotes
// so arrow functions and comparisons inside attributes do not end the tag early.
function* openTags(src) {
  const re = /<([A-Za-z][\w.]*)(?=[\s/>])/g;
  let m;
  while ((m = re.exec(src))) {
    let i = m.index + m[0].length, depth = 0, end = -1;
    const limit = Math.min(src.length, i + 4000);
    for (; i < limit; i++) {
      const c = src[i];
      if (c === '"' || c === "'" || c === "`") {
        const close = src.indexOf(c, i + 1);
        if (close === -1) break;
        i = close;
      } else if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === ">" && depth === 0 && src[i - 1] !== "=") { end = i; break; }
    }
    if (end === -1) continue;
    yield { name: m[1], attrs: src.slice(m.index + m[0].length, end), index: m.index };
  }
}

const has = (attrs, ...names) => names.some((n) => new RegExp(`(^|[\\s{])${n}\\b`).test(attrs));
const cls = (attrs) => (attrs.match(/className=(?:"([^"]*)"|\{[^}]*?["'`]([^"'`]*)["'`])/) || []).slice(1).find(Boolean) || "";

const CONV = ["tsx", "jsx", "js", "ts"];
const hasFile = (dir, base) => CONV.some((e) => fs.existsSync(path.join(dir, `${base}.${e}`)));
// nearest ancestor folder named "app" that has a root layout, or null
function findAppRoot(file) {
  for (let d = path.dirname(file); d !== path.dirname(d); d = path.dirname(d)) {
    if (path.basename(d) === "app" && hasFile(d, "layout")) return d;
  }
  return null;
}
function hasUp(file, appRoot, base) {
  for (let d = path.dirname(file); ; d = path.dirname(d)) {
    if (hasFile(d, base)) return true;
    if (d === appRoot || d === path.dirname(d)) return false;
  }
}
const IS_CLIENT = /^\s*(?:(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)\s*)*["']use client["']/;

const files = fs.existsSync(root) && fs.statSync(root).isFile() ? [root] : walk(root);
const findings = [];
const appRoots = new Set();
const add = (rule, file, line) => findings.push({ id: rule.id, severity: rule.sev, file: path.relative(process.cwd(), file), line, message: rule.msg });

for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  if (!/<[A-Za-z]/.test(src)) continue; // no JSX
  if (SKIP_FILE && SKIP_FILE.test(file)) continue;

  for (const t of openTags(src)) {
    for (const r of TAG_RULES) {
      if (r.tags.includes(t.name) && r.test(t.attrs, t.name, src)) add(r, file, lineAt(src, t.index));
    }
  }
  const lines = src.split("\n");
  lines.forEach((text, i) => {
    for (const r of LINE_RULES) {
      if (r.re.test(text) && !(r.unless && r.unless.test(text))) add(r, file, i + 1);
    }
  });
  const appRoot = findAppRoot(file);
  const base = path.basename(file).replace(/\.[jt]sx?$/, "");
  if (appRoot) appRoots.add(appRoot);
  const ctx = {
    appRoot,
    isPage: base === "page",
    isPageOrLayout: base === "page" || base === "layout",
    isClient: IS_CLIENT.test(src),
    hasLoading: appRoot ? hasUp(file, appRoot, "loading") : false,
    hasError: appRoot ? hasUp(file, appRoot, "error") : false,
  };
  for (const r of NEXT_RULES) {
    if (r.test(src, ctx)) add(r, file, 1);
  }
  for (const r of FILE_RULES) {
    if (r.test(src, ctx)) add(r, file, r.at ? r.at(src) : 1);
  }
}

// project level: an App Router app with no error.* and no not-found.* anywhere
const appFiles = [...appRoots].flatMap((r) => walk(r)).map((f) => path.basename(f));
const isConv = (b) => appFiles.some((f) => f.startsWith(b + ".") && /\.[jt]sx?$/.test(f));
if (appRoots.size && !isConv("error") && !isConv("not-found")) {
  add({ id: "next-no-error-or-not-found", sev: "medium",
    msg: "App Router app with no error.tsx and no not-found.tsx anywhere. Failures and unknown URLs fall back to the default framework pages." },
  [...appRoots][0], 1);
}

const ORDER = ["high", "medium", "low"];
if (asJson) {
  console.log(JSON.stringify({ root, filesScanned: files.length, findings }, null, 2));
} else {
  console.log(`UX scan: ${files.length} files under ${root}\n`);
  for (const sev of ORDER) {
    const group = findings.filter((f) => f.severity === sev);
    if (!group.length) continue;
    console.log(`== ${sev.toUpperCase()} (${group.length}) ==`);
    const byRule = new Map();
    for (const f of group) byRule.set(f.id, [...(byRule.get(f.id) || []), f]);
    for (const [id, list] of byRule) {
      console.log(`\n[${id}] ${list[0].message}  (${list.length})`);
      for (const f of list.slice(0, CAP)) console.log(`  ${f.file}:${f.line}`);
      if (list.length > CAP) console.log(`  ... and ${list.length - CAP} more (use --json for all)`);
    }
    console.log("");
  }
  if (!findings.length) console.log("No heuristic findings.");
  console.log("Note: these are static heuristics. Confirm each one by reading the code. A clean scan is not a pass; layout, flow, and copy still need a manual review.");
}
