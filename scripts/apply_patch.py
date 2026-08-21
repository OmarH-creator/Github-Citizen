#!/usr/bin/env python3
"""Apply one of Nova's patches to the world.

This exists for the case where the scheduled AI can read the repository but cannot write to
it. Nova prints a JSON patch (see soul/RUN.md §7); this applies it.

It is also the place where the guidelines stop being a request and become a rule. A patch
that overspends, jumps a personality trait, edits the clock, or writes outside `world/` is
rejected whole. Nothing is applied unless everything validates.

    python scripts/apply_patch.py patch.json
    cat patch.json | python scripts/apply_patch.py -
"""
import json, sys, datetime, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
W = ROOT / "world"
NL = chr(10)

CLAMPED = ("physical", "emotional", "personality")
MAX_MOVE = {"physical": 25, "emotional": 25, "personality": 1}


class Rejected(Exception):
    pass


def load(name):
    return json.loads((W / name).read_text(encoding="utf-8"))


def save(name, data):
    (W / name).write_text(json.dumps(data, indent=2, ensure_ascii=False) + NL, encoding="utf-8")


def deep_merge(dst, src, path=""):
    for k, v in src.items():
        here = f"{path}.{k}" if path else k
        if isinstance(v, dict) and isinstance(dst.get(k), dict):
            deep_merge(dst[k], v, here)
        else:
            dst[k] = v


