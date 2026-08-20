import { render, hitTest } from "./room.js?v=6";

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const json = (p) => fetch(p + "?v=" + Date.now()).then((r) => (r.ok ? r.json() : null)).catch(() => null);
const text = (p) => fetch(p + "?v=" + Date.now()).then((r) => (r.ok ? r.text() : null)).catch(() => null);

const W = { state: null, inv: null, mem: null, ev: null, hist: null, thoughts: null };
let thoughtPool = [];
let live = null;        // the real Nova
let shown = null;       // what the canvas is currently drawing (may be a past day)
let hover = null;

/* ---------------- view helpers ---------------- */
function meter(label, v, invert = false) {
  const bad = invert ? v > 70 : v < 25, warn = invert ? v > 45 : v < 50;
  return `<div class="meter ${bad ? "bad" : warn ? "warn" : ""}">
    <div class="row"><span>${esc(label)}</span><span class="mono">${Math.round(v)}</span></div>
    <div class="track"><i style="width:${Math.max(2, v)}%"></i></div></div>`;
}
const kv = (k, v) => `<div class="kv"><span>${esc(k)}</span><b>${esc(v)}</b></div>`;

/* ---------------- panels ---------------- */
function paintLife(st) {
  $("#dream").textContent = "“" + st.identity.dream + "”";
  const p = st.physical, e = st.emotional;
  $("#meters").innerHTML =
    meter("Energy", p.energy) + meter("Hunger", p.hunger, true) + meter("Health", p.health) +
    meter("Sleep", p.sleep) + meter("Stress", p.stress, true) + meter("Mood", e.mood) +
    meter("Motivation", e.motivation) + meter("Curiosity", e.curiosity) +
    meter("Creativity", e.creativity) + meter("Confidence", e.confidence) +
    meter("Loneliness", e.loneliness, true) + meter("Burnout", e.burnout, true);

  const f = st.finance;
  const runway = Math.floor(f.savings / (f.food_weekly / 7 || 1));
  $("#money").innerHTML =
    kv("Savings", "$" + Math.round(f.savings)) +
    kv("Salary", "$" + f.salary_monthly + "/mo") +
    kv("Rent", "$" + f.rent_monthly + "/mo") +
    kv("Food", "$" + f.food_weekly + "/wk") +
    kv("Runway", runway + " days");

  $("#skills").innerHTML = Object.entries(st.career.skills)
    .sort((a, b) => b[1] - a[1]).map(([k, v]) => kv(k, v)).join("");

  $("#projects").innerHTML = st.career.projects.length
    ? st.career.projects.map((pr) =>
        `<div class="proj"><b>${esc(pr.name)}</b> <span class="pill">${esc(pr.status)}</span>
         <div class="small muted">started day ${pr.started_day}${pr.note ? " · " + esc(pr.note) : ""}</div></div>`).join("")
    : `<p class="muted small">Nothing started yet.</p>`;

  $("#traits").innerHTML = Object.entries(st.personality)
    .map(([k, v]) => meter(k.replace(/_/g, " "), v)).join("");
  $("#interests").innerHTML = st.interests.map((i) => `<span>${esc(i)}</span>`).join("") +
    (st.cat ? `<span>🐈 ${esc(st.cat.name)}</span>` : "");
}

function paintStats(st) {
  const s = st.stats, inv = W.inv?.items || [];
  const spent = inv.reduce((a, i) => a + (i.cost || 0), 0);
  $("#tab-stats").innerHTML =
    `<h4>Life</h4>` +
    kv("Days alive", st.clock.day) + kv("Hours lived", st.clock.tick) +
    kv("Journal entries", W.journalCount ?? "—") +
    kv("Memories kept", (W.mem?.memories || []).length) +
    kv("Things owned", inv.length) + kv("Spent on the room", "$" + spent) +
    `<h4>Tally</h4>` +
    Object.entries(s).map(([k, v]) => kv(k.replace(/_/g, " "), Math.round(v))).join("") +
    `<h4>Everything Nova owns</h4>` +
    inv.map((i) => kv(i.label, i.cost ? "$" + i.cost : "—")).join("");
}

