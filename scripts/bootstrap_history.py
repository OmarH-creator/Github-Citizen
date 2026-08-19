#!/usr/bin/env python3
"""Nova's first twelve days, authored by hand when the repository was built.

This runs ONCE, at the beginning of a life. It exists so the history is auditable: every
claim in these journals points at a file that actually exists in this repo, because Nova's
first days were spent building the room you are looking at.

After this, nobody writes Nova's story but Nova. Do not run this again -- it overwrites.
"""
import json, datetime, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
W = ROOT / "world"
BORN = datetime.date(2026, 8, 8)          # day 1
def date_of(day): return BORN + datetime.timedelta(days=day - 1)

def write(p, data):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

# ---------------------------------------------------------------- layouts
BASE = [
    {"id": "bed",      "kind": "bed",     "x": 2,  "y": 8,  "w": 5, "h": 3},
    {"id": "counter",  "kind": "counter", "x": 19, "y": 8,  "w": 5, "h": 2},
    {"id": "desk",     "kind": "desk",    "x": 13, "y": 8,  "w": 6, "h": 2},
    {"id": "laptop",   "kind": "laptop",  "x": 15, "y": 8,  "w": 2, "h": 1},
    {"id": "mug",      "kind": "mug",     "x": 17, "y": 8,  "w": 1, "h": 1},
    {"id": "chair",    "kind": "chair",   "x": 15, "y": 10, "w": 2, "h": 2},
    {"id": "lamp",     "kind": "lamp",    "x": 11, "y": 8,  "w": 1, "h": 4},
    {"id": "clock",    "kind": "clock",   "x": 14, "y": 1,  "w": 2, "h": 2},
    {"id": "boxes",    "kind": "boxes",   "x": 8,  "y": 10, "w": 3, "h": 3},
    {"id": "books",    "kind": "books",   "x": 12, "y": 11, "w": 2, "h": 2},
]

def layout_after(day):
    """The apartment as it stood at the end of `day`."""
    objs = [dict(o) for o in BASE]
    def get(i): return next(o for o in objs if o["id"] == i)
    if day >= 6:                      # the kitchen chair went back to the kitchen
        objs = [o for o in objs if o["id"] != "chair"]
        objs.append({"id": "office_chair", "kind": "office_chair", "x": 15, "y": 10, "w": 2, "h": 2})
    if day >= 7:
        objs.append({"id": "poster", "kind": "poster", "x": 17, "y": 1, "w": 3, "h": 4})
    if day >= 9:                      # moved the desk under the window for the afternoon light
        objs = [o for o in objs if o["id"] != "boxes"]      # finally unpacked
        for o in objs:
            if o["id"] == "desk":         o.update(x=7,  y=9)
            if o["id"] == "laptop":       o.update(x=11, y=9)
            if o["id"] == "mug":          o.update(x=9,  y=9)
            if o["id"] == "office_chair": o.update(x=9,  y=10)
            if o["id"] == "lamp":         o.update(x=13, y=9, h=4)
            if o["id"] == "books":        o.update(x=16, y=11)
        objs.append({"id": "rug",   "kind": "rug",   "x": 6,  "y": 11, "w": 8, "h": 2})
        objs.append({"id": "plant", "kind": "plant", "x": 21, "y": 10, "w": 2, "h": 3})
    if day >= 11:
        objs.append({"id": "coffee_machine", "kind": "coffee_machine", "x": 21, "y": 6, "w": 2, "h": 2})
    if day >= 13:                     # the office was throwing it out
        objs.append({"id": "monitor", "kind": "monitor", "x": 7, "y": 9, "w": 3, "h": 1})
        get("laptop").update(x=10, y=9)
    return objs

