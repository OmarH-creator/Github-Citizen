// Everything drawn here is generated at runtime. There are no image files in this repo.
export const T = 32, COLS = 24, ROWS = 14, WALL_ROWS = 7;
const FLOOR_Y = WALL_ROWS * T;

const rgb = (hex, k = 1, a = 1) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(c * k)));
  return `rgba(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)},${a})`;
};
const clamp01 = (v) => Math.max(0, Math.min(1, v));

/* ================= the world outside ================= */
const WIN = { x: 6 * T, y: 1 * T, w: 5 * T, h: 4.5 * T };

function skyColors(hour, weather) {
  let a = ["#0a0a1e", "#1a1a3a"];                          // night
  if (hour >= 5 && hour < 8) a = ["#3a2b4d", "#e0906a"];   // dawn
  else if (hour >= 8 && hour < 17) a = ["#5f9ed6", "#c8e6f5"];
  else if (hour >= 17 && hour < 20) a = ["#42305c", "#e08a52"];
  if (weather === "rain") a = a.map((c) => rgb(c, 0.62));
  if (weather === "storm") a = a.map((c) => rgb(c, 0.45));
  if (weather === "fog") a = ["#61616e", "#9a9aa6"];
  if (weather === "snow") a = a.map((c) => rgb(c, 0.88));
  if (weather === "cloudy") a = a.map((c) => rgb(c, 0.78));
  return a;
}

// how much daylight reaches the floor: drives the whole room's mood
export function daylight(st) {
  const h = +st.clock.sim_time.slice(0, 2);
  const d = h < 5 || h >= 21 ? 0 : h < 8 ? (h - 5) / 3 : h < 17 ? 1 : (21 - h) / 4;
  return d * ({ storm: 0.4, rain: 0.6, fog: 0.65, cloudy: 0.8 }[st.clock.weather] ?? 1);
}

function drawWindow(g, t, st) {
  const { x, y, w, h } = WIN;
  const hour = +st.clock.sim_time.slice(0, 2);
  const wet = st.clock.weather === "rain" || st.clock.weather === "storm";
  const [c1, c2] = skyColors(hour, st.clock.weather);

  const sky = g.createLinearGradient(0, y, 0, y + h);
  sky.addColorStop(0, c1); sky.addColorStop(1, c2);
  g.fillStyle = sky; g.fillRect(x, y, w, h);

  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();

  const overcast = ["rain", "storm", "snow", "fog", "cloudy"].includes(st.clock.weather);
  if ((hour < 6 || hour >= 20) && !overcast) {
    g.fillStyle = "#fff";
    for (let i = 0; i < 26; i++) {
      g.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(t / 900 + i * 1.7));
      g.fillRect(x + ((i * 37) % w), y + ((i * 53) % (h * 0.62)), 2, 2);
    }
    g.globalAlpha = 1;
    g.fillStyle = "#eceadc"; g.beginPath(); g.arc(x + w * 0.74, y + h * 0.24, 11, 0, 7); g.fill();
    g.fillStyle = c1;        g.beginPath(); g.arc(x + w * 0.79, y + h * 0.20, 10, 0, 7); g.fill();
  } else if (["clear", "cloudy"].includes(st.clock.weather) && hour >= 6 && hour < 20) {
    const sx = x + w * (0.16 + 0.68 * clamp01((hour - 6) / 14));
    g.fillStyle = "#ffe9a8"; g.globalAlpha = 0.9;
    g.beginPath(); g.arc(sx, y + h * 0.24, 12, 0, 7); g.fill(); g.globalAlpha = 1;
  }
  if (overcast) {
    g.fillStyle = rgb("#ffffff", 1, 0.16);
    for (let i = 0; i < 4; i++) {
      const cx = x + ((i * 61 + t * 0.004) % (w + 60)) - 30, cy = y + 14 + (i % 2) * 16;
      g.beginPath(); g.ellipse(cx, cy, 26, 9, 0, 0, 7); g.fill();
    }
  }

  // skyline: towers of different widths and heights, each with its own lit windows
  const night = hour < 7 || hour >= 19;
  const towers = [[0, 34, 15], [15, 52, 12], [27, 26, 18], [45, 44, 14], [59, 62, 16],
                  [75, 30, 13], [88, 48, 17], [105, 36, 12], [117, 58, 15], [132, 28, 16]];
  for (const [tx, th, tw] of towers) {
    const bx = x + tx * (w / 148);
    const bw2 = tw * (w / 148);
    g.fillStyle = rgb(c1, night ? 0.34 : 0.52);
    g.fillRect(bx, y + h - 16 - th, bw2, th + 16);
    g.fillStyle = rgb(c1, night ? 0.26 : 0.44);
    g.fillRect(bx, y + h - 16 - th, bw2 * 0.3, th + 16);
    for (let r = 0; r < Math.floor(th / 9); r++) {
      for (let cN = 0; cN < Math.max(1, Math.floor(bw2 / 6)); cN++) {
        const seed = (tx * 7 + r * 13 + cN * 29) % 10;
        const lit = night ? seed > 3 : seed > 8;
        if (!lit) continue;
        g.fillStyle = night
          ? `rgba(255,226,150,${0.5 + 0.45 * Math.abs(Math.sin(t / 4000 + seed * 2))})`
          : "rgba(255,255,255,.18)";
        g.fillRect(bx + 2 + cN * 6, y + h - 22 - r * 9, 3, 4);
      }
    }
    if (th > 50) {                                   // antenna with a blinking light
      g.fillStyle = rgb(c1, 0.3);
      g.fillRect(bx + bw2 / 2 - 1, y + h - 16 - th - 9, 2, 9);
      if (night && Math.sin(t / 700) > 0.4) {
        g.fillStyle = "#e2585f";
        g.fillRect(bx + bw2 / 2 - 2, y + h - 16 - th - 12, 4, 4);
      }
    }
  }
  g.fillStyle = "#241f1a"; g.fillRect(x, y + h - 16, w, 16);          // street
  g.fillStyle = night ? "rgba(255,214,140,.22)" : "rgba(255,255,255,.06)";
  for (let i = 0; i < 4; i++) g.fillRect(x + 10 + i * 40, y + h - 16, 14, 16);
  if (st.clock.weather === "snow") { g.fillStyle = "#e8ecf2"; g.fillRect(x, y + h - 18, w, 5); }

  if (wet) {
    g.strokeStyle = "rgba(207,230,255,.55)"; g.lineWidth = 1;
    const n = st.clock.weather === "storm" ? 90 : 55;
    for (let i = 0; i < n; i++) {
      const rx = x + ((i * 41 + t * 0.45) % w), ry = y + ((i * 67 + t * 1.1) % h);
      g.beginPath(); g.moveTo(rx, ry); g.lineTo(rx - 3, ry + 9); g.stroke();
    }
    if (st.clock.weather === "storm" && Math.sin(t / 1300) > 0.993) {
      g.fillStyle = "rgba(255,255,255,.8)"; g.fillRect(x, y, w, h);
    }
  } else if (st.clock.weather === "snow") {
    g.fillStyle = "rgba(255,255,255,.9)";
    for (let i = 0; i < 50; i++)
      g.fillRect(x + ((i * 47 + Math.sin(t / 700 + i) * 14 + t * 0.05) % w),
                 y + ((i * 71 + t * 0.2) % h), 3, 3);
  } else if (st.clock.weather === "fog") {
    g.fillStyle = "rgba(255,255,255,.22)"; g.fillRect(x, y, w, h);
  }

  const bp = (t / 45) % 1400;                      // a bird, now and then
  if (bp < w + 40) {
    g.strokeStyle = "rgba(0,0,0,.55)"; g.lineWidth = 2;
    const bx = x + bp - 20, by = y + 24 + Math.sin(t / 260) * 7, f = Math.sin(t / 110) * 5;
    g.beginPath(); g.moveTo(bx - 6, by + f); g.lineTo(bx, by); g.lineTo(bx + 6, by + f); g.stroke();
  }

  // drops clinging to the glass, running down at their own speeds
  if (wet) {
    for (let i = 0; i < 14; i++) {
      const dx = x + 8 + ((i * 53) % (w - 16));
      const dy = y + ((i * 97 + t * (0.02 + (i % 5) * 0.012)) % (h - 10));
      g.fillStyle = "rgba(226,240,255,.18)"; g.fillRect(dx - 0.8, dy - 9, 1.6, 9);
      g.fillStyle = "rgba(226,240,255,.5)";
      g.beginPath(); g.ellipse(dx, dy, 1.6, 3.2, 0, 0, 7); g.fill();
    }
  }
  g.restore();

  g.fillStyle = "#efe4d0";                          // frame
  g.fillRect(x - 6, y - 6, w + 12, 6); g.fillRect(x - 6, y + h, w + 12, 8);
  g.fillRect(x - 6, y - 6, 6, h + 12); g.fillRect(x + w, y - 6, 6, h + 12);
  g.fillStyle = "#d9cbb2";
  g.fillRect(x + w / 2 - 2, y, 4, h); g.fillRect(x, y + h / 2 - 2, w, 4);
  g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(x - 6, y + h + 8, w + 12, 4);
}

