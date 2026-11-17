/* "Book a slot" tab: hourly robot bookings.
   Screens: #booking (overview), #book-<robot> (choose a time), #mybookings (confirmation + my bookings).
   Data: GET/POST/PUT/DELETE api/bookings (see backend/app.py). Uses window.LAB_APP from app.js. */
(function () {
  const APP = window.LAB_APP, ROBOTS = window.LAB_ROBOTS, ART = window.LAB_ART;
  const PEOPLE = window.LAB_PEOPLE || [];
  const byId = Object.fromEntries(ROBOTS.map(r => [r.id, r]));
  const $ = s => document.querySelector(s), esc = APP.esc;
  const API = "api/bookings";
  const WD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  let cfg = { open: 8, close: 18, maxHours: 4, days: [1, 2, 3, 4, 5], weeksAhead: 4 };
  let bookings = [], loaded = false, online = true, lastJSON = "";
  let me = ""; try { me = localStorage.getItem("lab-me") || ""; } catch (_) {}
  // overview state
  const ov = { date: "", from: 0, to: 0, cell: "", q: "", filter: "all", view: "tiles" };
  // robot page state
  const rp = { robot: "", week: "", day: "", sel: null, note: "", editing: null, err: "" };
  // my bookings state
  const mine = { tab: "upcoming", justBooked: null, confirm: "" };

  /* ---------- dates & hours ---------- */
  const pad = n => String(n).padStart(2, "0");
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
  const isoDow = s => (parse(s).getDay() + 6) % 7 + 1;          // 1 = Monday
  const monday = s => addDays(s, 1 - isoDow(s));
  const today = () => iso(new Date());
  const nowHour = () => new Date().getHours();
  const hh = h => pad(h) + ":00";
  const range = (a, b) => `${hh(a)}–${hh(b)}`;
  const fmt = (s, long) => { const d = parse(s); return `${WD[isoDow(s) - 1]}, ${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${long ? d.getFullYear() : ""}`; };
  const lastDay = () => addDays(today(), cfg.weeksAhead * 7);
  const dayOpen = s => cfg.days.includes(isoDow(s)) && s >= today() && s <= lastDay();
  const slotPast = (s, h) => s < today() || (s === today() && h < nowHour());
  function firstOpenDay() {
    let s = today();
    for (let i = 0; i < 14; i++, s = addDays(s, 1)) {
      if (cfg.days.includes(isoDow(s)) && !(s === today() && nowHour() >= cfg.close - 1)) return s;
    }
    return today();
  }
  function defaultWindow(s) {
    const start = s === today() ? Math.min(Math.max(cfg.open, nowHour() + 1), cfg.close - 1) : 9;
    return [Math.max(start, cfg.open), Math.min(start + 3, cfg.close)];
  }

  /* ---------- availability logic ---------- */
  const active = b => b.status !== "cancelled";
  const dayBookings = (robot, s) => bookings.filter(b => active(b) && b.robot === robot && b.date === s).sort((a, b) => a.start - b.start);
  // Busy/Occupied on the availability board blocks bookings (until its date, or open-ended)
  function blocked(robot, s) {
    const st = APP.status(robot);
    if (st.state !== "use" && st.state !== "occ") return null;
    if (st.date && s > st.date) return null;
    return st;
  }
  function blockText(st) {
    const until = st.date ? " until " + APP.fmtDate(st.date) : "";
    return st.state === "occ" ? `Out of service${until}${st.note ? " · " + st.note : ""}` : `Assigned to ${st.person || "someone"}${until}`;
  }
  function stateFor(robot, s, a, b) {
    const bl = blocked(robot, s);
    if (bl || !dayOpen(s)) return { k: "blocked", info: bl ? blockText(bl) : "Lab closed on this day" };
    const hit = dayBookings(robot, s).filter(x => x.start < b && a < x.end);
    if (hit.length) return { k: "booked", info: hit.map(x => `${range(x.start, x.end)} · ${x.person}`).join("<br>"), hit };
    const next = dayBookings(robot, s).find(x => x.start >= b);
    return { k: "free", info: `Free ${range(a, b)}${next ? ` · next booking ${hh(next.start)}` : ""}` };
  }
  const K = { free: ["free", "Free"], booked: ["use", "Booked"], blocked: ["occ", "Not bookable"] };

  /* ---------- data ---------- */
  async function refresh(force) {
    try {
      const r = await fetch(`${API}?from=${addDays(today(), -120)}`, { cache: "no-store" });
      if (!r.ok) throw 0;
      const txt = await r.text();
      online = true; loaded = true;
      if (txt !== lastJSON || force) { lastJSON = txt; bookings = JSON.parse(txt); return true; }
    } catch (_) { online = false; loaded = true; }
    return false;
  }
  async function send(method, url, body) {
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json", "X-Lab-Token": APP.token() }, body: body ? JSON.stringify(body) : undefined });
    let j = {}; try { j = await r.json(); } catch (_) {}
    if (!r.ok) throw new Error(j.error || "The booking could not be saved. Check your connection and try again.");
    await refresh(true);
    APP.refreshBoard();
    return j;
  }
  function setMe(v) { me = v; try { localStorage.setItem("lab-me", v); } catch (_) {} }
  function peopleSelect(id, extra) {
    const list = PEOPLE.includes(me) || !me ? PEOPLE : [me, ...PEOPLE];
    return `<select id="${id}" ${extra || ""}><option value="">Choose your name…</option>${list.map(p => `<option${p === me ? " selected" : ""}>${esc(p)}</option>`).join("")}</select>`;
  }
  const busyInput = () => { const a = document.activeElement; return a && $("#view").contains(a) && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName); };

  /* ---------- routing ---------- */
  function render(h) {
    if (!ov.date) { ov.date = firstOpenDay(); [ov.from, ov.to] = defaultWindow(ov.date); }
    if (h === "mybookings") return renderMine();
    if (h.startsWith("book-") && byId[h.slice(5)]) return renderRobot(h.slice(5));
    return renderOverview();
  }
  const current = () => (location.hash || "").slice(1);
  const onBookingView = () => /^(booking|mybookings|book-)/.test(current());
  function rerender() { if (onBookingView() && !busyInput() && !$("#dlgHost").innerHTML) render(current()); }

  function subnav(which) {
    return `<div class="bk-subnav" role="tablist">
      <a href="#booking" class="${which === "robots" ? "on" : ""}">Robots</a>
      <a href="#mybookings" class="${which === "mine" ? "on" : ""}">My bookings${me ? ` <span class="count">${bookings.filter(b => active(b) && b.person === me && b.date >= today()).length}</span>` : ""}</a>
    </div>`;
  }
  const offline = () => online ? "" : `<p class="note-bar">Server not reachable – bookings can't be loaded or saved right now.</p>`;

  /* ---------- 1 · overview ---------- */
  function renderOverview() {
    const s = ov.date, a = ov.from, b = ov.to;
    const cells = [...new Set(ROBOTS.map(r => r.cell))].sort();
    const q = ov.q.toLowerCase();
    const all = ROBOTS.filter(r => (!ov.cell || r.cell === ov.cell) && (!q || (r.name + r.maker + r.type + r.cell).toLowerCase().includes(q)))
      .map(r => ({ r, st: stateFor(r.id, s, a, b) }));
    const n = k => k === "all" ? all.length : all.filter(x => x.st.k === k).length;
    const list = all.filter(x => ov.filter === "all" || x.st.k === ov.filter);
    const hours = (from, to, val) => { let o = ""; for (let h = from; h <= to; h++) o += `<option value="${h}"${h === val ? " selected" : ""}>${hh(h)}</option>`; return o; };

    $("#view").innerHTML = `
      ${subnav("robots")}
      <div class="page-head"><div><h1>Book a slot</h1><p>Check which robots are free in your time window and book one by the hour (max. ${cfg.maxHours} h per booking).</p></div>
        <div class="bk-seg" role="group" aria-label="View"><button data-v="tiles" aria-pressed="${ov.view === "tiles"}">Tiles</button><button data-v="list" aria-pressed="${ov.view === "list"}">List</button></div></div>
      <section class="bk-panel bk-filters" aria-label="Filters">
        <label>Date<input type="date" id="fDate" value="${s}" min="${today()}" max="${lastDay()}"></label>
        <label>From<select id="fFrom">${hours(cfg.open, cfg.close - 1, a)}</select></label>
        <label>To<select id="fTo">${hours(cfg.open + 1, cfg.close, b)}</select></label>
        <label>Location<select id="fCell"><option value="">All locations</option>${cells.map(c => `<option${c === ov.cell ? " selected" : ""}>${esc(c)}</option>`).join("")}</select></label>
        <label>Search<input type="search" id="fQ" placeholder="Robot, maker, type" value="${esc(ov.q)}"></label>
      </section>
      <div class="bk-row">
        <div class="bk-chips" role="group" aria-label="Filter by status">${[["all", "All"], ["free", "Free"], ["booked", "Booked"], ["blocked", "Not bookable"]].map(([k, l]) =>
          `<button class="bk-chip" data-f="${k}" aria-pressed="${ov.filter === k}">${l} (${n(k)})</button>`).join("")}</div>
        <div class="legend" style="margin:0"><span class="pill free"><i></i>Free</span><span class="pill use"><i></i>Booked in this window</span><span class="pill occ"><i></i>Not bookable</span></div>
      </div>
      ${offline()}
      <p class="bk-freeinfo">${dayOpen(s) ? `<strong>${n("free")} of ${all.length}</strong> robots free on ${fmt(s, true)}, ${range(a, b)}` : `The lab is closed on ${fmt(s, true)} – choose a weekday.`}</p>
      ${ov.view === "tiles" ? `<div class="bk-grid">${list.map(card).join("")}</div>` : table(list)}
      ${list.length ? "" : `<p>No robot matches these filters.</p>`}`;

    const set = () => {
      ov.date = $("#fDate").value || ov.date;
      let f = +$("#fFrom").value, t = +$("#fTo").value;
      if (t <= f) t = Math.min(f + 1, cfg.close);
      ov.from = f; ov.to = t; ov.cell = $("#fCell").value;
    };
    ["#fDate", "#fFrom", "#fTo", "#fCell"].forEach(id => $(id).onchange = () => { set(); renderOverview(); });
    const qi = $("#fQ"); qi.oninput = () => { ov.q = qi.value; const p = qi.selectionStart; renderOverview(); const x = $("#fQ"); x.focus(); x.setSelectionRange(p, p); };
    document.querySelectorAll(".bk-chip").forEach(c => c.onclick = () => { ov.filter = c.dataset.f; renderOverview(); });
    document.querySelectorAll(".bk-seg [data-v]").forEach(c => c.onclick = () => { ov.view = c.dataset.v; renderOverview(); });
    document.querySelectorAll("[data-book]").forEach(btn => btn.onclick = () => openRobot(btn.dataset.book, ov.date, btn.dataset.pre === "1" ? { start: ov.from, end: Math.min(ov.to, ov.from + cfg.maxHours) } : null));
  }
  function action(x) {
    if (x.st.k === "free") return `<button class="btn primary" data-book="${x.r.id}" data-pre="1">Book</button>`;
    if (x.st.k === "booked") return `<button class="btn" data-book="${x.r.id}">Choose another time</button>`;
    return `<button class="btn" disabled>Not bookable</button>`;
  }
  function card(x) {
    const [cls, label] = K[x.st.k];
    return `<article class="bk-card ${x.st.k}">
      <div class="bk-head"><div><h3>${esc(x.r.name)}</h3><span class="bk-place">${esc(x.r.cell)} · ${esc(x.r.maker)}</span></div><span class="pill ${cls}"><i></i>${label}</span></div>
      <div class="bk-art"><img src="${ART[x.r.art]}" alt="" loading="lazy"></div>
      <span class="bk-info">${x.st.k === "booked" ? x.st.info : esc(x.st.info)}</span>
      ${action(x)}
    </article>`;
  }
  function table(list) {
    return `<div class="bk-tablebox"><table class="bk-table"><thead><tr><th>Robot</th><th>Location</th><th>Status</th><th>Details</th><th><span class="sr">Action</span></th></tr></thead><tbody>
      ${list.map(x => { const [cls, label] = K[x.st.k]; return `<tr><td><b>${esc(x.r.name)}</b><br><small>${esc(x.r.maker)}</small></td><td>${esc(x.r.cell)}</td><td><span class="pill ${cls}"><i></i>${label}</span></td>
        <td>${x.st.k === "booked" ? x.st.info : esc(x.st.info)}</td><td class="bk-actions">${action(x)}</td></tr>`; }).join("")}
    </tbody></table></div>`;
  }

  /* ---------- 2 · choose a time ---------- */
  function openRobot(id, day, sel, editing, note) {
    rp.robot = id; rp.day = day; rp.week = monday(day); rp.sel = sel; rp.editing = editing || null; rp.note = note || ""; rp.err = "";
    APP.go("book-" + id);
  }
  function slotState(h) {
    const s = rp.day;
    if (slotPast(s, h)) return { k: "past" };
    const b = dayBookings(rp.robot, s).find(x => x.start <= h && h < x.end && x.id !== rp.editing);
    if (b) return { k: "busy", b };
    return { k: "free" };
  }
  function renderRobot(id) {
    if (rp.robot !== id) { rp.robot = id; rp.day = ov.date || firstOpenDay(); rp.week = monday(rp.day); rp.sel = null; rp.editing = null; rp.note = ""; rp.err = ""; }
    const r = byId[id], s = rp.day, bl = blocked(id, s), open = dayOpen(s);
    const thisMon = monday(today()), lastMon = monday(lastDay());
    const days = [0, 1, 2, 3, 4, 5, 6].map(i => addDays(rp.week, i));
    const slots = []; for (let h = cfg.open; h < cfg.close; h++) slots.push(h);
    if (rp.sel && (bl || !open || rp.sel.start < cfg.open)) rp.sel = null;
    const editingB = rp.editing && bookings.find(b => b.id === rp.editing);
    const nowSt = blocked(id, today());

    $("#view").innerHTML = `
      ${subnav("robots")}
      <nav class="bk-crumbs" aria-label="Breadcrumb"><a href="#booking">Book a slot</a><span aria-hidden="true">/</span><span>${esc(r.name)}</span></nav>
      <div class="bk-split">
        <section class="bk-panel bk-side">
          <div class="bk-art big"><img src="${ART[r.art]}" alt="${esc(r.name)}"></div>
          <div class="bk-row" style="gap:8px"><h1 class="bk-title">${esc(r.name)}</h1>${nowSt ? `<span class="pill occ"><i></i>Not bookable now</span>` : `<span class="pill free"><i></i>Bookable</span>`}</div>
          <dl class="bk-dl">
            <div><dt>Maker</dt><dd>${esc(r.maker)}</dd></div><div><dt>Location</dt><dd>${esc(r.cell)}</dd></div>
            <div><dt>Type</dt><dd>${esc(r.type)}</dd></div><div><dt>IP / connection</dt><dd>${esc(r.ip)}</dd></div>
            <div><dt>Max. duration</dt><dd>${cfg.maxHours} hours</dd></div><div><dt>Bookable</dt><dd>${WD[cfg.days[0] - 1]}–${WD[cfg.days[cfg.days.length - 1] - 1]}, ${range(cfg.open, cfg.close)}</dd></div>
          </dl>
          ${nowSt ? `<p class="bk-warn">${esc(blockText(nowSt))}</p>` : ""}
          <a class="btn" href="#doc-${r.id}">Open setup guide →</a>
        </section>
        <section class="bk-panel bk-content">
          ${editingB ? `<p class="bk-editing">Changing booking <b>${esc(editingB.id)}</b> (${fmt(editingB.date)} ${range(editingB.start, editingB.end)}). Pick the new time and save.</p>` : ""}
          <div class="bk-row" style="gap:12px"><h2>Choose a time</h2>
            <div class="bk-weeknav"><button class="bk-icon" id="wPrev" aria-label="Previous week" ${rp.week <= thisMon ? "disabled" : ""}>‹</button>
              <span>${fmt(rp.week).slice(5)} – ${fmt(addDays(rp.week, 6), true).slice(5)}</span>
              <button class="bk-icon" id="wNext" aria-label="Next week" ${rp.week >= lastMon ? "disabled" : ""}>›</button></div></div>
          <div class="bk-days" role="group" aria-label="Choose a day">${days.map(d => {
            const n = dayBookings(id, d).length, ok = dayOpen(d), blk = ok && blocked(id, d);
            return `<button class="bk-day" data-d="${d}" aria-pressed="${d === s}" ${ok ? "" : "disabled"}><small>${WD[isoDow(d) - 1]}</small><b>${parse(d).getDate()}</b><small>${!ok ? "–" : blk ? "blocked" : n ? n + " booked" : "free"}</small></button>`; }).join("")}</div>
          <div class="legend" style="margin:0"><span><i class="bk-sw free"></i>Free</span><span><i class="bk-sw busy"></i>Booked</span><span><i class="bk-sw sel"></i>Your selection</span></div>
          ${bl ? `<p class="bk-warn">Not bookable on ${fmt(s, true)}: ${esc(blockText(bl))}.</p>`
            : !open ? `<p class="bk-warn">The lab is closed on ${fmt(s, true)}.</p>`
            : `<div class="bk-slots" role="group" aria-label="Time slots">${slots.map(h => {
                const st = slotState(h), on = rp.sel && h >= rp.sel.start && h < rp.sel.end;
                if (st.k === "past") return `<button class="bk-slot past" disabled><b>${hh(h)}</b><small>Past</small></button>`;
                if (st.k === "busy") return `<button class="bk-slot busy" disabled title="${esc(st.b.person)}${st.b.note ? " – " + esc(st.b.note) : ""}"><b>${hh(h)}</b><small>${esc(st.b.person.split(",")[0])}</small></button>`;
                return `<button class="bk-slot${on ? " sel" : ""}" data-h="${h}" aria-pressed="${on}"><b>${hh(h)}</b><small>${on ? "Selected" : "Free"}</small></button>`;
              }).join("")}</div>`}
          <div class="bk-form">
            <label>Booking as${peopleSelect("who")}</label>
            <label>Project or note <span class="muted">(optional)</span><input id="bNote" maxlength="80" placeholder="e.g. Pick-and-place thesis" value="${esc(rp.note)}"></label>
          </div>
          <div class="bk-row bk-summary">
            <div><span class="muted">Your selection</span><b id="sum">${rp.sel ? `${fmt(s)} · ${range(rp.sel.start, rp.sel.end)} (${rp.sel.end - rp.sel.start} h)` : "Pick a start time, then click the next slots to make it longer"}</b></div>
            <div class="bk-btns"><a href="${rp.editing ? "#mybookings" : "#booking"}" class="btn" id="bCancel">Cancel</a><button class="btn primary" id="bGo" ${rp.sel && !bl && open ? "" : "disabled"}>${rp.editing ? "Save change" : "Book now"}</button></div>
          </div>
          ${rp.err ? `<p class="err" role="alert">${esc(rp.err)}</p>` : ""}
        </section>
      </div>`;

    $("#wPrev").onclick = () => { rp.week = addDays(rp.week, -7); pickFirstDay(); renderRobot(id); };
    $("#wNext").onclick = () => { rp.week = addDays(rp.week, 7); pickFirstDay(); renderRobot(id); };
    document.querySelectorAll(".bk-day").forEach(b => b.onclick = () => { rp.day = b.dataset.d; rp.sel = null; rp.err = ""; renderRobot(id); });
    document.querySelectorAll(".bk-slot[data-h]").forEach(b => b.onclick = () => { pick(+b.dataset.h); renderRobot(id); });
    $("#who").onchange = e => { setMe(e.target.value); rp.err = ""; };
    $("#bNote").oninput = e => { rp.note = e.target.value; };
    $("#bCancel").onclick = () => { rp.sel = null; rp.editing = null; rp.err = ""; };
    $("#bGo").onclick = submit;
  }
  function pickFirstDay() {
    for (let i = 0; i < 7; i++) { const d = addDays(rp.week, i); if (dayOpen(d)) { rp.day = d; rp.sel = null; return; } }
    rp.day = rp.week; rp.sel = null;
  }
  function pick(h) {
    rp.err = "";
    const s = rp.sel, free = x => x >= cfg.open && x < cfg.close && slotState(x).k === "free";
    if (!s) { rp.sel = { start: h, end: h + 1 }; return; }
    if (h === s.end || h === s.start - 1) {               // extend
      const n = { start: Math.min(s.start, h), end: Math.max(s.end, h + 1) };
      if (n.end - n.start > cfg.maxHours) { rp.err = `A booking can be at most ${cfg.maxHours} hours.`; return; }
      rp.sel = n; return;
    }
    if (h === s.start && s.end - s.start > 1) { rp.sel = { start: h + 1, end: s.end }; return; }   // shrink
    if (h === s.end - 1 && s.end - s.start > 1) { rp.sel = { start: s.start, end: h }; return; }
    if (h >= s.start && h < s.end) { rp.sel = null; return; }
    rp.sel = free(h) ? { start: h, end: h + 1 } : null;   // start over
  }
  async function submit() {
    if (!rp.sel) return;
    if (!me) { rp.err = "Choose your name under “Booking as” first."; renderRobot(rp.robot); return; }
    const btn = $("#bGo"); btn.disabled = true; btn.textContent = "Saving…";
    const body = { robot: rp.robot, person: me, date: rp.day, start: rp.sel.start, end: rp.sel.end, note: rp.note.trim() };
    try {
      const b = rp.editing ? await send("PUT", `${API}/${encodeURIComponent(rp.editing)}`, body) : await send("POST", API, body);
      mine.justBooked = { b, changed: !!rp.editing }; mine.tab = "upcoming";
      rp.sel = null; rp.editing = null; rp.note = ""; rp.err = "";
      APP.go("mybookings");
    } catch (e) { rp.err = e.message; await refresh(true); renderRobot(rp.robot); }
  }

  /* ---------- 3 · confirmation & my bookings ---------- */
  function renderMine() {
    const t = today(), h = nowHour();
    const isPast = b => b.date < t || (b.date === t && b.end <= h);
    const mineAll = bookings.filter(b => b.person === me);
    const list = mineAll.filter(b => mine.tab === "upcoming" ? !isPast(b) && active(b) : isPast(b) || !active(b))
      .sort((a, b) => mine.tab === "upcoming" ? (a.date + pad(a.start)).localeCompare(b.date + pad(b.start)) : (b.date + pad(b.start)).localeCompare(a.date + pad(a.start)));
    const jb = mine.justBooked && bookings.find(b => b.id === mine.justBooked.b.id);
    const status = b => !active(b) ? `<span class="pill occ"><i></i>Cancelled</span>` : isPast(b) ? `<span class="pill">Done</span>` : `<span class="pill free"><i></i>Confirmed</span>`;

    $("#view").innerHTML = `
      ${subnav("mine")}
      ${jb ? `<section class="bk-success" role="status">
        <div class="bk-check" aria-hidden="true">✓</div>
        <div class="bk-success-txt"><h1>${mine.justBooked.changed ? "Booking changed" : "Booking confirmed"}</h1>
          <p>${esc(byId[jb.robot] ? byId[jb.robot].name : jb.robot)} · ${fmt(jb.date, true)} · ${range(jb.start, jb.end)} · Booking no. <b>${esc(jb.id)}</b></p>
          <p class="muted">Visible to everyone on the Book a slot page. Cancel it here if your plans change.</p></div>
        <div class="bk-btns"><button class="btn" data-ics="${esc(jb.id)}">Add to calendar</button><a href="#booking" class="btn primary">Book another robot</a></div>
      </section>` : ""}
      <div class="page-head"><div><h1>My bookings</h1><p>Your upcoming and past robot bookings.</p></div>
        <label class="bk-who">Showing bookings for${peopleSelect("whoMine")}</label></div>
      <div class="bk-row"><div class="bk-seg" role="group"><button data-t="upcoming" aria-pressed="${mine.tab === "upcoming"}">Upcoming</button><button data-t="past" aria-pressed="${mine.tab === "past"}">Past &amp; cancelled</button></div></div>
      ${offline()}
      ${!me ? `<p class="bk-freeinfo">Choose your name above to see your bookings.</p>`
        : !list.length ? `<p class="bk-freeinfo">${mine.tab === "upcoming" ? `No upcoming bookings. <a href="#booking">Book a robot →</a>` : "No past or cancelled bookings yet."}</p>`
        : `<div class="bk-tablebox"><table class="bk-table"><thead><tr><th>Robot</th><th>Date</th><th>Time</th><th>Location</th><th>Status</th><th><span class="sr">Actions</span></th></tr></thead><tbody>
          ${list.map(b => { const r = byId[b.robot] || { name: b.robot, cell: "" }, up = active(b) && !isPast(b);
            return `<tr${jb && jb.id === b.id ? ' class="bk-hl"' : ""}><td><b>${esc(r.name)}</b>${b.note ? `<br><small>${esc(b.note)}</small>` : ""}</td><td>${fmt(b.date, true)}</td><td>${range(b.start, b.end)}</td><td>${esc(r.cell)}</td><td>${status(b)}</td>
              <td class="bk-actions">${up ? `<button class="btn" data-ics="${esc(b.id)}" title="Download calendar file">Calendar</button><button class="btn" data-edit="${esc(b.id)}">Change</button><button class="btn${mine.confirm === b.id ? " danger" : ""}" data-cancel="${esc(b.id)}">${mine.confirm === b.id ? "Confirm cancel" : "Cancel"}</button>` : ""}</td></tr>`; }).join("")}
        </tbody></table></div>`}
      <p class="err" id="mErr" hidden></p>`;

    $("#whoMine").onchange = e => { setMe(e.target.value); mine.justBooked = null; renderMine(); };
    document.querySelectorAll(".bk-seg [data-t]").forEach(b => b.onclick = () => { mine.tab = b.dataset.t; renderMine(); });
    document.querySelectorAll("[data-ics]").forEach(b => b.onclick = () => ics(bookings.find(x => x.id === b.dataset.ics)));
    document.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => { const x = bookings.find(y => y.id === b.dataset.edit); mine.justBooked = null; openRobot(x.robot, x.date, { start: x.start, end: x.end }, x.id, x.note); });
    document.querySelectorAll("[data-cancel]").forEach(b => b.onclick = async () => {
      const id = b.dataset.cancel;
      if (mine.confirm !== id) { mine.confirm = id; renderMine(); setTimeout(() => { if (mine.confirm === id) { mine.confirm = ""; rerender(); } }, 4000); return; }
      mine.confirm = ""; b.disabled = true; b.textContent = "Cancelling…";
      try { await send("DELETE", `${API}/${encodeURIComponent(id)}?person=${encodeURIComponent(me)}`); if (mine.justBooked && mine.justBooked.b.id === id) mine.justBooked = null; renderMine(); }
      catch (e) { renderMine(); const m = $("#mErr"); m.textContent = e.message; m.hidden = false; }
    });
  }
  function ics(b) {
    if (!b) return;
    const r = byId[b.robot] || { name: b.robot, cell: "" };
    const t = (s, h) => s.replace(/-/g, "") + "T" + pad(h) + "0000";
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
    const clean = s => String(s).replace(/[\\,;]/g, m => "\\" + m).replace(/\n/g, "\\n");
    const txt = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//FH Technikum Wien//Digital Factory Lab//EN", "BEGIN:VEVENT",
      `UID:${b.id}@digital-factory-lab`, `DTSTAMP:${stamp}`, `DTSTART:${t(b.date, b.start)}`, `DTEND:${t(b.date, b.end)}`,
      `SUMMARY:${clean(r.name + " – Digital Factory Lab")}`, `LOCATION:${clean("Digital Factory Lab, " + r.cell)}`,
      `DESCRIPTION:${clean(`Booking no. ${b.id}${b.note ? "\n" + b.note : ""}`)}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([txt], { type: "text/calendar" }));
    a.download = `${b.id}.ics`; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  /* ---------- for the Availability board: is a slot booking running right now? ---------- */
  function activeNow(robot) {
    const t = today(), h = nowHour();
    return bookings.find(b => active(b) && b.robot === robot && b.date === t && b.start <= h && h < b.end) || null;
  }

  // next booking that hasn't ended yet (running now or later)
  function next(robot, laterOnly) {
    const t = today(), h = nowHour();
    return bookings.filter(b => active(b) && b.robot === robot && (b.date > t || (b.date === t && (laterOnly ? b.start > h : b.end > h))))
      .sort((a, b) => (a.date + pad(a.start)).localeCompare(b.date + pad(b.start)))[0] || null;
  }
  const describe = b => `${b.date === today() ? "today" : fmt(b.date)} ${range(b.start, b.end)} · ${b.person}`;

  window.LAB_BOOKING = { render, onStatus: rerender, activeNow, next, describe, count: () => bookings.filter(b => active(b) && b.person === me && b.date >= today()).length };

  fetch("api/config", { cache: "no-store" }).then(r => r.ok ? r.json() : null).then(c => {
    if (c && c.booking) { cfg = Object.assign(cfg, c.booking); ov.date = ""; rerender(); }
  }).catch(() => {});
  refresh(true).then(() => { rerender(); APP.refreshBoard(); });
  setInterval(async () => { if (document.hidden) return; if (await refresh()) { rerender(); APP.refreshBoard(); } }, 10000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh().then(ch => { if (ch) { rerender(); APP.refreshBoard(); } }); });
})();
