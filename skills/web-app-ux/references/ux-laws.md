# Laws of UX in this skill

The Laws of UX (lawsofux.com, by Jon Yablonski) are well known principles from psychology and design. This file maps each one to the concrete rules in this skill. The rules live in the other reference files; this is the index. Use it to explain why a rule exists, or to check a design against a principle by name.

The laws describe tendencies, not hard limits. Where a law suggests a number (such as 7 plus or minus 2), the rules in this skill already set practical limits; do not invent stricter ones from the law.

| Law | What it means for a web app | Where the rules are |
|:--|:--|:--|
| Aesthetic-Usability Effect | A clean, consistent interface is perceived as easier to use, and users forgive small issues in it. Polish matters, but never at the cost of function. | `layout-and-visual.md` sections 1 to 5 and 11; `SKILL.md` rule 10 |
| Choice Overload | Too many options at once stall decisions. | `forms.md` section 3 (control by option count); `layout-and-visual.md` section 7 (plan pickers, advanced options) |
| Chunking | Break information into small meaningful groups. | `forms.md` sections 1 and 4 (field groups, steps, grouped numbers); `data-display.md` section 3 (grouped lists) |
| Cognitive Bias | People decide with predictable shortcuts. Do not exploit them. | `actions-and-feedback.md` section 9 (honest design) |
| Cognitive Load | Every element costs mental effort. | `layout-and-visual.md` section 7 (every element earns its place); `SKILL.md` rules 3 and 10 |
| Doherty Threshold | Responses under about 400ms keep users in rhythm. | `actions-and-feedback.md` section 2 (response time, pending states, optimistic updates) |
| Fitts's Law | Big, close targets are faster to hit. | `actions-and-feedback.md` section 1 (hit areas); `accessibility.md` (target size); `layout-and-visual.md` section 8 (touch targets) |
| Flow | Users work best uninterrupted. | `actions-and-feedback.md` section 5 (no unrequested dialogs); `navigation.md` section 8 (no tours, no nagging) |
| Goal-Gradient Effect | Effort increases as the goal gets closer. Show progress. | `forms.md` section 1 (step indicator); `navigation.md` section 8 (setup checklists) |
| Hick's Law | More and harder choices mean slower decisions. | `forms.md` section 3; `actions-and-feedback.md` sections 1 and 8 (one primary action, short menus); `layout-and-visual.md` section 7 |
| Jakob's Law | Users expect your app to work like the others they use. | `navigation.md` section 1 (conventional shell); `layout-and-visual.md` section 7 (title left, action right); shadcn components over custom ones |
| Law of Common Region | Things inside a shared boundary read as a group. | `layout-and-visual.md` section 7 (cards only for self contained units); `forms.md` section 1 (fieldsets) |
| Law of Proximity | Things close together read as related. | `layout-and-visual.md` section 1 (spacing ladder) |
| Law of Prägnanz | People read complex visuals as the simplest shape. Keep layouts simple. | `layout-and-visual.md` sections 2 and 11 |
| Law of Similarity | Things that look alike read as alike. | `actions-and-feedback.md` section 1 (variant per importance); `layout-and-visual.md` section 6 (signifiers); `data-display.md` (consistent status badges) |
| Law of Uniform Connectedness | Visually connected elements read as more related. | `layout-and-visual.md` sections 1 and 5 (borders, dividers, grouped surfaces); `forms.md` section 1 (fieldsets) |
| Mental Model | Users bring expectations of how things work. | `data-display.md` section 2 (values in the user's words); `navigation.md` (conventional structure) |
| Miller's Law | Working memory is small. Chunk, do not overload. | `forms.md` sections 1 and 4; `data-display.md` section 3 |
| Occam's Razor | The simplest design that works is best. | `SKILL.md` rule 10; `layout-and-visual.md` section 11 |
| Paradox of the Active User | Users skip manuals and start using the app. | `navigation.md` section 8 (no tours, teach at point of use); `data-display.md` section 7 (first use empty states) |
| Pareto Principle | A few features do most of the work. | `layout-and-visual.md` section 7 (keep the vital few visible); `navigation.md` section 1 (order by frequency) |
| Parkinson's Law | Tasks expand to fill the time available. Make them quick. | `forms.md` sections 1 and 4 (prefill, autofill, fewer fields) |
| Peak-End Rule | Experiences are judged by their peak and their end. | `navigation.md` section 8 (completion screens, protect the worst moment); `actions-and-feedback.md` section 4 (errors) |
| Postel's Law | Accept input liberally, output consistently. | `forms.md` section 4 (accept common formats, normalize); `layout-and-visual.md` section 9 (one date and number format) |
| Selective Attention | Users notice what relates to their goal and ignore banner like content. | `actions-and-feedback.md` section 9 (important messages inline); `layout-and-visual.md` section 11 |
| Serial Position Effect | First and last items are remembered best. | `navigation.md` section 1 (order by frequency, account at the end); `actions-and-feedback.md` section 8 (most used first, destructive last behind a separator) |
| Tesler's Law | Some complexity cannot be removed; the app should carry it, not the user. | `forms.md` section 1 (prefill and infer); `forms.md` section 3 (sensible defaults) |
| Von Restorff Effect | The item that differs is the one remembered. | `actions-and-feedback.md` section 1 (one filled button per view); `layout-and-visual.md` section 4 (one accent color) |
| Working Memory | Users hold only a little in mind while working. Show, do not make them recall. | `forms.md` section 1 (review step); `data-display.md` sections 1 and 5 (side by side comparison, active filter chips) |
| Zeigarnik Effect | Unfinished tasks stay on the mind. Make them easy to resume. | `navigation.md` section 8 (drafts, continue where you left off); `forms.md` section 1 (save drafts) |

## Other design frameworks in this skill

The same ideas appear under other names in design courses and talks. They map onto the rules like this:

| Framework | Where the rules are |
|:--|:--|
| Emphasis (one focal point, visual weight) | `layout-and-visual.md` section 7; Von Restorff Effect above |
| Hierarchy | `layout-and-visual.md` section 3 and section 7 |
| Scale and proportion | `layout-and-visual.md` section 3 (type scale) and section 7 (sizes follow importance) |
| Unity and variety | `layout-and-visual.md` section 7; Law of Similarity above |
| Gestalt: similarity, proximity, common region | Laws of Similarity, Proximity, and Common Region above |
| C.R.A.P.: contrast, repetition, alignment, proximity | `layout-and-visual.md` sections 1 to 4 (spacing, alignment, type, color) and section 7 (unity) |
| Color roles: brand, layout, meaning, interactive | `layout-and-visual.md` section 4 |
| Helping users decide (filter counts, histograms, layout toggles, density) | `data-display.md` sections 1 and 5; `layout-and-visual.md` section 7 |
| Four level design review: detail, page, function, app | `audit.md` section 3 |

## Where the laws pull in different directions

- **Defaults versus consent.** Sensible defaults reduce effort (Tesler's Law), but a default never opts the user into marketing, data sharing, paid add ons, or consent (Cognitive Bias). Those start unchecked.
- **A memorable ending versus restraint.** Completion screens end significant flows on a good note (Peak-End Rule), but routine saves keep using a toast or the visible result, and there is no celebration animation unless asked.
- **First and last positions versus destructive actions.** The most important item goes first (Serial Position Effect). Destructive items stay last in a menu, behind a separator, so they are findable but hard to hit by accident.
- **Standing out versus one accent.** A recommended option is highlighted with the existing accent and the view's one primary button (Von Restorff Effect), not with a new color or decoration.
- **Aesthetics versus decoration.** A polished interface feels more usable (Aesthetic-Usability Effect), but polish means consistent spacing, type, and color, not gradients or effects.
- **Clean versus informative.** Fewer visible choices speed decisions (Hick's Law, Cognitive Load), but hiding what the user needs to decide slows them more. Hide what is rarely used; keep counts, prices, status, and key attributes visible even if the page gets denser.
- **One layout versus a layout toggle.** Each collection gets the layout that fits its main task. Add a list and grid toggle only when users both browse and compare the same collection, with a sensible default that is remembered.
- **Unity versus variety.** Repeat the same components and styles everywhere; variety is reserved for elements that carry meaning (the primary action, a status, the selected or recommended item).