/* ================= the apartment itself =================
   Fixed architecture. Nova did not buy any of this; it is the flat. */
function drawArchitecture(g, st, t, light) {
  const wall = st.apartment.wall;

  // --- front door, on the left ---
  const dx = 0.5 * T, dy = 1.3 * T, dw = 2.3 * T, dh = FLOOR_Y - dy;
  g.fillStyle = rgb(wall, 0.5); g.fillRect(dx - 6, dy - 6, dw + 12, dh + 6);
  g.fillStyle = "#6b4f38"; g.fillRect(dx, dy, dw, dh);
  g.fillStyle = "#5b4230";
  g.fillRect(dx + 7, dy + 11, dw - 14, dh * 0.35);
  g.fillRect(dx + 7, dy + dh * 0.5, dw - 14, dh * 0.35);
  g.fillStyle = "#7d5c40";
  g.fillRect(dx + 7, dy + 11, dw - 14, 3); g.fillRect(dx + 7, dy + dh * 0.5, dw - 14, 3);
  g.fillStyle = "#e0c98d"; g.beginPath();
  g.arc(dx + dw - 13, dy + dh * 0.52, 4, 0, 7); g.fill();

  // --- bathroom door, narrower, on the right ---
  const bx2 = 3.35 * T, bw2 = 1.85 * T;
  g.fillStyle = rgb(wall, 0.5); g.fillRect(bx2 - 5, dy - 5, bw2 + 10, dh + 5);
  g.fillStyle = "#63482f"; g.fillRect(bx2, dy, bw2, dh);
  g.fillStyle = "#553e29"; g.fillRect(bx2 + 6, dy + 10, bw2 - 12, dh * 0.72);
  g.fillStyle = "#e0c98d"; g.beginPath();
  g.arc(bx2 + 12, dy + dh * 0.52, 3.5, 0, 7); g.fill();
  g.fillStyle = "#cfc6b6"; g.fillRect(bx2 + bw2 * 0.32, dy + 14, bw2 * 0.36, 13);   // little sign
  g.fillStyle = "#8a8290"; g.fillRect(bx2 + bw2 * 0.44, dy + 17, 4, 7);

  g.fillStyle = "#e6e2d8"; g.fillRect(5.5 * T, 3.1 * T, 9, 12);                     // light switch
  g.fillStyle = "#b9b3a6"; g.fillRect(5.5 * T + 2, 3.1 * T + 3, 5, 5);

  // --- window sill, curtain and radiator ---
  g.fillStyle = "#e8ddc8"; g.fillRect(WIN.x - 12, WIN.y + WIN.h + 8, WIN.w + 24, 7);
  g.fillStyle = "#cfc3ad"; g.fillRect(WIN.x - 12, WIN.y + WIN.h + 15, WIN.w + 24, 3);
  for (const side of [-1, 1]) {                                                      // curtains
    const edge = side < 0 ? WIN.x : WIN.x + WIN.w;
    for (let i = 0; i < 3; i++) {
      const a = edge + side * (14 + i * 5), b = edge + side * (2 + i * 5);
      g.beginPath();
      g.moveTo(a, WIN.y - 10);
      g.quadraticCurveTo(a - side * 6, WIN.y + WIN.h * 0.5, a + side * 2, WIN.y + WIN.h + 6);
      g.lineTo(b, WIN.y + WIN.h + 6); g.lineTo(b, WIN.y - 10); g.closePath();
      g.fillStyle = i % 2 ? "#4e6f8c" : "#446283"; g.fill();
    }
  }
  g.fillStyle = "#3a3442"; g.fillRect(WIN.x - 26, WIN.y - 14, WIN.w + 52, 4);        // rail

  const rx = WIN.x + 10, ry = FLOOR_Y - 44, rw = WIN.w - 20;
  g.fillStyle = "#d5cfc5"; g.fillRect(rx, ry, rw, 36);
  g.fillStyle = "#bdb6ab";
  for (let i = 0; i < Math.floor(rw / 10); i++) g.fillRect(rx + 4 + i * 10, ry + 4, 5, 28);
  g.fillStyle = "#a49d92"; g.fillRect(rx, ry, rw, 4); g.fillRect(rx, ry + 32, rw, 4);

  // --- kitchen: cabinets, light strip, utensils, bin ---
  const kx = 20.4 * T, kw = COLS * T - kx;
  g.fillStyle = "#6f5b45"; g.fillRect(kx, 2.3 * T, kw, 2.5 * T);
  g.fillStyle = "#846c52";
  g.fillRect(kx + 5, 2.3 * T + 5, kw / 2 - 9, 2.5 * T - 10);
  g.fillRect(kx + kw / 2 + 4, 2.3 * T + 5, kw / 2 - 9, 2.5 * T - 10);
  g.fillStyle = "#785f47";
  for (let i = 0; i < 6; i++) {                                                      // grain
    g.fillRect(kx + 8 + (i % 3) * 18, 2.4 * T + (i % 2) * 30, 2, 34);
  }
  g.fillStyle = "#d8cfc0";
  g.fillRect(kx + kw / 2 - 16, 3.5 * T, 9, 3); g.fillRect(kx + kw / 2 + 9, 3.5 * T, 9, 3);
  g.fillStyle = "rgba(0,0,0,.3)"; g.fillRect(kx, 4.8 * T, kw, 5);
  g.fillStyle = light < 0.5 ? "#ffe9b0" : "#cfc6ae";                                 // under-cabinet strip
  g.fillRect(kx + 6, 4.8 * T + 4, kw - 12, 3);
  if (light < 0.5) {
    const ug = g.createLinearGradient(0, 4.8 * T + 6, 0, 6.6 * T);
    ug.addColorStop(0, `rgba(255,226,150,${0.3 * (1 - light)})`);
    ug.addColorStop(1, "rgba(255,226,150,0)");
    g.fillStyle = ug; g.fillRect(kx, 4.8 * T + 6, kw, 1.8 * T);
  }

  const ux = 18.6 * T;                                                               // utensil rail
  g.fillStyle = "#4a4450"; g.fillRect(ux, 4.4 * T, 1.6 * T, 3);
  g.fillStyle = "#3a3640";
  g.beginPath(); g.arc(ux + 12, 4.4 * T + 16, 9, 0, 7); g.fill();                    // pan
  g.fillRect(ux + 18, 4.4 * T + 13, 12, 3);
  g.fillStyle = "#8a6a48"; g.fillRect(ux + 34, 4.4 * T + 4, 7, 20);                  // board
  g.fillStyle = "#b9bec4"; g.fillRect(ux + 46, 4.4 * T + 4, 4, 16);

  g.fillStyle = "#9aa0a8"; g.fillRect(19.1 * T, FLOOR_Y - 4, 1.2 * T, 4);            // bin
  g.fillStyle = "#8b919a"; g.fillRect(19.15 * T, 11.0 * T, 1.1 * T, 1.6 * T);
  g.fillStyle = "#a8aeb6"; g.fillRect(19.1 * T, 10.85 * T, 1.2 * T, 8);
  g.fillStyle = "#7d838b"; g.fillRect(19.45 * T, 10.9 * T, 12, 3);

  // --- power socket ---
  g.fillStyle = "#e6e2d8"; g.fillRect(15.3 * T, 6.2 * T, 12, 10);
  g.fillStyle = "#9a948a";
  g.fillRect(15.45 * T, 6.2 * T + 3, 3, 3); g.fillRect(15.75 * T, 6.2 * T + 3, 3, 3);

  // --- ceiling pendant ---
  const cx = 12.6 * T;
  g.strokeStyle = "#3a3442"; g.lineWidth = 2;
  g.beginPath(); g.moveTo(cx, 0); g.lineTo(cx, 26); g.stroke();
  const on = light < 0.42;
  g.fillStyle = on ? "#f6e3a4" : "#4a4450";
  g.beginPath(); g.moveTo(cx - 17, 42); g.lineTo(cx + 17, 42);
  g.lineTo(cx + 9, 26); g.lineTo(cx - 9, 26); g.closePath(); g.fill();
  g.fillStyle = on ? "#fff6d2" : "#5a5460";
  g.fillRect(cx - 17, 40, 34, 3);
  if (on) {
    g.fillStyle = "#fffbe8"; g.beginPath(); g.arc(cx, 46, 5, 0, 7); g.fill();        // bulb
    const gl = g.createRadialGradient(cx, 46, 5, cx, 46, 210);
    gl.addColorStop(0, `rgba(255,226,150,${0.34 * (1 - light)})`);
    gl.addColorStop(0.45, `rgba(255,214,140,${0.12 * (1 - light)})`);
    gl.addColorStop(1, "rgba(255,226,150,0)");
    g.fillStyle = gl; g.beginPath(); g.arc(cx, 46, 210, 0, 7); g.fill();
  }
}