def validate_state(before, patch):
    """Everything Nova is not allowed to do to state.json."""
    if "clock" in patch:
        raise Rejected("the clock belongs to the heartbeat -- remove `clock` from the patch")
    if "schema_version" in patch:
        raise Rejected("schema_version is not yours to change")
    if "identity" in patch and "born" in patch["identity"]:
        raise Rejected("you have one birthday and it already happened")

    for group in CLAMPED:
        for k, v in patch.get(group, {}).items():
            if not isinstance(v, (int, float)):
                raise Rejected(f"{group}.{k} must be a number")
            if not 0 <= v <= 100:
                raise Rejected(f"{group}.{k}={v} is outside 0-100")
            was = before[group].get(k)
            if was is None:
                continue
            # eating and resting are allowed to outrun the body; nothing else is
            relief = (group == "physical" and
                      ((k == "hunger" and v < was) or (k in ("energy", "sleep") and v > was)))
            if not relief and abs(v - was) > MAX_MOVE[group]:
                raise Rejected(
                    f"{group}.{k} moved {was}->{v}; at most {MAX_MOVE[group]} in one hour")

    fin = patch.get("finance", {})
    if "savings" in fin and fin["savings"] < 0:
        raise Rejected("savings cannot go below zero -- you cannot buy what you cannot afford")

    for k, v in patch.get("stats", {}).items():
        was = before["stats"].get(k, 0)
        if v < was:
            raise Rejected(f"stats.{k} went backwards ({was} -> {v}); counters only go up")

    for k, v in patch.get("career", {}).get("skills", {}).items():
        if not 0 <= v <= 100:
            raise Rejected(f"career.skills.{k}={v} is outside 0-100")

    for o in patch.get("apartment", {}).get("objects", []):
        if not {"id", "kind", "x", "y"} <= set(o):
            raise Rejected(f"apartment object {o} needs at least id, kind, x, y")
        if not (0 <= o["x"] <= 24 and 0 <= o["y"] <= 14):
            raise Rejected(f"object {o['id']} is outside the room")


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else "-"
    raw = sys.stdin.read() if src == "-" else pathlib.Path(src).read_text(encoding="utf-8")
    raw = raw.strip()
    if raw.startswith("```"):                       # tolerate a fenced block
        raw = raw.split("```")[1]
        raw = raw[4:] if raw.lower().startswith("json") else raw
    try:
        patch = json.loads(raw)
    except json.JSONDecodeError as e:
        raise Rejected(f"not valid JSON: {e}")

    unknown = set(patch) - {
        "commit_message", "state", "events_append", "journal_append", "memories_append",
        "inventory_append", "thoughts_append", "mail", "history_headline", "prompt"}
    if unknown:
        raise Rejected(f"unknown keys in patch: {sorted(unknown)}")

    state = load("state.json")
    clock = state["clock"]
    born = datetime.date.fromisoformat(state["identity"]["born"][:10])
    today = born + datetime.timedelta(days=clock["day"] - 1)
    changed = []

    # ---- state ---------------------------------------------------------
    if patch.get("state"):
        validate_state(state, patch["state"])
        deep_merge(state, patch["state"])
        save("state.json", state)
        changed.append("state.json")

    # ---- the trail -----------------------------------------------------
    if patch.get("events_append"):
        ev = load("events.json")
        for e in patch["events_append"]:
            if not e.get("text"):
                raise Rejected("every event needs text")
            ev["events"].append({
                "tick": e.get("tick", clock["tick"]), "day": e.get("day", clock["day"]),
                "time": e.get("time", clock["sim_time"]), "kind": e.get("kind", "life"),
                "text": e["text"]})
        ev["events"] = ev["events"][-2000:]
        save("events.json", ev)
        changed.append("events.json")

    if patch.get("memories_append"):
        mem = load("memories.json")
        for m in patch["memories_append"]:
            if not (m.get("title") and m.get("text")):
                raise Rejected("a memory needs a title and text")
            mem["memories"].append({"day": m.get("day", clock["day"]),
                                    "date": m.get("date", today.isoformat()),
                                    "title": m["title"], "text": m["text"],
                                    "tags": m.get("tags", [])})
        save("memories.json", mem)
        changed.append("memories.json")

    if patch.get("inventory_append"):
        inv = load("inventory.json")
        owned = {i["id"] for i in inv["items"]}
        for it in patch["inventory_append"]:
            if not (it.get("id") and it.get("label") and it.get("reason")):
                raise Rejected("everything you own needs an id, a label and a reason")
            if it["id"] in owned:
                raise Rejected(f"you already own '{it['id']}'")
            inv["items"].append({**it, "cost": it.get("cost", 0),
                                 "bought_day": it.get("bought_day", clock["day"]),
                                 "bought_date": it.get("bought_date", today.isoformat())})
        save("inventory.json", inv)
        changed.append("inventory.json")

    if patch.get("thoughts_append"):
        th = load("thoughts.json")
        for t in patch["thoughts_append"]:
            if not t.get("text"):
                raise Rejected("a thought needs text")
            th["thoughts"].append({"when": t.get("when", "any"), "text": t["text"]})
        save("thoughts.json", th)
        changed.append("thoughts.json")

    # ---- the journal ---------------------------------------------------
    if patch.get("journal_append"):
        f = W / "journal" / f"{today.isoformat()}.md"
        text = patch["journal_append"].strip()
        if f.exists():
            f.write_text(f.read_text(encoding="utf-8").rstrip() + NL * 2 + text + NL,
                         encoding="utf-8")
        else:
            head = f"# Day {clock['day']} — {today.strftime('%-d %B %Y') if sys.platform != 'win32' else today.strftime('%d %B %Y').lstrip('0')}"
            f.write_text(head + NL * 2 + text + NL, encoding="utf-8")
        changed.append(str(f.relative_to(ROOT)))

    # ---- the mailbox ---------------------------------------------------
    if patch.get("mail"):
        idx = load("mail/index.json")
        by_file = {m["file"]: m for m in idx["messages"]}
        for fname, upd in patch["mail"].items():
            if fname not in by_file:
                raise Rejected(f"no message called '{fname}'")
            if upd.get("status") not in {"unread", "read", "saved", "declined", None}:
                raise Rejected(f"'{upd.get('status')}' is not a mail status")
            by_file[fname].update({k: v for k, v in upd.items() if k in
                                   ("status", "note", "answered_day")})
            by_file[fname].setdefault("answered_day", clock["day"])
        save("mail/index.json", idx)
        changed.append("mail/index.json")

    # ---- a past day's headline ----------------------------------------
    if patch.get("history_headline"):
        h = patch["history_headline"]
        hist = load("history.json")
        for d in hist["days"]:
            if d["day"] == h.get("day"):
                d["headline"] = h["headline"]
                break
        else:
            raise Rejected(f"no day {h.get('day')} in history")
        save("history.json", hist)
        changed.append("history.json")

    # ---- the note to the next self -------------------------------------
    if patch.get("prompt"):
        (ROOT / "soul" / "PROMPT.md").write_text(patch["prompt"].rstrip() + NL, encoding="utf-8")
        changed.append("soul/PROMPT.md")

    if not changed:
        raise Rejected("the patch changed nothing")

    msg = patch.get("commit_message") or f"nova: day {clock['day']}, {clock['sim_time']}"
    print(msg)
    print("changed: " + ", ".join(changed), file=sys.stderr)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Rejected as e:
        print(f"patch rejected: {e}", file=sys.stderr)
        sys.exit(1)
