/* Debate Timer – web port of https://github.com/Michaelihc/debate-timer */
(() => {
  "use strict";

  // ---------------------------------------------------------------------------
  // Defaults, i18n, storage
  // ---------------------------------------------------------------------------
  const STORAGE_KEY = "debate-timer-save";

  const DEFAULT_SAVE = {
    settings: {
      pro_colors: "#0000FF",
      con_colors: "#FF0000",
      time_warning: 30,
      time_prep: 300,
      time_free: 500,
      display_minutes: true,
      language: "en",
    },
    title: "New Debate Title",
    pro_side: [
      { name: "Team 1 A", time: 240 },
      { name: "Team 1 B", time: 180 },
      { name: "Team 1 C", time: 180 },
      { name: "Team 1 D", time: 300 },
    ],
    con_side: [
      { name: "Team 2 A", time: 240 },
      { name: "Team 2 B", time: 180 },
      { name: "Team 2 C", time: 180 },
      { name: "Team 2 D", time: 300 },
    ],
    event_order: ["prep", 1, -1, 2, -2, 3, -3, 4, -4, "prep", "free"],
  };
  const DEFAULT_TEXT = JSON.stringify(DEFAULT_SAVE, null, 2);

  const I18N = {
    en: {
      menu: "Menu",
      reload: "Reload Scene",
      begin: "Begin",
      next: "Next",
      save: "Save",
      discard: "Discard",
      reset: "Reset",
      pause: "Pause",
      resume: "Resume",
      start: "Start",
      invert: "Invert",
      editSave: "Edit Save File",
      timeout: "Time ran out",
      prep: "Preparation Time",
      free: "Free Debate Time",
      ended: "Debate Ended",
      close: "Close",
      download: "Download",
      upload: "Upload",
      langBtn: "中文",
      invalidJson: "Invalid JSON: ",
      speakerTurn: (name) => `Speaker ${name}'s Turn`,
    },
    zh: {
      menu: "菜单",
      reload: "刷新",
      begin: "开始",
      next: "下一项",
      save: "保存",
      discard: "放弃更改",
      reset: "重置",
      pause: "暂停",
      resume: "继续",
      start: "开始",
      invert: "翻转",
      editSave: "编辑存档",
      timeout: "时间到",
      prep: "准备时间",
      free: "自由辩论",
      ended: "辩论结束",
      close: "关闭",
      download: "下载存档",
      upload: "导入存档",
      langBtn: "English",
      invalidJson: "JSON 格式错误：",
      speakerTurn: (name) => `辩手 ${name} 发言`,
    },
  };

  // Original Unity build: language 0 = Chinese (Simplified), 1 = English.
  function normalizeLang(v) {
    if (v === 0 || v === "0" || v === "zh" || v === "zh-Hans") return "zh";
    return "en";
  }

  function loadText() {
    const t = localStorage.getItem(STORAGE_KEY);
    if (t === null) {
      localStorage.setItem(STORAGE_KEY, DEFAULT_TEXT);
      return DEFAULT_TEXT;
    }
    return t;
  }
  function saveText(t) {
    localStorage.setItem(STORAGE_KEY, t);
  }

  function parseSave(text) {
    const raw = JSON.parse(text);
    const s = Object.assign({}, DEFAULT_SAVE.settings, raw.settings || {});
    const list = (arr) =>
      Array.isArray(arr)
        ? arr.map((p, i) => ({
            name: p && p.name != null ? String(p.name) : String(i + 1),
            time: Number(p && p.time) || 0,
          }))
        : [];
    return {
      settings: {
        pro_colors: String(s.pro_colors || "#0000FF"),
        con_colors: String(s.con_colors || "#FF0000"),
        time_warning: Number(s.time_warning) || 0,
        time_prep: Number(s.time_prep) || 0,
        time_free: Number(s.time_free) || 0,
        display_minutes: Boolean(s.display_minutes),
        language: normalizeLang(s.language),
      },
      title: raw.title != null ? String(raw.title) : "",
      pro_side: list(raw.pro_side),
      con_side: list(raw.con_side),
      event_order: Array.isArray(raw.event_order) ? raw.event_order : [],
    };
  }

  // ---------------------------------------------------------------------------
  // DOM helpers
  // ---------------------------------------------------------------------------
  const $ = (id) => document.getElementById(id);
  const show = (el, on) => el.classList.toggle("hidden", !on);

  const els = {
    title: $("title"),
    flash: $("flash"),
    proCol: $("pro-column"),
    conCol: $("con-column"),
    ringTimer: $("ring-timer"),
    doubleTimer: $("double-timer"),
    ringBg: $("ring-bg"),
    ringFg: $("ring-fg"),
    ringText: $("ring-text"),
    btnNext: $("btn-next"),
    timeline: $("timeline-buttons"),
    menuOverlay: $("menu-overlay"),
    endOverlay: $("end-overlay"),
    editor: $("editor"),
    editorError: $("editor-error"),
    btnLang: $("btn-lang"),
    fileInput: $("file-input"),
    audioWarning: $("audio-warning"),
    audioEnd: $("audio-end"),
  };
  const RING_CIRC = 2 * Math.PI * 44;

  function playSound(audio) {
    try {
      audio.currentTime = 0;
      const p = audio.play();
      if (p && p.catch) p.catch(() => {});
    } catch (_) {
      /* autoplay restrictions – ignore */
    }
  }

  function formatTime(seconds, displayMinutes) {
    const s = Math.max(0, seconds);
    if (!displayMinutes) return String(Math.floor(s));
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? "0" : ""}${sec}`;
  }

  // ---------------------------------------------------------------------------
  // Timer (mirrors TimerController.cs)
  // ---------------------------------------------------------------------------
  class Timer {
    constructor(ui) {
      this.ui = ui; // {fg, bg, text, start, pause, resume, out, reset, onRunningChange}
      this.total = 180;
      this.warningThreshold = 30;
      this.displayMinutes = true;
      this.remaining = 0;
      this.running = false;
      this.timedOut = false;
      this.warned = false;
      this.wire();
      this.reset();
    }

    wire() {
      const u = this.ui;
      u.start.addEventListener("click", () => this.start());
      u.pause.addEventListener("click", () => this.stop());
      u.resume.addEventListener("click", () => this.resume());
      u.reset.addEventListener("click", () => this.reset());
    }

    tick(dt) {
      if (!this.running) return;
      const before = this.remaining;
      this.remaining -= dt;
      if (this.remaining <= this.warningThreshold && before > this.warningThreshold) {
        this.warned = true;
        playSound(els.audioWarning);
        triggerFlash();
      }
      if (this.remaining <= 0) {
        this.remaining = 0;
        this.running = false;
        this.timedOut = true;
        playSound(els.audioEnd);
        this.syncButtons();
      }
    }

    start() {
      this.remaining = this.total;
      this.running = true;
      this.timedOut = false;
      this.syncButtons();
    }
    stop() {
      this.running = false;
      this.syncButtons();
    }
    resume() {
      if (this.timedOut) return;
      this.running = true;
      this.syncButtons();
    }
    reset() {
      this.remaining = this.total;
      this.running = false;
      this.timedOut = false;
      this.warned = this.total <= this.warningThreshold;
      this.syncButtons();
    }

    syncButtons() {
      const u = this.ui;
      const fresh = !this.running && !this.timedOut && this.remaining === this.total;
      show(u.start, fresh);
      show(u.pause, this.running);
      show(u.resume, !this.running && !this.timedOut && !fresh);
      show(u.out, this.timedOut);
      if (u.onRunningChange) u.onRunningChange(this.running);
    }

    render() {
      const u = this.ui;
      u.text.textContent = formatTime(this.remaining, this.displayMinutes);
      u.fg.classList.toggle("warning", this.warned);
      u.bg.classList.toggle("timeout", this.timedOut);
      const frac = this.total > 0 ? Math.min(1, Math.max(0, this.remaining / this.total)) : 0;
      u.paint(frac);
    }
  }

  // Ring timer UI
  const ringTimer = new Timer({
    fg: els.ringFg,
    bg: els.ringBg,
    text: els.ringText,
    start: $("ring-start"),
    pause: $("ring-pause"),
    resume: $("ring-resume"),
    out: $("ring-out"),
    reset: $("ring-reset"),
    paint: (frac) => {
      els.ringFg.style.strokeDashoffset = String(RING_CIRC * (1 - frac));
    },
  });

  // Bar timers UI
  function makeBarTimer(root) {
    const label = root.querySelector(".bar-label");
    const fg = root.querySelector(".bar-fg");
    return new Timer({
      fg,
      bg: root.querySelector(".bar-bg"),
      text: root.querySelector(".bar-text"),
      start: root.querySelector(".bar-start"),
      pause: root.querySelector(".bar-pause"),
      resume: root.querySelector(".bar-resume"),
      out: root.querySelector(".bar-out"),
      reset: root.querySelector(".bar-reset"),
      paint: (frac) => {
        fg.style.height = `${frac * 100}%`;
      },
      onRunningChange: (running) => label.classList.toggle("show", running),
    });
  }
  const barTimers = Array.from(els.doubleTimer.querySelectorAll(".bar-timer")).map(makeBarTimer);
  const [barPro, barCon] = barTimers;

  // InvertTimer.swap()
  $("btn-invert").addEventListener("click", () => {
    if (barPro.running && !barCon.running) {
      barPro.stop();
      barCon.resume();
    } else if (barCon.running && !barPro.running) {
      barCon.stop();
      barPro.resume();
    }
  });

  function triggerFlash() {
    els.flash.classList.remove("go");
    // force reflow so the animation restarts
    void els.flash.offsetWidth;
    els.flash.classList.add("go");
  }

  // ---------------------------------------------------------------------------
  // Debate state (mirrors MenuController.cs)
  // ---------------------------------------------------------------------------
  const state = {
    data: null,
    lang: "en",
    eventIndex: -1,
    currentSpeaker: null, // signed index: +n pro, -n con
    nextSpeaker: null,
    prepPhase: true,
    freePhase: false,
    speakers: { pro: [], con: [] },
    timelineButtons: [],
  };

  function t(key) {
    return I18N[state.lang][key];
  }

  function applyI18n() {
    document.documentElement.lang = state.lang === "zh" ? "zh-Hans" : "en";
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.dataset.i18n;
      const v = I18N[state.lang][key];
      if (typeof v === "string") el.textContent = v;
    });
    els.btnLang.textContent = t("langBtn");
    els.btnNext.textContent = state.eventIndex < 0 ? t("begin") : t("next");
    updateTitle();
  }

  function speakerIdAt(index) {
    const order = state.data.event_order;
    if (index < 0 || index >= order.length) return null;
    const v = Number(order[index]);
    return Number.isInteger(v) && v !== 0 ? v : null;
  }

  function updateTitle() {
    const d = state.data;
    const order = d.event_order;
    const i = state.eventIndex;
    if (i < 0 || i >= order.length) {
      els.title.textContent = d.title;
      return;
    }
    const ev = order[i];
    if (ev === "prep") els.title.textContent = t("prep");
    else if (ev === "free") els.title.textContent = t("free");
    else {
      const id = speakerIdAt(i);
      const p = id > 0 ? d.pro_side[id - 1] : d.con_side[-id - 1];
      els.title.textContent = p ? t("speakerTurn")(p.name) : String(ev);
    }
  }

  // Build speaker columns + timeline from the current save (loadScene)
  function loadScene() {
    let data;
    try {
      data = parseSave(loadText());
    } catch (e) {
      data = parseSave(DEFAULT_TEXT);
    }
    state.data = data;
    state.lang = data.settings.language;

    ringTimer.warningThreshold = data.settings.time_warning;
    ringTimer.displayMinutes = data.settings.display_minutes;
    barTimers.forEach((bt) => {
      bt.warningThreshold = data.settings.time_warning;
      bt.displayMinutes = data.settings.display_minutes;
    });

    buildSpeakers("pro", data.pro_side.length, data.settings.pro_colors);
    buildSpeakers("con", data.con_side.length, data.settings.con_colors);
    buildTimeline(data.event_order);

    // reset flow
    state.eventIndex = -1;
    state.currentSpeaker = null;
    state.nextSpeaker = null;
    state.prepPhase = true;
    state.freePhase = false;
    ringTimer.reset();
    barTimers.forEach((bt) => bt.reset());
    show(els.ringTimer, false);
    show(els.doubleTimer, false);
    show(els.endOverlay, false);

    applyI18n();
    updateSpeakerIndicators();
    updateTimelineActive();
  }

  function buildSpeakers(side, count, color) {
    const col = side === "pro" ? els.proCol : els.conCol;
    col.innerHTML = "";
    const list = [];
    for (let i = 1; i <= count; i++) {
      const row = document.createElement("div");
      row.className = "speaker";
      row.innerHTML = `
        <div class="slot outer"><img class="icon-next" src="assets/icons/next-icon.png" alt="" /></div>
        <div class="figure" style="background-color:${color}"><div class="figure-num">${i}</div></div>
        <div class="slot inner">
          <img class="icon-clipboard" src="assets/icons/clipboard.png" alt="" />
          <img class="icon-group" src="assets/icons/group-icon.png" alt="" />
          <img class="icon-speech" src="assets/icons/speech-icon.png" alt="" />
        </div>`;
      col.appendChild(row);
      list.push({
        id: side === "pro" ? i : -i,
        next: row.querySelector(".icon-next"),
        clipboard: row.querySelector(".icon-clipboard"),
        group: row.querySelector(".icon-group"),
        speech: row.querySelector(".icon-speech"),
      });
    }
    state.speakers[side] = list;
    fitSpeakerSize();
  }

  function fitSpeakerSize() {
    const n = Math.max(state.speakers.pro.length, state.speakers.con.length, 1);
    const avail = els.proCol.clientHeight || window.innerHeight * 0.7;
    const gap = avail * 0.06;
    const h = Math.min(avail * 0.24, (avail - (n - 1) * gap) / n);
    document.documentElement.style.setProperty("--fig-h", `${Math.max(30, h)}px`);
  }

  function buildTimeline(order) {
    els.timeline.innerHTML = "";
    state.timelineButtons = order.map((ev, i) => {
      const b = document.createElement("button");
      b.className = "tl-btn";
      b.textContent = ev === "prep" ? "P" : ev === "free" ? "F" : String(ev);
      b.title = String(ev);
      b.addEventListener("click", () => {
        // TimelineButtonControl.OnButtonPress: jump to event i
        state.eventIndex = i - 1;
        next();
      });
      els.timeline.appendChild(b);
      return b;
    });
  }

  function updateTimelineActive() {
    state.timelineButtons.forEach((b, i) => b.classList.toggle("active", i === state.eventIndex));
  }

  // AnimationController.Update, evaluated every frame
  function updateSpeakerIndicators() {
    const all = state.speakers.pro.concat(state.speakers.con);
    const currentTimerDone = ringTimer.remaining < 0.1;
    for (const sp of all) {
      sp.clipboard.classList.toggle("show", state.prepPhase);
      sp.group.classList.toggle("show", state.freePhase);
      const isCurrent = sp.id === state.currentSpeaker;
      const isNext = sp.id === state.nextSpeaker;
      sp.speech.classList.toggle("show", isCurrent && ringTimer.running);
      sp.next.classList.toggle("show", isNext);
      sp.next.classList.toggle("flashing", isNext && currentTimerDone);
    }
  }

  // MenuController.Next()
  function next() {
    const d = state.data;
    const order = d.event_order;
    state.eventIndex++;

    state.nextSpeaker = speakerIdAt(state.eventIndex + 1);
    state.prepPhase = false;
    state.freePhase = false;
    show(els.ringTimer, true);
    show(els.doubleTimer, false);

    if (state.eventIndex >= order.length) {
      // End of debate
      state.eventIndex = -1;
      state.currentSpeaker = null;
      state.nextSpeaker = null;
      state.prepPhase = true;
      ringTimer.reset();
      show(els.ringTimer, false);
      show(els.endOverlay, true);
    } else {
      const ev = order[state.eventIndex];
      if (ev === "prep") {
        ringTimer.total = d.settings.time_prep;
        state.currentSpeaker = null;
        state.prepPhase = true;
        ringTimer.reset();
        ringTimer.start();
      } else if (ev === "free") {
        state.currentSpeaker = null;
        state.freePhase = true;
        show(els.ringTimer, false);
        show(els.doubleTimer, true);
        barTimers.forEach((bt) => {
          bt.total = d.settings.time_free;
          bt.reset();
        });
      } else {
        const id = speakerIdAt(state.eventIndex);
        state.currentSpeaker = id;
        const p = id > 0 ? d.pro_side[id - 1] : id < 0 ? d.con_side[-id - 1] : null;
        ringTimer.total = p ? p.time : 0;
        ringTimer.reset();
        ringTimer.start();
      }
    }

    updateTitle();
    els.btnNext.textContent = state.eventIndex < 0 ? t("begin") : t("next");
    updateTimelineActive();
    updateSpeakerIndicators();
  }

  // ---------------------------------------------------------------------------
  // Menu / save-file editor
  // ---------------------------------------------------------------------------
  let cachedText = DEFAULT_TEXT;

  function openMenu() {
    cachedText = loadText();
    els.editor.value = cachedText;
    els.editorError.textContent = "";
    show(els.menuOverlay, true);
  }

  function closeMenu() {
    // OnDisable in the original auto-saves the field on close
    if (els.editor.value.trim().length > 3) {
      if (!trySave(els.editor.value)) return; // keep open on invalid JSON
    }
    show(els.menuOverlay, false);
  }

  function trySave(text) {
    try {
      parseSave(text);
    } catch (e) {
      els.editorError.textContent = t("invalidJson") + e.message;
      return false;
    }
    saveText(text);
    els.editorError.textContent = "";
    return true;
  }

  $("btn-menu").addEventListener("click", () => {
    if (els.menuOverlay.classList.contains("hidden")) openMenu();
    else closeMenu();
  });
  $("btn-close").addEventListener("click", closeMenu);
  $("btn-save").addEventListener("click", () => trySave(els.editor.value));
  $("btn-discard").addEventListener("click", () => {
    els.editor.value = cachedText;
    els.editorError.textContent = "";
  });
  $("btn-reset-save").addEventListener("click", () => {
    saveText(DEFAULT_TEXT);
    els.editor.value = DEFAULT_TEXT;
    els.editorError.textContent = "";
  });

  $("btn-download").addEventListener("click", () => {
    const blob = new Blob([els.editor.value], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "save.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $("btn-upload").addEventListener("click", () => els.fileInput.click());
  els.fileInput.addEventListener("change", () => {
    const f = els.fileInput.files && els.fileInput.files[0];
    if (!f) return;
    f.text().then((txt) => {
      els.editor.value = txt;
      els.editorError.textContent = "";
    });
    els.fileInput.value = "";
  });

  // ToggleLanguage – persisted into the save file's settings.language
  els.btnLang.addEventListener("click", () => {
    state.lang = state.lang === "en" ? "zh" : "en";
    state.data.settings.language = state.lang;
    try {
      const raw = JSON.parse(els.editor.value);
      raw.settings = raw.settings || {};
      raw.settings.language = state.lang;
      els.editor.value = JSON.stringify(raw, null, 2);
      saveText(els.editor.value);
      cachedText = els.editor.value;
    } catch (_) {
      /* editor holds invalid JSON – language stays in-memory only */
    }
    applyI18n();
  });

  // ---------------------------------------------------------------------------
  // Global buttons, keyboard, end screen
  // ---------------------------------------------------------------------------
  $("btn-reload").addEventListener("click", loadScene);
  $("btn-end-reload").addEventListener("click", loadScene);
  $("btn-end-close").addEventListener("click", () => show(els.endOverlay, false));
  els.btnNext.addEventListener("click", next);

  document.addEventListener("keydown", (e) => {
    const editing = document.activeElement === els.editor;
    if (e.key === "Escape") {
      if (!els.menuOverlay.classList.contains("hidden")) closeMenu();
      else if (!els.endOverlay.classList.contains("hidden")) show(els.endOverlay, false);
      return;
    }
    if (editing || !els.menuOverlay.classList.contains("hidden")) return;
    if (e.key === " ") {
      e.preventDefault();
      if (state.freePhase) {
        const running = barTimers.find((bt) => bt.running);
        if (running) running.stop();
        else if (!barPro.timedOut && barPro.remaining !== barPro.total) barPro.resume();
        else if (barPro.remaining === barPro.total && !barPro.timedOut) barPro.start();
      } else if (!els.ringTimer.classList.contains("hidden")) {
        if (ringTimer.running) ringTimer.stop();
        else if (ringTimer.timedOut) return;
        else if (ringTimer.remaining === ringTimer.total) ringTimer.start();
        else ringTimer.resume();
      }
    } else if (e.key === "ArrowRight" || e.key.toLowerCase() === "n") {
      next();
    } else if (e.key.toLowerCase() === "i" && state.freePhase) {
      $("btn-invert").click();
    }
  });

  window.addEventListener("resize", fitSpeakerSize);

  // ---------------------------------------------------------------------------
  // Main loop (Update)
  // ---------------------------------------------------------------------------
  let last = performance.now();
  function update(now) {
    const dt = Math.max(0, (now - last) / 1000);
    last = now;
    ringTimer.tick(dt);
    barTimers.forEach((bt) => bt.tick(dt));
    ringTimer.render();
    barTimers.forEach((bt) => bt.render());
    updateSpeakerIndicators();
  }
  function frame(now) {
    update(now);
    requestAnimationFrame(frame);
  }
  // Background tabs throttle rAF; keep the clock honest with a coarse interval too.
  setInterval(() => {
    if (document.hidden) update(performance.now());
  }, 500);

  loadScene();
  requestAnimationFrame(frame);
})();