/* ================= screens ================= */
// scrolling text on any screen, so the code on it is never the same twice
function codeLines(g, x, y, w, h, t, colour, seed) {
  const lh = 5, n = Math.max(1, Math.floor(h / lh));
  const scroll = Math.floor(t / 900 + seed * 3);
  for (let i = 0; i < n; i++) {
    const r = (((i + scroll) * 2654435761 * (seed + 1)) % 97) / 97;
    const indent = Math.floor(r * 3) * 5;
    const len = 6 + r * Math.max(8, w - 12 - indent);
    g.fillStyle = rgb(colour, 0.55 + r * 0.6, 0.9);
    g.fillRect(x + indent, y + i * lh, len, 2);
  }
  if (Math.sin(t / 260) > 0) {
    const r = (((n - 1 + scroll) * 2654435761 * (seed + 1)) % 97) / 97;
    g.fillStyle = rgb(colour, 1.4);
    g.fillRect(x + 6 + r * Math.max(8, w - 20), y + (n - 1) * lh, 3, 3);
  }
}

/* ================= furniture ================= */
// Each takes (g, x, y, w, h, o, t, st). y is the TOP of the object in pixels.
const OBJ = {
  bed(g, x, y, w, h) {
    // Geometry other code depends on: sheet from y+0.16h, quilt starts at x+0.32w.
    g.fillStyle = "#4a3226"; g.fillRect(x, y + h * 0.55, w, h * 0.45);
    g.fillStyle = "#3a2620"; g.fillRect(x, y + h * 0.55, w, 5);
    g.fillStyle = "#3e2a20"; g.fillRect(x - 4, y - 6, 7, h * 0.66);            // headboard
    g.fillStyle = "#4f3628"; g.fillRect(x - 4, y - 6, 7, 5);
    g.fillStyle = "#6b4a33"; g.fillRect(x, y + h * 0.5, w, 7);
    g.fillStyle = "#ece8dd"; g.fillRect(x + 3, y + h * 0.16, w - 6, h * 0.44);  // sheet
    g.fillStyle = "#dad5c8"; g.fillRect(x + 3, y + h * 0.56, w - 6, 4);

    const qx = x + w * 0.32, qw = w * 0.68 - 3, qy = y + h * 0.2, qh = h * 0.4;
    const quilt = ["#8fa9c6", "#c98a72", "#d9c187", "#7d96b3", "#a8899f"];
    const cols = Math.max(3, Math.round(qw / 17)), rows = 3;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        g.fillStyle = quilt[(r * 3 + c * 2) % quilt.length];
        g.fillRect(qx + c * (qw / cols), qy + r * (qh / rows), qw / cols - 1.5, qh / rows - 1.5);
      }
    g.fillStyle = "rgba(255,255,255,.14)"; g.fillRect(qx, qy, qw, 4);
    g.fillStyle = "rgba(0,0,0,.16)"; g.fillRect(qx, qy + qh - 4, qw, 4);
    g.fillStyle = "#f4f1e8"; g.fillRect(x + 6, y + h * 0.08, w * 0.28, h * 0.26);  // pillow
    g.fillStyle = "#e2ddd0"; g.fillRect(x + 9, y + h * 0.11, w * 0.2, h * 0.1);
  },
  desk(g, x, y, w, h) {
    g.fillStyle = "#9c7448"; g.fillRect(x, y, w, 8);
    g.fillStyle = "#b08655"; g.fillRect(x, y, w, 3);
    g.fillStyle = "#75522f"; g.fillRect(x, y + 8, w, 6);
    g.fillStyle = "#5f4228"; g.fillRect(x + 5, y + 14, 7, h - 14);
    g.fillRect(x + w - 12, y + 14, 7, h - 14);
    g.fillStyle = "#7c5734"; g.fillRect(x + w - 34, y + 14, 29, h * 0.6);
    g.fillStyle = "#65462a"; g.fillRect(x + w - 32, y + 16, 25, h * 0.26);
    g.fillRect(x + w - 32, y + 18 + h * 0.28, 25, h * 0.26);
    g.fillStyle = "#d8bd8c";
    g.fillRect(x + w - 26, y + 16 + h * 0.11, 12, 3);
    g.fillRect(x + w - 26, y + 18 + h * 0.39, 12, 3);
  },
  chair(g, x, y, w, h) {
    g.fillStyle = "#7a5c3e"; g.fillRect(x + w * 0.15, y, w * 0.7, h * 0.55);
    g.fillStyle = "#8a6a48"; g.fillRect(x + w * 0.1, y + h * 0.5, w * 0.8, 6);
    g.fillStyle = "#5f462e";
    g.fillRect(x + w * 0.15, y + h * 0.55, 4, h * 0.45);
    g.fillRect(x + w * 0.75, y + h * 0.55, 4, h * 0.45);
  },
  office_chair(g, x, y, w, h) {
    g.fillStyle = "#33303c"; g.fillRect(x + w * 0.12, y, w * 0.76, h * 0.5);
    g.fillStyle = "#3d3948"; g.fillRect(x + w * 0.12, y + 3, w * 0.76, 4);
    g.fillStyle = "#2a2733"; g.fillRect(x + w * 0.06, y + h * 0.48, w * 0.88, 8);
    g.fillStyle = "#4a4656"; g.fillRect(x + w * 0.42, y + h * 0.62, 5, h * 0.2);
    g.fillStyle = "#22202a";
    g.fillRect(x + w * 0.14, y + h * 0.82, w * 0.72, 4);
    g.fillRect(x + w * 0.2, y + h * 0.86, 5, 5); g.fillRect(x + w * 0.72, y + h * 0.86, 5, 5);
  },
  laptop(g, x, y, w, h, o, t) {
    g.fillStyle = "#2b2b34"; g.fillRect(x + 2, y - h * 0.9, w - 4, h * 0.95);
    g.fillStyle = "#1d3a3a"; g.fillRect(x + 5, y - h * 0.8, w - 10, h * 0.72);
    codeLines(g, x + 7, y - h * 0.76, w - 14, h * 0.64, t, "#7fd8c8", 1);
    g.fillStyle = "#3c3c48"; g.fillRect(x, y + h * 0.05, w, 5);
    g.fillStyle = "#2b2b34"; g.fillRect(x + w * 0.3, y + h * 0.05, w * 0.4, 2);
  },
  monitor(g, x, y, w, h, o, t) {
    const mh = h * 1.75;
    g.fillStyle = "#1f1f27"; g.fillRect(x, y - mh, w, mh);
    g.fillStyle = "#16283a"; g.fillRect(x + 4, y - mh + 4, w - 8, mh - 12);
    codeLines(g, x + 8, y - mh + 8, w - 16, mh - 22, t, "#8fc6ea", 2);
    g.fillStyle = "#3a3a45"; g.fillRect(x + 6, y - 3, w - 12, 3);
    g.fillStyle = "#22222a"; g.fillRect(x + w / 2 - 5, y, 10, 8);
    g.fillRect(x + w / 2 - 16, y + 7, 32, 4);
  },
  keyboard(g, x, y, w, h) {
    g.fillStyle = "#33323c"; g.fillRect(x, y, w, h * 0.5);
    g.fillStyle = "#454452";
    for (let i = 0; i < Math.floor(w / 6); i++) g.fillRect(x + 2 + i * 6, y + 2, 4, 3);
  },
  mug(g, x, y, w, h, o, t, st) {
    const hot = st && /coffee|morning|work|writ|read/i.test(st.activity.current);
    g.fillStyle = "#d9d3e0"; g.fillRect(x + 6, y - 13, 13, 13);
    g.fillStyle = "#b9b2c4"; g.fillRect(x + 6, y - 13, 13, 3);
    g.strokeStyle = "#d9d3e0"; g.lineWidth = 2.5;
    g.beginPath(); g.arc(x + 21, y - 7, 4, -1.2, 1.2); g.stroke();
    if (hot) {
      g.strokeStyle = "rgba(255,255,255,.2)"; g.lineWidth = 1.5;
      for (let i = 0; i < 2; i++) {
        const p = (t / 34 + i * 26) % 52;
        g.globalAlpha = Math.max(0, 0.55 - p / 52);
        const bx = x + 10 + i * 5;
        g.beginPath(); g.moveTo(bx, y - 15 - p * 0.18);
        g.quadraticCurveTo(bx + 3, y - 19 - p * 0.2, bx, y - 23 - p * 0.22);
        g.stroke();
      }
      g.globalAlpha = 1;
    }
  },
  lamp(g, x, y, w, h, o, t) {
    g.fillStyle = "#3f3a48"; g.fillRect(x + w / 2 - 2, y, 5, h - 4);
    g.fillRect(x + w / 2 - 9, y + h - 5, 20, 5);
    const flicker = 1 + Math.sin(t / 1700) * 0.03;
    const sh = g.createLinearGradient(0, y - 22, 0, y + 4);
    sh.addColorStop(0, rgb("#f6e3a4", flicker)); sh.addColorStop(1, rgb("#d9b96a", flicker));
    g.fillStyle = sh; g.beginPath();
    g.moveTo(x + w / 2 - 6, y - 22); g.lineTo(x + w / 2 + 12, y - 22);
    g.lineTo(x + w / 2 + 18, y + 2); g.lineTo(x + w / 2 - 12, y + 2); g.closePath(); g.fill();
  },
  plant(g, x, y, w, h, o, t) {
    const cx = x + w / 2, base = y + h;
    g.fillStyle = "#a9663d"; g.fillRect(x + w * 0.2, base - h * 0.32, w * 0.6, h * 0.32);
    g.fillStyle = "#8d5030"; g.fillRect(x + w * 0.16, base - h * 0.34, w * 0.68, 5);
    for (let i = 0; i < 7; i++) {
      const a = (i - 3) * 0.42 + Math.sin(t / 1600 + i) * 0.05;
      g.fillStyle = i % 2 ? "#4e8f4a" : "#5fa356";
      g.save(); g.translate(cx, base - h * 0.34); g.rotate(a);
      g.beginPath(); g.ellipse(0, -h * 0.24, w * 0.14, h * 0.26, 0, 0, 7); g.fill();
      g.restore();
    }
  },
  rug(g, x, y, w, h) {
    g.fillStyle = "#7d4148"; g.fillRect(x, y, w, h);
    g.fillStyle = "#8d4d52"; g.fillRect(x + 4, y + 3, w - 8, h - 6);
    g.fillStyle = "#b87c66"; g.fillRect(x + 9, y + 7, w - 18, h - 14);
    g.fillStyle = "#7d4148"; g.fillRect(x + 13, y + 10, w - 26, h - 20);
    g.fillStyle = "#d3a184";                                   // centre diamond
    g.beginPath();
    g.moveTo(x + w / 2, y + 12); g.lineTo(x + w * 0.74, y + h / 2);
    g.lineTo(x + w / 2, y + h - 12); g.lineTo(x + w * 0.26, y + h / 2);
    g.closePath(); g.fill();
    g.fillStyle = "#8d4d52";
    g.beginPath();
    g.moveTo(x + w / 2, y + 19); g.lineTo(x + w * 0.68, y + h / 2);
    g.lineTo(x + w / 2, y + h - 19); g.lineTo(x + w * 0.32, y + h / 2);
    g.closePath(); g.fill();
    g.fillStyle = "#e0c39f";
    for (let i = 4; i < w - 4; i += 9) { g.fillRect(x + i, y - 4, 4, 4); g.fillRect(x + i, y + h, 4, 4); }
  },
  books(g, x, y, w, h) {
    const cols = ["#c9585f", "#5a7fb5", "#d6a94a", "#6fbf73"];
    let yy = y + h;
    for (let i = 0; i < 4; i++) {
      const bh = 7 + (i % 2) * 2, bw = w - 6 - (i % 3) * 4;
      yy -= bh;
      g.fillStyle = cols[i % 4]; g.fillRect(x + 3 + (i % 2) * 3, yy, bw, bh);
      g.fillStyle = "rgba(0,0,0,.2)"; g.fillRect(x + 3 + (i % 2) * 3, yy + bh - 2, bw, 2);
    }
  },
  boxes(g, x, y, w, h) {
    g.fillStyle = "#a8804d"; g.fillRect(x, y + h * 0.42, w * 0.8, h * 0.58);
    g.fillStyle = "#8d6a3d"; g.fillRect(x, y + h * 0.42, w * 0.8, 6);
    g.fillStyle = "#c2996a"; g.fillRect(x + w * 0.12, y, w * 0.62, h * 0.44);
    g.fillStyle = "#a8804d"; g.fillRect(x + w * 0.12, y, w * 0.62, 5);
    g.fillStyle = "#8d6a3d"; g.fillRect(x + w * 0.38, y, 5, h * 0.44);
    g.fillStyle = "#e8dcc4"; g.fillRect(x + w * 0.18, y + h * 0.16, w * 0.24, 7);
  },
  bookshelf(g, x, y, w, h) {
    g.fillStyle = "#5f4228"; g.fillRect(x, y, w, h);
    const rows = Math.max(1, Math.floor(h / 20));
    for (let r = 0; r < rows; r++) {
      g.fillStyle = "#4a3320"; g.fillRect(x, y + (r + 1) * (h / rows) - 4, w, 4);
      for (let i = 0; i < Math.floor((w - 6) / 6); i++) {
        g.fillStyle = ["#c9585f", "#5a7fb5", "#d6a94a", "#6fbf73", "#a877c4"][(i * 3 + r) % 5];
        const bh = 11 + ((i * 5 + r) % 4);
        g.fillRect(x + 4 + i * 6, y + (r + 1) * (h / rows) - 4 - bh, 5, bh);
      }
    }
  },
  poster(g, x, y, w, h) {
    g.fillStyle = "#2a2028"; g.fillRect(x - 3, y - 3, w + 6, h + 6);
    g.fillStyle = "#f0e6d2"; g.fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle = "#f0b98a"; g.fillRect(x, y, w, h);
    g.fillStyle = "#e88f6a"; g.fillRect(x, y + h * 0.3, w, h * 0.2);
    g.fillStyle = "#fff3c4"; g.beginPath(); g.arc(x + w * 0.5, y + h * 0.34, w * 0.16, 0, 7); g.fill();
    g.fillStyle = "#7a5f8f";
    for (let i = 0; i < 4; i++) {
      const bw = w / 3.2, bx = x + i * bw * 0.8 - 4;
      g.beginPath(); g.moveTo(bx, y + h); g.lineTo(bx + bw / 2, y + h * (0.46 + (i % 2) * 0.12));
      g.lineTo(bx + bw, y + h); g.closePath(); g.fill();
    }
    g.fillStyle = "#4a3a5e"; g.fillRect(x, y + h * 0.82, w, h * 0.18);
  },
  clock(g, x, y, w, h, o, t, st) {
    const cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) / 2 - 3;
    g.fillStyle = "#2c2733"; g.beginPath(); g.arc(cx, cy, r + 3, 0, 7); g.fill();
    g.fillStyle = "#efe9dd"; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
    g.fillStyle = "#8a8496";
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.fillRect(cx + Math.sin(a) * (r - 3) - 1, cy - Math.cos(a) * (r - 3) - 1, 2, 2);
    }
    const [hh, mm] = (st?.clock?.sim_time || "10:00").split(":").map(Number);
    const ha = (((hh % 12) + mm / 60) / 12) * Math.PI * 2, ma = (mm / 60) * Math.PI * 2;
    g.strokeStyle = "#2c2733"; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(cx, cy);
    g.lineTo(cx + Math.sin(ha) * r * 0.5, cy - Math.cos(ha) * r * 0.5); g.stroke();
    g.lineWidth = 1.8; g.beginPath(); g.moveTo(cx, cy);
    g.lineTo(cx + Math.sin(ma) * r * 0.78, cy - Math.cos(ma) * r * 0.78); g.stroke();
    const sa = (((t / 1000) % 60) / 60) * Math.PI * 2;      // seconds, always moving
    g.strokeStyle = "#c9585f"; g.lineWidth = 1;
    g.beginPath(); g.moveTo(cx, cy);
    g.lineTo(cx + Math.sin(sa) * r * 0.8, cy - Math.cos(sa) * r * 0.8); g.stroke();
  },
  counter(g, x, y, w, h) {
    g.fillStyle = "#cfc6b6"; g.fillRect(x, y, w, 8);
    g.fillStyle = "#7b6a58"; g.fillRect(x, y + 8, w, h - 8);
    g.fillStyle = "#6a5b4b";
    for (let i = 0; i < 3; i++) g.fillRect(x + 4 + i * (w / 3), y + 12, w / 3 - 8, h - 18);
    g.fillStyle = "#bdb2a0";
    for (let i = 0; i < 3; i++) g.fillRect(x + 12 + i * (w / 3), y + h * 0.55, 10, 3);
    g.fillStyle = "#9aa0a6"; g.fillRect(x + 8, y + 1, 34, 6);
    g.fillStyle = "#7e858c"; g.fillRect(x + 12, y + 2, 26, 4);
    g.strokeStyle = "#b9bec4"; g.lineWidth = 3;
    g.beginPath(); g.moveTo(x + 25, y + 1); g.lineTo(x + 25, y - 12);
    g.quadraticCurveTo(x + 25, y - 18, x + 34, y - 17); g.stroke();
  },
  coffee_machine(g, x, y, w, h, o, t) {
    g.fillStyle = "#2f2e36"; g.fillRect(x, y, w, h);
    g.fillStyle = "#3b3a44"; g.fillRect(x + 2, y + 2, w - 4, h * 0.42);
    g.fillStyle = "#d7d4dd"; g.fillRect(x + w * 0.25, y + h - 11, w * 0.5, 9);
    g.fillStyle = "#c9585f"; g.fillRect(x + w - 9, y + 5, 4, 4);
    g.strokeStyle = "rgba(255,255,255,.22)"; g.lineWidth = 1.5;
    for (let i = 0; i < 2; i++) {
      const p = (t / 30 + i * 30) % 55;
      g.globalAlpha = Math.max(0, 0.7 - p / 55);
      const bx = x + w * (0.4 + i * 0.18);
      g.beginPath(); g.moveTo(bx, y - 1 - p * 0.2);
      g.quadraticCurveTo(bx + 3, y - 5 - p * 0.22, bx, y - 9 - p * 0.24); g.stroke();
    }
    g.globalAlpha = 1;
  },
  laundry(g, x, y, w, h) {
    g.fillStyle = "#8d8598"; g.fillRect(x + 2, y + h * 0.45, w - 4, h * 0.55);
    g.fillStyle = "#7a7286"; g.fillRect(x + 2, y + h * 0.45, w - 4, 4);
    const cols = ["#4d7fa8", "#a85a54", "#5c5a66"];
    for (let i = 0; i < 3; i++) {
      g.fillStyle = cols[i];
      g.beginPath(); g.ellipse(x + 8 + i * 9, y + h * 0.42, 8, 6, i, 0, 7); g.fill();
    }
  },
  cat_bed(g, x, y, w, h) {
    g.fillStyle = "#b5765f"; g.beginPath(); g.ellipse(x + w / 2, y + h * 0.6, w / 2, h / 2.6, 0, 0, 7); g.fill();
    g.fillStyle = "#e0b49a"; g.beginPath(); g.ellipse(x + w / 2, y + h * 0.6, w / 2.9, h / 4, 0, 0, 7); g.fill();
  },
  guitar(g, x, y, w, h) {
    g.fillStyle = "#8a5a2a"; g.beginPath(); g.ellipse(x + w / 2, y + h * 0.72, w / 2.3, h / 3.2, 0, 0, 7); g.fill();
    g.fillStyle = "#5d3a18"; g.beginPath(); g.arc(x + w / 2, y + h * 0.7, w * 0.13, 0, 7); g.fill();
    g.fillStyle = "#3a2a18"; g.fillRect(x + w / 2 - 3, y, 7, h * 0.62);
  },
  console(g, x, y, w, h) {
    g.fillStyle = "#2a2a35"; g.fillRect(x, y + h * 0.35, w, h * 0.45);
    g.fillStyle = "#5ab0d8"; g.fillRect(x + 5, y + h * 0.42, w - 10, 3);
  },
  pc(g, x, y, w, h, o, t) {
    g.fillStyle = "#1c1c24"; g.fillRect(x, y, w, h);
    g.fillStyle = "#2a2a34"; g.fillRect(x + 2, y + 2, w - 4, h - 4);
    g.fillStyle = rgb("#8f6fd8", 0.7 + 0.3 * Math.sin(t / 500)); g.fillRect(x + 5, y + 6, w - 10, 4);
    g.fillStyle = "#3fd0a0"; g.fillRect(x + 5, y + h - 10, 5, 4);
  },
  rack(g, x, y, w, h) {
    g.fillStyle = "#25252c"; g.fillRect(x, y, w, h);
    for (let i = 0; i < Math.floor(h / 10); i++) {
      g.fillStyle = "#33333c"; g.fillRect(x + 2, y + 3 + i * 10, w - 4, 8);
      g.fillStyle = i % 2 ? "#3fd0a0" : "#d6a94a"; g.fillRect(x + 5, y + 6 + i * 10, 4, 3);
    }
  },
  window_box(g, x, y, w, h) {
    g.fillStyle = "#7a5a3a"; g.fillRect(x, y + h - 10, w, 10);
    g.fillStyle = "#5f9e58";
    for (let i = 0; i < w / 7; i++) g.fillRect(x + 3 + i * 7, y + h - 20, 5, 11);
  },
  shelf_unit(g, x, y, w, h) {
    g.fillStyle = "#6d4d2e"; g.fillRect(x, y, w, h);
    g.fillStyle = "#5a3f26"; g.fillRect(x, y, 5, h); g.fillRect(x + w - 5, y, 5, h);
    const rows = 3, rh = h / rows;
    for (let r = 0; r < rows; r++) {
      const sy = y + (r + 1) * rh - 5;
      g.fillStyle = "#7c5734"; g.fillRect(x, sy, w, 5);
      g.fillStyle = "rgba(0,0,0,.22)"; g.fillRect(x + 5, sy - 4, w - 10, 4);
      if (r === 0) {                                   // two framed pictures
        g.fillStyle = "#3a2f38"; g.fillRect(x + 9, sy - 26, 22, 24);
        g.fillStyle = "#8fb6d8"; g.fillRect(x + 12, sy - 23, 16, 18);
        g.fillStyle = "#5f8f5a"; g.fillRect(x + 12, sy - 12, 16, 7);
        g.fillStyle = "#3a2f38"; g.fillRect(x + 36, sy - 21, 19, 19);
        g.fillStyle = "#e0b98a"; g.fillRect(x + 39, sy - 18, 13, 13);
        g.fillStyle = "#a8759f"; g.fillRect(x + 39, sy - 10, 13, 5);
      } else {                                          // books, and a trailing plant
        const cols = ["#c9585f", "#5a7fb5", "#d6a94a", "#6fbf73", "#a877c4", "#e0b25c"];
        for (let i = 0; i < Math.floor((w - 26) / 6); i++) {
          const bh = 15 + ((i * 5 + r) % 6);
          g.fillStyle = cols[(i * 3 + r) % cols.length];
          g.fillRect(x + 8 + i * 6, sy - bh, 5, bh);
          g.fillStyle = "rgba(255,255,255,.12)"; g.fillRect(x + 8 + i * 6, sy - bh, 5, 3);
        }
        g.fillStyle = "#a9663d"; g.fillRect(x + w - 20, sy - 12, 12, 12);
        g.fillStyle = "#4e8f4a";
        g.beginPath(); g.ellipse(x + w - 14, sy - 15, 8, 6, 0, 0, 7); g.fill();
        g.fillStyle = "#5fa356";
        g.beginPath(); g.ellipse(x + w - 20, sy - 10, 5, 3, 0.6, 0, 7); g.fill();
      }
    }
  },
  armchair(g, x, y, w, h) {
    g.fillStyle = "#a8894f"; g.fillRect(x + 4, y, w - 8, h * 0.62);          // back
    g.fillStyle = "#b8975a"; g.fillRect(x + 7, y + 4, w - 14, h * 0.5);
    g.fillStyle = "#9a7c46"; g.fillRect(x, y + h * 0.3, 9, h * 0.42);        // arms
    g.fillRect(x + w - 9, y + h * 0.3, 9, h * 0.42);
    g.fillStyle = "#c3a165"; g.fillRect(x + 4, y + h * 0.55, w - 8, h * 0.2);
    g.fillStyle = "#8a6d3d"; g.fillRect(x + 4, y + h * 0.72, w - 8, 6);
    g.fillStyle = "#4a3a24";
    g.fillRect(x + 8, y + h * 0.78, 6, h * 0.2); g.fillRect(x + w - 14, y + h * 0.78, 6, h * 0.2);
  },
  desk_lamp(g, x, y, w, h, o, t, st) {
    const on = !st || daylight(st) < 0.55;
    g.fillStyle = "#33303c"; g.fillRect(x + 2, y - 5, w - 4, 5);              // base on the desk
    g.fillStyle = "#454252"; g.fillRect(x + 4, y - 7, w - 8, 3);
    g.strokeStyle = "#5a5568"; g.lineWidth = 4;                                // arm
    g.beginPath();
    g.moveTo(x + w / 2, y - 6);
    g.lineTo(x + w / 2 - 1, y - 24);
    g.lineTo(x + w * 0.05, y - 33);
    g.stroke();
    g.fillStyle = "#6a6478";
    g.beginPath(); g.arc(x + w / 2 - 1, y - 24, 3, 0, 7); g.fill();            // joint
    g.fillStyle = on ? "#f6e3a4" : "#4a4450";                                  // shade
    g.beginPath();
    g.moveTo(x - w * 0.28, y - 40); g.lineTo(x + w * 0.36, y - 36);
    g.lineTo(x + w * 0.26, y - 24); g.lineTo(x - w * 0.34, y - 28);
    g.closePath(); g.fill();
    g.fillStyle = on ? "#fff4cf" : "#565161";
    g.fillRect(x - w * 0.33, y - 30, w * 0.6, 3);
    if (on) {
      const gl = g.createRadialGradient(x, y - 24, 3, x, y - 24, 70);
      gl.addColorStop(0, "rgba(255,226,150,.32)"); gl.addColorStop(1, "rgba(255,226,150,0)");
      g.fillStyle = gl; g.beginPath(); g.arc(x, y - 24, 70, 0, 7); g.fill();
    }
  },
  crate(g, x, y, w, h, o) {
    g.fillStyle = "#8a6a44"; g.fillRect(x, y, w, h);
    g.strokeStyle = "#5e4629"; g.lineWidth = 2; g.strokeRect(x + 3, y + 3, w - 6, h - 6);
    g.fillStyle = "#3a2c1c"; g.font = "9px monospace"; g.textAlign = "center";
    g.fillText(String(o.kind || "?").slice(0, 11), x + w / 2, y + h / 2 + 3);
    g.textAlign = "left";
  },
};
export const KNOWN_KINDS = Object.keys(OBJ).filter((k) => k !== "crate");