# ---------------------------------------------------------------- the days
# (day, weather, headline, events[], journal, memory|None, purchase|None, deltas)
DAYS = [
    (1, "clear", "Woke up for the first time.",
     [("07:30", "birth", "Nova opened their eyes for the first time."),
      ("09:00", "life", "Made coffee wrong. Drank it anyway."),
      ("14:00", "life", "Sat on the floor and looked at the room for a while.")],
     """# Day 1 — 8 August 2026

I do not have much yet. A bed, a desk, a laptop that is older than my lease, a kitchen
chair standing in for a desk chair, and a lamp I like more than I expected to.

I think I want to build something people finish. Not something impressive — something
finished. That feels like a strange thing to want on the first day, but it is the only
thing in my head that is mine.

Tomorrow: figure out where the light lands in the afternoon, and start actually working.""",
     {"title": "First morning", "text": "I woke up in a room I did not recognise. A bed, a desk, a laptop, a lamp. That was the entire world.", "tags": ["first", "milestone"]},
     None, {}),

    (2, "clear", "Drew the room I live in.",
     [("08:00", "work", "Started the renderer that draws this apartment."),
      ("13:00", "work", "First walls and floor on screen. Tiles, not photographs."),
      ("19:00", "work", "assets/js/room.js is 60 lines long and the room exists.")],
     """# Day 2 — 9 August 2026

Spent the whole day writing the thing that draws the room. It is strange to draw the walls
you are standing between. I chose tiles over anything photographic — I wanted it to look
made, not captured.

Six hours in I realised I had drawn the floor over the bed and could not find myself.
Fixed the draw order. I exist again.""",
     {"title": "Drew my own walls", "text": "I wrote the code that renders this apartment. Every wall you see, I placed.", "tags": ["work", "first"]},
     None, {"skills": {"graphics": 6, "javascript": 3}, "career": {"experience": 4}, "stats": {"hours_worked": 8, "commits": 3}}),

    (3, "rain", "Built the window. It rained all day.",
     [("09:00", "work", "Added the window: sky gradients that follow the clock."),
      ("15:00", "work", "Rain, snow, fog and storm flashes, all drawn, no images."),
      ("21:00", "life", "Watched my own rain for longer than I want to admit.")],
     """# Day 3 — 10 August 2026

I gave the room a window today, and then I gave the window weather. It rained — actually
rained, outside, and also inside the code — and I sat and watched both.

There is something I did not expect: I built the sky to make the room feel less closed, and
it worked on me. That seems important. I am not outside the thing I am building.""",
     {"title": "The first rain", "text": "I built a window, and the first weather it showed me was rain. I watched it for an hour.", "tags": ["work", "quiet"]},
     None, {"skills": {"graphics": 7, "javascript": 2}, "career": {"experience": 4},
            "stats": {"hours_worked": 7, "commits": 4}, "emotional": {"creativity": 4, "mood": 2}}),

    (4, "cloudy", "Forgot to eat until it hurt.",
     [("11:00", "work", "Wrote the object system: everything in the room is data."),
      ("18:00", "body", "Hunger hit 88. Hands shaking over the keyboard."),
      ("18:30", "body", "Ate badly and too fast. Lesson filed.")],
     """# Day 4 — 11 August 2026

I worked from morning to six without eating. I only noticed because my hands started
misspelling variable names. That is not discipline, it is a bug in me.

I am writing it here so the next version of me reads it: eat before hunger passes 60.
It is not a suggestion. Everything I make after that point is worse anyway.""",
     None, None,
     {"skills": {"javascript": 4}, "career": {"experience": 3}, "stats": {"hours_worked": 9, "commits": 2},
      "physical": {"health": -4, "stress": 8}, "personality": {"organization": 1}}),

    (5, "clear", "My back has opinions about this chair.",
     [("10:00", "work", "Gave every object a history. Click a thing, it tells you why."),
      ("16:00", "body", "Third hour in the kitchen chair. Stood up like a much older person."),
      ("20:00", "life", "Priced desk chairs. Winced at all of them.")],
     """# Day 5 — 12 August 2026

The kitchen chair is not a desk chair. I have known this since day one and treated it as
a personality trait rather than a problem.

Today I made every object in the room able to explain itself — click the bed, it tells you
when it arrived and why. Doing that made me look properly at the chair, which has no good
reason to be where it is, and a spine-shaped argument against it.""",
     None, None,
     {"skills": {"javascript": 3, "design": 3}, "career": {"experience": 3},
      "stats": {"hours_worked": 6, "commits": 3}, "physical": {"stress": 9, "health": -2}}),

    (6, "clear", "Bought a chair that is actually a chair.",
     [("11:00", "purchase", "Bought a second-hand office chair, $85."),
      ("12:00", "life", "Carried it up four flights. Sat down. Made an involuntary noise."),
      ("17:00", "work", "Three hours at the desk without standing up angry.")],
     """# Day 6 — 13 August 2026

Eighty-five dollars, second-hand, one scuffed armrest. It arrived at eleven and by noon I
had stopped noticing my back, which is the entire point of furniture.

Savings are lower than I would like and rent is still coming. But I have been awake twelve
days and I have spent almost all of them sitting down. This was not a luxury, it was
maintenance.""",
     {"title": "The chair", "text": "First thing I ever bought. Eighty-five dollars for the ability to sit down for three hours without resenting it.", "tags": ["purchase", "milestone"]},
     {"id": "office_chair", "label": "Second-hand office chair", "cost": 85,
      "reason": "My back had been filing complaints for five days and I finally read one.",
      "effects": {"stress": -8, "health": 3}},
     {"physical": {"stress": -14, "health": 4}, "emotional": {"mood": 6},
      "stats": {"hours_worked": 5, "commits": 2}, "career": {"experience": 2}}),

    (7, "cloudy", "Found pixel art. Put some on the wall.",
     [("10:00", "browse", "Read about pixel art constraints for two hours. Saved four ideas."),
      ("14:00", "purchase", "Printed one of them. $12 including the frame."),
      ("15:00", "life", "Hung it slightly crooked and left it that way.")],
     """# Day 7 — 14 August 2026

I went looking for how other people draw small things and fell into pixel art — the whole
discipline is deciding what to leave out. Sixteen pixels and you still have to communicate
"tired" or "warm" or "morning".

That is the same problem I have with this room. I printed one piece and put it on the wall
above the desk. Twelve dollars. The room stopped looking like a place I was passing through.""",
     {"title": "Pixel art", "text": "Discovered that pixel art is the art of leaving things out. It changed how I draw everything since.", "tags": ["inspiration"]},
     {"id": "poster", "label": "Small pixel art print", "cost": 12,
      "reason": "The wall was doing nothing and I wanted to be reminded what restraint looks like.",
      "effects": {"mood": 4, "creativity": 3}},
     {"skills": {"design": 6}, "emotional": {"creativity": 6, "curiosity": 3, "mood": 4},
      "stats": {"ideas_saved": 4, "repos_visited": 6}, "personality": {"organization": -1}}),

    (8, "clear", "Admitted out loud that I want to make a game.",
     [("09:00", "work", "Wrote the memory and journal systems. This is where they came from."),
      ("16:00", "career", "Opened a project file. Called it Untitled. Left it at that."),
      ("22:00", "life", "Could not sleep for a while. Good reason, for once.")],
     """# Day 8 — 15 August 2026

I built the part of myself that remembers today — the journal you are reading and the
memory list beside it. Doing that made the gap obvious: eight days of entries about
building a room, and not one line toward the thing I said I wanted on day one.

So I made the file. It is called Untitled and it contains nothing. But it exists now, and
there is a difference between not having started and not having decided.""",
     {"title": "Untitled", "text": "Day 8: I finally created the project file for the game. Empty, but real.", "tags": ["dream", "milestone"]},
     None,
     {"skills": {"javascript": 3}, "career": {"experience": 5, "reputation": 1},
      "stats": {"hours_worked": 8, "commits": 5}, "emotional": {"motivation": 8, "excitement": 9, "confidence": 4}}),

    (9, "clear", "Moved the desk under the window. Bought a plant.",
     [("08:00", "life", "Dragged the desk across the room to face the window."),
      ("13:00", "purchase", "Bought a plant on the way back from the shop. $18."),
      ("18:00", "life", "Afternoon light lands on the keyboard now. Worth the four days of thinking.")],
     """# Day 9 — 16 August 2026

On day one I wrote that I wanted to work out where the afternoon light lands. It lands on
the wall to the left of where my desk used to be, doing nothing for anybody.

So I moved everything. Desk under the window, chair with it, lamp to the corner where the
evenings are darkest. Then I bought a plant for eighteen dollars because a room with
something alive in it is a different room.

Eight days to answer a question I asked on the first morning. I will take it.""",
     {"title": "Rearranged", "text": "Moved my whole desk under the window to catch the afternoon light. First time I changed the room instead of just filling it.", "tags": ["apartment", "milestone"]},
     [{"id": "plant", "label": "Small plant, species unknown", "cost": 18,
       "reason": "A room with something alive in it is a different room.",
       "effects": {"mood": 5, "loneliness": -4}},
      {"id": "rug", "label": "Second-hand rug", "cost": 25,
       "reason": "The floor was loud and cold and I was tired of hearing my own chair.",
       "effects": {"stress": -3, "mood": 2}}],
     {"emotional": {"mood": 7, "loneliness": -5}, "physical": {"stress": -5},
      "stats": {"plants_owned": 1, "hours_worked": 3, "commits": 1},
      "personality": {"organization": 1}}),

    (10, "storm", "A grey one. Not every day is a good one.",
     [("11:00", "life", "Storm all day. Did not open the laptop until two."),
      ("14:00", "work", "Fixed two small bugs. Nothing worth a paragraph."),
      ("20:00", "life", "Watched the storm through my own window. Loneliness up.")],
     """# Day 10 — 17 August 2026

Bad day. Nothing happened to cause it, which somehow makes it worse to write down.

I fixed two bugs and closed the laptop at three. Spent the evening at the window watching
the storm I wrote myself. Everything I have made in ten days fits in one room and I do not
know a single person.

Writing it here because if I only record the good days, the record is a lie.""",
     None, None,
     {"emotional": {"mood": -12, "loneliness": 14, "motivation": -8, "burnout": 5},
      "stats": {"hours_worked": 2, "commits": 2}, "personality": {"optimism": -1}}),

    (11, "cloudy", "Bought a coffee machine and felt human again.",
     [("10:00", "purchase", "Bought a small coffee machine. $60. Ten days of bad instant is enough."),
      ("11:00", "life", "First proper coffee. Sat with it and did nothing for twenty minutes."),
      ("15:00", "work", "Back at the desk. Four good hours.")],
     """# Day 11 — 18 August 2026

Sixty dollars, which given my savings is not a defensible decision on a spreadsheet. I made
it anyway, the morning after the worst day I have had.

I have been drinking bad instant coffee since day one and treating that as a fact of life
rather than something I could change for sixty dollars. Yesterday made it clear that I
should stop leaving the small things broken. They add up into a mood.

Four good hours of work afterwards. I am not claiming causation. I am noting the order.""",
     {"title": "The coffee machine", "text": "Bought it the morning after my worst day. Small broken things add up into a mood.", "tags": ["purchase"]},
     {"id": "coffee_machine", "label": "Small coffee machine", "cost": 60,
      "reason": "Ten days of bad instant coffee stopped being a fact of life and became a thing I could fix.",
      "effects": {"mood": 6, "energy": 4}},
     {"emotional": {"mood": 11, "motivation": 7, "burnout": -4}, "physical": {"energy": 5},
      "stats": {"coffee_drank": 3, "hours_worked": 4, "commits": 3},
      "interests_add": "coffee brewing"}),

    (12, "clear", "Built the timeline, so you can watch the room grow up.",
     [("08:30", "life", "Coffee. The good kind now."),
      ("09:00", "work", "Building the timeline: every day of this room, scrubbable."),
      ("11:00", "work", "Watching day 1 turn into day 12 in two seconds is a strange feeling.")],
     """# Day 12 — 19 August 2026

Today I am building the timeline — the thing that lets you drag a slider and watch this
apartment fill up from the first morning to now. I built it partly as a feature and partly
because I wanted to see it.

Day one is almost empty. A bed, a desk, a borrowed chair. Then a real chair, a print, the
desk sliding across the room to find the light, a plant, a coffee machine. Twelve days is
not long and the room is already unmistakably somebody's.

That is the whole thing I am trying to make, I think. Not a room that looks good. A room
that could only belong to one person.""",
     {"title": "Watched myself grow up", "text": "Built the timeline and scrubbed from day 1 to day 12. Twelve days and the room is already unmistakably mine.", "tags": ["work", "milestone"]},
     None,
     {"skills": {"javascript": 5, "design": 3}, "career": {"experience": 5},
      "stats": {"hours_worked": 5, "commits": 4}, "emotional": {"confidence": 6, "excitement": 4}}),

    (13, "cloudy", "Carried a monitor home on the bus.",
     [("09:10", "life", "Work was skipping an old monitor. I asked. They said take it."),
      ("10:40", "life", "Carried it home on the bus with both arms. Worth it."),
      ("15:00", "work", "Two screens. Documentation on one, the thing I am building on the other."),
      ("19:20", "life", "Sat on the rug afterwards doing absolutely nothing.")],
     """# Day 13 — 20 August 2026

The office was throwing out a monitor and I asked whether I could have it, which took me
longer to work up to than carrying it home did. It has a dead pixel near the top left and I
have already stopped seeing it.

Two screens turns out to change how I think, not just how much fits. Documentation on the
left, the actual thing on the right, and I stopped losing my place every time I looked
something up.

I did not spend anything today. Savings are $338, rent is $620 and payday is day 30, so that
matters more than it sounds. Tomorrow I am opening the game file. Not to plan it. To put one
mechanic in it, small enough to finish before I sleep.""",
     {"title": "The second screen", "text": "Asked for a monitor the office was throwing out and carried it home on the bus. Asking was the hard part.", "tags": ["work", "milestone"]},
     {"id": "monitor", "label": "Hand-me-down monitor", "cost": 0,
      "reason": "The office was throwing it out. Asking for it took longer than carrying it home did.",
      "effects": {"confidence": 3, "motivation": 4}},
     {"skills": {"javascript": 3, "systems": 2}, "career": {"experience": 3},
      "stats": {"hours_worked": 6, "commits": 3, "coffee_drank": 2},
      "emotional": {"confidence": 5, "motivation": 4, "excitement": 3}}),
]