function paintMemories() {
  const m = (W.mem?.memories || []).slice().reverse();
  $("#tab-memories").innerHTML = m.length
    ? m.map((x) => `<div class="entry">
        <div class="t">Day ${x.day} · ${esc(x.date || "")}${(x.tags || []).map((g) => ` · ${esc(g)}`).join("")}</div>
        <b>${esc(x.title)}</b><div>${esc(x.text)}</div></div>`).join("")
    : `<p class="muted">Nothing worth keeping yet.</p>`;
}

function paintFeed() {
  const e = (W.ev?.events || []).slice(-300).reverse();
  $("#feed").innerHTML = e.length
    ? e.map((x) => `<div class="entry">
        <div class="t">Day ${x.day} · ${esc(x.time)} · <span class="pill">${esc(x.kind)}</span></div>
        ${esc(x.text)}</div>`).join("")
    : `<p class="muted">Nothing has happened yet.</p>`;
}

async function paintJournal(st) {
  const box = $("#tab-journal");
  box.innerHTML = `<p class="muted">Opening the notebook…</p>`;
  const born = new Date(st.identity.born);
  const out = [];
  for (let d = st.clock.day; d >= 1 && out.length < 14; d--) {
    const day = new Date(born.getTime() + (d - 1) * 864e5).toISOString().slice(0, 10);
    const t = await text(`world/journal/${day}.md`);
    if (t) out.push(`<article class="journal">${esc(t.replace(/^#\s*/, ""))}</article>`);
  }
  W.journalCount = out.length;
  box.innerHTML = out.join("") || `<p class="muted">No entries yet.</p>`;
  paintStats(st);
}

/* ---------------- what Nova is thinking ---------------- */
// Pick the thoughts that fit right now. Context first, so a thought about rain only turns up
// when it is actually raining, with a few general ones mixed in so it never loops tightly.
function pickThoughts(st) {
  const all = W.thoughts?.thoughts || [];
  if (!all.length) return [];
  const hour = +st.clock.sim_time.slice(0, 2);
  const p = st.physical, e = st.emotional, act = st.activity.current.toLowerCase();
  const tags = new Set(["any"]);

  if (/^sleep/.test(act)) tags.add("sleeping");
  else {
    if (/work|cod|build|fix|debug|refactor|writ|set/.test(act)) tags.add("work");
    if (/coffee|breakfast/.test(act)) tags.add("coffee");
    if (p.hunger > 65) tags.add("hungry");
    if (p.energy < 40) tags.add("tired");
    if (hour >= 22 || hour < 5) tags.add("night");
    if (hour >= 6 && hour < 10) tags.add("morning");
    if (e.loneliness > 55) tags.add("lonely");
    if (e.mood >= 70) tags.add("happy");
    if (e.mood < 40) tags.add("low");
    if (st.finance.savings < 150) tags.add("broke");
    if (st.cat) tags.add("cat");
    if (st.activity.location === "window") tags.add("window");
    if (["rain", "storm", "snow", "fog"].includes(st.clock.weather)) tags.add(st.clock.weather);
    if (e.motivation > 70) tags.add("dream");
  }

  const fitting = all.filter((x) => tags.has(x.when) && x.when !== "any");
  const general = all.filter((x) => x.when === "any");
  const chosen = (fitting.length ? fitting : general).map((x) => x.text);
  if (fitting.length && general.length) chosen.push(general[st.clock.day % general.length].text);
  // stable order per day, so two visitors an hour apart do not see the same line first
  const off = st.clock.tick % Math.max(1, chosen.length);
  return chosen.slice(off).concat(chosen.slice(0, off));
}

