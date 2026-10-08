# Laws of UX in this skill

The Laws of UX (lawsofux.com, by Jon Yablonski) are well known principles from psychology and design. This file maps each one to the concrete rules in this skill. The rules live in the other reference files; this is the index. Use it to explain why a rule exists, or to check a design against a principle by name.

The laws describe tendencies, not hard limits. Where a law suggests a number (such as 7 plus or minus 2), the rules in this skill already set practical limits; do not invent stricter ones from the law.

| Law | What it means for a mobile app | Where the rules are |
|:--|:--|:--|
| Aesthetic-Usability Effect | A clean, consistent app is perceived as easier to use, and users forgive small issues in it. Polish matters, but never at the cost of function. | `layout-and-touch.md` sections 3 to 5 and 12; `SKILL.md` rule 10 |
| Choice Overload | Too many options at once stall decisions. | `forms-and-keyboard.md` section 6 (control by option count); `layout-and-touch.md` section 2 (plan pickers, advanced options) |
| Chunking | Break information into small meaningful groups. | `forms-and-keyboard.md` sections 1 and 6 (steps, grouped numbers); `lists-and-data.md` section 2 (grouped lists) |
| Cognitive Bias | People decide with predictable shortcuts. Do not exploit them. | `feedback-and-states.md` section 11 (honest design) |
| Cognitive Load | Every element costs mental effort, and a phone screen has little room. | `layout-and-touch.md` section 2 (every element earns its place); `SKILL.md` rule 10 |
| Doherty Threshold | Responses under about 400ms keep users in rhythm. | `feedback-and-states.md` sections 2 and 3 (feedback within 100ms, response time, pending states); section 8 (optimistic updates) |
| Fitts's Law | Big, close targets are faster to hit. | `layout-and-touch.md` sections 6 and 7 (48 minimum, thumb zone) |
| Flow | Users work best uninterrupted. | `navigation-and-gestures.md` section 5 (no prompts mid task) and section 11 (no tours, no nagging) |
| Goal-Gradient Effect | Effort increases as the goal gets closer. Show progress. | `forms-and-keyboard.md` section 1 (step indicator); `navigation-and-gestures.md` section 11 (setup checklists) |
| Hick's Law | More and harder choices mean slower decisions. | `forms-and-keyboard.md` section 6; `feedback-and-states.md` section 1 (one primary action); `navigation-and-gestures.md` sections 2 and 4 (at most two header actions, three to five tabs) |
| Jakob's Law | Users expect your app to work like the other apps on their phone. | `navigation-and-gestures.md` sections 1 to 4 (native stack, tabs, back); `SKILL.md` rule 8 |
| Law of Common Region | Things inside a shared boundary read as a group. | `lists-and-data.md` section 6 (cards); `layout-and-touch.md` section 2 (sections) |
| Law of Proximity | Things close together read as related. | `layout-and-touch.md` section 3 (spacing scale) |
| Law of Prägnanz | People read complex visuals as the simplest shape. Keep layouts simple. | `layout-and-touch.md` sections 3 and 12 |
| Law of Similarity | Things that look alike read as alike. | `feedback-and-states.md` section 1 (hierarchy); `layout-and-touch.md` section 10 (signifiers); `lists-and-data.md` section 2 (consistent rows) |
| Law of Uniform Connectedness | Visually connected elements read as more related. | `layout-and-touch.md` sections 3 and 5 (grouping, borders, surfaces); `lists-and-data.md` section 2 (row anatomy) |
| Mental Model | Users bring expectations of how things work. | `lists-and-data.md` section 2 (values in the user's words); `navigation-and-gestures.md` (platform conventions) |
| Miller's Law | Working memory is small. Chunk, do not overload. | `forms-and-keyboard.md` sections 1 and 6; `lists-and-data.md` section 2 |
| Occam's Razor | The simplest design that works is best. | `SKILL.md` rule 10; `layout-and-touch.md` section 12 |
| Paradox of the Active User | Users skip onboarding and start using the app. | `navigation-and-gestures.md` section 11 (no tours, teach at point of use); `lists-and-data.md` section 8 (first use empty states) |
| Pareto Principle | A few features do most of the work. | `layout-and-touch.md` section 2 (keep the vital few visible); `navigation-and-gestures.md` section 4 (tabs for top destinations) |
| Parkinson's Law | Tasks expand to fill the time available. Make them quick. | `forms-and-keyboard.md` sections 1 and 6 (prefill, autofill, taps over typing) |
| Peak-End Rule | Experiences are judged by their peak and their end. | `navigation-and-gestures.md` sections 9 and 11 (completion screens, protect the worst moment); `feedback-and-states.md` section 5 (errors) |
| Postel's Law | Accept input liberally, output consistently. | `forms-and-keyboard.md` section 6 (accept any spacing, store normalized) |
| Selective Attention | Users notice what relates to their goal and ignore banner like content. | `feedback-and-states.md` section 11 (important messages inline) |
| Serial Position Effect | First and last items are remembered best. | `navigation-and-gestures.md` section 4 (tab order); `navigation-and-gestures.md` section 5 (destructive options last in action sheets) |
| Tesler's Law | Some complexity cannot be removed; the app should carry it, not the user. | `forms-and-keyboard.md` section 1 (prefill and infer) and section 6 (sensible defaults) |
| Von Restorff Effect | The item that differs is the one remembered. | `feedback-and-states.md` section 1 (one primary button); `layout-and-touch.md` section 5 (one accent color) |
| Working Memory | Users hold only a little in mind while working. Show, do not make them recall. | `forms-and-keyboard.md` section 1 (review screen); `lists-and-data.md` section 7 (visible filters) |
| Zeigarnik Effect | Unfinished tasks stay on the mind. Make them easy to resume. | `navigation-and-gestures.md` section 11 (drafts, continue where you left off); `forms-and-keyboard.md` section 8 (save drafts) |

## Where the laws pull in different directions

- **Defaults versus consent.** Sensible defaults reduce effort (Tesler's Law), but a default never opts the user into marketing, data sharing, paid add ons, or consent (Cognitive Bias). Those start off.
- **A memorable ending versus restraint.** Completion screens end significant flows on a good note (Peak-End Rule), but routine saves keep using a toast, a haptic, or the visible result. A completion screen is a screen in the flow, never a success alert, and there is no celebration animation unless asked.
- **First and last positions versus destructive actions.** The most important item goes first (Serial Position Effect). Destructive options stay last in action sheets and menus, marked destructive, so they are findable but hard to hit by accident.
- **Standing out versus one accent.** A recommended option is highlighted with the existing accent and the screen's one primary button (Von Restorff Effect), not with a new color or decoration.
- **Aesthetics versus decoration.** A polished app feels more usable (Aesthetic-Usability Effect), but polish means consistent spacing, type, and color, not gradients or effects.