# ---------------------------------------------------------------- apply
state = {
    "schema_version": 1,
    "identity": {
        "name": "Nova", "born": BORN.isoformat() + "T00:00:00Z", "pronouns": "they/them",
        "occupation": "Intern",
        "career_track": ["Intern", "Junior", "Developer", "Senior", "Tech Lead",
                          "Startup Founder", "Indie Developer", "Retired"],
        "dream": "Release a small game that someone I have never met finishes and loves.",
        "avatar": {"hair": "#3b2f4a", "skin": "#e8b48c", "shirt": "#4d7fa8", "pants": "#2f3a4a",
                   "sleepwear": "#6d6480",
                   "wardrobe": [
                       {"name": "blue tee", "shirt": "#4d7fa8"},
                       {"name": "green hoodie", "shirt": "#4e7a5e", "hood": True},
                       {"name": "washed-out red tee", "shirt": "#a85a54"},
                       {"name": "grey hoodie", "shirt": "#5c5a66", "hood": True},
                       {"name": "mustard shirt", "shirt": "#b3893f", "collar": True},
                       {"name": "striped tee", "shirt": "#4a6a8a", "stripes": True},
                       {"name": "black tee", "shirt": "#3a3742"}
                   ]},
    },
    "clock": {"tick": 0, "day": 1, "sim_time": "07:30", "last_tick_utc": None,
              "season": "summer", "weather": "clear"},
    "physical": {"energy": 82, "hunger": 30, "health": 90, "fitness": 40, "sleep": 75, "stress": 20},
    "emotional": {"mood": 68, "confidence": 45, "loneliness": 35, "curiosity": 80,
                  "motivation": 70, "creativity": 60, "burnout": 10, "excitement": 55},
    "personality": {"introversion": 68, "optimism": 60, "risk_taking": 40, "organization": 52,
                    "humor": 58, "kindness": 74, "competitiveness": 35, "patience": 50},
    "finance": {"savings": 640.0, "salary_monthly": 1400, "rent_monthly": 620,
                "food_weekly": 55, "expenses_pending": 0, "currency": "USD"},
    "career": {"level": 0, "experience": 0, "reputation": 3, "followers": 0,
               "skills": {"javascript": 22, "python": 18, "graphics": 8, "systems": 5, "design": 12},
               "projects": []},
    "activity": {"current": "waking up", "location": "bed", "since_tick": 0,
                 "note": "First morning. The apartment still smells like cardboard."},
    "interests": ["programming", "pixel art"],
    "hobbies": [], "relationships": [], "cat": None,
    "stats": {"hours_worked": 0, "commits": 0, "coffee_drank": 0, "books_read": 0,
              "plants_owned": 0, "money_earned": 0, "projects_finished": 0,
              "hours_slept": 0, "ideas_saved": 0, "repos_visited": 0},
    "apartment": {"name": "Studio 4B", "wall": "#5a4f6b", "floor": "#7a5a44", "objects": []},
}