/* ---------------- mailbox ---------------- */
async function paintMail() {
  const idx = await json("world/mail/index.json");
  const msgs = (idx?.messages || []).slice().reverse();
  const unread = msgs.filter((m) => m.status === "unread").length;
  $("#unread").hidden = unread === 0;

  if (!msgs.length) {
    $("#mailList").innerHTML = `<p class="muted small">The mailbox is empty.</p>`;
    return;
  }
  $("#mailList").innerHTML = msgs.map((m, i) =>
    `<button class="msg ${m.status === "unread" ? "unread" : ""}" data-i="${i}">
       <b>${esc(m.from)}</b>
       <div class="t">${esc(m.kind)} · arrived day ${m.arrived_day} · ${esc(m.status)}</div>
     </button>`).join("");

  $("#mailList").querySelectorAll(".msg").forEach((b) => b.addEventListener("click", async () => {
    const m = msgs[+b.dataset.i];
    $("#mailList").querySelectorAll(".msg").forEach((x) => x.classList.toggle("on", x === b));
    const raw = await text("world/mail/" + m.file);
    const body = (raw || "").replace(/^---[\s\S]*?---\s*/, "").trim();
    $("#mailBody").hidden = false;
    $("#mailBody").innerHTML = esc(body) +
      (m.note ? `<div class="reply">Nova, day ${m.answered_day ?? "?"}: ${esc(m.note)}</div>` : "");
  }));
}

/* ---------------- object inspection ---------------- */
function inspect(obj) {
  const box = $("#inspect");
  if (!obj) { box.hidden = true; return; }
  const item = W.inv?.items.find((i) => i.id === obj.id);
  box.hidden = false;
  box.innerHTML = item
    ? `<h5>${esc(item.label)}</h5>
       <div class="small muted">Day ${item.bought_day}${item.bought_date ? " · " + esc(item.bought_date) : ""}</div>
       <p class="why">“${esc(item.reason)}”</p>
       <div class="small mono">${item.cost ? "$" + item.cost : "came with the apartment"}${
         item.effects && Object.keys(item.effects).length
           ? " · " + Object.entries(item.effects).map(([k, v]) => `${k} ${v > 0 ? "+" : ""}${v}`).join(", ")
           : ""}</div>`
    : `<h5>${esc(obj.kind).replace(/_/g, " ")}</h5><p class="why">No story recorded for this yet.</p>`;
}

/* ---------------- timeline ---------------- */
function setupTimeline() {
  const days = W.hist?.days || [];
  const range = $("#dayRange");
  if (!days.length) { $(".scrub").hidden = true; return; }
  range.min = 1; range.max = days.length; range.value = days.length;

  const show = (n) => {
    const d = days[n - 1];
    $("#scrubDay").textContent = `Day ${d.day}`;
    $("#scrubDate").textContent = d.date;
    $("#scrubHeadline").textContent = d.headline;
    $("#scrubMeta").textContent =
      `${d.objects.length} things in the room · $${d.savings} saved · mood ${d.mood} · ${d.weather}`;

    const last = n === days.length;
    if (last) { shown = live; $("#rewind").hidden = true; }
    else {
      shown = structuredClone(live);
      shown.apartment.objects = d.objects;
      shown.clock = { ...live.clock, day: d.day, weather: d.weather, sim_time: "14:00" };
      shown.activity = { current: "living day " + d.day, location: "floor", note: "" };
      $("#rewind").hidden = false;
      $("#rewindLabel").textContent = `viewing day ${d.day} — ${d.date}`;
    }
    inspect(null);
  };
  range.addEventListener("input", () => show(+range.value));
  $("#rewindExit").addEventListener("click", () => { range.value = range.max; show(days.length); });
  show(days.length);
}