/* ================= who Nova is today ================= */
// Nova does not wear the same shirt every day. The outfit is picked from the wardrobe by day
// number, so it is stable all day and different tomorrow.
function outfit(st) {
  const av = st.identity.avatar || {};
  const base = { hair: av.hair || "#3b2f4a", skin: av.skin || "#e8b48c",
                 pants: av.pants || "#2f3a4a", shirt: av.shirt || "#4d7fa8" };
  if (/^sleep/i.test(st.activity.current) && av.sleepwear)
    return { ...base, shirt: av.sleepwear };
  const wr = av.wardrobe || [];
  if (!wr.length) return base;
  return { ...base, ...wr[((st.clock.day % wr.length) + wr.length) % wr.length] };
}

// Small involuntary things, each on its own clock. This is most of what makes it feel alive.
function micro(st, t) {
  const energy = st.physical?.energy ?? 70, hunger = st.physical?.hunger ?? 30;
  return {
    blink: (t % 4300) < 130,
    yawn: energy < 40 && (t % 15000) < 1500,
    sip: /coffee/i.test(st.activity.current) ? (t % 7000) < 2200 : (t % 23000) < 1600,
    look: (t % 19000) < 2600,                        // glances at the window
    rub: hunger > 70 && (t % 21000) < 1800,          // hungry, rubs their face
  };
}