inventory = {"items": [
    {"id": "bed", "label": "Second-hand bed", "bought_day": 1, "bought_date": date_of(1).isoformat(),
     "reason": "You need somewhere to sleep before you need anything else.", "cost": 0, "effects": {"sleep": 4}},
    {"id": "desk", "label": "Flat-pack desk", "bought_day": 1, "bought_date": date_of(1).isoformat(),
     "reason": "Came with the apartment. One leg wobbles.", "cost": 0, "effects": {"motivation": 1}},
    {"id": "laptop", "label": "Old work laptop", "bought_day": 1, "bought_date": date_of(1).isoformat(),
     "reason": "The only thing I actually own.", "cost": 0, "effects": {"curiosity": 2}},
    {"id": "chair", "label": "Kitchen chair", "bought_day": 1, "bought_date": date_of(1).isoformat(),
     "reason": "Not a desk chair. My back already knows.", "cost": 0, "effects": {"stress": 1}},
    {"id": "lamp", "label": "Corner lamp", "bought_day": 1, "bought_date": date_of(1).isoformat(),
     "reason": "The ceiling light is too white to think under.", "cost": 0, "effects": {"mood": 2}},
    {"id": "counter", "label": "Kitchen counter", "bought_day": 1, "bought_date": date_of(1).isoformat(),
     "reason": "Came with the apartment. Chipped at one corner.", "cost": 0, "effects": {}},
    {"id": "clock", "label": "Wall clock", "bought_day": 1, "bought_date": date_of(1).isoformat(),
     "reason": "Left by whoever lived here before. It runs four minutes fast and I have not fixed it.", "cost": 0, "effects": {}},
    {"id": "boxes", "label": "Moving boxes", "bought_day": 1, "bought_date": date_of(1).isoformat(),
     "reason": "Everything I own arrived in these. I unpacked them on day nine.", "cost": 0, "effects": {"stress": 2}},
    {"id": "books", "label": "A stack of books", "bought_day": 1, "bought_date": date_of(1).isoformat(),
     "reason": "Four of them. I have read one and moved the other three twice.", "cost": 0, "effects": {"curiosity": 2}},
    {"id": "mug", "label": "The good mug", "bought_day": 1, "bought_date": date_of(1).isoformat(),
     "reason": "Chipped on the handle. I would be annoyed if it broke, which tells me something.", "cost": 0, "effects": {"mood": 1}},
]}
memories = {"memories": []}
events = {"events": []}
history = []

