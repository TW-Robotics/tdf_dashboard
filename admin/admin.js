/* Admin panel: change robot usage (free / busy / occupied). */
(function () {
  const ROBOTS = window.LAB_ROBOTS || [];
  const LABELS = { free: "Free", use: "Busy", occ: "Occupied" };
  // People who can be responsible for a robot (can be overridden with window.LAB_PEOPLE)
  const PEOPLE = window.LAB_PEOPLE || [
    "FH-Prof. Dr.techn. Mohamed Aburaia, MSc",
    "Dr. Techn. Zlatan Ajanovic",
    "Nikolaus Angel, MSc",
    "Dipl.-Ing. Angela Blaha, B.Sc.",
    "Radu-Dionisie Curcean",
    "Felix Dauser, BSc",
    "Dragana Dimitrijevic, MSc",
    "Amr Eltabakh, MSc.",
    "Florian Faber, B.Sc.",
    "Robert Fellner, MSc",
    "Dipl.-Ing. Bernhard Neuberger, BSc.",
    "Horst Orsolits, MSc",
    "Lucas Sebastian Pammer, MSc.",
    "Dr. techn. Surya Kannan Peesapati",
    "Michael Schebek, MSc",
    "Alessandro Scherl, MSc.",
    "Simon Schwaiger, MSc",
    "David Seyser, BSc",
    "Andreas Steinbichler, BSc",
    "Cedric Michael Steininger",
    "DI Dr. Kemajl Stuja",
  ];
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  let token = "";
  let server = {};          // last status from the server
  const drafts = {};        // id -> {state, person, date, note} edited but not saved

  try { token = sessionStorage.getItem("lab-admin-token") || ""; } catch (_) {}

  /* ---------- helpers ---------- */
  function api(path, opts = {}) {
    return fetch(path, {
      ...opts,
      headers: { "Content-Type": "application/json", "X-Lab-Token": token, ...(opts.headers || {}) },
    });
  }
  function toast(msg, isErr) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.toggle("err", !!isErr);
    clearTimeout(toast.t);
    toast.t = setTimeout(() => (t.textContent = ""), 4000);
  }
  function ago(ms) {
    if (!ms) return "—";
    const m = Math.round((Date.now() - ms) / 60000);
    if (m < 1) return "just now";
    if (m < 60) return m + " min ago";
    const h = Math.round(m / 60);
    return h < 24 ? h + " h ago" : Math.round(h / 24) + " d ago";
  }
  const current = (id) => drafts[id] || { state: "free", person: "", date: "", note: "", ...(server[id] || {}) };
  
  const isDirty = (id) => {
    if (!drafts[id]) return false;
    const s = { state: "free", person: "", date: "", note: "", ...(server[id] || {}) }, d = drafts[id];
    return (
      s.state !== d.state || 
      (s.person || "") !== d.person.trim() || 
      (s.date || "") !== (d.date || "") || 
      (s.note || "") !== d.note.trim()
    );
  };

  /* ---------- sign-in ---------- */
  function showLogin(msg) {
    $("#panel").hidden = true;
    if ($("#logout")) $("#logout").hidden = true;
    $("#login").hidden = false;
    const e = $("#loginErr");
    e.hidden = !msg;
    e.textContent = msg || "";
    $("#tokenIn").focus();
  }
  async function tryLogin(t) {
    token = t;
    try {
      const r = await api("/api/admin/login", { method: "POST" });
      if (r.status === 403) return showLogin(t ? "That token is not correct." : "");
      if (!r.ok) throw 0;
      try { sessionStorage.setItem("lab-admin-token", token); } catch (_) {}
      $("#login").hidden = true;
      $("#panel").hidden = false;
      if ($("#logout")) $("#logout").hidden = false;
      await refresh();
    } catch (_) {
      showLogin("The server is not reachable. Start it with python app.py and reload.");
    }
  }
  $("#loginForm").onsubmit = (e) => { e.preventDefault(); tryLogin($("#tokenIn").value.trim()); };
  $("#logout").onclick = () => {
    try { sessionStorage.removeItem("lab-admin-token"); } catch (_) {}
    token = "";
    $("#tokenIn").value = "";
    showLogin("");
  };

  /* ---------- data ---------- */
  async function refresh() {
    try {
      const r = await fetch("/api/status", { cache: "no-store" });
      server = await r.json();
      render();
    } catch (_) {
      toast("Could not load the current status.", true);
    }
  }

  /* ---------- render ---------- */
  function renderSummary() {
    const n = { free: 0, use: 0, occ: 0 };
    ROBOTS.forEach((r) => n[(server[r.id] || {}).state || "free"]++);
    $("#summary").innerHTML = ["free", "use", "occ"]
      .map((k) => `<div class="sum ${k}"><span>${LABELS[k]}</span><b>${n[k]}</b></div>`).join("");
  }
  function personSelect(r, c) {
    // Always selectable: picking a person switches the robot to Busy (see change handler)
    const val = c.state === "use" ? (c.person || "").trim() : "";
    // keep a saved name that is no longer in the list, so it is not lost
    const names = val && !PEOPLE.includes(val) ? [val, ...PEOPLE] : PEOPLE;
    const opts = [`<option value="">Select person…</option>`]
      .concat(names.map((n) => `<option value="${esc(n)}"${n === val ? " selected" : ""}>${esc(n)}</option>`))
      .join("");
    return `<select id="p-${r.id}" data-f="person" aria-label="Person using ${esc(r.name)}">${opts}</select>`;
  }
  function rowHTML(r) {
    const c = current(r.id), s = server[r.id] || {};
    return `<tr data-id="${r.id}" class="${isDirty(r.id) ? "dirty" : ""}">
      <td class="rname"><b>${esc(r.name)}</b><span>${esc(r.cell)} · ${esc(r.maker)}</span></td>
      <td><div class="seg" role="group" aria-label="Status of ${esc(r.name)}">
        ${["free", "use", "occ"].map((k) => `<button type="button" class="${k}" data-k="${k}" aria-pressed="${c.state === k}">${LABELS[k]}</button>`).join("")}
      </div></td>
      <td>${personSelect(r, c)}</td>
      <td><input type="date" id="d-${r.id}" data-f="date" value="${esc(c.state === "use" ? c.date : "")}" ${c.state === "use" ? "" : "disabled"} aria-label="Date for ${esc(r.name)}"></td>
      <td><input id="n-${r.id}" data-f="note" maxlength="80" placeholder="${c.state === "occ" ? "e.g. Maintenance" : "Optional"}" value="${esc(c.state === "free" ? "" : c.note)}" ${c.state === "free" ? "disabled" : ""} aria-label="Note for ${esc(r.name)}"></td>
      <td class="since">${s.state ? ago(s.since) : "—"}</td>
      <td class="row-save"><button type="button" class="btn primary" data-save ${isDirty(r.id) ? "" : "disabled"}>Save</button></td>
    </tr>`;
  }
  function render() {
    renderSummary();
    const focused = document.activeElement && document.activeElement.id;
    const selectionStart = document.activeElement?.selectionStart;
    const selectionEnd = document.activeElement?.selectionEnd;

    $("#rows").innerHTML = ROBOTS.map(rowHTML).join("");
    
    if (focused) { 
      const el = document.getElementById(focused); 
      if (el) { 
        el.focus(); 
        if (typeof el.setSelectionRange === 'function' && selectionStart != null) {
          try { el.setSelectionRange(selectionStart, selectionEnd); } catch(_) {}
        }
      } 
    }
  }
  function rerenderRow(id) {
    const tr = document.querySelector(`tr[data-id="${id}"]`);
    const focused = document.activeElement && document.activeElement.id;
    const selectionStart = document.activeElement?.selectionStart;
    const selectionEnd = document.activeElement?.selectionEnd;

    tr.outerHTML = rowHTML(ROBOTS.find((r) => r.id === id));
    
    if (focused) { 
      const el = document.getElementById(focused); 
      if (el) {
        el.focus();
        if (typeof el.setSelectionRange === 'function' && selectionStart != null) {
          try { el.setSelectionRange(selectionStart, selectionEnd); } catch(_) {}
        }
      } 
    }
  }

  /* ---------- interactions ---------- */
  $("#rows").addEventListener("click", async (e) => {
    const tr = e.target.closest("tr[data-id]");
    if (!tr) return;
    const id = tr.dataset.id;
    const seg = e.target.closest(".seg button");
    if (seg) {
      const currentState = current(id);
      const d = { 
        ...currentState, 
        state: seg.dataset.k,
        date: seg.dataset.k === "use" ? currentState.date : "" 
      };
      if (d.state === "free") { d.person = ""; d.date = ""; d.note = ""; }
      drafts[id] = d;
      rerenderRow(id);
      if (d.state === "use") document.getElementById("p-" + id).focus();
      return;
    }
    if (e.target.closest("[data-save]")) save(id);
  });
  
  // "change" covers <select> in all browsers; "input" covers text and date fields
  ["input", "change"].forEach((ev) => $("#rows").addEventListener(ev, (e) => {
    const tr = e.target.closest("tr[data-id]");
    if (!tr || !e.target.dataset.f) return;
    const id = tr.dataset.id;
    drafts[id] = { ...current(id), [e.target.dataset.f]: e.target.value };
    // choosing a person on a Free / Occupied robot makes it Busy
    if (e.target.dataset.f === "person" && e.target.value && drafts[id].state !== "use") {
      drafts[id].state = "use";
      rerenderRow(id);
      return;
    }
    tr.classList.toggle("dirty", isDirty(id));
    tr.querySelector("[data-save]").disabled = !isDirty(id);
    e.target.classList.remove("bad");
  }));
  
  $("#rows").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.tagName === "INPUT") {
      const id = e.target.closest("tr").dataset.id;
      if (isDirty(id)) save(id);
    }
  });

  async function save(id) {
    const d = current(id);
    const name = ROBOTS.find((r) => r.id === id).name;
    if (d.state === "use" && !d.person.trim()) {
      const p = document.getElementById("p-" + id);
      p.classList.add("bad");
      p.focus();
      return toast(`Select who is using ${name}.`, true);
    }
    const btn = document.querySelector(`tr[data-id="${id}"] [data-save]`);
    btn.disabled = true;
    btn.textContent = "Saving…";
    try {
      const r = await api("/api/status/" + encodeURIComponent(id), {
        method: "PUT",
        body: JSON.stringify({ 
          state: d.state, 
          person: d.person.trim(), 
          date: d.date, 
          note: d.note.trim() 
        }),
      });
      if (r.status === 403) return showLogin("Your session has expired. Sign in again.");
      if (!r.ok) throw new Error(await r.text());
      delete drafts[id];
      await refresh();
      toast(d.state === "use" ? `${name} is now busy (used by ${d.person.trim()}).` : `${name} is now ${LABELS[d.state].toLowerCase()}.`);
    } catch (_) {
      btn.disabled = false;
      btn.textContent = "Save";
      toast(`${name} could not be saved. Check the server and try again.`, true);
    }
  }

  $("#resetAll").onclick = () => { $("#confirm").hidden = false; $("#confirmNo").focus(); };
  $("#confirmNo").onclick = () => { $("#confirm").hidden = true; };
  $("#confirmYes").onclick = async () => {
    $("#confirm").hidden = true;
    const r = await api("/api/admin/reset", { method: "POST" }).catch(() => null);
    if (r && r.status === 403) return showLogin("Your session has expired. Sign in again.");
    if (!r || !r.ok) return toast("Could not reset the status.", true);
    Object.keys(drafts).forEach((k) => delete drafts[k]);
    await refresh();
    toast("All robots are now free.");
  };

  // keep "since" and other admins' changes fresh, without touching unsaved edits
  setInterval(() => { if (!$("#panel").hidden && !Object.keys(drafts).some(isDirty)) refresh(); }, 10000);

  // Development mode: the server does not check the token, so skip sign-in
  fetch("/api/config", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}))
    .then((cfg) => {
      if (cfg.devMode) {
        $("#devBanner").hidden = false;
        $("#logout").remove();
        tryLogin("");
      } else {
        token ? tryLogin(token) : showLogin("");
      }
    });
})();