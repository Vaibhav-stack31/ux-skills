#!/usr/bin/env node
// Heuristic UX scanner for React web code (Tailwind, shadcn/ui).
// Usage: node ux-scan.mjs <dir-or-file> [--json]
// Understands Next.js App Router route files (loading, error, not-found).
// No dependencies. Findings are hints to verify, not verdicts.
import fs from "node:fs";
import path from "node:path";

const SKIP_FILE = /components[\\/]ui[\\/]/; // vendored shadcn primitives

const ASYNC = /\buse(Query|SWR|InfiniteQuery|SuspenseQuery)\s*[(<]|\bfetch\(|\baxios\b|\bapi\s*[.(<]/;
const SPREAD = /\{\s*\.\.\./;
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
// Signifiers: a wrapping link or control makes its child clickable.
const WRAPPED = /<(?:Link|a|button|label|Button|DropdownMenuItem|ContextMenuItem|CommandItem|SelectItem|DialogTrigger|SheetTrigger|PopoverTrigger|DropdownMenuTrigger|TooltipTrigger)\b[^<]*>\s*$/;
const isWrapped = (src, idx) => WRAPPED.test(src.slice(Math.max(0, idx - 300), idx));
const LOOKS_CLICKABLE = /(?:^|[\s"'`])(?:hover:(?:bg|underline|shadow|text|border)-?[\w/-]*|cursor-pointer|underline)(?=[\s"'`])/;
const SCRIM = /from-black\/|via-black\/|bg-black\/\d|from-background|bg-background\/\d|bg-gradient-to-|bg-linear-to-|backdrop-blur/;
const SCROLL_LOCKED = /document\.(?:body|documentElement)\.style\.overflow|document\.(?:body|documentElement)\.classList\.(?:add|toggle)\([^)]*overflow-hidden|RemoveScroll|remove-scroll|useScrollLock|useLockBodyScroll|useBodyScrollLock|body-scroll-lock|disableBodyScroll|lockScroll|dialog:modal|dialog\[open\]/;

// Honest design and mental model checks.
const CONSENT = /newsletter|marketing|promo|special offers|subscribe|opt.?in|terms|privacy|consent|share (?:my )?data|third.part|partners/i;
const PRECHECKED = /\b(?:defaultChecked|checked|value)(?:=\{\s*true\s*\})?(?=\s|\/|$)/;
// the label usually follows the control; stop at the next control so a neighbor's label does not count
const nearConsent = (a, src, idx) => {
  const after = src.slice(idx + 1, idx + 300);
  const next = after.search(/<(?:input|Checkbox|CheckBox|Switch)\b/);
  return CONSENT.test(a) || CONSENT.test(next === -1 ? after : after.slice(0, next));
};

const TAG_RULES = [
  { id: "preselected-consent", sev: "medium", tags: ["input", "Checkbox", "Switch"],
    test: (a, n, src, idx) => (n !== "input" || /type=["']checkbox["']/.test(a)) && PRECHECKED.test(a) && nearConsent(a, src, idx),
    msg: "Consent, marketing, or terms checkbox starts checked. Opt ins and agreements must start unchecked." },
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
  { id: "button-missing-states", sev: "medium", tags: ["button", "div", "span", "a"],
    test: (a, n) => (n === "button" || /role=["']button["']/.test(a)) && /className=/.test(a) && !SPREAD.test(a) && (!/\bhover:/.test(a) || !/\bfocus(?:-visible)?:/.test(a)),
    msg: "Custom styled button with no hover or focus-visible style. Use the project's Button, or give it distinct hover, active, focus-visible, and disabled styles." },
  { id: "clickable-without-pointer", sev: "low", tags: ["tr", "TableRow", "Card", "li", "div"],
    test: (a, n) => has(a, "onClick") && (n !== "div" || /role=["']button["']/.test(a)) && !/cursor-pointer/.test(a),
    msg: "Clickable row, card, or item with no cursor-pointer. Add it, plus a hover background, so it reads as clickable." },
  { id: "looks-clickable-static", sev: "low", tags: ["div", "span", "p", "li", "Card", "Badge", "tr", "TableRow", "img", "h1", "h2", "h3", "h4"],
    test: (a, _n, src, idx) => LOOKS_CLICKABLE.test(a) && !has(a, "onClick", "onKeyDown", "onSelect", "href", "role", "asChild", "tabIndex") && !SPREAD.test(a) && !isWrapped(src, idx),
    msg: "Looks clickable (hover effect, pointer cursor, or underline) but has no click handler and is not inside a link or button. Remove the cue or make it interactive." },
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
  { id: "preselected-consent", sev: "medium", re: /\b(?:newsletter|marketing\w*|promo\w*|subscribe\w*|opt_?in\w*|acceptTerms|agreeTo\w*|accept(?:ed)?Privacy|consent\w*|shareData|termsAccepted)\s*:\s*true\b|\[\s*\w*(?:newsletter|marketing|subscribe|optIn|consent|terms|agree)\w*\s*,\s*\w+\s*\]\s*=\s*useState\(\s*true\b/i,
    msg: "Consent or marketing option defaults to true. Opt ins, data sharing, paid add ons, and agreement to terms must start unchecked." },
  { id: "confirmshaming", sev: "medium", re: /no,?\s+(?:thanks|thank you)?,?\s*i\s+(?:don'?t|do not)\s+(?:want|like|need|care)|\bi\s+(?:don'?t|do not)\s+(?:want|like|care about)\s+(?:to\s+)?(?:sav|discount|deal|money|free|better|grow|improv|success|learn)|\bi(?:'m| am)\s+not\s+interested\s+in\s+(?:sav|grow|improv|learn|being|getting)|\bi(?:'d| would)\s+rather\s+(?:pay|miss|lose|stay)|\bi\s+prefer\s+(?:to\s+)?(?:pay full|miss)/i,
    msg: "Guilt wording on a decline option (confirmshaming). Use a neutral label such as \"No thanks\", \"Not now\", or \"Skip\"." },
  { id: "raw-enum-label", sev: "low", re: />\s*[A-Z][A-Z0-9]*_[A-Z0-9_]+\s*<|>\s*\{\s*(?:\w+\??\.)*(?:status|state|role|kind|type)\s*\}\s*</,
    msg: "Raw enum or status value rendered as text. Map it to a label in the user's words (\"Paid\", not PAYMENT_SUCCEEDED) in one shared place." },
  { id: "tight-body-leading", sev: "medium", re: /<p\b[^>]*\bleading-(?:none|tight|snug|\[1(?:\.[0-2]\d*)?\])(?=[\s"'`\]])/,
    msg: "Tight line height on paragraph text. Keep body text at about 1.5 (the Tailwind default) and reserve tight leading for headings." },
  { id: "small-text-tight-tracking", sev: "low", re: /(?=.*\btracking-(?:tight|tighter|\[-))(?=.*\btext-(?:xs|sm|base)\b)/, unless: /\btext-(?:lg|[2-9]?xl)\b/,
    msg: "Letter spacing tightened on small text. Tighten only large headings (text-2xl and up); leave body text at the default." },
  { id: "extra-font-family", sev: "low", re: /\bfont-serif\b|\bfont-\[['"]?[A-Za-z]|fontFamily:\s*["'`](?!var\(|inherit|ui-monospace|monospace)/,
    msg: "Font family set on a single element. Use one sans-serif family set once as font-sans, plus font-mono for code." },
  { id: "harsh-shadow", sev: "low", re: /\bshadow-(?:xl|2xl)\b|\bshadow-(?:primary|(?:red|blue|green|purple|indigo|pink|violet|emerald|amber|yellow|orange|teal|cyan|sky|rose|fuchsia|lime)-\d{2,3})\b|\bshadow-\[-?\d+(?:px)?_-?\d+(?:px)?_0(?:px)?[_\]]/, unless: /Dialog|Popover|Dropdown|Menu|Sheet|Tooltip|Toast|\bfixed\b/,
    msg: "Heavy, hard, or colored shadow. Keep shadows soft: shadow-sm on cards, shadow-md or shadow-lg only for things that float, never colored glows." },
  { id: "raised-surface-on-background", sev: "medium", re: /(?=.*\bbg-background\b)(?=.*\bshadow-(?:md|lg|xl|2xl)\b)/, unless: /\bdark:bg-/,
    msg: "Raised surface uses bg-background with a shadow. In dark mode the shadow is invisible and the surface blends into the page; use bg-card or bg-popover and a border." },
  { id: "dark-mode-shadow", sev: "low", re: /\bdark:shadow-(?!none\b)/,
    msg: "Shadow added for dark mode. Shadows barely show on dark backgrounds; show depth with a lighter surface token and a border instead." },
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
  { id: "decoration", sev: "low", re: /\bbg-(?:gradient|linear)-to-|\bbackdrop-blur|\banimate-(?:pulse|bounce|ping)\b/, unless: /Skeleton|skeleton|from-black\/|via-black\/|bg-black\/\d/,
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
  { id: "text-over-image-no-scrim", sev: "medium",
    test: (s) => /<(?:img|Image)\b/.test(s) && /\babsolute\b/.test(s) && /\btext-white\b/.test(s) && !SCRIM.test(s),
    at: (s) => lineAt(s, s.search(/\btext-white\b/)),
    msg: "White text positioned over an image with no scrim. Add a gradient scrim (from-black/70 to-transparent) or a blurred backing so it stays readable on any photo." },
  { id: "effect-fetching", sev: "low",
    test: (s) => /useEffect\(/.test(s) && /\bfetch\(|\baxios\b/.test(s) && !/AbortController|signal/.test(s),
    msg: "Fetching in useEffect without cancellation. Stale responses can overwrite newer ones; prefer the project's query library." },
];

// Tailwind v3 default palette, shades 50 to 950 (from tailwindcss 3.4.17 lib/public/colors.js)
const TW = {
  slate: "f8fafc f1f5f9 e2e8f0 cbd5e1 94a3b8 64748b 475569 334155 1e293b 0f172a 020617",
  gray: "f9fafb f3f4f6 e5e7eb d1d5db 9ca3af 6b7280 4b5563 374151 1f2937 111827 030712",
  zinc: "fafafa f4f4f5 e4e4e7 d4d4d8 a1a1aa 71717a 52525b 3f3f46 27272a 18181b 09090b",
  neutral: "fafafa f5f5f5 e5e5e5 d4d4d4 a3a3a3 737373 525252 404040 262626 171717 0a0a0a",
  stone: "fafaf9 f5f5f4 e7e5e4 d6d3d1 a8a29e 78716c 57534e 44403c 292524 1c1917 0c0a09",
  red: "fef2f2 fee2e2 fecaca fca5a5 f87171 ef4444 dc2626 b91c1c 991b1b 7f1d1d 450a0a",
  orange: "fff7ed ffedd5 fed7aa fdba74 fb923c f97316 ea580c c2410c 9a3412 7c2d12 431407",
  amber: "fffbeb fef3c7 fde68a fcd34d fbbf24 f59e0b d97706 b45309 92400e 78350f 451a03",
  yellow: "fefce8 fef9c3 fef08a fde047 facc15 eab308 ca8a04 a16207 854d0e 713f12 422006",
  lime: "f7fee7 ecfccb d9f99d bef264 a3e635 84cc16 65a30d 4d7c0f 3f6212 365314 1a2e05",
  green: "f0fdf4 dcfce7 bbf7d0 86efac 4ade80 22c55e 16a34a 15803d 166534 14532d 052e16",
  emerald: "ecfdf5 d1fae5 a7f3d0 6ee7b7 34d399 10b981 059669 047857 065f46 064e3b 022c22",
  teal: "f0fdfa ccfbf1 99f6e4 5eead4 2dd4bf 14b8a6 0d9488 0f766e 115e59 134e4a 042f2e",
  cyan: "ecfeff cffafe a5f3fc 67e8f9 22d3ee 06b6d4 0891b2 0e7490 155e75 164e63 083344",
  sky: "f0f9ff e0f2fe bae6fd 7dd3fc 38bdf8 0ea5e9 0284c7 0369a1 075985 0c4a6e 082f49",
  blue: "eff6ff dbeafe bfdbfe 93c5fd 60a5fa 3b82f6 2563eb 1d4ed8 1e40af 1e3a8a 172554",
  indigo: "eef2ff e0e7ff c7d2fe a5b4fc 818cf8 6366f1 4f46e5 4338ca 3730a3 312e81 1e1b4b",
  violet: "f5f3ff ede9fe ddd6fe c4b5fd a78bfa 8b5cf6 7c3aed 6d28d9 5b21b6 4c1d95 2e1065",
  purple: "faf5ff f3e8ff e9d5ff d8b4fe c084fc a855f7 9333ea 7e22ce 6b21a8 581c87 3b0764",
  fuchsia: "fdf4ff fae8ff f5d0fe f0abfc e879f9 d946ef c026d3 a21caf 86198f 701a75 4a044e",
  pink: "fdf2f8 fce7f3 fbcfe8 f9a8d4 f472b6 ec4899 db2777 be185d 9d174d 831843 500724",
  rose: "fff1f2 ffe4e6 fecdd3 fda4af fb7185 f43f5e e11d48 be123c 9f1239 881337 4c0519",
};

// Contrast. Resolves a background and a text color for one element (Tailwind palette,
// arbitrary values, inline styles, and theme tokens read from the project's CSS) and
// computes the WCAG ratio for the light and the dark theme.
const RAW_HUES = Object.keys(TW).join("|");
const SHADES = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"];
const SURFACE_TOKENS = new Set(["background", "card", "popover", "muted"]);

function hexToRgb(h) {
  h = h.replace("#", "");
  if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join("");
  if (h.length === 8 && h.slice(6) !== "ff") return null; // translucent
  if (h.length !== 6 && h.length !== 8) return null;
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  return [0, 8, 4].map((n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)))));
}
function oklchToRgb(L, C, H) {
  const hr = (H * Math.PI) / 180, a = C * Math.cos(hr), b = C * Math.sin(hr);
  const l_ = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
  return lin.map((c) => {
    c = Math.min(1, Math.max(0, c));
    return Math.round(255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055));
  });
}
// Accepts hex, rgb(), hsl(), oklch(), bare shadcn style "h s% l%" or "r g b", and black or white.
function parseColor(v) {
  if (!v) return null;
  v = v.trim().replace(/\s*!important$/, "");
  if (/^(?:black)$/i.test(v)) return [0, 0, 0];
  if (/^(?:white)$/i.test(v)) return [255, 255, 255];
  if (/^#[0-9a-f]{3,8}$/i.test(v)) return hexToRgb(v);
  const fn = v.match(/^(rgba?|hsla?|oklch)\(\s*([^)]*)\)$/i);
  const body = fn ? fn[2] : v;
  const kind = fn ? fn[1].toLowerCase() : null;
  const parts = body.split(/[\s,/]+/).filter(Boolean);
  if (parts.length === 4 && parseFloat(parts[3]) < (parts[3].endsWith("%") ? 100 : 1)) return null; // translucent
  if (parts.length < 3) return null;
  const n = parts.slice(0, 3).map((p) => parseFloat(p));
  if (n.some(Number.isNaN)) return null;
  if (kind === "oklch") return oklchToRgb(parts[0].endsWith("%") ? n[0] / 100 : n[0], n[1], n[2]);
  if (kind?.startsWith("hsl") || (!kind && parts[1].endsWith("%") && parts[2].endsWith("%"))) return hslToRgb(n[0], n[1], n[2]);
  if (kind?.startsWith("rgb") || (!kind && n.every((x) => Number.isInteger(x) && x <= 255))) return n;
  return null;
}
const lum = (rgb) => {
  const [r, g, b] = rgb.map((c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// Theme tokens from CSS: :root (light), .dark (dark), and Tailwind v4 @theme blocks.
function readTheme(cssFiles) {
  const light = new Map(), dark = new Map(), where = new Map();
  for (const file of cssFiles) {
    let css = "";
    try { css = fs.readFileSync(file, "utf8"); } catch { continue; }
    for (const m of css.matchAll(/(:root|\.dark|\[data-theme=["']?dark["']?\]|@theme(?:\s+inline)?)\s*\{([^}]*)\}/g)) {
      const target = /dark/.test(m[1]) ? dark : light;
      for (const d of m[2].matchAll(/--(?:color-)?([\w-]+)\s*:\s*([^;]+);/g)) {
        const self = d[2].trim().match(/^(?:hsl|rgb|oklch)?\(?\s*var\(--(?:color-)?([\w-]+)\)/);
        if (self && self[1] === d[1]) continue; // @theme inline mapping a token onto itself
        target.set(d[1], d[2].trim());
        const at = m.index + m[0].indexOf("{") + 1 + d.index;
        if (!where.has(d[1])) where.set(d[1], { file, line: css.slice(0, at).split("\n").length });
      }
    }
  }
  const resolve = (map, name, depth = 0) => {
    const v = map.get(name) ?? light.get(name);
    if (!v || depth > 5) return null;
    const ref = v.match(/^(?:hsl|rgb|oklch)?\(?\s*var\(--(?:color-)?([\w-]+)\)\s*\)?$/);
    return ref ? resolve(map, ref[1], depth + 1) : parseColor(v);
  };
  const tokens = new Set([...light.keys(), ...dark.keys()]);
  return { tokens, where, color: (name, mode) => resolve(mode === "dark" ? dark : light, name), hasDark: dark.size > 0 };
}

// One color class or style value, as { name, kind, light, dark } or null.
function colorFromClass(prefix, cls, theme) {
  const m = cls.match(new RegExp(`^${prefix}-(.+)$`));
  if (!m) return null;
  const v = m[1];
  if (/\/\d+$|\/\[/.test(v)) return { name: cls, kind: "translucent" };
  if (v === "black" || v === "white") { const c = parseColor(v); return { name: cls, kind: "raw", light: c, dark: c }; }
  const hue = v.match(new RegExp(`^(${RAW_HUES})-(\\d{2,3})$`));
  if (hue && SHADES.includes(hue[2])) { const c = hexToRgb(TW[hue[1]].split(" ")[SHADES.indexOf(hue[2])]); return { name: cls, kind: "raw", light: c, dark: c }; }
  const arb = v.match(/^\[(#[0-9a-fA-F]{3,8}|(?:rgb|hsl|oklch)a?\([^\]]*\))\]$/);
  if (arb) { const c = parseColor(arb[1].replace(/_/g, " ")); return c ? { name: cls, kind: "raw", light: c, dark: c } : null; }
  if (theme.tokens.has(v)) return { name: cls, kind: "token", token: v, light: theme.color(v, "light"), dark: theme.color(v, "dark") };
  if (/^(?:primary|secondary|destructive|accent|muted|card|popover|background|foreground)(?:-foreground)?$/.test(v)) return { name: cls, kind: "token", token: v, light: null, dark: null };
  return null;
}
function colorsFrom(attrs, theme) {
  const classes = (attrs.match(/className=(?:"([^"]*)"|'([^']*)'|\{[^}]*?["'`]([^"'`]*)["'`])/) || []).slice(1).find(Boolean) || "";
  const pick = (prefix, variant) => {
    let found = null;
    for (const c of classes.split(/\s+/)) {
      const base = variant ? (c.startsWith(variant + ":") ? c.slice(variant.length + 1) : null) : (c.includes(":") ? null : c);
      if (base) found = colorFromClass(prefix, base, theme) || found;
    }
    return found;
  };
  const style = (key) => {
    const m = attrs.match(new RegExp(`\\b${key}\\s*:\\s*["'\`]([^"'\`]+)["'\`]`));
    const c = m ? parseColor(m[1]) : null;
    return c ? { name: `${key}: ${m[1]}`, kind: "raw", light: c, dark: c } : null;
  };
  const bg = style("backgroundColor") || pick("bg");
  const fg = style("color") || pick("text");
  return { bg, fg, darkBg: pick("bg", "dark") || bg, darkFg: pick("text", "dark") || fg, classes };
}
const isLarge = (classes) => /\btext-(?:2xl|[3-9]xl)\b/.test(classes) || (/\btext-xl\b/.test(classes) && /\bfont-(?:bold|extrabold|black)\b/.test(classes));

// Returns findings { id, sev, msg } for one element's background and text colors.
function pairFindings(bg, fg, darkBg, darkFg, classes, theme) {
  const out = [];
  if (!bg || !fg || bg.kind === "translucent" || fg.kind === "translucent") return out;
  if (bg.kind === "token" && fg.kind === "raw") {
    const want = SURFACE_TOKENS.has(bg.token) ? "text-foreground or text-muted-foreground" : `text-${bg.token}-foreground`;
    out.push({ id: "token-pair-mismatch", sev: "medium", msg: `${bg.name} paired with ${fg.name}. Use ${want} so the text keeps its contrast in every theme.` });
  } else if (fg.kind === "token" && /-foreground$/.test(fg.token) && fg.token !== "muted-foreground" && fg.token !== "foreground" && !(bg.kind === "token" && `${bg.token}-foreground` === fg.token)) {
    out.push({ id: "token-pair-mismatch", sev: "medium", msg: `${fg.name} on ${bg.name}. A *-foreground token is designed for its own background; use bg-${fg.token.replace(/-foreground$/, "")} or the foreground token that matches ${bg.name}.` });
  }
  const need = isLarge(classes) ? 3 : 4.5;
  const fails = [];
  for (const [mode, b, f] of [["light", bg, fg], ["dark", darkBg, darkFg]]) {
    if (mode === "dark" && !theme.hasDark && b === bg && f === fg && bg.kind !== "token" && fg.kind !== "token") continue;
    const bc = b?.[mode], fc = f?.[mode];
    if (!bc || !fc) continue;
    const r = ratio(bc, fc);
    if (r < need) fails.push({ mode, r, b, f });
  }
  const same = fails.length === 2 && fails[0].r.toFixed(2) === fails[1].r.toFixed(2);
  for (const x of same ? [fails[0]] : fails) {
    const fromDarkVariant = x.mode === "dark" && (x.b !== bg || x.f !== fg);
    const theme_ = same || (!fromDarkVariant && x.b.kind === "raw" && x.f.kind === "raw") ? "" : ` in ${x.mode} mode`;
    out.push({ id: "low-contrast-pair", sev: x.r < 3 ? "high" : "medium",
      msg: `${x.f.name} on ${x.b.name} is ${x.r.toFixed(2)}:1${theme_}; text needs ${need}:1. Pick colors that pass, ideally a token pair such as bg-primary with text-primary-foreground.` });
  }
  return out;
}

// Project level: each token and its -foreground partner, plus body text on the page background.
function themeFindings(theme) {
  const out = [];
  const pairs = [...theme.tokens].filter((t) => theme.tokens.has(`${t}-foreground`)).map((t) => [t, `${t}-foreground`]);
  if (theme.tokens.has("background") && theme.tokens.has("foreground")) pairs.push(["background", "foreground"]);
  if (theme.tokens.has("background") && theme.tokens.has("muted-foreground")) pairs.push(["background", "muted-foreground"]);
  for (const [b, f] of pairs) {
    for (const mode of theme.hasDark ? ["light", "dark"] : ["light"]) {
      const bc = theme.color(b, mode), fc = theme.color(f, mode);
      if (!bc || !fc) continue;
      if (mode === "dark" && String(bc) === String(theme.color(b, "light")) && String(fc) === String(theme.color(f, "light"))) continue; // no dark override
      const r = ratio(bc, fc);
      if (r < 4.5) {
        const at = theme.where.get(f) || theme.where.get(b);
        out.push({ id: "theme-token-contrast", sev: r < 3 ? "high" : "medium", file: at.file, line: at.line,
          msg: `Theme tokens --${f} on --${b} are ${r.toFixed(2)}:1 in ${mode} mode; text needs 4.5:1. Every component using this pair inherits the problem, so fix it in the theme.` });
      }
    }
  }
  return out;
}

// CSS files that can hold the theme: any .css under the scan root, else common names in parent folders.
function findCssFiles(root) {
  const found = [];
  const walkCss = (dir, depth) => {
    if (depth > 6) return;
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (IGNORE.has(e.name) || e.name.startsWith(".")) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walkCss(p, depth + 1);
      else if (e.name.endsWith(".css")) found.push(p);
    }
  };
  const start = fs.existsSync(root) && fs.statSync(root).isFile() ? path.dirname(root) : root;
  walkCss(start, 0);
  for (let d = path.dirname(start), i = 0; !found.length && i < 3 && d !== path.dirname(d); d = path.dirname(d), i++) {
    for (const sub of ["", "src", "app", "styles"]) {
      for (const n of ["globals.css", "global.css", "index.css", "app.css", "styles.css"]) {
        const p = path.join(d, sub, n);
        if (fs.existsSync(p)) found.push(p);
      }
    }
  }
  return found;
}


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
const theme = readTheme(findCssFiles(root));
const findings = [];
const appRoots = new Set();
const fontFamilies = new Map();
const hues = new Map();
const add = (rule, file, line) => findings.push({ id: rule.id, severity: rule.sev, file: path.relative(process.cwd(), file), line, message: rule.msg });

for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  if (!/<[A-Za-z]/.test(src)) continue; // no JSX
  if (SKIP_FILE && SKIP_FILE.test(file)) continue;

  for (const t of openTags(src)) {
    for (const r of TAG_RULES) {
      if (r.tags.includes(t.name) && r.test(t.attrs, t.name, src, t.index)) add(r, file, lineAt(src, t.index));
    }
  }
  for (const t of openTags(src)) {
    const c = colorsFrom(t.attrs, theme);
    for (const f of pairFindings(c.bg, c.fg, c.darkBg, c.darkFg, c.classes, theme)) add(f, file, lineAt(src, t.index));
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
  for (const m of src.matchAll(/import\s*\{([^}]+)\}\s*from\s*["']next\/font\/google["']|from\s*["']@fontsource(?:-variable)?\/([\w-]+)/g)) {
    for (const name of (m[1] || m[2]).split(",").map((x) => x.trim().split(/\s+as\s+/)[0].replace(/_/g, " ").toLowerCase()).filter(Boolean)) {
      if (!/mono|code/.test(name) && !fontFamilies.has(name)) fontFamilies.set(name, { file, line: lineAt(src, m.index) });
    }
  }
  for (const m of src.matchAll(/\b(?:bg|text|border|ring|fill|stroke|from|via|to|outline|divide|shadow|decoration)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g)) {
    if (!hues.has(m[1])) hues.set(m[1], { file, line: lineAt(src, m.index) });
  }
}

// project level: theme token pairs that fail contrast
for (const f of themeFindings(theme)) add(f, f.file, f.line);

// project level: more than one non monospace font family
if (fontFamilies.size > 1) {
  const [, second] = [...fontFamilies.values()];
  add({ id: "multiple-font-families", sev: "medium",
    msg: `More than one font family loaded (${[...fontFamilies.keys()].join(", ")}). Use one sans-serif family for the interface, plus a monospace for code.` },
  second.file, second.line);
}

// project level: raw palette hues used directly instead of color roles
if (hues.size > 3) {
  const [, , , fourth] = [...hues.values()];
  add({ id: "color-sprawl", sev: "medium",
    msg: `${hues.size} raw color hues used directly (${[...hues.keys()].join(", ")}). Give colors roles (brand, neutral, status, interactive) as theme tokens instead of picking hues per component.` },
  fourth.file, fourth.line);
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