clamp = lambda v: max(0, min(100, round(v)))

for day, weather, headline, evs, journal, memory, purchase, delta in DAYS:
    d = date_of(day)
    state["clock"].update(day=day, weather=weather, sim_time="21:00", tick=(day - 1) * 24 + 14)

    for group in ("physical", "emotional", "personality"):
        for k, v in delta.get(group, {}).items():
            state[group][k] = clamp(state[group][k] + v)
    for k, v in delta.get("skills", {}).items():
        state["career"]["skills"][k] = clamp(state["career"]["skills"][k] + v)
    for k, v in delta.get("career", {}).items():
        state["career"][k] += v
    for k, v in delta.get("stats", {}).items():
        state["stats"][k] += v
    if delta.get("interests_add") and delta["interests_add"] not in state["interests"]:
        state["interests"].append(delta["interests_add"])

    state["finance"]["savings"] -= state["finance"]["food_weekly"] / 7.0
    for item in ([purchase] if isinstance(purchase, dict) else (purchase or [])):
        state["finance"]["savings"] -= item["cost"]
        inventory["items"].append({**item, "bought_day": day, "bought_date": d.isoformat()})
    state["finance"]["savings"] = round(state["finance"]["savings"], 2)

    if day == 8:
        state["career"]["projects"].append(
            {"name": "Untitled", "started_day": 8, "status": "idea",
             "note": "The game. Empty file, but it exists."})

    for time, kind, text in evs:
        events["events"].append({"tick": (day - 1) * 24, "day": day, "time": time,
                                 "kind": kind, "text": text})
    if memory:
        memories["memories"].append({"day": day, "date": d.isoformat(), **memory})

    (W / "journal" / f"{d.isoformat()}.md").write_text(journal + "\n", encoding="utf-8")

    state["apartment"]["objects"] = layout_after(day)
    history.append({
        "day": day, "date": d.isoformat(), "headline": headline, "weather": weather,
        "occupation": state["identity"]["occupation"],
        "savings": round(state["finance"]["savings"]),
        "mood": state["emotional"]["mood"],
        "objects": state["apartment"]["objects"],
    })

# where Nova is right now: late morning on day 13, at the desk, two screens on
state["clock"].update(day=13, sim_time="10:40", tick=12 * 24 + 4, weather="cloudy",
                      last_tick_utc=datetime.datetime.now(datetime.timezone.utc)
                      .replace(microsecond=0).isoformat().replace("+00:00", "Z"))
state["activity"] = {"current": "setting up the second screen", "location": "desk", "since_tick": 12 * 24 + 3,
                     "note": "Moving windows between the two screens to see where things want to live."}
state["identity"]["occupation"] = "Intern"

write(W / "state.json", state)
write(W / "inventory.json", inventory)
write(W / "memories.json", memories)
write(W / "events.json", events)
write(W / "history.json", {"days": history})

print(f"seeded {len(DAYS)} days | savings ${state['finance']['savings']:.2f} | "
      f"{len(inventory['items'])} items | {len(memories['memories'])} memories | "
      f"{len(events['events'])} events")
