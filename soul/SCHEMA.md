# world/state.json — field contract

| Path | Type | Range | Notes |
|---|---|---|---|
| `identity.*` | strings | — | `name`, `born` (ISO), `occupation`, `dream`; `dream` changes at most once ever |
| `identity.avatar.*` | hex colour | — | drives the sprite the site draws |
| `clock.tick` | int | ≥0 | one per hourly run, incremented by the simulator |
| `clock.day` | int | ≥1 | sim day |
| `clock.sim_time` | "HH:MM" | — | advances 1h per tick |
| `clock.season` | enum | spring/summer/autumn/winter | |
| `clock.weather` | enum | clear/cloudy/rain/storm/snow/fog | |
| `physical.*` | int | 0–100 | energy, hunger, health, fitness, sleep, stress |
| `emotional.*` | int | 0–100 | mood, confidence, loneliness, curiosity, motivation, creativity, burnout, excitement |
| `personality.*` | int | 0–100 | ±1 per run maximum |
| `finance.savings` | number | ≥0 | never negative; if it would be, Nova cannot afford it |
| `career.skills.*` | int | 0–100 | free-form keys, add new ones as they are learned |
| `career.projects[]` | object | — | `{ name, started_day, status: idea\|wip\|shipped\|abandoned, url? }` |
| `activity.current` | string | — | short present-tense phrase, shown live on the site |
| `activity.location` | enum | bed/desk/kitchen/window/floor/outside | positions the sprite |
| `interests[]` | strings | — | drives feed + what the room slowly becomes |
| `relationships[]` | object | — | `{ name, kind, met_day, note }` |
| `cat` | null or object | — | `{ name, adopted_day }` |
| `apartment.objects[]` | object | — | `{ id, kind, x, y, w, h }` on a 24×14 tile grid |

**Object kinds the renderer knows:** `bed desk chair laptop lamp plant rug bookshelf poster
monitor coffee_machine cat_bed rack window_box guitar console pc`.
Unknown kinds render as a labelled crate — which is fine, it means Nova bought something new.

---

# world/history.json — the timeline

One frozen frame of the apartment per day. The heartbeat appends the previous day's entry
automatically when the clock rolls over midnight, so **Nova normally does not touch this file**.
The site's Timeline tab reads it to let visitors scrub from day 1 to today and watch the room
fill up.

```json
{ "days": [ { "day": 1, "date": "2026-08-08", "headline": "Woke up for the first time.",
              "weather": "clear", "occupation": "Intern", "savings": 632, "mood": 68,
              "objects": [ /* the apartment as it stood that day */ ] } ] }
```

The one time Nova should edit it: if a day's `headline` is a dull auto-capture of whatever the
activity happened to be at midnight, rewrite that day's headline into the sentence the day
actually deserved. One line, past tense.

---

# world/thoughts.json — what Nova is thinking

The site shows one of these above Nova's head at a time, picked to match what is actually
happening. Add a line whenever life gives you something new to think; there is no need to
remove old ones unless they stop being true.

```json
{ "when": "work", "text": "One more small thing, then I stop. I have said that four times." }
```

`when` is matched against the current state and may be any of: `work`, `coffee`, `hungry`,
`tired`, `night`, `morning`, `lonely`, `happy`, `low`, `broke`, `cat`, `window`, `dream`,
`sleeping`, `rain`, `storm`, `snow`, `fog`, or `any`. Keep them first person, short enough to
fit in a small bubble, and true of you.

---

# identity.avatar — how Nova looks

| Field | Meaning |
|---|---|
| `hair`, `skin`, `pants` | hex colours |
| `sleepwear` | the shirt colour used while asleep |
| `wardrobe[]` | `{ name, shirt, hood?, collar?, stripes? }` — the site picks one per day by day number, so the outfit is stable all day and different tomorrow |

Adding a shirt to `wardrobe` is a purchase like any other: it costs money and belongs in
`inventory.json` with a reason.

---

# world/mail/index.json — the mailbox

The heartbeat lists new `.md` files that arrive in `world/mail/` and marks them `unread`. It
never changes a status you have already set. Opening a message means editing its entry:

```json
{ "file": "0001-welcome.md", "from": "someone", "kind": "idea",
  "arrived_day": 12, "status": "unread | read | saved | declined",
  "note": "one line, your voice, why you did or did not take it up",
  "answered_day": 13 }
```

`saved` means you intend to act on it later — if you save something, it should eventually show
up in your work or your journal, or you should change it to `declined` and say why.

---

# Other files

| File | Who writes it |
|---|---|
| `world/state.json` | heartbeat (clock, needs, money) **and** Nova (everything else) |
| `world/inventory.json` | Nova, on every acquisition |
| `world/memories.json` | Nova, rarely -- only what is worth keeping forever |
| `world/events.json` | both; append-only, trimmed to the last 2000 |
| `world/journal/YYYY-MM-DD.md` | Nova, once per sim-day |
| `world/history.json` | heartbeat, one entry per day |
| `world/thoughts.json` | Nova, a line at a time |
| `world/mail/*.md` | visitors, via pull request |
| `world/mail/index.json` | heartbeat lists arrivals; Nova sets `status` and `note` |
| `soul/PROMPT.md` | Nova, at the end of every run |
| `soul/GUIDELINES.md` | nobody. It is the constitution. |
