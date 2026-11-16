/* Shared presentation and server-confirmed editing for dashboard and admin. */
window.Lab = (() => {
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[char]));
  const labels = {free:"Free", use:"Busy", occ:"Occupied", unknown:"Review required"};
  const state = device => device.migrationPending ? "unknown" : device.status.state;
  const pill = device => `<span class="pill ${state(device)}"><i></i>${labels[state(device)]}</span>`;
  const option = (value, label, selected) => `<option value="${esc(value)}"${String(value) === String(selected) ? " selected" : ""}>${esc(label)}</option>`;
  const date = value => /^\d{4}-\d{2}-\d{2}$/.test(value || "") ? value.split("-").reverse().join(".") : value || "";
  function ago(ms) {
    if (!ms) return "—";
    const minutes = Math.max(0, Math.floor((Date.now() - ms) / 60000));
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    return hours < 24 ? `${hours} h ago` : `${Math.floor(hours / 24)} d ago`;
  }
  async function request(path, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(path, {...options, cache:"no-store", signal:controller.signal,
        headers:{"Content-Type":"application/json", ...(options.headers || {})}});
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(data.error || `The request failed (${response.status}).`);
        error.status = response.status;
        throw error;
      }
      return data;
    } catch (error) {
      if (error.status) throw error;
      throw new Error("The server is not reachable. Your changes have not been confirmed. Reload the current status before trying again.");
    } finally { clearTimeout(timeout); }
  }
  function field(name, label, value = "", attributes = "") {
    return `<label class="field">${esc(label)}<input name="${esc(name)}" value="${esc(value)}" ${attributes}></label>`;
  }
  function select(name, label, options, attributes = "") {
    return `<label class="field">${esc(label)}<select name="${esc(name)}" ${attributes}>${options}</select></label>`;
  }
  function modal(title, subtitle, fields, submit, options = {}) {
    const host = document.querySelector("#dlgHost");
    const previousFocus = document.activeElement;
    host.innerHTML = `<dialog class="dlg modal" aria-labelledby="modalTitle"><form id="modalForm">
      <h2 id="modalTitle">${esc(title)}</h2><p class="sub">${esc(subtitle)}</p>
      <div class="form-fields">${fields}</div>
      <p class="err" role="alert" hidden></p>
      <div class="actions"><button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="submit">${esc(options.saveLabel || "Save")}</button></div>
    </form></dialog>`;
    const dialog = host.querySelector("dialog"), form = host.querySelector("form");
    let saving = false;
    const close = () => { if (!saving) dialog.close(); };
    dialog.addEventListener("cancel", event => { if (saving) event.preventDefault(); });
    form.querySelector("[data-close]").onclick = close;
    dialog.addEventListener("click", event => {
      const rect = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) close();
    });
    dialog.addEventListener("close", () => { host.innerHTML = ""; previousFocus?.focus(); options.onClose?.(); }, {once:true});
    form.onsubmit = async event => {
      event.preventDefault();
      const button = form.querySelector('[type="submit"]'), errorBox = form.querySelector(".err");
      if (saving) return;
      saving = true;
      button.disabled = true;
      form.querySelector("[data-close]").disabled = true;
      errorBox.hidden = true;
      try {
        await submit(Object.fromEntries(new FormData(form)), form);
        saving = false;
        close();
      } catch (error) {
        saving = false;
        form.querySelector("[data-close]").disabled = false;
        errorBox.textContent = error.message;
        errorBox.hidden = false;
        if (error.status === 409) {
          errorBox.textContent += " Close this dialog and reopen the current record to continue.";
          options.onConflict?.();
        } else button.disabled = false;
      }
    };
    dialog.showModal();
    return form;
  }
  function personOptions(people, selected, blank = "Select a person…") {
    const counts = people.reduce((all, person) => { all[person.name] = (all[person.name] || 0) + 1; return all; }, {});
    return option("", blank, selected) + people.map(person => option(person.id,
      `${person.name}${counts[person.name] > 1 ? ` · ${person.role} · ${person.id.slice(0, 6)}` : ""}`, selected)).join("");
  }
  function openUsage(device, model, options) {
    const status = device.status, admin = !!options.admin;
    let selectedState = admin ? status.state : status.state === "free" ? "use" : "free";
    const users = (options.people || []).filter(person => person.active);
    const staff = options.staff || users.filter(person => person.role === "staff");
    const fields = `${status.needsReview ? `<p class="note-bar">Imported assignment: ${esc(status.legacyPerson || "person not yet assigned")}. Select the current user or release this device.</p>` : ""}
      ${admin ? `<div class="choices">${["free", "use", "occ"].map(key => `<button class="choice ${key}" type="button" data-state="${key}" aria-pressed="${key === selectedState}">${labels[key]}</button>`).join("")}</div>` : `<p>${selectedState === "use" ? "Book this device for your current session." : "Release this device and clear its current assignment."}</p>`}
      <div data-user>${admin ? select("usedById", "Student / person using this device", personOptions(users, status.usedById) + option("__new", "+ Register a new student…", "")) : ""}
        <div data-new-user>${field("usedByName", admin ? "New student's name" : "Your name (student)", "", 'maxlength="120" autocomplete="name"')}</div>
      </div>
      <div data-details>${select("responsibleId", "Responsible staff member", personOptions(staff, status.responsibleId, "Optional for personal use"))}
        ${field("date", "Until (optional)", status.date, 'type="date"')}
        ${field("note", "Project / note", status.note, 'maxlength="240"')}
      </div>`;
    const form = modal(device.inventoryId, model.name, fields, async (values, currentForm) => {
      const payload = {state:selectedState, version:status.version, instanceVersion:device.version,
        usedById:admin && values.usedById !== "__new" ? values.usedById : "",
        usedByName:values.usedByName, responsibleId:values.responsibleId,
        date:values.date, note:values.note};
      if (selectedState === "use" && !payload.usedById && !payload.usedByName.trim()) throw new Error("Enter the student's name or select a person from the register.");
      if (selectedState === "occ" && (!payload.responsibleId || !payload.note.trim())) throw new Error("Select the responsible staff member and enter a reason.");
      await options.save(device.id, payload);
      await options.onSaved();
    }, {saveLabel:admin ? "Save" : selectedState === "use" ? "Book device" : "Release device", onConflict:options.onConflict, onClose:options.onClose});
    const sync = () => {
      form.querySelectorAll("[data-state]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.state === selectedState)));
      form.querySelector("[data-user]").hidden = selectedState !== "use";
      form.querySelector("[data-details]").hidden = selectedState === "free";
      const newUser = !admin || form.elements.usedById.value === "__new";
      form.querySelector("[data-new-user]").hidden = !newUser;
      form.elements.usedByName.required = selectedState === "use" && newUser;
      if (admin) form.elements.usedById.required = selectedState === "use" && !newUser;
      form.elements.responsibleId.required = selectedState === "occ";
      form.elements.note.required = selectedState === "occ";
    };
    form.querySelectorAll("[data-state]").forEach(button => button.onclick = () => { selectedState = button.dataset.state; sync(); });
    if (admin) form.elements.usedById.onchange = sync;
    sync();
  }
  return {esc, labels, state, pill, option, date, ago, request, field, select, modal, personOptions, openUsage};
})();