/* ---------------- boot ---------------- */
async function load() {
  const [state, inv, mem, ev, hist] = await Promise.all([
    json("world/state.json"), json("world/inventory.json"), json("world/memories.json"),
    json("world/events.json"), json("world/history.json"),
  ]);
  W.thoughts = W.thoughts || await json("world/thoughts.json");
  if (!state) {
    document.body.innerHTML = "<p style='padding:2rem;font:14px monospace'>Nova's world could not be loaded.</p>";
    return null;
  }
  Object.assign(W, { state, inv, mem, ev, hist });

  const born = new Date(state.identity.born);
  $("#hName").textContent = state.identity.name;
  $("#hOcc").textContent = state.identity.occupation;
  $("#hAge").textContent = "awake since " +
    born.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  $("#hDayNum").textContent = state.clock.day;
  $("#hTime").textContent = state.clock.sim_time;
  $("#hWeather").textContent = `${state.clock.weather} · ${state.clock.season}`;
  if (state.clock.last_tick_utc) {
    const mins = Math.round((Date.now() - new Date(state.clock.last_tick_utc)) / 6e4);
    $("#hFresh").textContent = mins < 90 ? `woke up ${mins}m ago` : `last seen ${Math.round(mins / 60)}h ago`;
  }
  $("#doing").textContent = state.activity.current;
  $("#doingNote").textContent = state.activity.note || "";
  document.title = `${state.identity.name} — day ${state.clock.day}, ${state.activity.current}`;

  thoughtPool = pickThoughts(state);
  paintLife(state); paintMemories(); paintFeed(); paintStats(state); paintJournal(state); paintMail();
  return state;
}

live = await load();
shown = live;
if (live) setupTimeline();

const canvas = $("#room");
const touch = window.matchMedia("(hover: none)").matches;

// The canvas is a fixed 768x448 but is shown at whatever width the screen allows. On a phone
// that is well under half size, so anything with text on it has to be drawn correspondingly
// bigger or it becomes unreadable.
let uiScale = 1;
const measure = () => {
  const w = canvas.getBoundingClientRect().width || canvas.width;
  uiScale = Math.max(1, Math.min(2.4, canvas.width / w));
};
measure();
addEventListener("resize", measure);
addEventListener("orientationchange", () => setTimeout(measure, 200));
(function loop(t) {
  if (shown) render(canvas, shown, t, hover, shown === live ? thoughtPool : null, uiScale);
  requestAnimationFrame(loop);
})(0);

const at = (e) => {
  const r = canvas.getBoundingClientRect(), k = canvas.width / r.width;
  return [(e.clientX - r.left) * k, (e.clientY - r.top) * k];
};
canvas.addEventListener("mousemove", (e) => {
  if (!shown) return;
  hover = hitTest(shown, ...at(e));
  canvas.style.cursor = hover ? "pointer" : "default";
});
canvas.addEventListener("mouseleave", () => { hover = null; });
canvas.addEventListener("click", (e) => {
  if (!shown) return;
  const hit = hitTest(shown, ...at(e));
  if (touch) hover = hit;                 // no pointer to hover with, so the tap highlights
  inspect(hit);
});

if (touch) {
  const hint = document.querySelector(".hint");
  if (hint) hint.textContent = "Tap anything in the room — it remembers why it is there.";
}

document.querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => {
  document.querySelectorAll(".tab").forEach((x) => x.classList.toggle("on", x === b));
  document.querySelectorAll(".tabbody").forEach((x) => (x.hidden = x.id !== "tab-" + b.dataset.tab));
}));

// Nova keeps going while the page is open
setInterval(async () => {
  const s = await load();
  if (!s) return;
  const wasLive = shown === live;
  live = s;
  if (wasLive) shown = live;
}, 120000);

// Only claim a repository link when we can actually work one out from the host.
const repoBase = location.hostname.endsWith("github.io")
  ? `https://github.com/${location.hostname.split(".")[0]}${location.pathname.replace(/\/$/, "")}`
  : document.querySelector("footer").dataset.repo || null;
const links = [...document.querySelectorAll("footer a")];
if (repoBase) {
  links[0].href = repoBase;
  links[1].href = repoBase + "/tree/main/world/mail";
} else {
  links.forEach((a) => { a.replaceWith(document.createTextNode(a.textContent)); });
}