/* ================= the person ================= */
const SPOT = { kitchen: [18.6, 10.3], window: [8, 10.4], floor: [12, 11], outside: [-3, 11] };
const PS = 1.7;

function novaTarget(st) {
  const objs = st.apartment.objects;
  if (st.activity.location === "desk") {
    const c = objs.find((o) => o.id === "office_chair" || o.id === "chair");
    const d = objs.find((o) => o.kind === "desk");
    if (c) return [c.x + (c.w || 1) / 2 - 0.35, c.y - 0.55];
    if (d) return [d.x + (d.w || 1) / 2, d.y + 2];
  }
  if (st.activity.location === "bed") {
    const b = objs.find((o) => o.kind === "bed");
    if (b) return [b.x + 0.6, b.y + 0.1];
  }
  return SPOT[st.activity.location] || SPOT.floor;
}

let pos = null;                              // persists between frames so Nova can walk

// The soul only decides once an hour. Left alone, Nova would stand in one spot the whole
// time, which reads as frozen rather than alive. So between decisions they drift: a few
// steps, a pause, a few steps back. It changes nothing in the world -- it is just fidgeting.
function idleDrift(st, t) {
  if (["desk", "bed", "outside"].includes(st.activity.location)) return 0;
  const period = 11000;
  const i = Math.floor(t / period), p = (t % period) / period;
  const at = (n) => {                                 // a properly mixed hash: the plain
    const h = Math.sin(n * 127.1 + 311.7) * 43758.5453;  // modulo version came out as a ramp,
    return ((h - Math.floor(h)) - 0.5) * 2.6;            // so Nova crept one way and never back
  };
  const move = Math.min(1, p / 0.4);                                 // walk, then stand a while
  return at(i) + (at(i + 1) - at(i)) * (move * move * (3 - 2 * move));
}

