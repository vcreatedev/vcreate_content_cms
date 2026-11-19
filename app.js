(() => {
  "use strict";
  const KEY = "vcreate-studio-v1";
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const uid = () => "x" + Math.random().toString(36).slice(2, 9);
  const today = () => new Date().toISOString().slice(0, 10);

  // ---------- state ----------
  let db;
  try { db = JSON.parse(localStorage.getItem(KEY)); } catch { db = null; }
  if (!db || !db.content) db = JSON.parse(JSON.stringify(window.SEED));
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {} };
  save();

  const campName = (id) => (db.campaigns.find((c) => c.id === id) || {}).name || "—";
  const memberName = (id) => (db.team.find((t) => t.id === id) || {}).name || "Unassigned";
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const badge = (s) => `<span class="badge s-${slug(s)}">${esc(s)}</span>`;
  const fmt = (d) => (d ? new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "Unscheduled");

  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg; t.hidden = false;
    clearTimeout(toast.h); toast.h = setTimeout(() => (t.hidden = true), 2400);
  }

  // ---------- routing ----------
  const ROUTES = [
    ["dashboard", "Dashboard"], ["content", "Content"], ["pipeline", "Pipeline"],
    ["calendar", "Calendar"], ["campaigns", "Campaigns"], ["team", "Team"], ["analytics", "Analytics"],
  ];
  let query = "";
  function route() {
    const name = (location.hash.replace("#/", "") || "dashboard").split("?")[0];
    const r = ROUTES.find((x) => x[0] === name) ? name : "dashboard";
    $("#nav").innerHTML = ROUTES.map(([k, l]) => `<a href="#/${k}" class="${k === r ? "on" : ""}">${l}</a>`).join("");
    $("#sidebar").classList.remove("open");
    $("#view").innerHTML = views[r]();
    bind(r);
    document.title = `${ROUTES.find((x) => x[0] === r)[1]} · vcreate Studio`;
  }
  const match = (c) => !query || (c.title + " " + c.caption + " " + c.platform + " " + campName(c.campaign)).toLowerCase().includes(query);

  // ---------- views ----------
  const views = {
    dashboard() {
      const c = db.content;
      const by = (s) => c.filter((x) => x.status === s).length;
      const upcoming = c.filter((x) => x.date >= today() && x.status !== "Published").sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);
      const review = c.filter((x) => x.status === "Review");
      return `<h1>Dashboard</h1>
      <div class="cards">
        <div class="card stat"><b>${c.length}</b><span>Total content</span></div>
        <div class="card stat"><b>${c.filter((x) => !["Published", "Scheduled", "Approved"].includes(x.status)).length}</b><span>In production</span></div>
        <div class="card stat"><b>${review.length}</b><span>Awaiting review</span></div>
        <div class="card stat"><b>${by("Scheduled") + by("Approved")}</b><span>Ready to go</span></div>
        <div class="card stat"><b>${by("Published")}</b><span>Published</span></div>
      </div>
      <div class="two">
        <section class="card"><h2>Upcoming schedule</h2>${upcoming.length ? upcoming.map(row).join("") : `<p class="muted">Nothing scheduled.</p>`}</section>
        <section class="card"><h2>Needs review</h2>${review.length ? review.map(row).join("") : `<p class="muted">No items waiting.</p>`}
          <h2 style="margin-top:20px">Pipeline</h2>${STAGES.map((s) => `<div class="bar"><span>${s}</span><i style="width:${c.length ? (by(s) / c.length) * 100 : 0}%"></i><em>${by(s)}</em></div>`).join("")}
        </section>
      </div>`;
    },
    content() {
      const f = JSON.parse(sessionStorage.getItem("filters") || "{}");
      let list = db.content.filter(match);
      if (f.status) list = list.filter((x) => x.status === f.status);
      if (f.platform) list = list.filter((x) => x.platform === f.platform);
      const opt = (arr, v, label) => `<option value="">${label}</option>` + arr.map((a) => `<option ${a === v ? "selected" : ""}>${a}</option>`).join("");
      return `<div class="head"><h1>Content</h1></div>
      <div class="filters"><select data-f="status">${opt(STAGES, f.status, "All statuses")}</select><select data-f="platform">${opt(PLATFORMS, f.platform, "All platforms")}</select></div>
      <section class="card table-wrap"><table><thead><tr><th>Title</th><th>Platform</th><th>Type</th><th>Status</th><th>Campaign</th><th>Date</th><th></th></tr></thead><tbody>
      ${list.map((x) => `<tr><td><a href="#" data-edit="${x.id}">${esc(x.title)}</a></td><td>${x.platform}</td><td>${x.type}</td><td>${badge(x.status)}</td><td>${esc(campName(x.campaign))}</td><td>${fmt(x.date)}</td><td><button class="icon-btn" data-del="${x.id}" aria-label="Delete">🗑</button></td></tr>`).join("") || `<tr><td colspan="7" class="muted">No content found.</td></tr>`}
      </tbody></table></section>`;
    },
    pipeline() {
      return `<h1>Pipeline</h1><p class="muted">Drag a card to move it to another stage.</p>
      <div class="kanban">${STAGES.map((s) => `<div class="col" data-stage="${s}"><h3>${s} <em>${db.content.filter((x) => x.status === s && match(x)).length}</em></h3>
      ${db.content.filter((x) => x.status === s && match(x)).map((x) => `<div class="kcard" draggable="true" data-id="${x.id}" data-edit="${x.id}"><b>${esc(x.title)}</b><small>${x.platform} · ${x.type}</small></div>`).join("")}</div>`).join("")}</div>`;
    },
    calendar() {
      const m = +(sessionStorage.getItem("cal") || 0);
      const base = new Date(); base.setDate(1); base.setMonth(base.getMonth() + m);
      const y = base.getFullYear(), mo = base.getMonth();
      const first = (new Date(y, mo, 1).getDay() + 6) % 7; // Monday start
      const days = new Date(y, mo + 1, 0).getDate();
      let cells = "";
      for (let i = 0; i < first; i++) cells += `<div class="day empty"></div>`;
      for (let d = 1; d <= days; d++) {
        const ds = `${y}-${String(mo + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const items = db.content.filter((x) => x.date === ds && match(x));
        cells += `<div class="day ${ds === today() ? "today" : ""}" data-date="${ds}"><span>${d}</span>${items.map((x) => `<a href="#" class="chip s-${slug(x.status)}" data-edit="${x.id}">${esc(x.title)}</a>`).join("")}</div>`;
      }
      return `<div class="head"><h1>Calendar</h1><div><button class="btn ghost small" data-cal="-1">‹</button> <b>${base.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</b> <button class="btn ghost small" data-cal="1">›</button></div></div>
      <div class="cal"><div class="dow">${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => `<span>${d}</span>`).join("")}</div><div class="grid">${cells}</div></div>
      <p class="muted">Click an empty day to create content for that date.</p>`;
    },
    campaigns() {
      return `<div class="head"><h1>Campaigns</h1><button class="btn primary" data-newcamp>+ New campaign</button></div>
      <div class="cards">${db.campaigns.map((c) => {
        const items = db.content.filter((x) => x.campaign === c.id);
        const done = items.filter((x) => x.status === "Published").length;
        return `<div class="card"><div class="head"><h2>${esc(c.name)}</h2>${badge(c.status)}</div><p class="muted">${esc(c.goal)}</p><p>${fmt(c.start)} – ${fmt(c.end)}</p>
        <div class="bar"><span>${done}/${items.length} published</span><i style="width:${items.length ? (done / items.length) * 100 : 0}%"></i></div>
        <button class="btn ghost small" data-delcamp="${c.id}">Delete</button></div>`;
      }).join("")}</div>`;
    },
    team() {
      return `<div class="head"><h1>Team</h1><button class="btn primary" data-newmember>+ Add member</button></div>
      <section class="card table-wrap"><table><thead><tr><th>Name</th><th>Role</th><th>Assigned</th><th></th></tr></thead><tbody>
      ${db.team.map((t) => `<tr><td>${esc(t.name)}</td><td>${esc(t.role)}</td><td>${db.content.filter((x) => x.owner === t.id && x.status !== "Published").length} open</td><td><button class="icon-btn" data-delmember="${t.id}" aria-label="Remove">🗑</button></td></tr>`).join("")}
      </tbody></table></section>`;
    },
    analytics() {
      const pub = db.content.filter((x) => x.status === "Published");
      const sum = (k) => pub.reduce((a, x) => a + ((x.stats || {})[k] || 0), 0);
      const perPlat = PLATFORMS.map((p) => [p, db.content.filter((x) => x.platform === p).length]);
      const max = Math.max(1, ...perPlat.map((p) => p[1]));
      return `<h1>Analytics</h1>
      <div class="cards"><div class="card stat"><b>${sum("views")}</b><span>Views</span></div><div class="card stat"><b>${sum("likes")}</b><span>Likes</span></div><div class="card stat"><b>${sum("shares")}</b><span>Shares</span></div></div>
      <section class="card"><h2>Content by platform</h2>${perPlat.map(([p, n]) => `<div class="bar"><span>${p}</span><i style="width:${(n / max) * 100}%"></i><em>${n}</em></div>`).join("")}</section>
      <section class="card"><h2>Published content</h2>${pub.map((x) => `<div class="row"><a href="#" data-edit="${x.id}">${esc(x.title)}</a><span class="muted">${(x.stats || {}).views || 0} views</span></div>`).join("") || `<p class="muted">Nothing published yet.</p>`}
      <p class="muted">Live numbers from Instagram/Facebook/YouTube arrive when publishing APIs are connected (next phase). Enter stats by editing a published item.</p></section>`;
    },
  };
  function row(x) { return `<div class="row"><a href="#" data-edit="${x.id}">${esc(x.title)}</a><span>${x.platform} · ${fmt(x.date)} ${badge(x.status)}</span></div>`; }

  // ---------- modal / forms ----------
  function modal(html) {
    const m = $("#modal");
    m.innerHTML = `<div class="sheet"><button class="icon-btn close" aria-label="Close">✕</button>${html}</div>`;
    m.hidden = false;
    m.onclick = (e) => { if (e.target === m || e.target.closest(".close")) closeModal(); };
    return m;
  }
  const closeModal = () => { $("#modal").hidden = true; $("#modal").innerHTML = ""; };
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
  const sel = (name, arr, v) => `<select name="${name}">${arr.map((a) => `<option ${a === v ? "selected" : ""}>${a}</option>`).join("")}</select>`;

  function contentForm(item, preset = {}) {
    const x = item || { title: "", type: "Post", platform: "Instagram", status: "Idea", campaign: "", date: "", owner: "", caption: "", notes: "", ...preset };
    const m = modal(`<h2>${item ? "Edit content" : "New content"}</h2>
    <form id="cf" class="form">
      <label>Title<input name="title" required value="${esc(x.title)}"></label>
      <div class="grid2"><label>Platform${sel("platform", PLATFORMS, x.platform)}</label><label>Type${sel("type", TYPES, x.type)}</label></div>
      <div class="grid2"><label>Status${sel("status", STAGES, x.status)}</label><label>Publish date<input type="date" name="date" value="${esc(x.date)}"></label></div>
      <div class="grid2"><label>Campaign<select name="campaign"><option value="">None</option>${db.campaigns.map((c) => `<option value="${c.id}" ${c.id === x.campaign ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label>
      <label>Owner<select name="owner"><option value="">Unassigned</option>${db.team.map((t) => `<option value="${t.id}" ${t.id === x.owner ? "selected" : ""}>${esc(t.name)}</option>`).join("")}</select></label></div>
      <label>Caption<textarea name="caption" rows="3">${esc(x.caption)}</textarea></label>
      <label>Notes<textarea name="notes" rows="2">${esc(x.notes)}</textarea></label>
      ${x.status === "Published" ? `<div class="grid2"><label>Views<input type="number" min="0" name="views" value="${(x.stats || {}).views || 0}"></label><label>Likes<input type="number" min="0" name="likes" value="${(x.stats || {}).likes || 0}"></label></div>` : ""}
      <div class="actions"><button class="btn primary" type="submit">Save</button></div>
    </form>`);
    $("#cf", m).onsubmit = (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      const rec = { ...x, ...f, id: x.id || uid() };
      if (x.status === "Published" || f.status === "Published") rec.stats = { ...(x.stats || {}), views: +f.views || (x.stats || {}).views || 0, likes: +f.likes || (x.stats || {}).likes || 0 };
      delete rec.views; delete rec.likes;
      if (item) db.content = db.content.map((c) => (c.id === item.id ? rec : c)); else db.content.unshift(rec);
      save(); closeModal(); route(); toast("Saved");
    };
  }

  function simpleForm(title, fields, onSave) {
    const m = modal(`<h2>${title}</h2><form id="sf" class="form">${fields.map(([n, l, t = "text", opts]) => `<label>${l}${opts ? sel(n, opts, "") : `<input name="${n}" type="${t}" required>`}</label>`).join("")}<div class="actions"><button class="btn primary">Save</button></div></form>`);
    $("#sf", m).onsubmit = (e) => { e.preventDefault(); onSave(Object.fromEntries(new FormData(e.target))); save(); closeModal(); route(); toast("Saved"); };
  }

  // ---------- events ----------
  function bind(r) {
    const v = $("#view");
    v.querySelectorAll("select[data-f]").forEach((s) => (s.onchange = () => {
      const f = JSON.parse(sessionStorage.getItem("filters") || "{}"); f[s.dataset.f] = s.value;
      sessionStorage.setItem("filters", JSON.stringify(f)); route();
    }));
    v.querySelectorAll("[data-cal]").forEach((b) => (b.onclick = () => { sessionStorage.setItem("cal", +(sessionStorage.getItem("cal") || 0) + +b.dataset.cal); route(); }));
    v.querySelectorAll(".day[data-date]").forEach((d) => (d.onclick = (e) => { if (!e.target.closest("a")) contentForm(null, { date: d.dataset.date, status: "Planning" }); }));
    v.querySelectorAll("[data-del]").forEach((b) => (b.onclick = () => { if (confirm("Delete this content?")) { db.content = db.content.filter((c) => c.id !== b.dataset.del); save(); route(); toast("Deleted"); } }));
    v.querySelectorAll("[data-newcamp]").forEach((b) => (b.onclick = () => simpleForm("New campaign", [["name", "Name"], ["goal", "Goal"], ["start", "Start", "date"], ["end", "End", "date"]], (f) => db.campaigns.push({ id: uid(), status: "Planned", ...f }))));
    v.querySelectorAll("[data-delcamp]").forEach((b) => (b.onclick = () => { if (confirm("Delete this campaign? Content stays, unlinked.")) { db.campaigns = db.campaigns.filter((c) => c.id !== b.dataset.delcamp); db.content.forEach((c) => { if (c.campaign === b.dataset.delcamp) c.campaign = ""; }); save(); route(); } }));
    v.querySelectorAll("[data-newmember]").forEach((b) => (b.onclick = () => simpleForm("Add team member", [["name", "Name"], ["role", "Role", "text", ["Owner", "Designer", "Video Editor", "Copywriter", "Manager", "Client"]]], (f) => db.team.push({ id: uid(), ...f }))));
    v.querySelectorAll("[data-delmember]").forEach((b) => (b.onclick = () => { if (confirm("Remove this member?")) { db.team = db.team.filter((t) => t.id !== b.dataset.delmember); db.content.forEach((c) => { if (c.owner === b.dataset.delmember) c.owner = ""; }); save(); route(); } }));
    if (r === "pipeline") {
      v.querySelectorAll(".kcard").forEach((k) => (k.ondragstart = (e) => e.dataTransfer.setData("text/plain", k.dataset.id)));
      v.querySelectorAll(".col").forEach((c) => {
        c.ondragover = (e) => { e.preventDefault(); c.classList.add("over"); };
        c.ondragleave = () => c.classList.remove("over");
        c.ondrop = (e) => { e.preventDefault(); const it = db.content.find((x) => x.id === e.dataTransfer.getData("text/plain")); if (it) { it.status = c.dataset.stage; save(); route(); toast(`Moved to ${it.status}`); } };
      });
    }
  }
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-edit]");
    if (a) { e.preventDefault(); const it = db.content.find((x) => x.id === a.dataset.edit); if (it) contentForm(it); }
  });
  $("#newBtn").onclick = () => contentForm(null);
  $("#menuBtn").onclick = () => $("#sidebar").classList.toggle("open");
  $("#search").oninput = (e) => { query = e.target.value.trim().toLowerCase(); route(); };
  $("#exportBtn").onclick = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(db, null, 2)], { type: "application/json" }));
    a.download = `vcreate-studio-${today()}.json`; a.click();
  };
  $("#importFile").onchange = async (e) => {
    try { const j = JSON.parse(await e.target.files[0].text()); if (!j.content || !j.campaigns || !j.team) throw 0; db = j; save(); route(); toast("Imported"); } catch { toast("Invalid backup file"); }
  };
  window.addEventListener("hashchange", route);
  route();
})();
