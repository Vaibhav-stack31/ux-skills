#!/usr/bin/env node
// Heuristic UX scanner for React Native code (NativeWind or StyleSheet).
// Usage: node ux-scan.mjs <dir-or-file> [--json]
// No dependencies. Findings are hints to verify, not verdicts.
import fs from "node:fs";
import path from "node:path";

const SKIP_FILE = null;

const ASYNC = /\buse(Query|SWR|InfiniteQuery|SuspenseQuery)\s*[(<]|\bfetch\(|\baxios\b|\bapi\s*[.(<]/;
const MAPS_JSX = /\.map\(\s*(?:async\s*)?\(?[^)]*\)?\s*=>\s*[({]?\s*(?:return\s*)?</;
const PRESSABLES = ["Pressable", "TouchableOpacity", "TouchableHighlight", "TouchableWithoutFeedback"];
const LISTS = ["FlatList", "FlashList", "SectionList", "Animated.FlatList"];
const SPREAD = /\{\s*\.\.\./;

// Hand built overlays: an absolutely filled View with a backdrop color, in a file that reads like a modal.
const FILL = /StyleSheet\.absoluteFill(?:Object)?\b|\babsolute\b[^"'`\n]*\binset-0\b|\binset-0\b[^"'`\n]*\babsolute\b/;
const BACKDROP_COLOR = /\bbg-(?:black|background|foreground)\/\d+|rgba\(\s*0\s*,\s*0\s*,\s*0\s*,|backgroundColor:\s*["']#000(?:000)?[0-9a-fA-F]{0,2}["']/;
const MODAL_LIKE = /\b(?!StyleSheet\b)\w*(?:Modal|Dialog|Sheet|Backdrop|Overlay|Popup)\b|\b(?:isOpen|isVisible|visible|open)\s*&&/;
const MODAL_LIB = /<Modal[\s>]|@gorhom\/bottom-sheet|react-native-modal|react-native-actions-sheet|presentation:\s*["'](?:modal|transparentModal|formSheet|containedModal)/;
// Signifiers: a wrapping pressable or link makes its child pressable.
const WRAPPED = /<(?:Pressable|TouchableOpacity|TouchableHighlight|Link|Button)\b[^<]*>\s*$/;
const isWrapped = (src, idx) => WRAPPED.test(src.slice(Math.max(0, idx - 300), idx));
const SCRIM = /LinearGradient|BlurView|bg-black\/\d|rgba\(\s*0\s*,\s*0\s*,\s*0\s*,/;
// lineHeight at or below fontSize, or negative letterSpacing on text at 16 or smaller, in one style object
const num = (t, k) => { const m = t.match(new RegExp(`${k}:\\s*(-?\\d+(?:\\.\\d+)?)`)); return m ? Number(m[1]) : null; };
const tightStyleLeading = { test: (t) => { const f = num(t, "fontSize"), l = num(t, "lineHeight"); return f !== null && l !== null && l <= f && f < 24; } };
const tightStyleTracking = { test: (t) => { const f = num(t, "fontSize"), ls = num(t, "letterSpacing"); return f !== null && ls !== null && ls < 0 && f <= 16; } };
const overlayIndex = (s) => (BACKDROP_COLOR.test(s) && MODAL_LIKE.test(s) && !MODAL_LIB.test(s) ? s.search(FILL) : -1);

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
  { id: "preselected-consent", sev: "medium", tags: ["Checkbox", "CheckBox", "Switch"],
    test: (a, n, src, idx) => true && PRECHECKED.test(a) && nearConsent(a, src, idx),
    msg: "Consent, marketing, or terms checkbox starts checked. Opt ins and agreements must start unchecked." },
  { id: "onpress-on-view", sev: "high", tags: ["View"],
    test: (a) => has(a, "onPress"),
    msg: "onPress on a View does nothing. Use Pressable." },
  { id: "onpress-on-text", sev: "medium", tags: ["Text"],
    test: (a) => has(a, "onPress") && !has(a, "accessibilityRole", "role"),
    msg: "Pressable Text has no press feedback, no role, and usually a small target. Wrap in Pressable or add role and hitSlop." },
  { id: "pressable-without-role", sev: "medium", tags: PRESSABLES,
    test: (a) => has(a, "onPress") && !has(a, "accessibilityRole", "role") && !SPREAD.test(a),
    msg: "Pressable without accessibilityRole. Screen readers will not announce it as a button or link." },
  { id: "small-touch-target", sev: "high", tags: PRESSABLES,
    test: (a) => /\b(?:h|w|size)-(?:[1-9]|10)\b/.test(cls(a)) && !has(a, "hitSlop") && !/\bmin-[hw]-|\bp[xy]?-(?:[3-9]|\d\d)\b/.test(cls(a)),
    msg: "Pressable smaller than 44pt with no hitSlop. Enlarge to 48 or add hitSlop." },
  { id: "no-press-feedback", sev: "medium", tags: ["TouchableWithoutFeedback"],
    test: () => true,
    msg: "TouchableWithoutFeedback gives no visual response. Use Pressable with an active state (fine if only dismissing the keyboard)." },
  { id: "pressable-without-feedback", sev: "low", tags: ["Pressable"],
    test: (a) => has(a, "onPress") && !/active:|android_ripple|pressed/.test(a) && !SPREAD.test(a),
    msg: "Pressable with no pressed state (active: class, android_ripple, or pressed style)." },
  { id: "text-class-on-view", sev: "medium", tags: ["View", "Pressable", "ScrollView"],
    test: (a) => /\b(?:text-(?:xs|sm|base|lg|[2-9]?xl|foreground|muted-foreground|primary|white|black|[a-z]+-\d{2,3})|font-(?:medium|semibold|bold))\b/.test(cls(a)),
    msg: "Text styles on a non Text element. NativeWind has no style inheritance; put them on the Text." },
  { id: "input-without-label", sev: "high", tags: ["TextInput", "Input"],
    test: (a) => !has(a, "accessibilityLabel", "aria-label", "accessibilityLabelledBy", "aria-labelledby") && !SPREAD.test(a),
    msg: "Input without accessibilityLabel. Add one, plus a visible label above the field." },
  { id: "input-keyboard-config", sev: "medium", tags: ["TextInput", "Input"],
    test: (a) => !has(a, "keyboardType", "inputMode", "autoComplete", "textContentType", "secureTextEntry", "multiline") && !SPREAD.test(a),
    msg: "Input with no keyboardType, autoComplete, or textContentType. Set them so the right keyboard and autofill appear." },
  { id: "input-return-key", sev: "low", tags: ["TextInput", "Input"],
    test: (a) => !has(a, "returnKeyType", "enterKeyHint", "multiline") && !SPREAD.test(a),
    msg: "Input without returnKeyType. Use next, done, go, or search and wire onSubmitEditing." },
  { id: "list-without-empty", sev: "high", tags: LISTS,
    test: (a) => !has(a, "ListEmptyComponent") && !SPREAD.test(a),
    msg: "List without ListEmptyComponent." },
  { id: "list-without-key", sev: "low", tags: ["FlatList", "SectionList", "Animated.FlatList"],
    test: (a) => !has(a, "keyExtractor") && !SPREAD.test(a),
    msg: "List without keyExtractor. Fine only if items have a key or id field." },
  { id: "image-without-size", sev: "low", tags: ["Image"],
    test: (a) => !has(a, "style", "className") && !SPREAD.test(a),
    msg: "Image without dimensions. Set width and height or an aspect ratio." },
  { id: "disabled-without-style", sev: "low", tags: PRESSABLES,
    test: (a) => has(a, "disabled") && !/disabled:|opacity:|\bpressed\b|\bdisabled\s*[?&]/.test(a) && !SPREAD.test(a),
    msg: "Pressable can be disabled but has no disabled look. Add disabled:opacity-50 (or a style based on disabled) and accessibilityState." },
  { id: "underline-not-pressable", sev: "low", tags: ["Text"],
    test: (a, _n, src, idx) => /(?:^|[\s"'`])underline(?=[\s"'`])|textDecorationLine:\s*["']underline/.test(a) && !has(a, "onPress") && !SPREAD.test(a) && !isWrapped(src, idx),
    msg: "Underlined text that is not pressable looks like a link. Remove the underline or make it pressable." },
  { id: "modal-without-request-close", sev: "medium", tags: ["Modal"],
    test: (a, _n, src) => /import\s*\{[^}]*\bModal\b[^}]*\}\s*from\s*["']react-native["']/.test(src) && !has(a, "onRequestClose") && !SPREAD.test(a),
    msg: "Modal without onRequestClose. Android back will not close it." },
  { id: "scroll-padding", sev: "low", tags: ["ScrollView", "FlatList", "FlashList", "KeyboardAwareScrollView"],
    test: (a) => /\bp[xytb]?-\d/.test(cls(a)) && !has(a, "contentContainerStyle", "contentContainerClassName"),
    msg: "Padding class on a scroll container. Use contentContainerClassName or contentContainerStyle so content is not clipped." },
];

const LINE_RULES = [
  { id: "preselected-consent", sev: "medium", re: /\b(?:newsletter|marketing\w*|promo\w*|subscribe\w*|opt_?in\w*|acceptTerms|agreeTo\w*|accept(?:ed)?Privacy|consent\w*|shareData|termsAccepted)\s*:\s*true\b|\[\s*\w*(?:newsletter|marketing|subscribe|optIn|consent|terms|agree)\w*\s*,\s*\w+\s*\]\s*=\s*useState\(\s*true\b/i,
    msg: "Consent or marketing option defaults to true. Opt ins, data sharing, paid add ons, and agreement to terms must start unchecked." },
  { id: "confirmshaming", sev: "medium", re: /no,?\s+(?:thanks|thank you)?,?\s*i\s+(?:don'?t|do not)\s+(?:want|like|need|care)|\bi\s+(?:don'?t|do not)\s+(?:want|like|care about)\s+(?:to\s+)?(?:sav|discount|deal|money|free|better|grow|improv|success|learn)|\bi(?:'m| am)\s+not\s+interested\s+in\s+(?:sav|grow|improv|learn|being|getting)|\bi(?:'d| would)\s+rather\s+(?:pay|miss|lose|stay)|\bi\s+prefer\s+(?:to\s+)?(?:pay full|miss)/i,
    msg: "Guilt wording on a decline option (confirmshaming). Use a neutral label such as \"No thanks\", \"Not now\", or \"Skip\"." },
  { id: "raw-enum-label", sev: "low", re: />\s*[A-Z][A-Z0-9]*_[A-Z0-9_]+\s*<|>\s*\{\s*(?:\w+\??\.)*(?:status|state|role|kind|type)\s*\}\s*</,
    msg: "Raw enum or status value rendered as text. Map it to a label in the user's words (\"Paid\", not PAYMENT_SUCCEEDED) in one shared place." },
  { id: "tight-body-leading", sev: "medium", re: /(?=.*\bleading-(?:none|tight)\b)(?=.*\btext-(?:xs|sm|base)\b)/,
    msg: "Tight line height on body sized text. Lines collide and descenders clip on Android; keep body text at 1.3 to 1.5 times the size." },
  { id: "tight-body-leading", sev: "medium", re: tightStyleLeading,
    msg: "lineHeight at or below fontSize. Lines collide and descenders clip on Android; keep body text at 1.3 to 1.5 times the size." },
  { id: "small-text-tight-tracking", sev: "low", re: /(?=.*\btracking-(?:tight|tighter)\b)(?=.*\btext-(?:xs|sm|base)\b)/,
    msg: "Letter spacing tightened on small text. Tighten only large headings; leave body text at the default." },
  { id: "small-text-tight-tracking", sev: "low", re: tightStyleTracking,
    msg: "Negative letterSpacing on text at 16 or smaller. Tighten only large headings; leave body text at the default." },
  { id: "harsh-shadow", sev: "low", re: /shadowOpacity:\s*(?:0?\.[3-9]|1(?:\.0+)?)\b|shadowRadius:\s*0\b|\bshadow-(?:xl|2xl)\b|elevation[:=]\s*\{?\s*(?:[6-9]|\d\d)\b/,
    msg: "Heavy or hard shadow. Keep shadows soft (opacity 0.05 to 0.15, radius 4 to 12, elevation 1 to 4) and use them only for things that float." },
  { id: "raised-surface-on-background", sev: "medium", re: /(?=.*\bbg-background\b)(?=.*(?:\bshadow(?:-(?:sm|md|lg|xl|2xl))?(?=["'`\s])|\belevation\b))/,
    msg: "Raised surface uses bg-background with a shadow. In dark mode the shadow is invisible and the surface blends in; use bg-card and border-border." },
  { id: "backdrop-passes-touches", sev: "high", re: /(?=.*pointerEvents=\{?["'](?:none|box-none)["'])(?=.*[Bb]ackdrop)/,
    msg: "Backdrop with pointerEvents none or box-none. Taps go through to the screen behind the overlay." },
  { id: "font-scaling-disabled", sev: "high", re: /allowFontScaling=\{\s*false\s*\}|allowFontScaling\s*=\s*false/,
    msg: "Font scaling disabled. Users with large text settings cannot read this; use maxFontSizeMultiplier if a cap is needed." },
  { id: "static-dimensions", sev: "low", re: /\bDimensions\.get\(/,
    msg: "Dimensions.get does not update on rotation or split screen. Use useWindowDimensions()." },
  { id: "hover-class", sev: "low", re: /["'`\s]hover:[\w-]+/, unless: /web:|active:/,
    msg: "hover: has no effect on touch. Add an active: state for press feedback." },
  { id: "tiny-text", sev: "medium", re: /\btext-\[(?:[0-9]|1[01])px\]|fontSize:\s*(?:[0-9]|1[01])\b(?!\.)/,
    msg: "Text smaller than 12." },
  { id: "low-contrast-text", sev: "medium", re: /\btext-(gray|slate|zinc|neutral|stone)-(200|300|400)\b/, unless: /dark:text-/,
    msg: "Light gray text. Check 4.5:1 contrast, especially outdoors; prefer text-muted-foreground." },
  { id: "arbitrary-spacing", sev: "low", re: /\b(?:p[xytblr]?|m[xytblr]?|gap(?:-[xy])?|top|left|right|bottom)-\[\d+(?:px)?\]/,
    msg: "Arbitrary spacing value. Use the 4 point scale." },
  { id: "hardcoded-color", sev: "low", re: /\b(?:bg|text|border)-\[#[0-9a-fA-F]{3,8}\]|(?:color|backgroundColor):\s*["']#[0-9a-fA-F]{3,8}["']/,
    msg: "Hard coded color. Use a theme token so dark mode works." },
  { id: "fixed-text-height", sev: "low", re: /<Text\b[^>]*\bclassName="[^"]*\bh-\d/,
    msg: "Fixed height on Text. It will clip at larger font sizes; use min-h or padding." },
];

const FILE_RULES = [
  { id: "core-safe-area-view", sev: "high",
    test: (s) => /import\s*\{[^}]*\bSafeAreaView\b[^}]*\}\s*from\s*["']react-native["']/.test(s),
    msg: "SafeAreaView imported from react-native (iOS only, deprecated). Use react-native-safe-area-context." },
  { id: "scrollview-map", sev: "high",
    test: (s) => /<ScrollView[\s>]/.test(s) && MAPS_JSX.test(s) && ASYNC.test(s),
    msg: "ScrollView rendering fetched data with .map(). Use FlashList or FlatList so rows are virtualized." },
  { id: "input-without-keyboard-handling", sev: "high",
    test: (s) => /<(?:TextInput|Input)[\s/>]/.test(s) && !/Keyboard(?:Avoiding|Aware|Sticky|Toolbar)|keyboard-controller|automaticallyAdjustKeyboardInsets|BottomSheetTextInput/.test(s),
    msg: "Screen has inputs but no keyboard avoidance in this file. Confirm a parent handles it; otherwise the keyboard may cover fields." },
  { id: "scroll-taps-with-keyboard", sev: "medium",
    test: (s) => /<(?:TextInput|Input)[\s/>]/.test(s) && /<(?:ScrollView|FlatList|FlashList|KeyboardAwareScrollView)[\s>]/.test(s) && !/keyboardShouldPersistTaps/.test(s),
    msg: "Scrollable form without keyboardShouldPersistTaps=\"handled\". Buttons need two taps while the keyboard is open." },
  { id: "async-without-loading", sev: "high",
    test: (s) => ASYNC.test(s) && !/isLoading|isPending|isFetching|\bloading\b|Skeleton|ActivityIndicator|Spinner|Suspense|refreshing/.test(s),
    msg: "Fetches data but shows no loading state." },
  { id: "async-without-error", sev: "high",
    test: (s) => ASYNC.test(s) && !/isError|\berror\b|\bcatch\b|ErrorBoundary|onError/.test(s),
    msg: "Fetches data but has no error handling the user can see." },
  { id: "list-without-refresh", sev: "medium",
    test: (s) => ASYNC.test(s) && /<(?:FlatList|FlashList|SectionList)[\s>]/.test(s) && !/onRefresh|RefreshControl/.test(s),
    msg: "Server backed list without pull to refresh." },
  { id: "screen-without-refresh", sev: "medium",
    test: (s) => ASYNC.test(s) && /<(?:ScrollView|KeyboardAwareScrollView)[\s>]/.test(s) && !/<(?:FlatList|FlashList|SectionList|TextInput|Input)[\s/>]/.test(s) && !/onRefresh|RefreshControl/.test(s),
    msg: "Screen shows fetched data in a ScrollView with no pull to refresh. Add RefreshControl unless the content is static." },
  { id: "server-data-without-scroll", sev: "low",
    test: (s) => /\buse(?:Query|SWR|SuspenseQuery)\s*[(<]/.test(s) && !/<(?:ScrollView|KeyboardAwareScrollView|FlatList|FlashList|SectionList)[\s>]/.test(s) && !/<(?:TextInput|Input)[\s/>]/.test(s) && /export\s+default/.test(s),
    msg: "Screen fetches data but has no scroll container, so it cannot be pulled to refresh and may clip on small phones or large fonts." },
  { id: "refresh-bound-to-refetching", sev: "low",
    test: (s) => /refreshing=\{\s*(?:\w+\.)?(?:isRefetching|isFetching)\s*\}/.test(s),
    msg: "RefreshControl bound to isRefetching or isFetching. The spinner will appear on background refetches; track user started refreshes in their own state." },
  { id: "mutation-without-pending", sev: "high",
    test: (s) => /useMutation\s*[(<]|handleSubmit\(/.test(s) && !/isPending|isSubmitting|isLoading|\bsubmitting\b|\bloading\b|\bpending\b|disabled=/.test(s),
    msg: "Submits or mutates with no pending state, so it can be double tapped and gives no feedback." },
  { id: "overlay-background-reachable", sev: "high",
    test: (s) => overlayIndex(s) !== -1 && !/accessibilityViewIsModal|aria-modal|no-hide-descendants/.test(s),
    at: (s) => lineAt(s, overlayIndex(s)),
    msg: "Hand built overlay without accessibilityViewIsModal or aria-modal. VoiceOver and TalkBack can reach the screen behind it. Use Modal or the sheet library, or set aria-modal on the overlay and importantForAccessibility=\"no-hide-descendants\" on the background." },
  { id: "overlay-without-back", sev: "medium",
    test: (s) => overlayIndex(s) !== -1 && !/BackHandler|useBackHandler|onRequestClose/.test(s),
    at: (s) => lineAt(s, overlayIndex(s)),
    msg: "Hand built overlay with no BackHandler. Android back will leave the screen instead of closing the overlay." },
  { id: "text-over-image-no-scrim", sev: "medium",
    test: (s) => (/<ImageBackground\b/.test(s) || (/<Image\b/.test(s) && /absolute/.test(s))) && /\btext-white\b|color:\s*["'](?:#fff(?:fff)?|white)["']/i.test(s) && !SCRIM.test(s),
    at: (s) => lineAt(s, s.search(/\btext-white\b|color:\s*["'](?:#fff(?:fff)?|white)["']/i)),
    msg: "White text over an image with no scrim. Add a LinearGradient from transparent to about 70% black, or a BlurView, so it stays readable on any photo." },
  { id: "no-safe-area", sev: "medium",
    test: (s) => /headerShown:\s*false/.test(s) && !/useSafeAreaInsets|SafeAreaView|-safe\b/.test(s),
    msg: "Header hidden but no safe area handling in this file. Content may sit under the status bar or notch." },
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

const files = fs.existsSync(root) && fs.statSync(root).isFile() ? [root] : walk(root);
const findings = [];
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
  const lines = src.split("\n");
  lines.forEach((text, i) => {
    for (const r of LINE_RULES) {
      if (r.re.test(text) && !(r.unless && r.unless.test(text))) add(r, file, i + 1);
    }
  });
  for (const r of FILE_RULES) {
    if (r.test(src)) add(r, file, r.at ? r.at(src) : 1);
  }
  for (const m of src.matchAll(/fontFamily:\s*["']([^"']+)["']|from\s*["']@expo-google-fonts\/([\w-]+)["']/g)) {
    const name = (m[1] || m[2]).split(/[_-]/)[0].toLowerCase();
    if (name && !/mono|code|system|^sans-serif$/.test(name) && !fontFamilies.has(name)) fontFamilies.set(name, { file, line: lineAt(src, m.index) });
  }
  for (const m of src.matchAll(/\b(?:bg|text|border|ring|fill|stroke|from|via|to|outline|divide|shadow|decoration)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g)) {
    if (!hues.has(m[1])) hues.set(m[1], { file, line: lineAt(src, m.index) });
  }
}

// project level: more than one non monospace font family
if (fontFamilies.size > 1) {
  const [, second] = [...fontFamilies.values()];
  add({ id: "multiple-font-families", sev: "medium",
    msg: `More than one font family used (${[...fontFamilies.keys()].join(", ")}). Use one sans-serif family for the app, plus a monospace for code.` },
  second.file, second.line);
}

// project level: raw palette hues used directly instead of color roles
if (hues.size > 3) {
  const [, , , fourth] = [...hues.values()];
  add({ id: "color-sprawl", sev: "medium",
    msg: `${hues.size} raw color hues used directly (${[...hues.keys()].join(", ")}). Give colors roles (brand, neutral, status, interactive) as theme tokens instead of picking hues per component.` },
  fourth.file, fourth.line);
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