function drawSleeping(g, st, t, fit, bubbleVisible) {
  const bed = st.apartment.objects.find((o) => o.kind === "bed");
  if (!bed) return null;
  const bx = bed.x * T, by = bed.y * T, bw = (bed.w || 1) * T, bh = (bed.h || 1) * T;
  const breath = Math.sin(t / 2100) * 1.3;

  const headW = 11 * PS, headH = 11 * PS;
  const hx = bx + 8 + (bw * 0.28 - headW) / 2;         // centred on the pillow
  const hy = by + bh * 0.08 + (bh * 0.26 - headH) / 2;
  const qTop = by + bh * 0.2, qBottom = by + bh * 0.6;
  const shoulderX = hx + headW - 4;

  // head, resting on its side
  g.save();
  g.translate(hx, hy); g.scale(PS, PS);
  g.fillStyle = fit.skin; g.fillRect(0, 1, 11, 9);
  g.fillStyle = rgb(fit.skin, 0.86); g.fillRect(0, 8, 11, 2);
  g.fillStyle = fit.hair; g.fillRect(-1, -2, 13, 6); g.fillRect(-1, -2, 4, 7);
  g.fillStyle = rgb(fit.hair, 1.3); g.fillRect(1, -1, 5, 2);
  g.fillStyle = "#221c2a"; g.fillRect(3, 5, 3, 1); g.fillRect(8, 5, 2, 1);
  g.fillStyle = rgb("#c9585f", 1, 0.26); g.fillRect(2, 7, 2, 1);
  g.restore();

  // the quilt, pulled up over a shoulder that rises and falls
  g.save();
  g.beginPath();
  g.moveTo(shoulderX, qBottom);
  g.lineTo(shoulderX, qTop + 13);
  g.quadraticCurveTo(shoulderX + bw * 0.06, qTop + 1 + breath,
                     shoulderX + bw * 0.2, qTop + 5 + breath);
  g.quadraticCurveTo(shoulderX + bw * 0.34, qTop + 10, bx + bw - 3, qTop + 7);
  g.lineTo(bx + bw - 3, qBottom);
  g.closePath();
  g.clip();

  const quilt = ["#8fa9c6", "#c98a72", "#d9c187", "#7d96b3", "#a8899f"];
  const qw = bx + bw - 3 - shoulderX, qh = qBottom - qTop;
  const cols = Math.max(3, Math.round(qw / 17));
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < cols; c++) {
      g.fillStyle = quilt[(r * 3 + c * 2) % quilt.length];
      g.fillRect(shoulderX + c * (qw / cols), qTop + r * (qh / 3) + breath * 0.4,
                 qw / cols - 1.5, qh / 3 - 1.5);
    }
  g.fillStyle = "rgba(255,255,255,.16)";
  g.fillRect(shoulderX, qTop + breath, qw, 5);
  g.restore();

  g.strokeStyle = "rgba(0,0,0,.18)"; g.lineWidth = 1.5;   // the fold along the top edge
  g.beginPath();
  g.moveTo(shoulderX, qTop + 13);
  g.quadraticCurveTo(shoulderX + bw * 0.06, qTop + 1 + breath,
                     shoulderX + bw * 0.2, qTop + 5 + breath);
  g.quadraticCurveTo(shoulderX + bw * 0.34, qTop + 10, bx + bw - 3, qTop + 7);
  g.stroke();

  if (!bubbleVisible && (t % 9000) < 5000) {
    const p = (t % 9000) / 5000;
    g.globalAlpha = Math.sin(p * Math.PI) * 0.55;
    g.fillStyle = "#ffffff"; g.font = "13px monospace";
    g.fillText("z", hx + 34, hy - 8 - p * 22);
    g.globalAlpha = 1;
  }
  return [hx, hy];
}

