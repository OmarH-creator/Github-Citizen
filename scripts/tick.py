#!/usr/bin/env python3
"""Deterministic hourly heartbeat.

This is the body, not the soul. It advances time and lets needs drift so the world stays
alive even if the AI misses a run. It never makes a *decision* -- no purchases, no journal
entries, no personality change. Those belong to Nova (see soul/RUN.md).
"""
import json, random, re, datetime, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
W = ROOT / "world"
NL = chr(10)

def load(p): return json.loads((W / p).read_text(encoding="utf-8"))
def save(p, d): (W / p).write_text(json.dumps(d, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

def clamp(v, lo=0, hi=100): return max(lo, min(hi, round(v)))

def index_mail(day):
    """Keep world/mail/index.json in step with the .md files people send.

    Mechanical only: it lists what arrived. Whether a message is read, saved or declined is
    Nova's call, and any status already recorded here is left exactly as it is.
    """
    box = W / "mail"
    if not box.is_dir():
        return
    idx_path = box / "index.json"
    idx = json.loads(idx_path.read_text(encoding="utf-8")) if idx_path.exists() else {"messages": []}
    known = {m["file"]: m for m in idx["messages"]}
    out = []
    for f in sorted(box.glob("*.md")):
        if f.name.lower() == "readme.md":
            continue
        if f.name in known:
            out.append(known[f.name])
            continue
        head = f.read_text(encoding="utf-8")[:600]
        grab = lambda k: (re.search("^" + k + r":\s*(.+)$", head, re.M) or [None, "unknown"])[1].strip()
        out.append({"file": f.name, "from": grab("from"), "kind": grab("kind"),
                    "arrived_day": day, "status": "unread", "note": ""})
    if out != idx["messages"]:
        idx["messages"] = out
        idx_path.write_text(json.dumps(idx, indent=2, ensure_ascii=False) + NL, encoding="utf-8")

SEASONS = ["winter","winter","spring","spring","spring","summer","summer","summer","autumn","autumn","autumn","winter"]
WEATHER = {
    "spring": ["clear","clear","cloudy","rain","rain","fog"],
    "summer": ["clear","clear","clear","cloudy","storm"],
    "autumn": ["cloudy","cloudy","rain","rain","fog","clear"],
    "winter": ["snow","snow","cloudy","fog","clear","storm"],
}

def main():
    st = load("state.json")
    ev = load("events.json")
    c, phy, emo, fin = st["clock"], st["physical"], st["emotional"], st["finance"]

    # deterministic-per-day randomness: the same day always rolls the same weather
    rng = random.Random(f"{st['identity']['born']}#{c['day']}#{c['tick']}")

    # --- time -------------------------------------------------------------
    h, m = (int(x) for x in c["sim_time"].split(":"))
    h += 1
    rolled = h >= 24
    if rolled:
        h -= 24
        c["day"] += 1
    c["sim_time"] = f"{h:02d}:{m:02d}"
    c["tick"] += 1
    now = datetime.datetime.now(datetime.timezone.utc)
    c["last_tick_utc"] = now.replace(microsecond=0).isoformat().replace("+00:00", "Z")
    c["season"] = SEASONS[now.month - 1]
    if rolled or rng.random() < 0.12:
        c["weather"] = rng.choice(WEATHER[c["season"]])

    log = []
    asleep = st["activity"]["current"].startswith("sleep")

    # The body does not decide how Nova spends an hour -- that is the soul's job. It only
    # collapses when there is nothing left, and wakes up once it has had enough. Staying up
    # is allowed; it is simply expensive.
    if not asleep and phy["energy"] <= 12:
        asleep = True
        st["activity"].update(current="sleeping", location="bed", since_tick=c["tick"])
        log.append("Ran out of energy and fell asleep without deciding to.")
    elif asleep and (phy["energy"] >= 96 or (h >= 9 and phy["energy"] >= 55)):
        asleep = False
        st["activity"].update(current="waking up", location="bed", since_tick=c["tick"])

    # --- body -------------------------------------------------------------
    if asleep:
        phy["energy"] = clamp(phy["energy"] + 9)
        phy["sleep"] = clamp(phy["sleep"] + 11)
        phy["hunger"] = clamp(phy["hunger"] + 2)
        phy["stress"] = clamp(phy["stress"] - 3)
        emo["burnout"] = clamp(emo["burnout"] - 2)
        st["stats"]["hours_slept"] += 1
    else:
        night = h < 6 or h >= 23          # being awake at 3am costs more than at 3pm
        phy["energy"] = clamp(phy["energy"] - (7 if night else 4))
        phy["sleep"] = clamp(phy["sleep"] - (5 if night else 3))
        phy["hunger"] = clamp(phy["hunger"] + 5)
        phy["fitness"] = clamp(phy["fitness"] - 0.3)
        if night:
            phy["stress"] = clamp(phy["stress"] + 2)

    # consequences: hunger and exhaustion are not free
    if phy["hunger"] > 75:
        emo["mood"] = clamp(emo["mood"] - 3); phy["health"] = clamp(phy["health"] - 1)
    if phy["energy"] < 20:
        emo["motivation"] = clamp(emo["motivation"] - 3); phy["stress"] = clamp(phy["stress"] + 2)
    if phy["stress"] > 70:
        emo["burnout"] = clamp(emo["burnout"] + 2)

    # mood drifts toward a baseline set by optimism, loneliness and burnout
    baseline = 45 + st["personality"]["optimism"] * 0.25 - emo["loneliness"] * 0.15 - emo["burnout"] * 0.2
    emo["mood"] = clamp(emo["mood"] + (baseline - emo["mood"]) * 0.12)
    if st.get("cat"):
        emo["loneliness"] = clamp(emo["loneliness"] - 0.5)
    else:
        emo["loneliness"] = clamp(emo["loneliness"] + 0.2)

    for k in phy: phy[k] = clamp(phy[k])
    for k in emo: emo[k] = clamp(emo[k])

    # --- money ------------------------------------------------------------
    if rolled:
        fin["savings"] = round(fin["savings"] - fin["food_weekly"] / 7.0, 2)
        if c["day"] % 30 == 0:
            fin["savings"] = round(fin["savings"] + fin["salary_monthly"] - fin["rent_monthly"], 2)
            st["stats"]["money_earned"] += fin["salary_monthly"]
            log.append(f"Payday, and rent out the same door. Savings: ${fin['savings']:.0f}.")
        if fin["savings"] < 0:
            fin["savings"] = 0.0
            phy["stress"] = clamp(phy["stress"] + 10)
            log.append("Ran out of money. That is a real problem now.")
        log.append(f"Day {c['day']} began. {c['weather'].capitalize()} outside.")

    index_mail(c["day"])

    # --- the timeline snapshot -------------------------------------------
    # One frozen frame of the apartment per day, so visitors can rewind the room.
    if rolled:
        hist = load("history.json")
        prev_day = c["day"] - 1
        if not any(d["day"] == prev_day for d in hist["days"]):
            born = datetime.date.fromisoformat(st["identity"]["born"][:10])
            hist["days"].append({
                "day": prev_day,
                "date": (born + datetime.timedelta(days=prev_day - 1)).isoformat(),
                "headline": st["activity"]["current"],
                "weather": c["weather"],
                "occupation": st["identity"]["occupation"],
                "savings": round(fin["savings"]),
                "mood": emo["mood"],
                "objects": st["apartment"]["objects"],
            })
            save("history.json", hist)

    # --- trail ------------------------------------------------------------
    for text in log:
        ev["events"].append({"tick": c["tick"], "day": c["day"], "time": c["sim_time"],
                             "kind": "heartbeat", "text": text})
    ev["events"] = ev["events"][-2000:]

    save("state.json", st)
    save("events.json", ev)
    print(f"tick {c['tick']} | day {c['day']} {c['sim_time']} | {c['weather']} | "
          f"energy {phy['energy']} hunger {phy['hunger']} mood {emo['mood']} ${fin['savings']:.0f}")

if __name__ == "__main__":
    main()
