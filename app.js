/* Debate Timer – web port of https://github.com/Michaelihc/debate-timer */
(() => {
  "use strict";

  // ---------------------------------------------------------------------------
  // Defaults, i18n, storage
  // ---------------------------------------------------------------------------
  const STORAGE_KEY = "debate-timer-save";
  const DEFAULT_AUDIO = {
    warning: "assets/audio/warning.wav",
    end: "assets/audio/bell.ogg",
  };

  const DEFAULT_SAVE = {
    settings: {
      pro_colors: "#0000FF",
      con_colors: "#FF0000",
      pro_label: "",
      con_label: "",
      background_color: "#000000",
      time_warning: 30,
      time_prep: 300,
      time_free: 500,
      display_minutes: true,
      language: "en",
      audio_warning: "",
      audio_end: "",
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
      saveApply: "Save & Apply",
      discard: "Discard",
      reset: "Reset",
      resetDefaults: "Reset to Defaults",
      pause: "Pause",
      resume: "Resume",
      start: "Start",
      invert: "Invert",
      editSave: "Settings",
      tabSettings: "Settings",
      tabJson: "JSON",
      timeout: "Time ran out",
      prep: "Preparation Time",
      free: "Free Debate Time",
      ended: "Debate Ended",
      close: "Close",
      download: "Download JSON",
      upload: "Upload JSON",
      langBtn: "中文",
      invalidJson: "Invalid JSON: ",
      proDefault: "Pro",
      conDefault: "Con",
      speakerTurn: (name) => `Speaker ${name}'s Turn`,
      // settings form
      fGeneral: "General",
      fTitle: "Debate title",
      fLanguage: "Language",
      fDisplayMinutes: "Show minutes (m:ss)",
      fBackground: "Background color",
      fTimes: "Times (seconds)",
      fWarning: "Warning at",
      fPrep: "Preparation",
      fFree: "Free debate (per side)",
      fSounds: "Sounds",
      fWarningSound: "Warning sound",
      fEndSound: "End sound",
      fChooseFile: "Choose file…",
      fDefault: "Default",
      fPlay: "Play",
      fUrlPlaceholder: "URL or leave empty for default",
      fProSide: "Pro side",
      fConSide: "Con side",
      fLabel: "Label",
      fLabelPlaceholder: "Shown above the column",
      fColor: "Color",
      fSpeakers: "Speakers",
      fName: "Name",
      fSeconds: "Seconds",
      fAdd: "+ Add speaker",
      fRemove: "Remove",
      fEvents: "Event order",
      fEventsHint: "Drag to reorder. Hover an item and click × to remove it.",
      fAddLabel: "Add",
      fEmptyOrder: "No events yet. Click an item below to add it.",
      fFileTooBig: "Audio file is too large (max 2 MB). Use a URL instead.",
      fNoSpeaker: "Speaker does not exist",
      unsavedTitle: "Unsaved changes",
      unsavedText: "You changed the settings. Save and apply them?",
      invalidTitle: "Invalid JSON",
      invalidText: "The JSON tab has errors and cannot be saved. Discard the changes?",
      keepEditing: "Keep editing",
    },
    zh: {
      menu: "菜单",
      reload: "刷新",
      begin: "开始",
      next: "下一项",
      save: "保存",
      saveApply: "保存并应用",
      discard: "放弃更改",
      reset: "重置",
      resetDefaults: "恢复默认",
      pause: "暂停",
      resume: "继续",
      start: "开始",
      invert: "翻转",
      editSave: "设置",
      tabSettings: "设置",
      tabJson: "JSON",
      timeout: "时间到",
      prep: "准备时间",
      free: "自由辩论",
      ended: "辩论结束",
      close: "关闭",
      download: "下载 JSON",
      upload: "导入 JSON",
      langBtn: "English",
      invalidJson: "JSON 格式错误：",
      proDefault: "正方",
      conDefault: "反方",
      speakerTurn: (name) => `辩手 ${name} 发言`,
      fGeneral: "常规",
      fTitle: "辩题",
      fLanguage: "语言",
      fDisplayMinutes: "显示分钟 (m:ss)",
      fBackground: "背景颜色",
      fTimes: "时间（秒）",
      fWarning: "警告提示",
      fPrep: "准备时间",
      fFree: "自由辩论（每方）",
      fSounds: "音效",
      fWarningSound: "警告音效",
      fEndSound: "结束音效",
      fChooseFile: "选择文件…",
      fDefault: "默认",
      fPlay: "试听",
      fUrlPlaceholder: "输入 URL，留空使用默认",
      fProSide: "正方",
      fConSide: "反方",
      fLabel: "标签",
      fLabelPlaceholder: "显示在辩手上方",
      fColor: "颜色",
      fSpeakers: "辩手",
      fName: "姓名",
      fSeconds: "秒",
      fAdd: "+ 添加辩手",
      fRemove: "删除",
      fEvents: "流程顺序",
      fEventsHint: "拖动调整顺序，悬停后点击 × 删除。",
      fAddLabel: "添加",
      fEmptyOrder: "暂无流程，点击下方项目添加。",
      fFileTooBig: "音频文件过大（最大 2 MB），请改用 URL。",
      fNoSpeaker: "辩手不存在",
      unsavedTitle: "未保存的更改",
      unsavedText: "设置已修改，是否保存并应用？",
      invalidTitle: "JSON 格式错误",
      invalidText: "JSON 内容有错误，无法保存。是否放弃更改？",
      keepEditing: "继续编辑",
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

  function normalizeColor(v, fallback) {
    const s = String(v || "").trim();
    if (/^#[0-9a-f]{6}$/i.test(s)) return s.toUpperCase();
    if (/^#[0-9a-f]{3}$/i.test(s)) return ("#" + s[1] + s[1] + s[2] + s[2] + s[3] + s[3]).toUpperCase();
    if (/^#[0-9a-f]{8}$/i.test(s)) return s.slice(0, 7).toUpperCase();
    return fallback;
  }

  function parseSave(text) {
    const raw = typeof text === "string" ? JSON.parse(text) : text;
    if (!raw || typeof raw !== "object") throw new Error("root must be an object");
    const s = Object.assign({}, DEFAULT_SAVE.settings, raw.settings || {});
    const list = (arr) =>
      Array.isArray(arr)
        ? arr.map((p, i) => ({
            name: p && p.name != null ? String(p.name) : String(i + 1),
            time: Math.max(0, Number(p && p.time) || 0),
          }))
        : [];
    const events = Array.isArray(raw.event_order)
      ? raw.event_order
          .map((e) => {
            if (e === "prep" || e === "free") return e;
            const n = Number(e);
            return Number.isInteger(n) && n !== 0 ? n : null;
          })
          .filter((e) => e !== null)
      : [];
    return {
      settings: {
        pro_colors: normalizeColor(s.pro_colors, "#0000FF"),
        con_colors: normalizeColor(s.con_colors, "#FF0000"),
        pro_label: String(s.pro_label || ""),
        con_label: String(s.con_label || ""),
        background_color: normalizeColor(s.background_color, "#000000"),
        time_warning: Math.max(0, Number(s.time_warning) || 0),
        time_prep: Math.max(0, Number(s.time_prep) || 0),
        time_free: Math.max(0, Number(s.time_free) || 0),
        display_minutes: Boolean(s.display_minutes),
        language: normalizeLang(s.language),
        audio_warning: String(s.audio_warning || ""),
        audio_end: String(s.audio_end || ""),
      },
      title: raw.title != null ? String(raw.title) : "",
      pro_side: list(raw.pro_side),
      con_side: list(raw.con_side),
      event_order: events,
    };
  }

  // ---------------------------------------------------------------------------
  // DOM helpers
  // ---------------------------------------------------------------------------
  const $ = (id) => document.getElementById(id);
  const show = (el, on) => el.classList.toggle("hidden", !on);
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  const els = {
    title: $("title"),
    flash: $("flash"),
    proCol: $("pro-column"),
    conCol: $("con-column"),
    proLabel: $("pro-label"),
    conLabel: $("con-label"),
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
    audioFileInput: $("audio-file-input"),
    audioWarning: $("audio-warning"),
    audioEnd: $("audio-end"),
    form: $("settings-form"),
    formView: $("form-view"),
    jsonView: $("json-view"),
    tabForm: $("tab-form"),
    tabJson: $("tab-json"),
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
      this.ui = ui;
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

    get fresh() {
      return !this.running && !this.timedOut && this.remaining === this.total;
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
    toggle() {
      if (this.running) this.stop();
      else if (this.timedOut) return;
      else if (this.fresh) this.start();
      else this.resume();
    }

    syncButtons() {
      const u = this.ui;
      const fresh = this.fresh;
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
  function invert() {
    if (barPro.running && !barCon.running) {
      barPro.stop();
      barCon.resume();
    } else if (barCon.running && !barPro.running) {
      barCon.stop();
      barPro.resume();
    }
  }
  $("btn-invert").addEventListener("click", invert);

  function triggerFlash() {
    els.flash.classList.remove("go");
    void els.flash.offsetWidth; // restart the animation
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
      const v = I18N[state.lang][el.dataset.i18n];
      if (typeof v === "string") el.textContent = v;
    });
    els.btnLang.textContent = t("langBtn");
    els.btnNext.textContent = state.eventIndex < 0 ? t("begin") : t("next");
    if (state.data) {
      els.proLabel.textContent = state.data.settings.pro_label || t("proDefault");
      els.conLabel.textContent = state.data.settings.con_label || t("conDefault");
    }
    updateTitle();
  }

  function speakerIdAt(index) {
    const order = state.data.event_order;
    if (index < 0 || index >= order.length) return null;
    const v = Number(order[index]);
    return Number.isInteger(v) && v !== 0 ? v : null;
  }

  function participant(id) {
    const d = state.data;
    if (id > 0) return d.pro_side[id - 1] || null;
    if (id < 0) return d.con_side[-id - 1] || null;
    return null;
  }

  function updateTitle() {
    const d = state.data;
    if (!d) return;
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
      const p = participant(speakerIdAt(i));
      els.title.textContent = p ? t("speakerTurn")(p.name) : String(ev);
    }
  }

  function applyTheme(settings) {
    const bg = settings.background_color;
    document.documentElement.style.setProperty("--bg", bg);
    // Pick a readable foreground for light backgrounds.
    const r = parseInt(bg.slice(1, 3), 16);
    const g = parseInt(bg.slice(3, 5), 16);
    const b = parseInt(bg.slice(5, 7), 16);
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    document.documentElement.classList.toggle("light-bg", lum > 0.6);
  }

  function applyAudio(settings) {
    const w = settings.audio_warning || DEFAULT_AUDIO.warning;
    const e = settings.audio_end || DEFAULT_AUDIO.end;
    if (els.audioWarning.getAttribute("src") !== w) els.audioWarning.src = w;
    if (els.audioEnd.getAttribute("src") !== e) els.audioEnd.src = e;
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

    applyTheme(data.settings);
    applyAudio(data.settings);
    buildSpeakers("pro", data.pro_side.length, data.settings.pro_colors);
    buildSpeakers("con", data.con_side.length, data.settings.con_colors);
    buildTimeline(data.event_order);

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
    const avail = els.proCol.clientHeight || window.innerHeight * 0.65;
    const gap = avail * 0.06;
    const h = Math.min(avail * 0.24, (avail - (n - 1) * gap) / n);
    document.documentElement.style.setProperty("--fig-h", `${Math.max(30, h)}px`);
  }

  function eventLabel(ev) {
    return ev === "prep" ? "P" : ev === "free" ? "F" : String(ev);
  }

  function buildTimeline(order) {
    els.timeline.innerHTML = "";
    state.timelineButtons = order.map((ev, i) => {
      const b = document.createElement("button");
      b.className = "tl-btn";
      b.textContent = eventLabel(ev);
      const p = participant(Number(ev));
      b.title = ev === "prep" ? t("prep") : ev === "free" ? t("free") : p ? p.name : String(ev);
      b.addEventListener("click", () => {
        state.eventIndex = i - 1; // TimelineButtonControl.OnButtonPress
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
        const p = participant(id);
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
  // Settings panel: form view + JSON view over a shared draft
  // ---------------------------------------------------------------------------
  let draft = null;
  let activeTab = "form";

  function setError(msg) {
    els.editorError.textContent = msg || "";
  }

  function openMenu() {
    try {
      draft = parseSave(loadText());
    } catch (_) {
      draft = parseSave(DEFAULT_TEXT);
    }
    setError("");
    switchTab(activeTab, true);
    show(els.menuOverlay, true);
  }

  function closeMenu() {
    show(els.menuOverlay, false);
    show(confirmOverlay, false);
  }

  function storedDraft() {
    try {
      return parseSave(loadText());
    } catch (_) {
      return parseSave(DEFAULT_TEXT);
    }
  }

  function isDirty() {
    return JSON.stringify(draft) !== JSON.stringify(storedDraft());
  }

  // Close the panel, prompting first if there are unsaved (or unparsable) edits.
  const confirmOverlay = $("confirm-overlay");
  function requestClose() {
    const valid = commitView();
    if (valid && !isDirty()) {
      closeMenu();
      return;
    }
    $("confirm-title").textContent = t(valid ? "unsavedTitle" : "invalidTitle");
    $("confirm-text").textContent = t(valid ? "unsavedText" : "invalidText");
    show($("confirm-save"), valid);
    show(confirmOverlay, true);
    $(valid ? "confirm-save" : "confirm-discard").focus();
  }
  $("confirm-save").addEventListener("click", saveAndApply);
  $("confirm-discard").addEventListener("click", () => {
    draft = storedDraft();
    setError("");
    closeMenu();
  });
  $("confirm-cancel").addEventListener("click", () => show(confirmOverlay, false));
  confirmOverlay.addEventListener("click", (e) => {
    if (e.target === confirmOverlay) show(confirmOverlay, false);
  });

  // Pull the current view's edits into `draft`. Returns false on invalid JSON.
  function commitView() {
    if (activeTab === "json") {
      try {
        draft = parseSave(els.editor.value);
      } catch (e) {
        setError(t("invalidJson") + e.message);
        return false;
      }
    }
    setError("");
    return true;
  }

  function switchTab(tab, force) {
    if (!force && tab === activeTab) return;
    if (!force && !commitView()) return;
    activeTab = tab;
    els.tabForm.classList.toggle("active", tab === "form");
    els.tabJson.classList.toggle("active", tab === "json");
    show(els.formView, tab === "form");
    show(els.jsonView, tab === "json");
    if (tab === "form") renderForm();
    else els.editor.value = JSON.stringify(draft, null, 2);
  }

  function saveAndApply() {
    if (!commitView()) return;
    saveText(JSON.stringify(draft, null, 2));
    closeMenu();
    loadScene();
  }

  els.tabForm.addEventListener("click", () => switchTab("form"));
  els.tabJson.addEventListener("click", () => switchTab("json"));
  $("btn-menu").addEventListener("click", () => {
    if (els.menuOverlay.classList.contains("hidden")) openMenu();
    else requestClose();
  });
  $("btn-close").addEventListener("click", requestClose);
  $("btn-save").addEventListener("click", saveAndApply);
  $("btn-discard").addEventListener("click", () => {
    try {
      draft = parseSave(loadText());
    } catch (_) {
      draft = parseSave(DEFAULT_TEXT);
    }
    setError("");
    switchTab(activeTab, true);
  });
  $("btn-reset-save").addEventListener("click", () => {
    draft = parseSave(DEFAULT_TEXT);
    draft.settings.language = state.lang;
    setError("");
    switchTab(activeTab, true);
  });

  $("btn-download").addEventListener("click", () => {
    if (!commitView()) return;
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "save.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $("btn-upload").addEventListener("click", () => els.fileInput.click());
  els.fileInput.addEventListener("change", () => {
    const f = els.fileInput.files && els.fileInput.files[0];
    els.fileInput.value = "";
    if (!f) return;
    f.text().then((txt) => {
      els.editor.value = txt;
      setError("");
    });
  });

  // Language toggle: applies immediately and is persisted into the save file.
  els.btnLang.addEventListener("click", () => {
    state.lang = state.lang === "en" ? "zh" : "en";
    state.data.settings.language = state.lang;
    if (draft) draft.settings.language = state.lang;
    try {
      const raw = JSON.parse(loadText());
      raw.settings = raw.settings || {};
      raw.settings.language = state.lang;
      saveText(JSON.stringify(raw, null, 2));
    } catch (_) {
      /* stored JSON is broken – keep language in memory only */
    }
    applyI18n();
    if (!els.menuOverlay.classList.contains("hidden")) switchTab(activeTab, true);
  });

  // ---- Form rendering ------------------------------------------------------
  function field(labelKey, inner, extraClass) {
    return `<label class="f ${extraClass || ""}"><span>${esc(t(labelKey))}</span>${inner}</label>`;
  }

  function renderForm() {
    const s = draft.settings;
    els.form.innerHTML = `
      <section class="sgroup">
        <h3>${esc(t("fGeneral"))}</h3>
        <div class="frow">
          ${field("fTitle", `<input type="text" data-path="title" value="${esc(draft.title)}" />`, "grow")}
          ${field(
            "fLanguage",
            `<select data-path="settings.language">
              <option value="en" ${s.language === "en" ? "selected" : ""}>English</option>
              <option value="zh" ${s.language === "zh" ? "selected" : ""}>中文</option>
            </select>`
          )}
          ${field("fBackground", `<input type="color" data-path="settings.background_color" value="${esc(s.background_color)}" />`)}
          <label class="f check"><input type="checkbox" data-path="settings.display_minutes" ${s.display_minutes ? "checked" : ""} /><span>${esc(t("fDisplayMinutes"))}</span></label>
        </div>
      </section>

      <section class="sgroup">
        <h3>${esc(t("fTimes"))}</h3>
        <div class="frow">
          ${field("fWarning", `<input type="number" min="0" step="1" data-path="settings.time_warning" value="${s.time_warning}" />`)}
          ${field("fPrep", `<input type="number" min="0" step="1" data-path="settings.time_prep" value="${s.time_prep}" />`)}
          ${field("fFree", `<input type="number" min="0" step="1" data-path="settings.time_free" value="${s.time_free}" />`)}
        </div>
      </section>

      <section class="sgroup">
        <h3>${esc(t("fSounds"))}</h3>
        ${audioRow("fWarningSound", "audio_warning", DEFAULT_AUDIO.warning)}
        ${audioRow("fEndSound", "audio_end", DEFAULT_AUDIO.end)}
      </section>

      ${sideSection("pro")}
      ${sideSection("con")}

      <section class="sgroup">
        <h3>${esc(t("fEvents"))}</h3>
        <p class="hint">${esc(t("fEventsHint"))}</p>
        <div class="chips order" id="event-chips"></div>
        <div class="palette-row">
          <span class="palette-label">${esc(t("fAddLabel"))}</span>
          <div class="chips palette" id="event-palette"></div>
        </div>
      </section>`;

    renderSpeakerList("pro");
    renderSpeakerList("con");
    renderEventChips();
  }

  function audioRow(labelKey, key, defaultSrc) {
    const v = draft.settings[key];
    const shown = v.startsWith("data:") ? "(uploaded file)" : v;
    return `<div class="frow audio-row" data-audio="${key}">
      <span class="flabel">${esc(t(labelKey))}</span>
      <input type="text" class="grow" data-audio-url="${key}" placeholder="${esc(t("fUrlPlaceholder"))}"
        value="${esc(shown)}" ${v.startsWith("data:") ? "readonly" : ""} />
      <button type="button" class="btn btn-lime sm" data-audio-file="${key}">${esc(t("fChooseFile"))}</button>
      <button type="button" class="btn btn-mint sm" data-audio-play="${key}" data-default="${defaultSrc}">${esc(t("fPlay"))}</button>
      <button type="button" class="btn btn-grey sm" data-audio-default="${key}">${esc(t("fDefault"))}</button>
    </div>`;
  }

  function sideSection(side) {
    const s = draft.settings;
    const isPro = side === "pro";
    return `<section class="sgroup side-${side}">
      <h3>${esc(t(isPro ? "fProSide" : "fConSide"))}</h3>
      <div class="frow">
        ${field(
          "fLabel",
          `<input type="text" data-path="settings.${side}_label" placeholder="${esc(t("fLabelPlaceholder"))}" value="${esc(
            isPro ? s.pro_label : s.con_label
          )}" />`,
          "grow"
        )}
        ${field("fColor", `<input type="color" data-path="settings.${side}_colors" value="${esc(isPro ? s.pro_colors : s.con_colors)}" />`)}
      </div>
      <div class="speaker-list" id="list-${side}"></div>
      <button type="button" class="btn btn-lime sm" data-add-speaker="${side}">${esc(t("fAdd"))}</button>
    </section>`;
  }

  function renderSpeakerList(side) {
    const list = draft[side + "_side"];
    const root = $("list-" + side);
    root.innerHTML = `<div class="srow head"><span></span><span>${esc(t("fName"))}</span><span>${esc(t("fSeconds"))}</span><span></span></div>`;
    list.forEach((p, i) => {
      const row = document.createElement("div");
      row.className = "srow";
      row.innerHTML = `<span class="num">${i + 1}</span>
        <input type="text" data-sp="${side}:${i}:name" value="${esc(p.name)}" />
        <input type="number" min="0" step="1" data-sp="${side}:${i}:time" value="${p.time}" />
        <button type="button" class="btn btn-red sm" data-del-speaker="${side}:${i}" title="${esc(t("fRemove"))}">✕</button>`;
      root.appendChild(row);
    });
  }

  function eventName(ev) {
    if (ev === "prep") return t("prep");
    if (ev === "free") return t("free");
    const p = participant2(Number(ev));
    return p ? p.name : t("fNoSpeaker");
  }

  function makeChip(ev, extra) {
    const chip = document.createElement("span");
    const id = Number(ev);
    const missing = Number.isInteger(id) && id !== 0 && !participant2(id);
    chip.className =
      "chip " +
      (ev === "prep" ? "c-prep" : ev === "free" ? "c-free" : id > 0 ? "c-pro" : "c-con") +
      (missing ? " c-missing" : "") +
      (extra ? " " + extra : "");
    chip.dataset.ev = String(ev);
    chip.title = eventName(ev);
    chip.innerHTML = `<span class="lbl">${esc(eventLabel(ev))}</span>`;
    return chip;
  }

  function renderEventChips() {
    const root = $("event-chips");
    root.innerHTML = "";
    if (draft.event_order.length === 0) {
      root.innerHTML = `<span class="empty">${esc(t("fEmptyOrder"))}</span>`;
    }
    draft.event_order.forEach((ev, i) => {
      const chip = makeChip(ev);
      chip.insertAdjacentHTML(
        "beforeend",
        `<button type="button" class="x" data-del-event="${i}" title="${esc(t("fRemove"))}">×</button>`
      );
      root.appendChild(chip);
    });
    renderPalette();
  }

  function renderPalette() {
    const root = $("event-palette");
    root.innerHTML = "";
    const items = ["prep", "free"]
      .concat(draft.pro_side.map((_, i) => i + 1))
      .concat(draft.con_side.map((_, i) => -(i + 1)));
    items.forEach((ev) => {
      const chip = makeChip(ev, "add");
      chip.dataset.addEv = String(ev);
      chip.setAttribute("role", "button");
      root.appendChild(chip);
    });
  }

  function chipValue(chip) {
    const v = chip.dataset.ev;
    return v === "prep" || v === "free" ? v : Number(v);
  }

  // Pointer-based drag reordering for the event chips (mouse + touch).
  (function enableChipDrag() {
    const rootEl = () => $("event-chips");
    let root = null;
    let dragEl = null;
    let ghost = null;
    let dragging = false;
    let sx = 0;
    let sy = 0;

    function moveGhost(e) {
      ghost.style.transform = `translate(${e.clientX - sx}px, ${e.clientY - sy}px)`;
    }

    function placeAt(e) {
      const chips = Array.from(root.querySelectorAll(".chip")).filter((c) => c !== dragEl);
      if (!chips.length) return;
      let best = null;
      let bestDist = Infinity;
      for (const c of chips) {
        const r = c.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dist = Math.hypot((e.clientX - cx) * 0.6, e.clientY - cy);
        if (dist < bestDist) {
          bestDist = dist;
          best = c;
        }
      }
      const r = best.getBoundingClientRect();
      if (e.clientX < r.left + r.width / 2) root.insertBefore(dragEl, best);
      else root.insertBefore(dragEl, best.nextSibling);
    }

    document.addEventListener("pointerdown", (e) => {
      root = rootEl();
      if (!root || !root.contains(e.target)) return;
      const chip = e.target.closest(".chip");
      if (!chip || e.target.closest(".x") || e.button !== 0) return;
      dragEl = chip;
      dragging = false;
      sx = e.clientX;
      sy = e.clientY;
      chip.setPointerCapture(e.pointerId);
    });

    document.addEventListener("pointermove", (e) => {
      if (!dragEl) return;
      if (!dragging) {
        if (Math.hypot(e.clientX - sx, e.clientY - sy) < 5) return;
        dragging = true;
        const r = dragEl.getBoundingClientRect();
        ghost = dragEl.cloneNode(true);
        ghost.classList.add("ghost");
        ghost.style.left = `${r.left}px`;
        ghost.style.top = `${r.top}px`;
        ghost.style.width = `${r.width}px`;
        ghost.style.height = `${r.height}px`;
        document.body.appendChild(ghost);
        dragEl.classList.add("dragging");
      }
      moveGhost(e);
      placeAt(e);
    });

    function endDrag() {
      if (!dragEl) return;
      if (dragging) {
        dragEl.classList.remove("dragging");
        if (ghost) ghost.remove();
        ghost = null;
        draft.event_order = Array.from(root.querySelectorAll(".chip")).map(chipValue);
        renderEventChips();
      }
      dragEl = null;
      dragging = false;
    }
    document.addEventListener("pointerup", endDrag);
    document.addEventListener("pointercancel", endDrag);
  })();

  function participant2(id) {
    if (id > 0) return draft.pro_side[id - 1] || null;
    if (id < 0) return draft.con_side[-id - 1] || null;
    return null;
  }

  function setPath(obj, path, value) {
    const parts = path.split(".");
    let o = obj;
    for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]];
    o[parts[parts.length - 1]] = value;
  }

  // Delegated form events
  els.form.addEventListener("input", (e) => {
    const el = e.target;
    if (el.dataset.path) {
      let v;
      if (el.type === "checkbox") v = el.checked;
      else if (el.type === "number") v = Math.max(0, Number(el.value) || 0);
      else if (el.type === "color") v = el.value.toUpperCase();
      else v = el.value;
      setPath(draft, el.dataset.path, v);
      if (el.dataset.path === "settings.language") {
        state.lang = v;
        applyI18n();
        renderForm();
      }
    } else if (el.dataset.sp) {
      const [side, idx, key] = el.dataset.sp.split(":");
      const p = draft[side + "_side"][Number(idx)];
      if (!p) return;
      if (key === "time") p.time = Math.max(0, Number(el.value) || 0);
      else p.name = el.value;
      if (key === "name") renderEventChips();
    } else if (el.dataset.audioUrl) {
      draft.settings[el.dataset.audioUrl] = el.value.trim();
    }
  });

  els.form.addEventListener("click", (e) => {
    const b = e.target.closest("button, .chip.add");
    if (!b) return;
    const d = b.dataset;
    if (d.addSpeaker) {
      const side = d.addSpeaker;
      const list = draft[side + "_side"];
      list.push({ name: `${side === "pro" ? "Team 1" : "Team 2"} ${String.fromCharCode(65 + (list.length % 26))}`, time: 180 });
      renderSpeakerList(side);
      renderEventChips();
    } else if (d.delSpeaker) {
      const [side, idx] = d.delSpeaker.split(":");
      draft[side + "_side"].splice(Number(idx), 1);
      renderSpeakerList(side);
      renderEventChips();
    } else if (d.addEv !== undefined) {
      draft.event_order.push(chipValue(b));
      renderEventChips();
    } else if (d.delEvent !== undefined) {
      draft.event_order.splice(Number(d.delEvent), 1);
      renderEventChips();
    } else if (d.audioFile) {
      const key = d.audioFile;
      els.audioFileInput.onchange = () => {
        const f = els.audioFileInput.files && els.audioFileInput.files[0];
        els.audioFileInput.value = "";
        if (!f) return;
        if (f.size > 2 * 1024 * 1024) {
          setError(t("fFileTooBig"));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          draft.settings[key] = String(reader.result);
          setError("");
          renderForm();
        };
        reader.readAsDataURL(f);
      };
      els.audioFileInput.click();
    } else if (d.audioDefault) {
      draft.settings[d.audioDefault] = "";
      renderForm();
    } else if (d.audioPlay) {
      const src = draft.settings[d.audioPlay] || d.default;
      const a = new Audio(src);
      const p = a.play();
      if (p && p.catch) p.catch(() => setError("Could not play: " + src));
    }
  });

  els.form.addEventListener("submit", (e) => e.preventDefault());

  // ---------------------------------------------------------------------------
  // Global buttons, keyboard, end screen
  // ---------------------------------------------------------------------------
  $("btn-reload").addEventListener("click", loadScene);
  $("btn-end-reload").addEventListener("click", loadScene);
  $("btn-end-close").addEventListener("click", () => show(els.endOverlay, false));
  els.btnNext.addEventListener("click", next);

  document.addEventListener("keydown", (e) => {
    const menuOpen = !els.menuOverlay.classList.contains("hidden");
    if (e.key === "Escape") {
      if (!confirmOverlay.classList.contains("hidden")) show(confirmOverlay, false);
      else if (menuOpen) requestClose();
      else if (!els.endOverlay.classList.contains("hidden")) show(els.endOverlay, false);
      return;
    }
    if (menuOpen) return;
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (e.key === " ") {
      e.preventDefault();
      if (state.freePhase) {
        const running = barTimers.find((bt) => bt.running);
        if (running) running.stop();
        else barPro.toggle();
      } else if (!els.ringTimer.classList.contains("hidden")) {
        ringTimer.toggle();
      }
    } else if (e.key === "ArrowRight" || e.key.toLowerCase() === "n") {
      next();
    } else if (e.key.toLowerCase() === "i" && state.freePhase) {
      invert();
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