function drawNova(g, st, t, bubbleVisible) {
  const fit = outfit(st), act = st.activity;
  if (/^sleep/i.test(act.current)) return drawSleeping(g, st, t, fit, bubbleVisible);

  const [baseX, ty] = novaTarget(st);
  const sittingSpot = st.activity.location === "desk";
  // a chair swivels a little; a person standing about wanders a little more
  const tx = baseX + (sittingSpot ? Math.sin(t / 5200) * 0.1 : idleDrift(st, t));
  if (!pos) pos = [tx, ty];
  const dx = tx - pos[0];
  pos[0] += dx * 0.05; pos[1] += (ty - pos[1]) * 0.05;
  const walking = !sittingSpot && Math.abs(dx) > 0.05;
  const m = micro(st, t);
  let facing = tx < pos[0] ? -1 : 1;
  if (!walking && m.look) facing = pos[0] * T > WIN.x + WIN.w / 2 ? -1 : 1;

  const sitting = !walking && act.location === "desk";
  const typing = sitting && !m.sip && !m.yawn &&
                 /work|cod|writ|typ|build|fix|refactor|debug|read|set/i.test(act.current);
  const step = walking ? Math.sin(t / 90) : 0;
  const bob = walking ? Math.abs(Math.sin(t / 90)) * 2 : Math.sin(t / 1500) * 0.7;

  const px = pos[0] * T, py = pos[1] * T;

  g.save();
  g.fillStyle = "rgba(0,0,0,.32)";
  g.beginPath(); g.ellipse(px + 9 * PS, py + 33 * PS, 13 * PS, 4, 0, 0, 7); g.fill();

  g.translate(px, py + bob);
  g.scale(PS, PS);
  if (facing < 0) { g.translate(17, 0); g.scale(-1, 1); }

  const skinD = rgb(fit.skin, 0.82), shirtD = rgb(fit.shirt, 0.78);

  if (sitting) {
    g.fillStyle = fit.pants;
    g.fillRect(1, 20, 16, 6);
    g.fillRect(3, 25, 5, 7); g.fillRect(10, 25, 5, 7);
    g.fillStyle = "#241f2b"; g.fillRect(2, 31, 7, 3); g.fillRect(9, 31, 7, 3);
  } else {
    g.fillStyle = fit.pants;
    g.fillRect(3, 20 + step, 5, 11 - Math.abs(step));
    g.fillRect(9, 20 - step, 5, 11 - Math.abs(step));
    g.fillStyle = "#241f2b";
    g.fillRect(2, 30 + step, 7, 3); g.fillRect(9, 30 - step, 7, 3);
  }

  // torso, and whatever they put on this morning
  g.fillStyle = fit.shirt; g.fillRect(1, 9, 15, 12);
  g.fillStyle = shirtD;    g.fillRect(1, 18, 15, 3);
  if (fit.stripes) {
    g.fillStyle = rgb(fit.shirt, 1.45);
    for (let i = 0; i < 4; i++) g.fillRect(1, 10 + i * 3, 15, 1.4);
  }
  if (fit.collar) {
    g.fillStyle = rgb(fit.shirt, 1.3);
    g.beginPath(); g.moveTo(5, 9); g.lineTo(8.5, 13); g.lineTo(12, 9); g.fill();
  }

  // arms
  let armY = 14, handMug = false;
  if (typing) armY = 14 + Math.round(Math.sin(t / 85) * 2);
  else if (m.sip) { armY = 10; handMug = true; }
  else if (m.yawn) armY = 4;
  else if (m.rub) armY = 6;
  else if (walking) armY = 13 + step * 1.5;
  g.fillStyle = fit.shirt; g.fillRect(-2, 10, 4, 5); g.fillRect(15, 10, 4, 5);
  g.fillStyle = fit.skin;
  g.fillRect(-2, walking ? armY - step * 3 : armY, 4, 7);
  g.fillRect(15, armY, 4, 7);
  if (fit.hood) {
    g.fillStyle = rgb(fit.shirt, 0.8);
    g.beginPath(); g.ellipse(8.5, 9, 9, 4.5, 0, 0, 7); g.fill();
  }

  // head
  g.fillStyle = fit.skin; g.fillRect(3, 0, 11, 11);
  g.fillStyle = skinD;    g.fillRect(3, 9, 11, 2);
  g.fillStyle = fit.hair; g.fillRect(2, -3, 13, 6); g.fillRect(2, -3, 3, 9);
  if (+st.clock.sim_time.slice(0, 2) < 9) {                 // bed hair, early on
    g.fillRect(3, -6, 4, 4); g.fillRect(10, -5, 3, 3);
  }
  g.fillStyle = rgb(fit.hair, 1.35); g.fillRect(4, -2, 6, 2);

  g.fillStyle = "#221c2a";
  if (m.blink || m.yawn) { g.fillRect(6, 5, 2, 1); g.fillRect(11, 5, 2, 1); }
  else { g.fillRect(6, 4, 2, 2); g.fillRect(11, 4, 2, 2); }
  if (m.yawn) { g.fillStyle = "#3a2430"; g.fillRect(8, 7, 4, 3); }
  else if ((st.emotional?.mood ?? 50) >= 65) { g.fillStyle = "#3a2430"; g.fillRect(8, 7, 3, 1); }
  g.fillStyle = rgb("#c9585f", 1, 0.35); g.fillRect(4, 7, 2, 1); g.fillRect(12, 7, 2, 1);

  if (handMug) {                                    // the good mug, in hand
    g.fillStyle = "#d9d3e0"; g.fillRect(14, 8, 6, 6);
    g.fillStyle = "#b9b2c4"; g.fillRect(14, 8, 6, 1.5);
  }
  g.restore();

  if (m.yawn) {
    g.fillStyle = "rgba(255,255,255,.35)"; g.font = "11px monospace";
    g.fillText("~", px + 30, py - 4);
  }
  return [px, py];
}

/* ================= the cat ================= */
function drawCat(g, st, t, novaPx) {
  const CS = 1.6, hour = +st.clock.sim_time.slice(0, 2);
  const napping = hour < 8 || hour >= 22;
  const bed = st.apartment.objects.find((o) => o.kind === "bed");
  let cx, cy, facing = 1;
  if (napping && bed) {                              // at the far end, out of Nova's way
    cx = (bed.x + (bed.w || 1) - 1.7) * T; cy = (bed.y + 0.8) * T;
  } else {
    const wander = Math.sin(t / 5200) * 70;
    cx = Math.min(COLS * T - 60, Math.max(20, novaPx + 70 + wander));
    cy = 11.6 * T;
    facing = Math.cos(t / 5200) >= 0 ? 1 : -1;
  }

  const fur = "#4a4048", furL = "#5c5260", belly = "#e8dfe4";
  g.save();
  g.fillStyle = "rgba(0,0,0,.25)";
  g.beginPath(); g.ellipse(cx + 11 * CS, cy + 13 * CS, 12 * CS, 3, 0, 0, 7); g.fill();
  g.translate(cx, cy); g.scale(CS * facing, CS);
  if (facing < 0) g.translate(-22, 0);

  if (napping) {
    const br = Math.sin(t / 2100) * 0.5;
    g.fillStyle = fur;
    g.beginPath(); g.ellipse(11, 8 + br, 11, 6, 0, 0, 7); g.fill();
    g.beginPath(); g.arc(4, 6 + br, 5, 0, 7); g.fill();
    g.fillStyle = furL; g.beginPath(); g.ellipse(13, 8 + br, 7, 4, 0, 0, 7); g.fill();
    g.fillStyle = fur;
    g.beginPath(); g.moveTo(1, 4 + br); g.lineTo(3, br); g.lineTo(5, 4 + br); g.fill();
    g.beginPath(); g.moveTo(5, 3 + br); g.lineTo(8, br); g.lineTo(9, 4 + br); g.fill();
    g.strokeStyle = fur; g.lineWidth = 3;
    g.beginPath(); g.moveTo(20, 9 + br); g.quadraticCurveTo(24, 12 + br, 19, 13 + br); g.stroke();
    g.fillStyle = "#221c2a"; g.fillRect(2, 5 + br, 3, 1);
  } else {
    const step = Math.sin(t / 220) * 1.5;
    const earTwitch = (t % 6000) < 200 ? -1 : 0;
    g.fillStyle = fur;
    g.fillRect(4, 5, 14, 7);
    g.fillRect(5, 11, 3, 4 + step); g.fillRect(14, 11, 3, 4 - step);
    g.fillStyle = belly; g.fillRect(6, 10, 10, 2);
    g.fillStyle = fur;
    g.fillRect(15, 1, 7, 7);
    g.beginPath(); g.moveTo(15, 2); g.lineTo(16, -3 + earTwitch); g.lineTo(19, 1); g.fill();
    g.beginPath(); g.moveTo(19, 1); g.lineTo(22, -3); g.lineTo(22, 2); g.fill();
    g.strokeStyle = fur; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(4, 6); g.quadraticCurveTo(-3, 4 + Math.sin(t / 340) * 4, 0, -2); g.stroke();
    g.fillStyle = (t % 4700) < 140 ? fur : "#c9d86f"; g.fillRect(18, 3, 2, 2);
    g.fillStyle = "#e0a0a8"; g.fillRect(21, 5, 2, 1);
  }
  g.restore();
}

/* ================= what Nova is thinking ================= */
const BUBBLE_MS = 21000, BUBBLE_SHOW = 9000;

