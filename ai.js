// Claude-powered actions: Schedule, Create more content, Edit content, Create posters.
(() => {
  "use strict";
  const VC = window.VC;
  const { esc } = VC;
  const $ = (s, r = document) => r.querySelector(s);

  async function ask(task, prompt) {
    let r;
    try {
      r = await fetch("/api/claude", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ task, prompt }) });
    } catch { throw new Error("Could not reach the server. Claude works on the deployed site (not when opening the file directly)."); }
    let j = {};
    try { j = await r.json(); } catch {}
    if (!r.ok) throw new Error(j.error || "Claude request failed (" + r.status + ")");
    const m = j.text.match(/[\[{][\s\S]*[\]}]/);
    if (!m) throw new Error("Claude replied in an unexpected format. Try again.");
    try { return JSON.parse(m[0]); } catch { throw new Error("Claude replied in an unexpected format. Try again."); }
  }

  function busy(btn, on) { btn.disabled = on; btn.dataset.t = btn.dataset.t || btn.textContent; btn.textContent = on ? "Claude is working…" : btn.dataset.t; }
  const out = (html) => ($("#aiOut").innerHTML = html);
  const err = (e) => out(`<p class="err">${esc(e.message)}</p>`);

  // ---------- panels ----------
  const panels = {
    schedule() {
      const un = VC.db().content.filter((c) => c.status !== "Published");
      return `<h2>Schedule</h2><p class="muted">Claude spreads your unpublished content across the coming weeks. You review before anything changes.</p>
      <label class="fl">Extra instructions (optional)<input id="aiNote" placeholder="e.g. 4 posts a week, nothing on Sundays"></label>
      <button class="btn primary" id="aiGo">Suggest schedule for ${un.length} items</button>`;
    },
    create() {
      return `<h2>Create more content</h2><p class="muted">Tell Claude the topic. New ideas are added to your pipeline as “Idea”.</p>
      <label class="fl">Topic or goal<input id="aiTopic" placeholder="e.g. tips for restaurants getting online orders"></label>
      <div class="grid2"><label class="fl">How many<select id="aiN"><option>3</option><option selected>5</option><option>8</option></select></label>
      <label class="fl">Platform<select id="aiPlat"><option value="">Mix</option>${PLATFORMS.map((p) => `<option>${p}</option>`).join("")}</select></label></div>
      <button class="btn primary" id="aiGo">Generate ideas</button>`;
    },
    edit() {
      const c = VC.db().content;
      return `<h2>Edit content</h2><p class="muted">Pick an item and say what to change. Claude rewrites it; you approve.</p>
      <label class="fl">Content<select id="aiItem">${c.map((x) => `<option value="${x.id}">${esc(x.title)} (${x.platform})</option>`).join("")}</select></label>
      <label class="fl">What should change?<input id="aiInstr" placeholder="e.g. make it shorter and add a call to action"></label>
      <button class="btn primary" id="aiGo">Rewrite with Claude</button>`;
    },
    poster() {
      return `<h2>Create posters</h2><p class="muted">Claude writes the poster copy. The poster is built with your official vcreate logo — Claude never draws the logo.</p>
      <label class="fl">What is the poster for?<input id="aiBrief" placeholder="e.g. festival offer: starter website pack"></label>
      <button class="btn primary" id="aiGo">Create poster</button>`;
    },
  };

  const handlers = {
    async schedule(btn) {
      const db = VC.db();
      const items = db.content.filter((c) => c.status !== "Published").map((c) => ({ id: c.id, title: c.title, platform: c.platform, type: c.status === "Scheduled" ? c.type + " (already scheduled)" : c.type, current: c.date || null }));
      if (!items.length) return out(`<p class="muted">Nothing to schedule.</p>`);
      const res = await ask("schedule", `Today is ${new Date().toISOString().slice(0, 10)}. Extra instructions: ${$("#aiNote").value || "none"}.\nItems: ${JSON.stringify(items)}`);
      const rows = res.filter((r) => db.content.some((c) => c.id === r.id) && /^\d{4}-\d{2}-\d{2}$/.test(r.date));
      out(`<h3>Proposed schedule</h3>${rows.map((r) => { const c = db.content.find((x) => x.id === r.id); return `<div class="row"><span>${esc(c.title)}<br><small class="muted">${esc(r.reason || "")}</small></span><b>${r.date}</b></div>`; }).join("")}
      <button class="btn primary" id="aiApply">Apply this schedule</button>`);
      $("#aiApply").onclick = () => {
        rows.forEach((r) => { const c = VC.db().content.find((x) => x.id === r.id); if (c) { c.date = r.date; if (c.status === "Approved") c.status = "Scheduled"; } });
        VC.save(); VC.toast("Schedule applied"); location.hash = "#/calendar";
      };
    },
    async create(btn) {
      const topic = $("#aiTopic").value.trim();
      if (!topic) return out(`<p class="err">Enter a topic first.</p>`);
      const plat = $("#aiPlat").value;
      const res = await ask("create", `Create ${$("#aiN").value} content ideas about: ${topic}. ${plat ? "Platform: " + plat + "." : "Mix platforms."}`);
      const items = res.slice(0, 10);
      out(`<h3>Ideas</h3>${items.map((i) => `<div class="idea"><b>${esc(i.title)}</b> <span class="muted">${esc(i.platform)} · ${esc(i.type)}</span><p>${esc(i.caption)}</p></div>`).join("")}<button class="btn primary" id="aiApply">Add all to pipeline</button>`);
      $("#aiApply").onclick = () => {
        const db = VC.db();
        items.forEach((i) => db.content.unshift({ id: VC.uid(), title: String(i.title).slice(0, 140), type: TYPES.includes(i.type) ? i.type : "Post", platform: PLATFORMS.includes(i.platform) ? i.platform : "Instagram", status: "Idea", campaign: "", date: "", owner: "", caption: String(i.caption || ""), notes: String(i.notes || "") }));
        VC.save(); VC.toast(items.length + " ideas added"); location.hash = "#/content";
      };
    },
    async edit(btn) {
      const db = VC.db();
      const c = db.content.find((x) => x.id === $("#aiItem").value);
      const instr = $("#aiInstr").value.trim();
      if (!c || !instr) return out(`<p class="err">Pick an item and describe the change.</p>`);
      const r = await ask("edit", `Instruction: ${instr}\nCurrent item: ${JSON.stringify({ title: c.title, caption: c.caption, notes: c.notes, platform: c.platform, type: c.type })}`);
      out(`<h3>Suggested edit</h3><div class="cmp"><div><small class="muted">Before</small><p><b>${esc(c.title)}</b></p><p>${esc(c.caption)}</p></div><div><small class="muted">After</small><p><b>${esc(r.title)}</b></p><p>${esc(r.caption)}</p></div></div><button class="btn primary" id="aiApply">Use this version</button>`);
      $("#aiApply").onclick = () => { c.title = String(r.title || c.title).slice(0, 140); c.caption = String(r.caption ?? c.caption); c.notes = String(r.notes ?? c.notes); VC.save(); VC.toast("Content updated"); location.hash = "#/content"; };
    },
    async poster(btn) {
      const brief = $("#aiBrief").value.trim();
      if (!brief) return out(`<p class="err">Describe the poster first.</p>`);
      const p = await ask("poster", `Poster brief: ${brief}`);
      out(`<h3>Poster</h3><canvas id="pc" width="1080" height="1350" class="poster"></canvas>
      <div class="actions" style="justify-content:flex-start;gap:8px;margin-top:10px"><button class="btn primary" id="dl">Download PNG</button><button class="btn" id="saveP">Save to pipeline</button></div>`);
      await drawPoster($("#pc"), p);
      $("#dl").onclick = () => { const a = document.createElement("a"); a.href = $("#pc").toDataURL("image/png"); a.download = "vcreate-poster.png"; a.click(); };
      $("#saveP").onclick = () => { const db = VC.db(); db.content.unshift({ id: VC.uid(), title: String(p.headline).slice(0, 140), type: "Poster", platform: "Instagram", status: "Design", campaign: "", date: "", owner: "", caption: String(p.caption || ""), notes: "Poster generated in Studio: " + p.subline }); VC.save(); VC.toast("Saved to pipeline"); };
    },
  };

  // ---------- poster renderer (official logo file, never AI-drawn) ----------
  const THEMES = {
    dark: { bg: "#0f0f0f", fg: "#ffffff", sub: "#cbd5e1", accent: "#6366f1", logo: "assets/vcreate-logo-white.svg" },
    light: { bg: "#ffffff", fg: "#0f172a", sub: "#475569", accent: "#6366f1", logo: "assets/vcreate-logo-black.svg" },
    indigo: { bg: "#4f46e5", fg: "#ffffff", sub: "#e0e7ff", accent: "#ffffff", logo: "assets/vcreate-logo-white.svg" },
  };
  function wrap(ctx, text, maxW) {
    const words = String(text).split(/\s+/), lines = []; let line = "";
    for (const w of words) { const t = line ? line + " " + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
    if (line) lines.push(line); return lines;
  }
  function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }
  async function drawPoster(cv, p) {
    const t = THEMES[p.theme] || THEMES.dark, ctx = cv.getContext("2d"), W = cv.width, H = cv.height, M = 90;
    ctx.fillStyle = t.bg; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W * 0.85, H * 0.1, 0, W * 0.85, H * 0.1, 700); g.addColorStop(0, t.accent + "55"); g.addColorStop(1, "transparent"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    try { const img = await loadImg(t.logo); const lw = 320, lh = lw * (img.naturalHeight / img.naturalWidth || 0.213); ctx.drawImage(img, M, M, lw, lh); } catch {}
    ctx.fillStyle = t.accent; ctx.fillRect(M, 430, 90, 10);
    ctx.fillStyle = t.fg; ctx.font = "800 104px Inter, Arial, sans-serif"; ctx.textBaseline = "top";
    let y = 480; for (const l of wrap(ctx, p.headline, W - 2 * M).slice(0, 5)) { ctx.fillText(l, M, y); y += 120; }
    ctx.fillStyle = t.sub; ctx.font = "400 44px Inter, Arial, sans-serif"; y += 24;
    for (const l of wrap(ctx, p.subline, W - 2 * M).slice(0, 4)) { ctx.fillText(l, M, y); y += 62; }
    ctx.font = "700 42px Inter, Arial, sans-serif"; const cw = ctx.measureText(p.cta).width + 80;
    ctx.fillStyle = t.accent; ctx.beginPath(); ctx.roundRect(M, H - 270, cw, 96, 48); ctx.fill();
    ctx.fillStyle = t.accent === "#ffffff" ? "#4f46e5" : "#fff"; ctx.fillText(p.cta, M + 40, H - 270 + 28);
    ctx.fillStyle = t.sub; ctx.font = "500 32px Inter, Arial, sans-serif"; ctx.fillText("@vcreatewebsites", M, H - 110);
    // V, the vcreate character, appears on every poster
    try { const v = await loadImg("assets/v/v-face.png"); const vw = 400, vh = vw * (v.naturalHeight / v.naturalWidth); ctx.drawImage(v, W - vw - 30, H - vh, vw, vh); } catch {}
  }

  // ---------- home view ----------
  const CARDS = [["schedule", "📅", "Schedule", "Plan when everything goes out"], ["create", "✨", "Create more content", "Fresh ideas for your pipeline"], ["edit", "✏️", "Edit content", "Rewrite captions and titles"], ["poster", "🖼️", "Create posters", "On-brand poster, ready to download"]];
  window.VCAI = {
    drawPoster,
    render() {
      return `<h1>What do you want Claude to do?</h1>
      <div class="cards ai-cards">${CARDS.map(([k, i, t, d]) => `<button class="card ai-card" data-ai="${k}"><span class="ai-i">${i}</span><b>${t}</b><small class="muted">${d}</small></button>`).join("")}</div>
      <section class="card" id="aiPanel" hidden></section><section class="card" id="aiOut" hidden></section>`;
    },
    bind() {
      let cur = "";
      document.querySelectorAll("[data-ai]").forEach((b) => (b.onclick = () => {
        cur = b.dataset.ai;
        document.querySelectorAll("[data-ai]").forEach((x) => x.classList.toggle("on", x === b));
        const p = $("#aiPanel"); p.hidden = false; p.innerHTML = panels[cur](); $("#aiOut").hidden = true; $("#aiOut").innerHTML = "";
        $("#aiGo").onclick = async (e) => {
          const btn = e.currentTarget; busy(btn, true); $("#aiOut").hidden = false; out(`<p class="muted">Working…</p>`);
          try { await handlers[cur](btn); } catch (x) { err(x); } finally { busy(btn, false); }
        };
        p.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }));
    },
  };
})();