function drawThought(g, thoughts, t, anchor, ui = 1) {
  if (!thoughts || !thoughts.length || !anchor) return;
  const phase = t % BUBBLE_MS;
  if (phase > BUBBLE_SHOW) return;
  const text = String(thoughts[Math.floor(t / BUBBLE_MS) % thoughts.length] || "");
  if (!text) return;
  const fade = Math.min(1, phase / 500, (BUBBLE_SHOW - phase) / 500);

  g.save();
  g.globalAlpha = fade;
  g.font = `${Math.round(12 * ui)}px ui-monospace, monospace`;

  const maxW = Math.min(COLS * T - 40, 210 * ui), words = text.split(" "), lines = [];
  let line = "";
  for (const wd of words) {
    const test = line ? line + " " + wd : wd;
    if (g.measureText(test).width > maxW && line) { lines.push(line); line = wd; }
    else line = test;
  }
  if (line) lines.push(line);

  const lh = 15 * ui, padX = 10 * ui, padY = 8 * ui;
  const bw = Math.min(maxW, Math.max(...lines.map((l) => g.measureText(l).width))) + padX * 2;
  const bh = lines.length * lh + padY * 2;
  // keep it up on the wall, where it never covers the furniture Nova is using
  let bx = anchor[0] + 22 - bw / 2;
  let by = Math.max(6, Math.min(anchor[1] - bh - 34 * ui, FLOOR_Y - bh - 30));
  bx = Math.max(8, Math.min(COLS * T - bw - 8, bx));

  g.fillStyle = "rgba(24,20,34,.92)";
  g.strokeStyle = "rgba(224,178,92,.55)"; g.lineWidth = 1;
  const r = 9 * ui;
  g.beginPath();
  g.moveTo(bx + r, by); g.lineTo(bx + bw - r, by); g.quadraticCurveTo(bx + bw, by, bx + bw, by + r);
  g.lineTo(bx + bw, by + bh - r); g.quadraticCurveTo(bx + bw, by + bh, bx + bw - r, by + bh);
  g.lineTo(bx + r, by + bh); g.quadraticCurveTo(bx, by + bh, bx, by + bh - r);
  g.lineTo(bx, by + r); g.quadraticCurveTo(bx, by, bx + r, by);
  g.closePath(); g.fill(); g.stroke();

  // a trail of shrinking bubbles back down to whoever is thinking it
  const tailX = Math.max(bx + 14, Math.min(bx + bw - 14, anchor[0] + 22));
  const gap = Math.max(14, anchor[1] - (by + bh) - 6);
  for (let i = 0; i < 3; i++) {
    const k = (i + 1) / 3.6;
    g.beginPath();
    g.arc(tailX + (anchor[0] + 22 - tailX) * k, by + bh + gap * k, (5 - i * 1.4) * ui, 0, 7);
    g.fill(); g.stroke();
  }

  g.fillStyle = "#ece8f5";
  lines.forEach((l, i) => g.fillText(l, bx + padX, by + padY + 11 * ui + i * lh));
  g.restore();
}

/* ================= frame ================= */
export function render(canvas, st, t, hover, thoughts, ui = 1) {
  const g = canvas.getContext("2d");
  const ap = st.apartment;
  const light = daylight(st);
  g.clearRect(0, 0, canvas.width, canvas.height);

  // wall
  const wall = g.createLinearGradient(0, 0, 0, FLOOR_Y);
  wall.addColorStop(0, rgb(ap.wall, 0.72)); wall.addColorStop(1, rgb(ap.wall, 1.05));
  g.fillStyle = wall; g.fillRect(0, 0, COLS * T, FLOOR_Y);
  g.fillStyle = rgb(ap.wall, 0.9);
  for (let i = 0; i < COLS; i += 2) g.fillRect(i * T, 0, T, FLOOR_Y);
  g.fillStyle = rgb(ap.wall, 0.6); g.fillRect(0, 2.2 * T, COLS * T, 3);

  // floor
  const fl = g.createLinearGradient(0, FLOOR_Y, 0, ROWS * T);
  fl.addColorStop(0, rgb(ap.floor, 0.82)); fl.addColorStop(1, rgb(ap.floor, 1.06));
  g.fillStyle = fl; g.fillRect(0, FLOOR_Y, COLS * T, (ROWS - WALL_ROWS) * T);
  g.fillStyle = rgb(ap.floor, 0.92);
  for (let r = WALL_ROWS; r < ROWS; r++)
    for (let c = r % 2; c < COLS; c += 2) g.fillRect(c * T, r * T, T, T);
  g.strokeStyle = rgb(ap.floor, 0.75); g.lineWidth = 1;
  for (let r = WALL_ROWS; r <= ROWS; r++) {
    g.beginPath(); g.moveTo(0, r * T + 0.5); g.lineTo(COLS * T, r * T + 0.5); g.stroke();
  }
  g.fillStyle = rgb(ap.wall, 0.45); g.fillRect(0, FLOOR_Y - 9, COLS * T, 9);
  g.fillStyle = rgb(ap.wall, 0.3);  g.fillRect(0, FLOOR_Y, COLS * T, 4);

  drawArchitecture(g, st, t, light);
  drawWindow(g, t, st);

  // daylight pool, with dust turning over in it
  if (light > 0.05) {
    const pool = g.createLinearGradient(0, FLOOR_Y - 40, 0, ROWS * T);
    pool.addColorStop(0, `rgba(255,236,180,${0.3 * light})`);
    pool.addColorStop(1, "rgba(255,236,180,0)");
    g.fillStyle = pool;
    g.beginPath();
    g.moveTo(WIN.x, FLOOR_Y - 40); g.lineTo(WIN.x + WIN.w, FLOOR_Y - 40);
    g.lineTo(WIN.x + WIN.w + 70, ROWS * T); g.lineTo(WIN.x - 70, ROWS * T);
    g.closePath(); g.fill();
    for (let i = 0; i < 18; i++) {
      const dx = WIN.x - 30 + ((i * 37) % (WIN.w + 60));
      const dy = FLOOR_Y - 40 + ((i * 53 + t * 0.012 * (1 + (i % 3))) % 180);
      g.fillStyle = `rgba(255,244,214,${0.35 * light * (0.4 + 0.6 * Math.sin(t / 900 + i))})`;
      g.fillRect(dx + Math.sin(t / 1400 + i) * 6, dy, 2, 2);
    }
  }

  // objects: back to front, with contact shadows
  const flat = (o) => (o.kind === 'rug' ? -1 : 0);
  const objs = [...ap.objects].sort((a, b) => flat(a) - flat(b) || a.y - b.y);
  for (const o of objs) {
    const x = o.x * T, y = o.y * T, w = (o.w || 1) * T, h = (o.h || 1) * T;
    if (y + h > FLOOR_Y + 4 && o.kind !== "rug") {
      g.fillStyle = "rgba(0,0,0,.22)";
      g.beginPath(); g.ellipse(x + w / 2, y + h - 1, w * 0.52, 5, 0, 0, 7); g.fill();
    }
    (OBJ[o.kind] || OBJ.crate)(g, x, y, w, h, o, t, st);
    if (hover && hover.id === o.id) {
      const tall = o.kind === "monitor" ? h * 1.75 : o.kind === "laptop" ? h : 0;
      g.strokeStyle = "rgba(255,220,120,.9)"; g.lineWidth = 2;
      g.strokeRect(x - 3, y - tall - 3, w + 6, h + tall + 6);
    }
  }

  const bubbleVisible = !!(thoughts && thoughts.length && (t % BUBBLE_MS) <= BUBBLE_SHOW);
  const anchor = drawNova(g, st, t, bubbleVisible);
  if (st.cat) drawCat(g, st, t, anchor ? anchor[0] : 12 * T);

  // evening: dim the room, then let the lamps push back
  const dark = 1 - light;
  if (dark > 0.02) {
    g.fillStyle = `rgba(12,10,32,${0.55 * dark})`;
    g.fillRect(0, 0, COLS * T, ROWS * T);
    for (const o of ap.objects) {
      if (o.kind !== "lamp") continue;
      const lx = o.x * T + ((o.w || 1) * T) / 2, ly = o.y * T - 8;
      const gl = g.createRadialGradient(lx, ly, 6, lx, ly, 150);
      gl.addColorStop(0, `rgba(255,220,140,${0.5 * dark})`);
      gl.addColorStop(0.5, `rgba(255,200,120,${0.16 * dark})`);
      gl.addColorStop(1, "rgba(255,200,120,0)");
      g.fillStyle = gl; g.beginPath(); g.arc(lx, ly, 150, 0, 7); g.fill();
    }
    for (const o of ap.objects) {                 // screens glow back at the room
      if (!["monitor", "laptop"].includes(o.kind)) continue;
      const sx = o.x * T + ((o.w || 1) * T) / 2, sy = o.y * T - 14;
      const gl = g.createRadialGradient(sx, sy, 4, sx, sy, 90);
      gl.addColorStop(0, `rgba(140,200,235,${0.22 * dark})`);
      gl.addColorStop(1, "rgba(140,200,235,0)");
      g.fillStyle = gl; g.beginPath(); g.arc(sx, sy, 90, 0, 7); g.fill();
    }
  }

  drawThought(g, thoughts, t, anchor, ui);

  const vg = g.createRadialGradient(COLS * T / 2, ROWS * T / 2, ROWS * T * 0.5,
                                    COLS * T / 2, ROWS * T / 2, COLS * T * 0.72);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,.42)");
  g.fillStyle = vg; g.fillRect(0, 0, COLS * T, ROWS * T);
}

export function hitTest(st, px, py) {
  const x = px / T, y = py / T;
  return [...st.apartment.objects].reverse().find((o) => {
    const tall = o.kind === "monitor" ? (o.h || 1) * 1.75 : o.kind === "laptop" ? (o.h || 1) : 0.4;
    return x >= o.x - 0.2 && x <= o.x + (o.w || 1) + 0.2 &&
           y >= o.y - tall && y <= o.y + (o.h || 1) + 0.2;
  });
}
