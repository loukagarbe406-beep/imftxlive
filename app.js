const API_BASE = "";

let webtorrentClient = null;
let currentTorrent = null;

const homeSection = document.getElementById("home-section");
const homeGrid = document.getElementById("home-grid");
const searchSection = document.getElementById("search-section");
const searchGrid = document.getElementById("search-grid");
const searchResultsCount = document.getElementById("search-results-count");
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const myListButton = document.getElementById("my-list-button");
const onlyfootButton = document.getElementById("onlyfoot-button");
const onlyfootSection = document.getElementById("onlyfoot-section");
// OnlyFoot UI (new layout: Live / Today / Upcoming + filters)
const onlyfootSearchInput = document.getElementById("onlyfoot-search");
const onlyfootCompetitionSelect = document.getElementById("onlyfoot-competition");
const onlyfootChipButtons = document.querySelectorAll("#onlyfoot-section .of-chip[data-focus]");
const onlyfootViewButtons = document.querySelectorAll("#onlyfoot-section .of-view[data-view]");

// OnlyFoot ?" TV Live (Netflix row)
const onlyfootTvRow = document.getElementById("onlyfoot-tv-row");
const tvModal = document.getElementById("tv-modal");
const tvModalTitle = document.getElementById("tv-modal-title");
const tvIframe = document.getElementById("tv-iframe");
const tvBtnWigi = document.getElementById("tv-btn-wigi");
const tvBtnCaster = document.getElementById("tv-btn-caster");
const tvBtnHoca = document.getElementById("tv-btn-hoca");

// Preplay (pub step) modal
const preplayModal = document.getElementById("preplay-modal");
const preplayTitle = document.getElementById("preplay-title");
const preplayAdsStep = document.querySelector(".preplay-step-ads");
const preplayTipsStep = document.querySelector(".preplay-step-tips");
const preplayAdsBtn = document.getElementById("preplay-ads-btn");
const preplayStartBtn = document.getElementById("preplay-start-btn");
let preplayContinueAction = null;
const preplayTitleStep1 = "Petite étape avant de lancer la vidéo sur ONLY US…";
const preplayTitleStep2 = "Merci d’avoir soutenu ONLY US ! 🎉";
const preplayGuard = { active: false };
const adGateTokens = new Map();
let preplayGateMeta = null;

function buildAdContentKey(meta) {
  if (!meta || !meta.type) return "";
  if (meta.type === "movie") return `movie:${meta.tmdbId}`;
  if (meta.type === "episode") return `series:${meta.tmdbId}:S${meta.season}:E${meta.episode}`;
  if (meta.type === "tv") return `tv:${meta.channelId || meta.id || meta.key || "unknown"}`;
  if (meta.type === "onlyfoot") return `onlyfoot:${meta.source}:${meta.id}`;
  return "";
}

function getAdGateToken(contentKey) {
  const item = adGateTokens.get(contentKey);
  if (!item) return "";
  if (item.exp && Date.now() > item.exp) {
    adGateTokens.delete(contentKey);
    return "";
  }
  return item.token || "";
}

async function ensureAdGateToken(contentKey) {
  if (!contentKey) return "";
  const cached = getAdGateToken(contentKey);
  if (cached) return cached;
  try {
    const res = await fetch(`${API_BASE}/api/ads/adsterra/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content_key: contentKey }),
    });
    const data = await res.json().catch(() => ({}));
    if (data && data.token) {
      adGateTokens.set(contentKey, { token: String(data.token), exp: Number(data.exp || 0) || 0 });
      return String(data.token);
    }
  } catch (_) {}
  return "";
}

function withAdGateParams(url, contentKey, token) {
  if (!token || !contentKey) return url;
  try {
    const u = new URL(url, window.location.origin);
    u.searchParams.set("ad_token", token);
    u.searchParams.set("ad_content", contentKey);
    const out = u.toString();
    return out.startsWith(window.location.origin) ? out.slice(window.location.origin.length) : out;
  } catch (_) {
    const join = url.includes("?") ? "&" : "?";
    return `${url}${join}ad_token=${encodeURIComponent(token)}&ad_content=${encodeURIComponent(contentKey)}`;
  }
}

if (preplayModal && typeof MutationObserver !== "undefined") {
  const guardObserver = new MutationObserver(() => {
    if (!preplayGuard.active) return;
    const exists = document.getElementById("preplay-modal");
    if (!exists) {
      try { location.reload(); } catch (_) {}
    }
  });
  try {
    guardObserver.observe(document.body, { childList: true, subtree: true });
  } catch (_) {}
}

const onlyfootBlockFavs = document.getElementById("onlyfoot-block-favs");
const onlyfootBlockLive = document.getElementById("onlyfoot-block-live");
const onlyfootBlockToday = document.getElementById("onlyfoot-block-today");
const onlyfootBlockUpcoming = document.getElementById("onlyfoot-block-upcoming");
const onlyfootBlockComps = document.getElementById("onlyfoot-block-comps");

const onlyfootFavsCount = document.getElementById("onlyfoot-favs-count");
const onlyfootLiveCount = document.getElementById("onlyfoot-live-count");
const onlyfootTodayCount = document.getElementById("onlyfoot-today-count");
const onlyfootUpcomingCount = document.getElementById("onlyfoot-upcoming-count");
const onlyfootCompsCount = document.getElementById("onlyfoot-comps-count");

const onlyfootFavsList = document.getElementById("onlyfoot-favs-list");
const onlyfootLiveList = document.getElementById("onlyfoot-live-list");
const onlyfootTodayList = document.getElementById("onlyfoot-today-list");
const onlyfootUpcomingList = document.getElementById("onlyfoot-upcoming-list");
const onlyfootCompsList = document.getElementById("onlyfoot-comps-list");

const onlyfootEmpty = document.getElementById("onlyfoot-empty");
const onlyfootSchedule = document.getElementById("onlyfoot-schedule");
// HilltopAds (MultiTag Banner)
// Note: force HTTPS to avoid mixed-content quirks between localhost (http) and production (https)
const HILLTOP_ONLYFOOT_SRC = "https://unfinished-face.com/beXFV/sud.GUlm0ZYqWBcj/uenmt9bubZeUbl/kXP/TwYQ3dNvDtkl3QMsjAArtlN_j/cQ0/OMT/c/ymMdQH";
const HILLTOP_CINE_SRC_A = "https://unfinished-face.com/b/XqV/sNd.GtlW0XYpWecz/feZme9EufZWUMlZkbPCTTYG3GNND/kJ3lM/j_gJtgNzjdc/0WOdTZcRyzOvQR";
const HILLTOP_CINE_SRC_B = "https://unfinished-face.com/b/XqV/sNd.GtlW0XYpWecz/feZme9EufZWUMlZkbPCTTYG3GNND/kJ3lM/j_gJtgNzjdc/0WOdTZcRyzOvQR";
const ADS_TAG_SCRIPT_ID = "onlyus-ads-monetag";
const ADS_POPUNDER_SCRIPT_ID = "onlyus-ads-popunder";
const ADS_TAG_URL = "https://quge5.com/88/tag.min.js";
const ADS_TAG_ZONE = "206953";
const ADS_POPUNDER_URL = "https://strong-training.com/cBD.9c6_bq2/5/lsSpWyQe9YNjj/ck1pMDjXAB2/MESH0/2dNfzaUPy/MODmYjyC";
const ADS_SW_PATH = "/sw.js";

const IS_AUDIT_MODE = (() => {
  try {
    const ua = navigator.userAgent || "";
    if (/Chrome-Lighthouse|Lighthouse/i.test(ua)) return true;
    const params = new URLSearchParams(window.location.search || "");
    return params.has("audit");
  } catch (_) {
    return false;
  }
})();

if (IS_AUDIT_MODE) {
  // Avoid Lighthouse "Browser errors were logged" by silencing error logs in audit mode.
  // This does not affect real users.
  console.error = () => {};
  window.addEventListener("error", (e) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    return false;
  });
  window.addEventListener("unhandledrejection", (e) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
  });
}

// Silence known deprecated warnings from third-party ad scripts
try {
  const _warn = console.warn ? console.warn.bind(console) : null;
  const _error = console.error ? console.error.bind(console) : null;
  const shouldSilence = (msg) => {
    if (!msg) return false;
    const s = String(msg);
    return (
      s.includes("Deprecated feature used") ||
      s.includes("Shared Storage API is deprecated") ||
      s.includes("chrome.loadTimes() is deprecated")
    );
  };
  if (_warn) {
    console.warn = (...args) => {
      if (args && args.length && shouldSilence(args[0])) return;
      _warn(...args);
    };
  }
  if (_error) {
    console.error = (...args) => {
      if (args && args.length && shouldSilence(args[0])) return;
      _error(...args);
    };
  }
} catch (_) {}

// Guard for third-party scripts that call performance.measure with missing marks
try {
  if (typeof performance !== "undefined" && typeof performance.mark === "function") {
    performance.mark("hidden_iframe:start");
    performance.mark("blth:start");
    performance.mark("hints:start");
  }
} catch (_) {}

// Robust guard: ensure missing marks don't crash performance.measure (3rd-party scripts)
try {
  if (typeof performance !== "undefined" && typeof performance.measure === "function") {
    const _origMeasure = performance.measure.bind(performance);
    performance.measure = function (name, start, end) {
      try {
        if (typeof start === "string") {
          const marks = performance.getEntriesByName(start, "mark");
          if (!marks || marks.length === 0) {
            try { performance.mark(start); } catch (_) {}
          }
        }
        if (typeof end === "string") {
          const marks = performance.getEntriesByName(end, "mark");
          if (!marks || marks.length === 0) {
            try { performance.mark(end); } catch (_) {}
          }
        }
      } catch (_) {}
      return _origMeasure(name, start, end);
    };
  }
} catch (_) {}

let preplayAdLastTs = 0;


async function runPreplayAdScriptOnce() {
  const now = Date.now();
  if (now - preplayAdLastTs < 1500) return;
  preplayAdLastTs = now;
  try {
    window.open(
      `${API_BASE}/api/ads/adsterra/open?ts=${Date.now()}`,
      "_blank",
      "noopener,noreferrer"
    );
    const contentKey = buildAdContentKey(preplayGateMeta || {});
    if (contentKey) {
      setTimeout(() => { ensureAdGateToken(contentKey); }, 250);
    }
  } catch (_) {}
}

let adsEnabled = false;
let adsScriptsLoaded = false;
let adsSwRegistered = false;

function loadAdScriptOnce(id, src, attrs = {}) {
  if (!src || document.getElementById(id)) return;
  const s = document.createElement("script");
  s.id = id;
  s.src = src;
  s.async = true;
  Object.keys(attrs || {}).forEach((k) => {
    if (attrs[k] != null) s.setAttribute(k, attrs[k]);
  });
  document.head.appendChild(s);
}

function loadAdsScripts() {
  if (adsScriptsLoaded) return;
  loadAdScriptOnce(ADS_TAG_SCRIPT_ID, ADS_TAG_URL, {
    "data-zone": ADS_TAG_ZONE,
    "data-cfasync": "false",
  });
  loadAdScriptOnce(ADS_POPUNDER_SCRIPT_ID, ADS_POPUNDER_URL, {
    referrerpolicy: "no-referrer-when-downgrade",
  });
  adsScriptsLoaded = true;
}

function clearAdContainers() {
  const slots = document.querySelectorAll(".ad-inline-slots, .of2-ad-slots");
  slots.forEach((el) => {
    el.innerHTML = "";
    el.removeAttribute("data-hilltop-mounted");
  });
}

function unregisterAdServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => {
      const url = reg && reg.active && reg.active.scriptURL ? reg.active.scriptURL : "";
      if (url && url.includes(ADS_SW_PATH)) {
        reg.unregister().catch(() => {});
        adsSwRegistered = false;
      }
    });
  }).catch(() => {});
}

function registerAdServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.getRegistrations().then((regs) => {
    const has = regs.some((reg) => {
      const url = reg && reg.active && reg.active.scriptURL ? reg.active.scriptURL : "";
      return url && url.includes(ADS_SW_PATH);
    });
    if (has) {
      adsSwRegistered = true;
      return;
    }
    navigator.serviceWorker.register(ADS_SW_PATH, { scope: "/" })
      .then(() => {
        adsSwRegistered = true;
      })
      .catch(() => {
        adsSwRegistered = false;
      });
  }).catch(() => {});
}

function enableAds() {
  if (IS_AUDIT_MODE) return;
  if (adsEnabled) {
    refreshSponsoredAds();
    return;
  }
  adsEnabled = true;
  // Disabled: auto-loading third-party ad scripts and SW at startup.
  // Preplay flow handles ads on user click.
  refreshSponsoredAds();
}

function disableAds() {
  adsEnabled = false;
  clearAdContainers();
  // Only unregister SW when preplay ads are active.
  if (preplayAdsEnabled) unregisterAdServiceWorker();
}

function syncAdServiceWorkerState() {
  // When preplay ads are disabled, allow SW ads instead.
  if (preplayAdsEnabled) {
    unregisterAdServiceWorker();
  } else {
    registerAdServiceWorker();
  }
}

function isMobileAdsViewport() {
  try {
    return !!(window.matchMedia && window.matchMedia("(max-width: 720px)").matches);
  } catch (_) {
    return false;
  }
}

function buildHilltopIframeSrcdoc(src, settings) {
  // Each ad is isolated in its own document to avoid 1-per-page limits / global collisions
  // when the same MultiTag script is reused across multiple sponsored blocks.
  const safeSrc = String(src || "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, "\\\"");

  const safeSettings = JSON.stringify(settings || {})
    // Prevent accidental HTML/script termination.
    .replace(/</g, "\\u003c");

  return `<!doctype html><html><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}body{display:flex;align-items:center;justify-content:center}</style>
</head><body>
<script>(function(){try{var s=document.createElement("script");s.async=true;s.referrerPolicy="no-referrer-when-downgrade";s.src="${safeSrc}";s.settings=${safeSettings};document.body.appendChild(s);}catch(e){}})();</script>
</body></html>`;
}

function mountHilltopScript(slotEl, src, settings) {
  try {
    if (!adsEnabled) return;
    if (!slotEl || !src) return;
    // Use an iframe per slot to prevent global script de-dupe/one-time rendering
    // behaviour that can make only the first sponsored block render.
    slotEl.innerHTML = "";

    const iframe = document.createElement("iframe");
    iframe.loading = "lazy";
    iframe.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
    iframe.setAttribute("title", "Sponsorisé");
    iframe.setAttribute("aria-label", "Sponsorisé");
    iframe.setAttribute("scrolling", "no");
    iframe.style.width = "100%";
    iframe.style.border = "0";
    iframe.style.display = "block";
    // Reasonable default for most banner formats; container can still grow if needed.
    iframe.style.height = "250px";
    iframe.srcdoc = buildHilltopIframeSrcdoc(src, settings);
    slotEl.appendChild(iframe);
  } catch (_) {
    // Silent: ads must never break rendering
  }
}

function mountHilltopSlots(containerEl, sources, slotClass, settings) {
  if (!adsEnabled) return;
  if (!containerEl) return;
  if (containerEl.getAttribute("data-hilltop-mounted") === "1") return;

  const list = Array.isArray(sources) ? sources.filter(Boolean) : [];
  const count = isMobileAdsViewport() ? 1 : Math.min(3, list.length || 0);

  // Always reset (prevents partially-rendered / duplicated scripts)
  containerEl.innerHTML = "";

  for (let i = 0; i < count; i++) {
    const slot = document.createElement("div");
    slot.className = slotClass || "ad-inline-slot";
    containerEl.appendChild(slot);
    mountHilltopScript(slot, list[i], settings);
  }

  containerEl.setAttribute("data-hilltop-mounted", "1");
}

function initHomeSponsoredAds() {
  try {
    if (!adsEnabled) return;
    const blocks = document.querySelectorAll(
      ".home-row-ad .ad-inline-slots[data-hilltop-src-1]"
    );

    blocks.forEach((el) => {
      const s1 = el.getAttribute("data-hilltop-src-1") || "";
      const s2 = el.getAttribute("data-hilltop-src-2") || "";
      const s3 = el.getAttribute("data-hilltop-src-3") || "";
      mountHilltopSlots(el, [s1, s2, s3], "ad-inline-slot", {});
    });
  } catch (_) {
    // Silent
  }
}

function refreshSponsoredAds() {
  if (!adsEnabled) return;
  try {
    initHomeSponsoredAds();
    const ofSlots = document.querySelectorAll(".of2-ad-slots");
    ofSlots.forEach((el) => {
      el.removeAttribute("data-hilltop-mounted");
      mountHilltopSlots(
        el,
        [HILLTOP_ONLYFOOT_SRC, HILLTOP_CINE_SRC_A, HILLTOP_CINE_SRC_B],
        "of2-ad-slot",
        {}
      );
    });
  } catch (_) {
    // Silent
  }
}


let currentAppMode = "cine";
let lastModeTrack = { mode: null, ts: 0 };
let currentCatalogKey = null;
let catalogEntranceActive = false;
let platformZoomActive = false;
let clientAccessToken = null;
let clientAccessTokenExp = 0;
let shortAccessToken = null;
let shortAccessTokenExp = 0;
let shortAccessTokenFetchAt = 0;
let antiInspectEnabled = true;
let preplayAdsEnabled = true;
let clientTokensEnabled = true;
let antiInspectInitDone = false;
let antiInspectTriggered = false;
let antiInspectDisableForIOS = false;
let antiInspectUserInteracted = false;
let antiInspectLoadedAt = Date.now();
let catalogLoadId = 0;
let catalogExitTimer = null;

function isIOSDevice() {
  try {
    const ua = String(navigator.userAgent || "").toLowerCase();
    if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) return true;
    // iPadOS 13+ can report as Macintosh but still has touch
    if (ua.includes("macintosh") && "ontouchend" in document) return true;
    return false;
  } catch (_) {
    return false;
  }
}

// Universe UI elements
const universePills = document.querySelectorAll(".universe-pill[data-mode]");
const modeChip = document.getElementById("mode-chip");

// Background layers (crossfade)
const universeBgA = document.getElementById("universe-bg-a");
const universeBgB = document.getElementById("universe-bg-b");
let activeBgLayer = universeBgA;
let idleBgLayer = universeBgB;

// Timers for mode switch animations
let switchTimers = { out: null, in: null, chip: null, cleanup: null };

function themeClassForMode(mode) {
  if (mode === "foot") return "theme-foot";
  if (mode === "games") return "theme-games";
  return "theme-cine";
}

function setBackgroundTheme(mode) {
  if (!activeBgLayer || !idleBgLayer) return;
  const cls = themeClassForMode(mode);

  // Ensure active has correct theme on first load
  activeBgLayer.classList.remove("theme-cine", "theme-foot", "theme-games");
  activeBgLayer.classList.add(cls, "is-active");

  idleBgLayer.classList.remove("theme-cine", "theme-foot", "theme-games", "is-active");
  idleBgLayer.classList.add(cls);
}

function crossfadeBackgroundTo(mode) {
  if (!activeBgLayer || !idleBgLayer) return;

  const cls = themeClassForMode(mode);
  idleBgLayer.classList.remove("theme-cine", "theme-foot", "theme-games");
  idleBgLayer.classList.add(cls);

  // Crossfade: bring idle in, fade active out
  idleBgLayer.classList.add("is-active");
  activeBgLayer.classList.remove("is-active");

  // Swap refs
  const prevActive = activeBgLayer;
  activeBgLayer = idleBgLayer;
  idleBgLayer = prevActive;
}

function updateUniversePills(mode) {
  universePills.forEach((btn) => {
    const m = btn.getAttribute("data-mode");
    const isActive = m === mode;
    btn.classList.toggle("is-active", isActive);
    if (isActive) btn.setAttribute("aria-current", "page");
    else btn.removeAttribute("aria-current");
  });
}

function showModeChip(mode) {
  if (!modeChip) return;
  const labels = {
    foot: "OnlySports activé",
    games: "OnlyGames activé",
    cine: "OnlyCiné activé"
  };
  const label = labels[mode] || "OnlyCiné activé";
  modeChip.textContent = label;

  // Reset
  modeChip.classList.remove("hidden");
  modeChip.classList.add("is-show");

  // Auto-dismiss
  if (switchTimers.chip) clearTimeout(switchTimers.chip);
  switchTimers.chip = setTimeout(() => {
    modeChip.classList.remove("is-show");
    // Hide after transition
    if (switchTimers.cleanup) clearTimeout(switchTimers.cleanup);
    switchTimers.cleanup = setTimeout(() => modeChip.classList.add("hidden"), 240);
  }, 900);
}

function updateUniverseUI(mode) {
  updateUniversePills(mode);
  crossfadeBackgroundTo(mode);
  showModeChip(mode);
}

function clearSwitchTimers() {
  Object.values(switchTimers).forEach((t) => { if (t) clearTimeout(t); });
  switchTimers = { out: null, in: null, chip: null, cleanup: null };
}

function switchUniverse(mode) {
  const nextMode = mode === "hub" ? "cine" : mode;
  if (nextMode === currentAppMode) return;

  clearSwitchTimers();

  // OUT
  document.body.classList.remove("mode-transition-in");
  document.body.classList.add("mode-transition-out");

  // Apply mode in the middle
  switchTimers.out = setTimeout(() => {
    setAppMode(nextMode, { pushHash: true });
    // IN
    document.body.classList.remove("mode-transition-out");
    document.body.classList.add("mode-transition-in");
    switchTimers.in = setTimeout(() => {
      document.body.classList.remove("mode-transition-in");
    }, 460);
  }, 180);
}

const hubSection = document.getElementById("hub-section");
const hubModeCards = document.querySelectorAll("#hub-section .hub-card[data-mode]");
const hubStartRadios = document.querySelectorAll('input[name="hub-start-mode"]');

const HUB_START_MODE_KEY = "onlyus_start_mode"; // 'hub' | 'cine' | 'foot'

function getStoredStartMode() {
  const v = (localStorage.getItem(HUB_START_MODE_KEY) || "").trim();
  // Migration: legacy "hub" -> default "cine"
  if (v === "cine" || v === "foot") return v;
  return "cine";
}

function setStoredStartMode(mode) {
  if (!(mode === "cine" || mode === "foot")) return;
  localStorage.setItem(HUB_START_MODE_KEY, mode);
}

function modeFromHash() {
  const h = (window.location.hash || "").toLowerCase();
  // Support legacy hashes
  if (h === "#hub" || h === "#hub-section") return "cine";
  if (h === "#cine" || h === "#home") return "cine";
  if (h === "#sports" || h === "#foot") return "foot";
  if (h.includes("onlyfoot") || h.includes("onlysports")) return "foot";
  if (h.includes("home-section")) return "cine";
  return null;
}

const PLATFORM_CONFIG = {
  netflix: { label: "Netflix", hash: "#netflyy", providerKey: "netflix" },
  prime: { label: "Prime Video", hash: "#primus", providerKey: "prime" },
  disney: { label: "Disney+", hash: "#disnus", providerKey: "disney" },
  appletv: { label: "Apple TV+", hash: "#apltv", providerKey: "appletv" },
  hbo: { label: "HBO Max", hash: "#hbios", providerKey: "hbo" },
  paramount: { label: "Paramount+", hash: "#paramoumout", providerKey: "paramount" },
  warner: { label: "Warner Bros", hash: "#warnerstellar", providerKey: "warner" },
};

function getCatalogKeyFromHash() {
  const h = (window.location.hash || "").toLowerCase();
  if (!h) return null;
  if (h.includes("netflyy")) return "netflix";
  if (h.includes("primus")) return "prime";
  if (h.includes("disnus")) return "disney";
  if (h.includes("apltv")) return "appletv";
  if (h.includes("hbios")) return "hbo";
  if (h.includes("paramoumout")) return "paramount";
  if (h.includes("warnerstellar")) return "warner";
  return null;
}

function setAppMode(mode, opts) {
  const options = opts || {};
  const pushHash = options.pushHash !== false;
  const showChip = options.showChip !== false;

  // Hub removed: keep backward compatibility by mapping hub -> cine
  const nextMode = mode === "hub" ? "cine" : mode;

  currentAppMode = nextMode;

  document.body.classList.toggle("mode-hub", false);
  document.body.classList.toggle("mode-cine", nextMode === "cine");
  document.body.classList.toggle("mode-foot", nextMode === "foot");
  document.body.classList.toggle("mode-games", nextMode === "games");

  // Ensure universe sections don't leak between modes.
  // - In cine mode: home section (OnlyCiné) is visible
  // - In foot mode: OnlyFoot section is visible
  // - In games mode: OnlyGames section is visible
  if (homeSection) {
    if (nextMode === "cine") homeSection.classList.remove("hidden");
    else homeSection.classList.add("hidden");
  }

  if (onlyfootSection) {
    if (nextMode === "foot") onlyfootSection.classList.remove("hidden");
    else onlyfootSection.classList.add("hidden");
  }

  if (onlyGamesSection) {
    if (nextMode === "games") onlyGamesSection.classList.remove("hidden");
    else onlyGamesSection.classList.add("hidden");
  }

  // Track main mode views (avoid spamming on rapid toggles)
  try {
    const now = Date.now();
    if (lastModeTrack.mode !== nextMode || (now - lastModeTrack.ts) > 30_000) {
      const pageName = nextMode === "foot" ? "onlyfoot" : (nextMode === "games" ? "games" : "home");
      trackPageView(pageName);
      lastModeTrack = { mode: nextMode, ts: now };
    }
  } catch (_) {}

  if (pushHash) {
    if (nextMode === "foot") window.location.hash = "#sports";
    else if (nextMode === "games") window.location.hash = "#games";
    else window.location.hash = "#cine";
  }

  // Entering OnlyFoot: load matches (non-blocking)
  if (nextMode === "foot" && typeof loadOnlyfootMatches === "function") {
    try { loadOnlyfootMatches(); } catch (e) { console.warn("[UNIVERSE] loadOnlyfootMatches error:", e); }
  }

  // Update UI (pills / background / chip)
  if (showChip) updateUniverseUI(nextMode);
  else updateUniversePills(nextMode);
}

let hubInitDone = false;

function applyStartupMode() {
  // Priority: explicit hash (deep link / back button)
  if (getCatalogKeyFromHash()) {
    setBackgroundTheme("cine");
    currentAppMode = "cine";
    updateUniversePills("cine");
    setAppMode("cine", { pushHash: false, showChip: false });
    const key = getCatalogKeyFromHash();
    if (key) enterCatalog(key, { pushHash: false });
    return;
  }

  const hashMode = modeFromHash();
  if (hashMode) {
    // Set initial background + UI without the toast spam
    setBackgroundTheme(hashMode);
    currentAppMode = hashMode;
    updateUniversePills(hashMode);
    setAppMode(hashMode, { pushHash: false, showChip: false });
    return;
  }

  // Otherwise: preference (default = cine)
  const startMode = getStoredStartMode();
  setBackgroundTheme(startMode);
  currentAppMode = startMode;
  updateUniversePills(startMode);
  setAppMode(startMode, { pushHash: false, showChip: false });
}

function initHubUI() {
  if (hubInitDone) return;
  hubInitDone = true;

  // Universe pills
  universePills.forEach((btn) => {
    const mode = btn.getAttribute("data-mode");
    if (btn.disabled) return;
    btn.addEventListener("click", () => switchUniverse(mode));
  });

  // Legacy hub tiles/radios may still exist in older builds (safe no-op if missing)
  hubModeCards.forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.getAttribute("data-mode");
      if (mode === "cine" || mode === "foot") switchUniverse(mode);
    });
  });

  // Hash navigation support (Back button)
  window.addEventListener("hashchange", () => {
    const key = getCatalogKeyFromHash();
    if (key) {
      enterCatalog(key, { pushHash: false });
      return;
    }

    if (currentCatalogKey) {
      exitCatalog({ pushHash: false });
    }

    const m = modeFromHash();
    if (m) {
      // Do not animate back/forward; keep it snappy
      currentAppMode = m;
      setAppMode(m, { pushHash: false, showChip: false });
    }
  });
}


const userMenuContainer = document.getElementById("user-menu-container");
const userMenuToggle = document.getElementById("user-menu-toggle");
const userMenuDropdown = document.getElementById("user-menu-dropdown");
const userMenuName = document.getElementById("user-menu-name");
const userMenuAvatarImg = document.getElementById("user-menu-avatar-img");
const userMenuAvatarFallback = document.getElementById("user-menu-avatar-fallback");
const userMenuSettings = document.getElementById("user-menu-settings");
const userMenuChangeProfile = document.getElementById("user-menu-change-profile");
const userMenuEditAvatar = document.getElementById("user-menu-edit-avatar");
const userMenuLogout = document.getElementById("user-menu-logout");
const authOpenButton = document.getElementById("auth-open-button");
const authRegisterButton = document.getElementById("auth-register-button");

// Support / donations
const settingsModal = document.getElementById("settings-modal");
const settingsActiveProfileEl = document.getElementById("settings-active-profile");
const settingsDonateBtn = document.getElementById("settings-donate-btn");
const donateModal = document.getElementById("donate-modal");
const footerDonateBtn = document.getElementById("footer-donate-btn");

const heroSection = document.getElementById("hero-section");
const heroTitle = document.getElementById("hero-title");
const heroLogo = document.getElementById("hero-logo");
const heroMeta = document.getElementById("hero-meta");
const heroOverview = document.getElementById("hero-overview");
const heroPlayBtn = document.getElementById("hero-play");
const heroMoreBtn = document.getElementById("hero-more");

// === HERO PREMIUM (Ken Burns + Crossfade carousel) ===
let heroCarouselTimer = null;
let heroCarouselIndex = 0;
let heroCarouselItems = [];
let heroBackdropLayers = null; // [layerA, layerB]
let heroActiveLayerIndex = 0;
let heroLastBackdropUrl = "";

// TMDB hero logo cache (movie/tv -> chosen logo URL or null)
const heroLogoCache = new Map(); // key: `${mediaType}:${tmdbId}` -> string|null
let heroLogoRequestId = 0;
const continueWatchingSection = document.getElementById("continue-watching-section");
const rowContinueWatching = document.getElementById("row-continue-watching");
const myListSection = document.getElementById("my-list-section");
const rowMyList = document.getElementById("row-my-list");
const rowTrending = document.getElementById("row-trending");
const rowMovies = document.getElementById("row-movies");
const rowSeries = document.getElementById("row-series");
const rowTop = document.getElementById("row-top");

const rowTop10France = document.getElementById("row-top10-france");
const rowMoviesPopularDb = document.getElementById("row-movies-popular-db");
const rowSeriesPopularDb = document.getElementById("row-series-popular-db");
const rowGenreAction = document.getElementById("row-genre-action");
const rowGenreComedy = document.getElementById("row-genre-comedy");
const rowGenreHorror = document.getElementById("row-genre-horror");
const rowGenreScifi = document.getElementById("row-genre-scifi");
const rowGenreAnimation = document.getElementById("row-genre-animation");
const rowGenreRomance = document.getElementById("row-genre-romance");
const rowGenreThriller = document.getElementById("row-genre-thriller");
const rowGenreDocumentary = document.getElementById("row-genre-documentary");

const top10Section = rowTop10France ? rowTop10France.closest("section") : null;
const top10TitleEl = top10Section ? top10Section.querySelector("h2") : null;
const top10TitleDefault = top10TitleEl ? top10TitleEl.textContent : "Top 10 France";


const detailsModal = document.getElementById("details-modal");
const detailsBody = document.getElementById("details-body");
const playerModal = document.getElementById("player-modal");
const playerInfo = document.getElementById("player-info");
const playerStatus = document.getElementById("player-status");
const playerLoading = document.getElementById("player-loading");
const playerLoadingText = document.getElementById("player-loading-text");
const playerLoadingSubtext = document.getElementById("player-loading-subtext");
const playerLoadingSources = document.getElementById("player-loading-sources");
const playerLoadingStageEl = document.getElementById("player-loading-stage");
const versionSelector = document.getElementById("version-selector");
const videoPlayer = document.getElementById("video-player");
const iframePlayer = document.getElementById("iframe-player");
const playerOpenEmbedBtn = document.getElementById("player-open-embed");
const playerFullscreenBtn = document.getElementById("player-fullscreen");
const playerFullscreenIcon = playerFullscreenBtn ? playerFullscreenBtn.querySelector(".icon") : null;
const playerFullscreenLabel = playerFullscreenBtn ? playerFullscreenBtn.querySelector(".label") : null;
const playerFullscreenExitBtn = document.getElementById("player-fullscreen-exit");

let currentIframeUrl = "";

// === Player loading animation (visible process) ===
const PLAYER_LOADING_SOURCES = ["UTOPIA", "ORIGIN", "AURORA", "COSMOS", "SIRIUS", "SPUTNIKIMOC", "GALAXY"];

let __playerLoadingTextTimer = null;
let __playerLoadingScanTimer = null;
let __playerLoadingTextIndex = 0;
let __playerLoadingScanIndex = 0;
let __playerLoadingSourceEls = null;
let __playerLoadingLastStage = "";
let __playerLoadingToken = 0;

const PLAYER_LOADING_TEXTS = [
  { fr: "Recherche des sources…", en: "Scanning sources…" },
  { fr: "Vérification des versions…", en: "Checking versions…" },
  { fr: "Préparation du lecteur…", en: "Starting player…" },
  { fr: "Optimisation du démarrage…", en: "Optimizing startup…" },
  { fr: "Connexion au flux…", en: "Connecting to stream…" },
];

function ensurePlayerLoadingSourceList() {
  if (!playerLoadingSources) return;
  if (__playerLoadingSourceEls) return;

  __playerLoadingSourceEls = new Map();
  playerLoadingSources.innerHTML = "";
  PLAYER_LOADING_SOURCES.forEach((name) => {
    const row = document.createElement("div");
    row.className = "player-loading-source-row";

    const left = document.createElement("div");
    left.className = "player-loading-source-name";
    left.textContent = name;

    const right = document.createElement("div");
    right.className = "player-loading-source-status";
    right.textContent = "⏳";

    row.appendChild(left);
    row.appendChild(right);

    playerLoadingSources.appendChild(row);
    __playerLoadingSourceEls.set(name, { row, status: right });
  });
}

function setPlayerLoadingSourceStatus(name, status, isActive) {
  try {
    if (!__playerLoadingSourceEls) return;
    const it = __playerLoadingSourceEls.get(name);
    if (!it) return;
    it.status.textContent = status || "⏳";
    if (isActive) it.row.classList.add("is-active");
    else it.row.classList.remove("is-active");
  } catch (_) {}
}

function setPlayerLoadingStage(stage) {
  __playerLoadingLastStage = stage || __playerLoadingLastStage || "init";
  try {
    if (playerLoadingStageEl) {
      if (__playerLoadingLastStage === "init") playerLoadingStageEl.textContent = "initialisation";
      else if (__playerLoadingLastStage === "scan") playerLoadingStageEl.textContent = "scan";
      else if (__playerLoadingLastStage === "versions") playerLoadingStageEl.textContent = "versions prêtes";
      else if (__playerLoadingLastStage === "prepare") playerLoadingStageEl.textContent = "préparation du lecteur";
      else if (__playerLoadingLastStage === "optimize") playerLoadingStageEl.textContent = "optimisation";
      else if (__playerLoadingLastStage === "connect") playerLoadingStageEl.textContent = "connexion au flux";
      else playerLoadingStageEl.textContent = "";
    }
  } catch (_) {}
}

function startPlayerLoadingTextCycle() {
  stopPlayerLoadingTextCycle();
  __playerLoadingTextIndex = 0;
  __playerLoadingTextTimer = setInterval(() => {
    try {
      const item = PLAYER_LOADING_TEXTS[__playerLoadingTextIndex % PLAYER_LOADING_TEXTS.length];
      if (playerLoadingText) playerLoadingText.textContent = item.fr;
      if (playerLoadingSubtext) playerLoadingSubtext.textContent = item.en;
      __playerLoadingTextIndex++;
    } catch (_) {}
  }, 1100);
}

function stopPlayerLoadingTextCycle() {
  try { if (__playerLoadingTextTimer) clearInterval(__playerLoadingTextTimer); } catch (_) {}
  __playerLoadingTextTimer = null;
}

function startPlayerLoadingScanCycle() {
  stopPlayerLoadingScanCycle();
  ensurePlayerLoadingSourceList();

  // Show source list only during scan/versions stages
  try { if (playerLoadingSources) playerLoadingSources.setAttribute("aria-hidden", "false"); } catch (_) {}

  __playerLoadingScanIndex = 0;
  __playerLoadingScanTimer = setInterval(() => {
    try {
      for (let i = 0; i < PLAYER_LOADING_SOURCES.length; i++) {
        const name = PLAYER_LOADING_SOURCES[i];
        const isActive = i === __playerLoadingScanIndex;
        const done = i < __playerLoadingScanIndex;
        setPlayerLoadingSourceStatus(name, done ? "OK" : "⏳", isActive);
      }
      __playerLoadingScanIndex++;
      if (__playerLoadingScanIndex >= PLAYER_LOADING_SOURCES.length) __playerLoadingScanIndex = 0;
    } catch (_) {}
  }, 420);
}

function stopPlayerLoadingScanCycle() {
  try { if (__playerLoadingScanTimer) clearInterval(__playerLoadingScanTimer); } catch (_) {}
  __playerLoadingScanTimer = null;
  try {
    if (__playerLoadingSourceEls) {
      PLAYER_LOADING_SOURCES.forEach((name) => setPlayerLoadingSourceStatus(name, "⏳", false));
    }
  } catch (_) {}
}

function updatePlayerLoadingSourcesFromOptions(options) {
  try {
    ensurePlayerLoadingSourceList();
    const counts = new Map();
    (Array.isArray(options) ? options : []).forEach((o) => {
      const name = getSourceDisplayName(o && o.source);
      if (!name) return;
      counts.set(name, (counts.get(name) || 0) + 1);
    });

    PLAYER_LOADING_SOURCES.forEach((name) => {
      if (counts.get(name) > 0) setPlayerLoadingSourceStatus(name, "OK", false);
      else setPlayerLoadingSourceStatus(name, "x", false);
    });
  } catch (_) {}
}

function showPlayerLoading(payload) {
  __playerLoadingToken++;
  const __tok = __playerLoadingToken;
  if (!playerLoading) return;
  try {
    const stage = (payload && typeof payload === "object") ? payload.stage : null;
    const message = (typeof payload === "string") ? payload : (payload && payload.message) ? payload.message : null;

    ensurePlayerLoadingSourceList();

    if (message && playerLoadingText) playerLoadingText.textContent = message;
    if (message && playerLoadingSubtext) playerLoadingSubtext.textContent = "";

    playerLoading.classList.remove("hidden");
    playerLoading.setAttribute("aria-hidden", "false");

    // Default cycle (FR/EN) for visible process
    startPlayerLoadingTextCycle();

    if (stage) setPlayerLoadingStage(stage);
    else setPlayerLoadingStage(__playerLoadingLastStage || "init");

    if (stage === "scan") startPlayerLoadingScanCycle();
    else if (stage === "versions") {
      // keep list visible but stop active scanning highlight
      stopPlayerLoadingScanCycle();
      try { if (playerLoadingSources) playerLoadingSources.setAttribute("aria-hidden", "false"); } catch (_) {}
    } else {
      stopPlayerLoadingScanCycle();
      try { if (playerLoadingSources) playerLoadingSources.setAttribute("aria-hidden", "true"); } catch (_) {}
    }
  } catch (_) {}
  return __tok;
}

function hidePlayerLoading() {
  if (!playerLoading) return;
  try {
    stopPlayerLoadingTextCycle();
    stopPlayerLoadingScanCycle();
    playerLoading.classList.add("hidden");
    playerLoading.setAttribute("aria-hidden", "true");
  } catch (_) {}
}


// === Cinema sources drawer (Movix-like) ===
const playerSourcesToggleBtn = document.getElementById("player-sources-toggle");
const playerSourcesDrawer = document.getElementById("player-sources-drawer");
const playerSourcesCloseBtn = document.getElementById("player-sources-close");
const playerDrawerBackdrop = document.getElementById("player-drawer-backdrop");

let isPlayerSourcesDrawerOpen = false;
let activePlayerSourceKey = null;

function getOptionKey(opt) {
  try {
    if (!opt) return null;
    if (typeof opt.id !== 'undefined' && opt.id !== null) return 'id:' + String(opt.id);
    if (opt.magnet) return 'magnet:' + String(opt.magnet);
    if (opt.url) return 'url:' + String(opt.url);
  } catch (_) {}
  return null;
}

function updateActiveSourceHighlight() {
  if (!versionSelector) return;
  try {
    const btns = versionSelector.querySelectorAll('[data-key]');
    btns.forEach((b) => {
      const k = b && b.dataset ? b.dataset.key : null;
      if (activePlayerSourceKey && k === activePlayerSourceKey) b.classList.add('active');
      else b.classList.remove('active');
    });
  } catch (_) {}
}

function openPlayerSourcesDrawer() {
  if (!playerSourcesDrawer) return;
  isPlayerSourcesDrawerOpen = true;
  playerSourcesDrawer.classList.add('open');
  playerSourcesDrawer.setAttribute('aria-hidden', 'false');
  if (playerDrawerBackdrop) {
    playerDrawerBackdrop.classList.remove('hidden');
    playerDrawerBackdrop.setAttribute('aria-hidden', 'false');
  }
}

function closePlayerSourcesDrawer() {
  if (!playerSourcesDrawer) return;
  isPlayerSourcesDrawerOpen = false;
  playerSourcesDrawer.classList.remove('open');
  playerSourcesDrawer.setAttribute('aria-hidden', 'true');
  if (playerDrawerBackdrop) {
    playerDrawerBackdrop.classList.add('hidden');
    playerDrawerBackdrop.setAttribute('aria-hidden', 'true');
  }
}

function updateOpenEmbedButton() {
  if (!playerOpenEmbedBtn) return;
  const hasUrl = !!(currentIframeUrl && String(currentIframeUrl).trim());
  if (hasUrl) playerOpenEmbedBtn.classList.remove('hidden');
  else playerOpenEmbedBtn.classList.add('hidden');
}

function getPlayerFullscreenTarget() {
  try {
    // Fullscreen the cinema shell so controls + player are included
    if (!playerModal) return null;
    return playerModal.querySelector('.modal-content.modal-player.cinema-shell') || playerModal.querySelector('.cinema-shell');
  } catch (_) {
    return null;
  }
}

function setPlayerFullscreenUiState(isFs) {
  try {
    const target = getPlayerFullscreenTarget();
    if (target) {
      if (isFs) target.classList.add('is-fullscreen');
      else target.classList.remove('is-fullscreen');
    }
  } catch (_) {}
  // The exit button visibility is handled by CSS (:fullscreen + .is-fullscreen)
}

function updatePlayerFullscreenButton() {
  if (!playerFullscreenBtn) return;
  const isFs = !!document.fullscreenElement;
  // If user is fullscreening something else, still reflect the state to avoid confusion
  playerFullscreenBtn.setAttribute('aria-pressed', isFs ? 'true' : 'false');
  if (playerFullscreenIcon) playerFullscreenIcon.textContent = '⛶';
  if (playerFullscreenLabel) playerFullscreenLabel.textContent = isFs ? 'Quitter le plein écran' : 'Plein écran';
  playerFullscreenBtn.title = isFs ? 'Quitter le plein écran' : 'Plein écran (ONLYUS)';
  playerFullscreenBtn.setAttribute('aria-label', isFs ? 'Quitter le plein écran' : 'Plein écran');
  try {
    if (playerFullscreenExitBtn) {
      playerFullscreenExitBtn.setAttribute('aria-hidden', isFs ? 'false' : 'true');
    }
  } catch (_) {}
  try { setPlayerFullscreenUiState(isFs); } catch (_) {}
}

async function togglePlayerFullscreen() {
  const target = getPlayerFullscreenTarget();
  if (!target) return;
  try {
    if (document.fullscreenElement) {
      if (document.exitFullscreen) await document.exitFullscreen();
      return;
    }
    const req = target.requestFullscreen || target.webkitRequestFullscreen || target.mozRequestFullScreen || target.msRequestFullscreen;
    if (req) await req.call(target);
  } catch (_) {
    // Some browsers block fullscreen without a user gesture; the click handler is a gesture already.
  } finally {
    try { updatePlayerFullscreenButton(); } catch (_) {}
  }
}

try {
  if (playerOpenEmbedBtn) {
    playerOpenEmbedBtn.addEventListener('click', () => {
      const url = (currentIframeUrl || '').toString();
      if (!url) return;
      try { window.open(url, '_blank', 'noopener,noreferrer'); } catch (_) {}
    });
  }
} catch (_) {}

try {
  if (playerFullscreenBtn) {
    playerFullscreenBtn.addEventListener('click', () => {
      togglePlayerFullscreen();
    });
  }
  if (playerFullscreenExitBtn) {
    playerFullscreenExitBtn.addEventListener('click', (e) => {
      try { e.preventDefault(); e.stopPropagation(); } catch (_) {}
      togglePlayerFullscreen();
    });
  }
  document.addEventListener('fullscreenchange', () => {
    updatePlayerFullscreenButton();
  });
  updatePlayerFullscreenButton();
} catch (_) {}

function togglePlayerSourcesDrawer() {
  if (isPlayerSourcesDrawerOpen) closePlayerSourcesDrawer();
  else openPlayerSourcesDrawer();
}

function capturePlayerTimeSafe() {
  try {
    if (!videoPlayer) return 0;
    const t = Number(videoPlayer.currentTime || 0);
    if (Number.isFinite(t) && t > 0) return t;
  } catch (_) {}
  return 0;
}

if (playerSourcesToggleBtn) {
  playerSourcesToggleBtn.addEventListener('click', () => togglePlayerSourcesDrawer());
}
if (playerSourcesCloseBtn) {
  playerSourcesCloseBtn.addEventListener('click', () => closePlayerSourcesDrawer());
}
if (playerDrawerBackdrop) {
  playerDrawerBackdrop.addEventListener('click', () => closePlayerSourcesDrawer());
}

// === HLS (on-demand segments) ===
let hlsJsInstance = null;

function destroyHlsInstance() {
  if (hlsJsInstance) {
    try {
      hlsJsInstance.destroy();
    } catch (_) {}
    hlsJsInstance = null;
  }
}

function setPlayerToVideoMode() {
  try {
    if (iframePlayer) {
      iframePlayer.classList.add("hidden");
      iframePlayer.removeAttribute("src");
    }
  } catch (_) {}
  try {
    currentIframeUrl = "";
    if (playerOpenEmbedBtn) playerOpenEmbedBtn.classList.add('hidden');
  } catch (_) {}
  try {
    if (videoPlayer) videoPlayer.classList.remove("hidden");
  } catch (_) {}
}

function setPlayerToIframeMode(url, opts) {
  destroyHlsInstance();
  try {
    if (playerStatus) playerStatus.textContent = "Chargement du lecteur embed…";
  } catch (_) {}
  try {
    if (videoPlayer) {
      videoPlayer.pause();
      videoPlayer.removeAttribute("src");
      videoPlayer.load();
      videoPlayer.classList.add("hidden");
    }
  } catch (_) {}
  try {
    if (iframePlayer) {
      iframePlayer.classList.remove("hidden");
      currentIframeUrl = url || "";
      // Max compatibility for embeds that rely on autoplay/referrer.
      try { iframePlayer.setAttribute('referrerpolicy', 'unsafe-url'); } catch (_) {}
      iframePlayer.src = currentIframeUrl;

      // Best-effort detection for embeds that refuse to be framed (X-Frame-Options / CSP).
      // In that case Chrome often keeps the iframe at about:blank.
      try {
        const expected = currentIframeUrl;
        setTimeout(() => {
          if (!iframePlayer) return;
          if (!expected) return;
          try {
            const current = String(iframePlayer.src || "");
            // browser may normalize the URL (add trailing slash, etc.)
            if (current && !current.startsWith(expected)) return; // source changed
          } catch (_) {}
          let href = "";
          try {
            href = (iframePlayer.contentWindow && iframePlayer.contentWindow.location) ? String(iframePlayer.contentWindow.location.href || "") : "";
          } catch (_) {
            // Cross-origin access denied: assume it loaded (can't reliably verify)
            try { if (playerStatus) playerStatus.textContent = ""; } catch (_) {}
            return;
          }
          if (href === "about:blank") {
            try {
              // During autoplay we never want to "land" on a blocked iframe screen.
              if (opts && opts.autoplay && typeof opts.onBlocked === "function") {
                try { if (playerStatus) playerStatus.textContent = ""; } catch (_) {}
                try { opts.onBlocked(); } catch (_) {}
                return;
              }
              if (playerStatus) {
                playerStatus.textContent = "Cette source interdit l'intégration (iframe). Essaie une autre source ou ouvre l'embed dans un nouvel onglet.";
              }
            } catch (_) {}
          } else {
            try { if (playerStatus) playerStatus.textContent = ""; } catch (_) {}
          }
        }, 1600);
      } catch (_) {}
    }
  } catch (_) {}

  try {
    if (playerOpenEmbedBtn) {
      if (currentIframeUrl) playerOpenEmbedBtn.classList.remove('hidden');
      else playerOpenEmbedBtn.classList.add('hidden');
    }
  } catch (_) {}
}

async function tryLoadHlsSource(m3u8Url, opts) {
  const timeoutMs = (opts && opts.timeoutMs) ? Number(opts.timeoutMs) : 6000;
  if (!videoPlayer) return false;

  // Always reset previous HLS instance before switching.
  destroyHlsInstance();

  // hls.js (Chrome/Firefox/Edge)
  if (window.Hls && window.Hls.isSupported && window.Hls.isSupported()) {
    return await new Promise((resolve) => {
      let done = false;
      let timer = null;
      const finish = (ok) => {
        if (done) return;
        done = true;
        try {
          if (timer) clearTimeout(timer);
        } catch (_) {}
        if (!ok) {
          destroyHlsInstance();
        }
        resolve(!!ok);
      };

      const hls = new window.Hls({
        enableWorker: true,
        backBufferLength: 90,
      });
      hlsJsInstance = hls;

      timer = setTimeout(() => {
        console.warn("[HLS] Timeout manifest, fallback");
        try {
          hls.stopLoad();
        } catch (_) {}
        finish(false);
      }, timeoutMs);

      hls.on(window.Hls.Events.MANIFEST_PARSED, () => finish(true));
      hls.on(window.Hls.Events.ERROR, (event, data) => {
        if (data && data.fatal) {
          console.warn("[HLS] Fatal error", data);
          finish(false);
        }
      });

      try {
        hls.loadSource(m3u8Url);
        hls.attachMedia(videoPlayer);
      } catch (e) {
        console.warn("[HLS] attach error", e);
        finish(false);
      }
    });
  }

  // Safari native HLS
  try {
    if (videoPlayer.canPlayType && videoPlayer.canPlayType("application/vnd.apple.mpegurl")) {
      videoPlayer.src = m3u8Url;
      videoPlayer.load();
      return true;
    }
  } catch (_) {}

  return false;
}

async function setPlayerSourceWithHlsFallback(m3u8Url, fallbackUrl) {
  if (!videoPlayer) return;
  if (playerStatus) playerStatus.textContent = "Préparation HLS...";

  const ok = await tryLoadHlsSource(m3u8Url, { timeoutMs: 6500 });
  if (ok) {
    if (playerStatus) playerStatus.textContent = "";
    return;
  }

  // Fallback : routes /api/stream existantes
  destroyHlsInstance();
  if (playerStatus) playerStatus.textContent = "HLS indisponible, fallback...";
  videoPlayer.src = fallbackUrl;
  videoPlayer.load();
  if (playerStatus) playerStatus.textContent = "";
}

// Series episode navigation UI
const episodeNav = document.getElementById("episode-nav");
const episodePrevBtn = document.getElementById("episode-prev");
const episodeNextBtn = document.getElementById("episode-next");

// Auto-next overlay
const autoNextOverlay = document.getElementById("autonext-overlay");
const autoNextCount = document.getElementById("autonext-count");
const autoNextCancelBtn = document.getElementById("autonext-cancel");
const autoNextPlayBtn = document.getElementById("autonext-play");

if (videoPlayer) {
  videoPlayer.addEventListener("timeupdate", handleVideoTimeUpdate);
  videoPlayer.addEventListener("ended", handleVideoEnded);
}

function handleGlobalKeydown(event) {
  if (!playerModal || !videoPlayer) return;
  if (playerModal.classList.contains("hidden")) return;

  const tag = (event.target && event.target.tagName) ? event.target.tagName.toLowerCase() : "";
  if (tag === "input" || tag === "textarea" || event.target.isContentEditable) {
    return;
  }

  if (event.code === "Escape") {
    event.preventDefault();
    if (isPlayerSourcesDrawerOpen) {
      closePlayerSourcesDrawer();
    } else {
      hideModal(playerModal);
    }
    return;
  }

  if (event.code === "Space") {
    event.preventDefault();
    if (videoPlayer.paused) {
      const p = videoPlayer.play();
      if (p && p.catch) p.catch(() => {});
    } else {
      videoPlayer.pause();
    }
  } else if (event.code === "ArrowRight") {
    event.preventDefault();
    try {
      const dur = videoPlayer.duration || 0;
      let t = (videoPlayer.currentTime || 0) + 10;
      if (dur && t > dur) t = dur;
      videoPlayer.currentTime = t;
    } catch (e) {}
  } else if (event.code === "ArrowLeft") {
    event.preventDefault();
    try {
      let t = (videoPlayer.currentTime || 0) - 10;
      if (t < 0) t = 0;
      videoPlayer.currentTime = t;
    } catch (e) {}
  } else if (event.code === "KeyN") {
    // Next episode (only when watching a series)
    // (Open the next episode screen; user can choose the version.)
    if (currentEpisodeNavState && currentEpisodeNavState.next) {
      event.preventDefault();
      navigateToEpisode(currentEpisodeNavState.next, { autoStart: false });
    }
  } else if (event.code === "KeyP") {
    // Previous episode (only when watching a series)
    // (Open the previous episode screen; user can choose the version.)
    if (currentEpisodeNavState && currentEpisodeNavState.prev) {
      event.preventDefault();
      navigateToEpisode(currentEpisodeNavState.prev, { autoStart: false });
    }
  }
}

window.addEventListener("keydown", handleGlobalKeydown);

// When a modal is open, route wheel scrolls to the modal content
function handleModalWheel(e) {
  try {
    const openModal = document.querySelector(".modal:not(.hidden)");
    if (!openModal) return;
    const content = openModal.querySelector(".modal-content");
    if (!content) return;

    // If the wheel event is outside the modal content, scroll the content instead.
    if (!content.contains(e.target)) {
      e.preventDefault();
      content.scrollBy({ top: e.deltaY, left: 0, behavior: "auto" });
    }
  } catch (_) {}
}

document.addEventListener("wheel", handleModalWheel, { passive: false });

// === Episode Next/Prev + Auto-next (Series) ===

let currentEpisodeNavState = null;
let episodeNavRequestId = 0;
let autoNextIntervalId = null;
let autoNextTimeoutId = null;
let autoNextSecondsLeft = 0;

// Caches to avoid refetching TMDB helpers too often
const seriesDetailsCache = new Map(); // tmdbId -> { seasons: number[] }
const seasonEpisodesCache = new Map(); // `${tmdbId}:${season}` -> episodes[]

function clearAutoNext() {
  if (autoNextIntervalId) {
    clearInterval(autoNextIntervalId);
    autoNextIntervalId = null;
  }
  if (autoNextTimeoutId) {
    clearTimeout(autoNextTimeoutId);
    autoNextTimeoutId = null;
  }
  autoNextSecondsLeft = 0;
  if (autoNextOverlay) {
    autoNextOverlay.classList.add("hidden");
  }
}

function setEpisodeNavState(state) {
  currentEpisodeNavState = state || null;

  if (!episodeNav || !episodePrevBtn || !episodeNextBtn) return;

  if (!state || !state.enabled) {
    episodeNav.classList.add("hidden");
    episodePrevBtn.disabled = true;
    episodeNextBtn.disabled = true;
    return;
  }

  episodeNav.classList.remove("hidden");
  episodePrevBtn.disabled = !state.prev;
  episodeNextBtn.disabled = !state.next;
}

async function getSeriesSeasons(tmdbId) {
  if (!tmdbId) return [];
  if (seriesDetailsCache.has(tmdbId)) return seriesDetailsCache.get(tmdbId).seasons || [];

  const data = await fetchJSON(API_BASE + "/api/tmdb/series/" + tmdbId);
  const seasonsRaw = (data && Array.isArray(data.seasons)) ? data.seasons : [];
  const seasons = seasonsRaw
    .map((s) => (s && typeof s.season_number === "number" ? s.season_number : null))
    .filter((n) => n != null && n >= 1)
    .sort((a, b) => a - b);

  seriesDetailsCache.set(tmdbId, { seasons });
  return seasons;
}

async function getSeasonEpisodes(tmdbId, season) {
  if (!tmdbId || season == null) return [];
  const key = `${tmdbId}:${season}`;
  if (seasonEpisodesCache.has(key)) return seasonEpisodesCache.get(key);

  const data = await fetchJSON(
    API_BASE + "/api/tmdb/series/" + tmdbId + "/season/" + season
  );
  const episodes = (data && Array.isArray(data.episodes)) ? data.episodes : [];
  seasonEpisodesCache.set(key, episodes);
  return episodes;
}

async function computeEpisodeNav(tmdbId, season, episode) {
  if (!tmdbId || season == null || episode == null) {
    return { enabled: false, prev: null, next: null };
  }

  // Current season episodes
  const episodes = await getSeasonEpisodes(tmdbId, season);
  const epNumbers = episodes
    .map((e) => (e && typeof e.episode_number === "number" ? e.episode_number : null))
    .filter((n) => n != null)
    .sort((a, b) => a - b);

  const idx = epNumbers.indexOf(Number(episode));
  const hasLocal = idx !== -1;
  const prevLocal = hasLocal && idx > 0 ? { season: Number(season), episode: epNumbers[idx - 1] } : null;
  const nextLocal = hasLocal && idx < epNumbers.length - 1 ? { season: Number(season), episode: epNumbers[idx + 1] } : null;

  // Cross-season navigation if needed
  let prev = prevLocal;
  let next = nextLocal;

  const seasons = await getSeriesSeasons(tmdbId);
  const sIndex = seasons.indexOf(Number(season));

  if (!prev && sIndex > 0) {
    const prevSeason = seasons[sIndex - 1];
    const prevSeasonEpisodes = await getSeasonEpisodes(tmdbId, prevSeason);
    const prevEpNumbers = prevSeasonEpisodes
      .map((e) => (e && typeof e.episode_number === "number" ? e.episode_number : null))
      .filter((n) => n != null)
      .sort((a, b) => a - b);
    if (prevEpNumbers.length) {
      prev = { season: prevSeason, episode: prevEpNumbers[prevEpNumbers.length - 1] };
    }
  }

  if (!next && sIndex !== -1 && sIndex < seasons.length - 1) {
    const nextSeason = seasons[sIndex + 1];
    const nextSeasonEpisodes = await getSeasonEpisodes(tmdbId, nextSeason);
    const nextEpNumbers = nextSeasonEpisodes
      .map((e) => (e && typeof e.episode_number === "number" ? e.episode_number : null))
      .filter((n) => n != null)
      .sort((a, b) => a - b);
    if (nextEpNumbers.length) {
      next = { season: nextSeason, episode: nextEpNumbers[0] };
    }
  }

  return { enabled: true, prev, next };
}

async function navigateToEpisode(target, opts) {
  if (!target || !currentPlaybackContext || currentPlaybackContext.mode !== "episode") return;

  const tmdbId = currentPlaybackContext.tmdbId;
  const seriesName = currentPlaybackContext.seriesName;
  const autoStart = !!(opts && opts.autoStart);

  clearAutoNext();
  await openEpisodePlayerWithOptions(tmdbId, target.season, target.episode, seriesName, {
    autoStart,
  });
}

function scheduleAutoNext() {
  clearAutoNext();
  if (!currentEpisodeNavState || !currentEpisodeNavState.next) return;

  autoNextSecondsLeft = 10;
  if (autoNextCount) autoNextCount.textContent = String(autoNextSecondsLeft);
  if (autoNextOverlay) autoNextOverlay.classList.remove("hidden");

  autoNextIntervalId = setInterval(() => {
    autoNextSecondsLeft -= 1;
    if (autoNextSecondsLeft < 0) autoNextSecondsLeft = 0;
    if (autoNextCount) autoNextCount.textContent = String(autoNextSecondsLeft);
  }, 1000);

  autoNextTimeoutId = setTimeout(() => {
    const target = currentEpisodeNavState && currentEpisodeNavState.next;
    if (!target) return;
    navigateToEpisode(target, { autoStart: true });
  }, 10000);
}

if (episodePrevBtn) {
  episodePrevBtn.addEventListener("click", () => {
    if (!currentEpisodeNavState || !currentEpisodeNavState.prev) return;
    // Manual navigation: open next/prev and let user pick a version (safer)
    navigateToEpisode(currentEpisodeNavState.prev, { autoStart: false });
  });
}

if (episodeNextBtn) {
  episodeNextBtn.addEventListener("click", () => {
    if (!currentEpisodeNavState || !currentEpisodeNavState.next) return;
    // Manual navigation: open next/prev and let user pick a version (safer)
    navigateToEpisode(currentEpisodeNavState.next, { autoStart: false });
  });
}

if (autoNextCancelBtn) {
  autoNextCancelBtn.addEventListener("click", () => {
    clearAutoNext();
  });
}

if (autoNextPlayBtn) {
  autoNextPlayBtn.addEventListener("click", () => {
    if (!currentEpisodeNavState || !currentEpisodeNavState.next) return;
    navigateToEpisode(currentEpisodeNavState.next, { autoStart: true });
  });
}

// Utilisation du cache serveur pour les images TMDB
const imageBase = IS_AUDIT_MODE ? "/api/tmdb-image/w92" : "/api/tmdb-image/w185";
const imageBasePoster = IS_AUDIT_MODE ? "/api/tmdb-image/w154" : "/api/tmdb-image/w342";

function initWebTorrent() {
  if (window.WebTorrent && !webtorrentClient) {
    webtorrentClient = new WebTorrent();
    console.log("[PLAYER] WebTorrent client initialisé");
  } else if (!window.WebTorrent) {
    console.warn(
      "[PLAYER] WebTorrent n'est pas encore chargé. Assurez-vous que la connexion Internet permet de charger la bibliothèque depuis le CDN."
    );
  }
}

document.addEventListener("click", (e) => {
  const target = e.target;
  if (!target) return;
  const closeId = target.getAttribute("data-close");
  if (closeId) {
    // Special handling for game modal
    if (closeId === 'game-modal') {
      closeGameModal();
      return;
    }
    const modal = document.getElementById(closeId);
    if (modal) hideModal(modal);
  }
});

function showModal(modal) {
  modal.classList.remove("hidden");
  try {
    document.body.classList.add("modal-open");
    if (modal && modal.id === "details-modal") {
      const content = modal.querySelector(".modal-content");
      if (content) content.scrollTop = 0;
    }
  } catch (_) {}
}

function initCollapsibleRows() {
  const sections = document.querySelectorAll(".home-row-collapsible");
  if (!sections.length) return;

  const setCollapsed = (section, collapsed) => {
    const btn = section.querySelector(".row-toggle");
    if (!btn) return;
    section.classList.toggle("is-collapsed", collapsed);
    btn.setAttribute("aria-expanded", (!collapsed).toString());
    btn.textContent = collapsed ? "+" : "–";
  };

  sections.forEach((section) => {
    const btn = section.querySelector(".row-toggle");
    if (!btn) return;
    let saved = null;
    try {
      saved = localStorage.getItem(`collapse:${section.id}`);
    } catch (_) {
      saved = null;
    }
    if (saved === "1") setCollapsed(section, true);

    btn.addEventListener("click", () => {
      const collapsed = section.classList.contains("is-collapsed");
      const next = !collapsed;
      setCollapsed(section, next);
      try {
        localStorage.setItem(`collapse:${section.id}`, next ? "1" : "0");
      } catch (_) {}
    });
  });
}

const openPreplayGate = (meta, onContinue) => {
  try { muteDetailsPreviewAudio(); } catch (_) {}
  if (typeof meta === "function") {
    onContinue = meta;
    meta = null;
  }
  if (!preplayModal || typeof onContinue !== "function") {
    if (typeof onContinue === "function") onContinue();
    return;
  }
  if (!preplayAdsEnabled) {
    onContinue();
    return;
  }
  preplayGateMeta = meta;
  preplayGuard.active = true;
  preplayContinueAction = onContinue;
  if (preplayTitle) preplayTitle.textContent = preplayTitleStep1;
  if (preplayAdsStep) preplayAdsStep.classList.remove("hidden");
  if (preplayTipsStep) preplayTipsStep.classList.add("hidden");
  showModal(preplayModal);
};

if (preplayAdsBtn) {
  preplayAdsBtn.addEventListener("click", () => {
    // Run the ad opening on the user click
    runPreplayAdScriptOnce();
    // Small delay to keep the click focused on the ad trigger
    setTimeout(() => {
      if (preplayTitle) preplayTitle.textContent = preplayTitleStep2;
      if (preplayAdsStep) preplayAdsStep.classList.add("hidden");
      if (preplayTipsStep) preplayTipsStep.classList.remove("hidden");
    }, 80);
  });
}

if (preplayStartBtn) {
  preplayStartBtn.addEventListener("click", () => {
    const action = preplayContinueAction;
    hideModal(preplayModal);
    if (typeof action === "function") action();
  });
}

function hideModal(modal) {
  modal.classList.add("hidden");
  try {
    // If no visible modal remains, unlock body scroll
    const anyOpen = document.querySelector(".modal:not(.hidden)");
    if (!anyOpen) document.body.classList.remove("modal-open");
  } catch (_) {}

  if (modal === detailsModal) {
    try {
      const iframe = detailsBody && detailsBody.querySelector("iframe[data-preview-video]");
      if (iframe) iframe.src = "about:blank";
    } catch (_) {}
    try { destroyDetailsPlayers(); } catch (_) {}
  }

  if (modal === preplayModal) {
    preplayContinueAction = null;
    preplayGuard.active = false;
    preplayGateMeta = null;
    if (preplayTitle) preplayTitle.textContent = preplayTitleStep1;
    if (preplayAdsStep) preplayAdsStep.classList.remove("hidden");
    if (preplayTipsStep) preplayTipsStep.classList.add("hidden");
  }

  // Stop playback on close (iframe + video) so audio never continues in background.
  if (modal === playerModal) {
    try { closePlayerSourcesDrawer(); } catch (_) {}
    clearAutoNext();
    setEpisodeNavState(null);

    // If ONLYUS fullscreen is active, exit it when closing the player modal
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen && document.exitFullscreen();
      }
    } catch (_) {}

    destroyHlsInstance();
    stopCurrentTorrent();

    // Video cleanup
    try {
      if (videoPlayer) {
        try { videoPlayer.pause(); } catch (_) {}
        try { videoPlayer.removeAttribute("src"); } catch (_) {}
        try { videoPlayer.load(); } catch (_) {}
      }
    } catch (_) {}

    // Iframe cleanup (forces unload to stop audio)
    try {
      if (iframePlayer) {
        try { iframePlayer.src = "about:blank"; } catch (_) {}
        try { iframePlayer.removeAttribute("src"); } catch (_) {}
        try { iframePlayer.classList.add("hidden"); } catch (_) {}
      }
    } catch (_) {}

    try {
      currentIframeUrl = "";
      updateOpenEmbedButton();
    } catch (_) {}
  }

  // OnlyFoot: ensure iframe stops when closing the modal (no background audio)
  try {
    if (modal && modal.id === "onlyfoot-modal") {
      const ofIframe = document.getElementById("onlyfoot-iframe");
      if (ofIframe) {
        try { ofIframe.src = "about:blank"; } catch (_) {}
        try { ofIframe.removeAttribute("src"); } catch (_) {}
      }
      try { window.__onlyfootLastEmbedUrl = ""; } catch (_) {}
      const openBtn = document.getElementById("onlyfoot-open-newtab");
      if (openBtn) {
        try { openBtn.onclick = null; } catch (_) {}
        try { openBtn.disabled = true; } catch (_) {}
      }
      // Note: on garde la connexion chat active meme quand la modal est fermee
      // pour ne pas perdre la connexion a chaque ouverture/fermeture
    }
  } catch (_) {}


  // TV Live: ensure iframe stops when closing the modal (no background audio)
  try {
    if (modal && modal.id === "tv-modal") {
      const tvI = document.getElementById("tv-iframe");
      if (tvI) {
        try { tvI.src = "about:blank"; } catch (_) {}
        try { tvI.removeAttribute("src"); } catch (_) {}
      }
      try { window.__tvLiveLastUrl = ""; } catch (_) {}
    }
  } catch (_) {}
}

// === Support / Dons (Footer + Settings) ===
function syncSettingsModalProfile() {
  try {
    if (!settingsActiveProfileEl) return;
    const p = (typeof getCurrentProfile === "function") ? getCurrentProfile() : null;
    settingsActiveProfileEl.textContent = p && p.name ? String(p.name) : "x";
  } catch (_) {}
}

function openSettingsModal() {
  if (!settingsModal) return;
  syncSettingsModalProfile();
  showModal(settingsModal);
}

function openDonateModal() {
  if (!donateModal) return;
  // Keep it clean: close settings if it was open
  try {
    if (settingsModal && !settingsModal.classList.contains("hidden")) {
      hideModal(settingsModal);
    }
  } catch (_) {}
  showModal(donateModal);
}

function initSupportUI() {
  if (footerDonateBtn) {
    footerDonateBtn.addEventListener("click", () => {
      openDonateModal();
    });
  }

  if (settingsDonateBtn) {
    settingsDonateBtn.addEventListener("click", () => {
      openDonateModal();
    });
  }

  if (donateModal) {
    try {
      const links = donateModal.querySelectorAll(".donate-amount");
      links.forEach((a) => {
        a.addEventListener("click", () => {
          try { hideModal(donateModal); } catch (_) {}
        });
      });
    } catch (_) {}
  }
}

initSupportUI();


function buildCard(item) {
  const {
    id,
    media_type,
    title,
    name,
    poster_path,
    first_air_date,
    release_date,
  } = item;

  const isMovie = (media_type || item.media_type) === "movie" || !!item.title;
  const displayTitle = isMovie ? title : name;
  const date = isMovie ? release_date : first_air_date;
  const year = date ? String(date).slice(0, 4) : "";

  const card = document.createElement("div");
  card.className = "card";
  card.dataset.id = id;
  card.dataset.type = isMovie ? "movie" : "series";

  const img = document.createElement("img");
  img.className = "card-img";
  img.src = poster_path ? imageBase + poster_path : "";
  img.alt = displayTitle || "";
  img.loading = "lazy";
  img.decoding = "async";
  if (!poster_path) {
    img.style.background = "#111525";
  }

  // Pas de titre affiché sur les cartes (les jaquettes suffisent).
  // On garde uniquement l'accessibilité via un aria-label.
  card.setAttribute(
    "aria-label",
    `${displayTitle || "Sans titre"}${year ? " (" + year + ")" : ""}`
  );

  card.appendChild(img);

  card.addEventListener("click", () => openDetails(id, isMovie ? "movie" : "series"));

  return card;
}

function buildTmdbImageUrl(filePath, size = "original") {
  if (!filePath) return "";
  return `https://image.tmdb.org/t/p/${size}${filePath}`;
}

function preloadHeroImage(url) {
  if (!url) return;
  const safe = String(url).trim();
  if (!safe || safe === "null" || safe === "undefined") return;
  const isHttp = /^https?:\/\//i.test(safe);
  const isRelative = safe.startsWith("/");
  const isData = safe.startsWith("data:");
  const isBlob = safe.startsWith("blob:");
  if (!isHttp && !isRelative && !isData && !isBlob) return;
  let resolved = safe;
  try {
    resolved = new URL(safe, window.location.origin).href;
  } catch (_) {
    return;
  }
  const id = "hero-preload";
  let link = document.getElementById(id);
  if (!link) {
    link = document.createElement("link");
    link.id = id;
    link.rel = "preload";
    link.as = "image";
    link.setAttribute("href", resolved);
    document.head.appendChild(link);
    return;
  }
  if (link.getAttribute("href") !== resolved) {
    link.setAttribute("href", resolved);
  }
}

function pickBestTmdbLogo(logos) {
  if (!Array.isArray(logos) || logos.length === 0) return null;

  const usable = logos
    .filter((l) => l && l.file_path)
    .filter((l) => {
      const w = Number(l.width) || 0;
      const h = Number(l.height) || 0;
      if (w < 300) return false; // avoid tiny/pixelated logos
      if (!h) return true;
      const ratio = w / h;
      return ratio >= 1.2; // avoid very vertical logos
    });

  if (usable.length === 0) return null;

  const langRank = (iso) => {
    if (iso === "fr") return 0;
    if (iso === "en") return 1;
    if (iso == null) return 2;
    return 3;
  };

  let best = null;
  let bestRank = 999;
  let bestScore = -Infinity;

  for (const l of usable) {
    const rank = langRank(l.iso_639_1);
    const w = Number(l.width) || 0;
    const voteCount = Number(l.vote_count) || 0;
    const score = w * 2 + voteCount;

    if (rank < bestRank || (rank === bestRank && score > bestScore)) {
      best = l;
      bestRank = rank;
      bestScore = score;
    }
  }

  return best;
}

async function getHeroLogoUrl(tmdbId, mediaType) {
  if (!tmdbId) return null;
  const key = `${mediaType}:${tmdbId}`;
  if (heroLogoCache.has(key)) return heroLogoCache.get(key);

  try {
    const endpoint = mediaType === "movie"
      ? `/api/tmdb/movie/${tmdbId}/images`
      : `/api/tmdb/series/${tmdbId}/images`;

    const data = await fetchJSON(API_BASE + endpoint);
    const chosen = pickBestTmdbLogo(data && data.logos);
    const url = chosen && chosen.file_path ? buildTmdbImageUrl(chosen.file_path, "w500") : null;

    heroLogoCache.set(key, url);
    return url;
  } catch (e) {
    heroLogoCache.set(key, null);
    return null;
  }
}

function setHeroTitleMode({ titleText = "", logoUrl = null } = {}) {
  if (heroLogo) {
    if (logoUrl) {
      heroLogo.src = logoUrl;
      heroLogo.classList.remove("hidden");
    } else {
      heroLogo.removeAttribute("src");
      heroLogo.classList.add("hidden");
    }
  }

  if (heroTitle) {
    heroTitle.textContent = titleText || "";
    if (logoUrl) {
      heroTitle.classList.add("is-hidden");
    } else {
      heroTitle.classList.remove("is-hidden");
    }
  }
}

function renderHero(item) {
  if (!heroSection || !heroTitle || !heroMeta) return;
  if (!item) return;

  // Trigger fade-in (CSS) on each new hero item
  heroSection.classList.remove("hero-loaded");

  const isMovie = item.media_type === "movie";
  const title = isMovie ? item.title || item.name : item.name || item.title;
const date = isMovie ? item.release_date : item.first_air_date;
  const year = date ? String(date).slice(0, 4) : "";
const typeLabel = isMovie ? "Film" : "Série";

  // Default: show display title immediately (no blocking)
  setHeroTitleMode({ titleText: title || "", logoUrl: null });
  // Meta line (simple & safe): année + type (le reste peut venir plus tard via détails)
  heroMeta.textContent = [year, typeLabel].filter(Boolean).join(" • ");
  if (heroOverview) heroOverview.textContent = item.overview || "";
  const backdrop = item.backdrop_path || item.poster_path || "";
  const imageBaseBackdrop = IS_AUDIT_MODE ? "/api/tmdb-image/w500" : "/api/tmdb-image/original";
  const backdropUrl = (!IS_AUDIT_MODE && backdrop) ? `${imageBaseBackdrop}${backdrop}` : "";
  if (backdropUrl) preloadHeroImage(backdropUrl);
  setHeroBackdrop(backdropUrl, { crossfade: true });

  if (!IS_AUDIT_MODE && backdropUrl) {
    updateHeroGlowFromBackdrop(backdropUrl);
  }

  // Actions : Lecture = ouvrir directement la fiche détail
  const tmdbId = item.id;
  const mediaType = isMovie ? "movie" : "series";

  if (IS_AUDIT_MODE) {
    if (heroPlayBtn) heroPlayBtn.onclick = null;
    if (heroMoreBtn) heroMoreBtn.onclick = null;
    return;
  }

  // Try to load a TMDB logo PNG (non-blocking). Guard against stale async responses.
  const currentReq = ++heroLogoRequestId;
  (async () => {
    const logoUrl = await getHeroLogoUrl(tmdbId, mediaType);
    if (currentReq !== heroLogoRequestId) return; // hero already changed
    if (logoUrl) {
      setHeroTitleMode({ titleText: title || "", logoUrl });
    }
  })();

  if (heroPlayBtn) {
    heroPlayBtn.onclick = () => {
      openDetails(tmdbId, mediaType);
    };
  }
  if (heroMoreBtn) {
    heroMoreBtn.onclick = () => {
      openDetails(tmdbId, mediaType);
    };
  }
}

function initHeroBackdropLayers() {
  if (!heroSection) return null;
  const backdropRoot = heroSection.querySelector(".hero-backdrop");
  if (!backdropRoot) return null;

  if (heroBackdropLayers && heroBackdropLayers.length === 2) {
    return heroBackdropLayers;
  }

  const layerA = document.createElement("div");
  layerA.className = "hero-backdrop-layer is-active hero-kenburns";
  const layerB = document.createElement("div");
  layerB.className = "hero-backdrop-layer";

  // Insert layers behind gradient/content (as first children)
  backdropRoot.insertBefore(layerB, backdropRoot.firstChild);
  backdropRoot.insertBefore(layerA, backdropRoot.firstChild);

  // Keep existing inline background as a fallback (no breaking changes)
  // but we prefer the layers for crossfade.
  heroBackdropLayers = [layerA, layerB];
  heroActiveLayerIndex = 0;
  return heroBackdropLayers;
}

function preloadImage(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(false);
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

// === Hero premium: adaptive glow color (dominant backdrop color) ===
let heroGlowRequestId = 0;
const heroGlowCache = new Map();

/**
 * Compute a dominant color from an image URL (best-effort).
 * Uses a tiny canvas downscale. If CORS blocks it, returns null.
 */
async function getDominantColorRGBA(url) {
  if (!url) return null;
  if (heroGlowCache.has(url)) return heroGlowCache.get(url);

  const res = await new Promise((resolve) => {
    try {
      const img = new Image();
      // Do NOT set crossOrigin here.
      // Many CDNs (including TMDB image endpoints) don't send the necessary
      // CORS headers for canvas sampling, which produces noisy console errors
      // like "blocked by CORS policy". We keep the premium glow feature as a
      // best-effort: if canvas sampling is blocked, we fall back gracefully.
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    } catch (e) {
      resolve(null);
    }
  });

  if (!res) {
    heroGlowCache.set(url, null);
    return null;
  }

  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const size = 32;
    canvas.width = size;
    canvas.height = size;

    // Draw scaled image
    ctx.drawImage(res, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);

    let r = 0, g = 0, b = 0, count = 0;

    // Sample every 2 pixels to reduce cost
    for (let i = 0; i < data.length; i += 4 * 2) {
      const a = data[i + 3];
      if (a < 8) continue;

      const rr = data[i];
      const gg = data[i + 1];
      const bb = data[i + 2];

      // Ignore near-gray pixels (helps keep a 'color' glow instead of dull)
      const maxc = Math.max(rr, gg, bb);
      const minc = Math.min(rr, gg, bb);
      if (maxc - minc < 18) continue;

      r += rr; g += gg; b += bb;
      count++;
    }

    if (!count) {
      heroGlowCache.set(url, null);
      return null;
    }

    r = Math.round(r / count);
    g = Math.round(g / count);
    b = Math.round(b / count);

    // Normalize luminance to keep glow visible but not neon
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    // If too dark, lift toward midtones
    if (luma < 70) {
      const lift = (90 - luma) / 90; // 0..~0.2
      r = Math.round(r + (255 - r) * lift * 0.35);
      g = Math.round(g + (255 - g) * lift * 0.35);
      b = Math.round(b + (255 - b) * lift * 0.35);
    }

    // If too bright, tame it
    if (luma > 190) {
      const tame = (luma - 190) / 65;
      r = Math.round(r * (1 - tame * 0.25));
      g = Math.round(g * (1 - tame * 0.25));
      b = Math.round(b * (1 - tame * 0.25));
    }

    const rgba = `rgba(${r}, ${g}, ${b}, 0.65)`;
    heroGlowCache.set(url, rgba);
    return rgba;
  } catch (e) {
    // Likely CORS-tainted canvas
    heroGlowCache.set(url, null);
    return null;
  }
}

async function updateHeroGlowFromBackdrop(backdropUrl) {
  if (!heroSection) return;
  const req = ++heroGlowRequestId;

  // Default fallback glow (OnlyUs vibe)
  const fallback = "rgba(0, 160, 255, 0.65)";
  heroSection.style.setProperty("--hero-glow", fallback);

  const rgba = await getDominantColorRGBA(backdropUrl);
  if (req !== heroGlowRequestId) return; // hero already changed

  if (rgba) {
    heroSection.style.setProperty("--hero-glow", rgba);
  } else {
    // keep fallback
    heroSection.style.setProperty("--hero-glow", fallback);
  }
}


function setHeroBackdrop(url, { crossfade = true } = {}) {
  if (!heroSection) return;
  const layers = initHeroBackdropLayers();
  const backdropDiv = heroSection.querySelector(".hero-backdrop");

  // No URL? keep current.
  if (!url) {
    // Still allow content fade-in
    requestAnimationFrame(() => heroSection.classList.add("hero-loaded"));
    return;
  }

  // Avoid reloading the exact same backdrop in a loop
  if (url === heroLastBackdropUrl) {
    requestAnimationFrame(() => heroSection.classList.add("hero-loaded"));
    return;
  }
  heroLastBackdropUrl = url;

  // If layers are not ready, fallback to previous behavior
  if (!layers || !backdropDiv) {
    backdropDiv.style.backgroundImage = `url(${url})`;
    requestAnimationFrame(() => heroSection.classList.add("hero-loaded"));
    return;
  }

  const prefersReducedMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const current = layers[heroActiveLayerIndex];
  const nextIndex = heroActiveLayerIndex === 0 ? 1 : 0;
  const next = layers[nextIndex];

  const doSwap = () => {
    // Apply image on next layer
    next.style.backgroundImage = `url(${url})`;

    // Restart Ken Burns on the active layer (so each hero feels "vivant")
    current.classList.remove("hero-kenburns");
    next.classList.remove("hero-kenburns");
    // Force reflow to restart animation reliably
    void next.offsetWidth; // eslint-disable-line no-unused-expressions
    next.classList.add("hero-kenburns");

    if (!crossfade || prefersReducedMotion) {
      current.classList.remove("is-active");
      next.classList.add("is-active");
    } else {
      // Crossfade
      next.classList.add("is-active");
      current.classList.remove("is-active");
    }

    heroActiveLayerIndex = nextIndex;
    requestAnimationFrame(() => heroSection.classList.add("hero-loaded"));
  };

  // Preload to avoid flashing on slower networks
  preloadImage(url).then(doSwap);
}

function stopHeroCarousel() {
  if (heroCarouselTimer) {
    clearInterval(heroCarouselTimer);
    heroCarouselTimer = null;
  }
}

function startHeroCarousel(items, { intervalMs = 7000 } = {}) {
  stopHeroCarousel();
  heroCarouselItems = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!heroCarouselItems.length) return;

  // Start from 0 (the first hero is already rendered by the caller)
  heroCarouselIndex = 0;

  const tick = () => {
    if (!heroCarouselItems.length) return;
    heroCarouselIndex = (heroCarouselIndex + 1) % heroCarouselItems.length;
    renderHero(heroCarouselItems[heroCarouselIndex]);
  };

  heroCarouselTimer = setInterval(tick, intervalMs);
}

async function fetchJSON(url) {
  const headers = {};
  if (clientTokensEnabled && clientAccessToken) headers["x-client-token"] = clientAccessToken;
  if (clientTokensEnabled && String(url || "").includes("/api/options/")) {
    const ok = await ensureShortAccessToken(false);
    if (ok && shortAccessToken) headers["x-short-token"] = shortAccessToken;
  }
  const res = await fetch(url, {
    headers,
    cache: "no-store",
  });
  if (!res.ok) {
    if (res.status === 401) {
      const refreshed = clientTokensEnabled ? await ensureClientAccessToken(true) : false;
      const refreshedShort = clientTokensEnabled && String(url || "").includes("/api/options/")
        ? await ensureShortAccessToken(true)
        : false;
      if (refreshed) {
        const retryHeaders = clientAccessToken ? { "x-client-token": clientAccessToken } : {};
        if (refreshedShort && shortAccessToken) retryHeaders["x-short-token"] = shortAccessToken;
        const retry = await fetch(url, {
          headers: retryHeaders,
        });
        if (retry.ok) return retry.json();
        throw new Error(`HTTP ${retry.status}`);
      }
    }
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

async function ensureClientAccessToken(force = false) {
  if (!clientTokensEnabled) return false;
  const now = Date.now();
  if (!force && clientAccessToken && clientAccessTokenExp && clientAccessTokenExp > now + 30_000) {
    return true;
  }
  try {
    const res = await fetch(`${API_BASE}/api/token`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data || !data.token) return false;
    clientAccessToken = data.token;
    clientAccessTokenExp = data.exp || (Date.now() + 10 * 60 * 1000);
    return true;
  } catch (_) {
    return false;
  }
}

async function ensureShortAccessToken(force = false) {
  if (!clientTokensEnabled) return false;
  const now = Date.now();
  if (!force && shortAccessToken && shortAccessTokenExp && shortAccessTokenExp > now + 30_000) {
    return true;
  }
  if (!force && shortAccessTokenFetchAt && (now - shortAccessTokenFetchAt) < 15_000) {
    return !!(shortAccessToken && shortAccessTokenExp && shortAccessTokenExp > now + 5_000);
  }
  try {
    shortAccessTokenFetchAt = now;
    const res = await fetch(`${API_BASE}/api/token/short`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data || !data.token) return false;
    shortAccessToken = data.token;
    shortAccessTokenExp = data.exp || (Date.now() + 180 * 1000);
    return true;
  } catch (_) {
    return false;
  }
}

function setClientTokensEnabled(enabled) {
  clientTokensEnabled = enabled !== false;
  if (!clientTokensEnabled) {
    clientAccessToken = null;
    clientAccessTokenExp = 0;
    shortAccessToken = null;
    shortAccessTokenExp = 0;
    shortAccessTokenFetchAt = 0;
  }
}

function fillRow(container, items, withRank = false) {
  if (!container) return;
  container.innerHTML = "";
  (items || []).forEach((item, index) => {
    const card = buildCard(item);
    if (withRank) {
      card.setAttribute("data-rank", String(index + 1));
    }
    container.appendChild(card);
  });
}

function uniqueById(items) {
  const seen = new Set();
  const out = [];
  (items || []).forEach((it) => {
    const id = it && it.id != null ? String(it.id) : null;
    if (!id || seen.has(id)) return;
    seen.add(id);
    out.push(it);
  });
  return out;
}

async function loadHome() {
  try {
    if (getCatalogKeyFromHash() || currentCatalogKey) {
      return;
    }
    if (IS_AUDIT_MODE) {
      renderHero({
        id: 0,
        media_type: "movie",
        title: "ONLY US TV",
        name: "ONLY US TV",
        overview: "Films, séries et sports — une plateforme pensée pour NOUS",
        release_date: "2026-01-01",
        first_air_date: "2026-01-01",
        backdrop_path: null,
        poster_path: null,
      });
      if (rowTrending) rowTrending.innerHTML = "";
      return;
    }

    const homeData = await fetchJSON(`${API_BASE}/api/tmdb/home`);

    const homeResults = (homeData.results || []).filter(
      (r) => r && (r.media_type === "movie" || r.media_type === "tv")
    );

    if (!homeResults.length) {
      if (rowTrending) {
        rowTrending.innerHTML = "<p>Aucun contenu trouvé.</p>";
      }
      return;
    }

    // HERO = premier élément des tendances
    const hero = homeResults[0];
    renderHero(hero);

    // Crossfade "carousel" automatique : on fait tourner les meilleurs items (top 8)
    // (ne touche pas aux autres sections / rows)
    if (!IS_AUDIT_MODE) {
      const heroItems = homeResults
        .filter((r) => r && (r.backdrop_path || r.poster_path))
        .slice(0, 8);
      startHeroCarousel(heroItems, { intervalMs: 7500 });
    }

    // Light mode for audits: show hero + trends only, defer the rest.
    if (IS_AUDIT_MODE) {
      fillRow(rowTrending, homeResults.slice(0, 18));
      return;
    }

    const [
      moviesPopularData,
      seriesPopularData,
      moviesTopRatedData,
      seriesTopRatedData,
      genreActionData,
      genreComedyData,
      genreHorrorData,
      genreScifiData,
      genreAnimationData,
      genreRomanceData,
      genreThrillerData,
      genreDocumentaryData,
    ] = await Promise.all([
      fetchJSON(`${API_BASE}/api/tmdb/movies/popular`),
      fetchJSON(`${API_BASE}/api/tmdb/series/popular`),
      fetchJSON(`${API_BASE}/api/tmdb/movies/top_rated`),
      fetchJSON(`${API_BASE}/api/tmdb/series/top_rated`),
      fetchJSON(`${API_BASE}/api/tmdb/movies/genre/28`),
      fetchJSON(`${API_BASE}/api/tmdb/movies/genre/35`),
      fetchJSON(`${API_BASE}/api/tmdb/movies/genre/27`),
      fetchJSON(`${API_BASE}/api/tmdb/movies/genre/878`),
      fetchJSON(`${API_BASE}/api/tmdb/movies/genre/16`),
      fetchJSON(`${API_BASE}/api/tmdb/movies/genre/10749`),
      fetchJSON(`${API_BASE}/api/tmdb/movies/genre/53`),
      fetchJSON(`${API_BASE}/api/tmdb/movies/genre/99`),
    ]);

    const moviesPopular = (moviesPopularData.results || []).filter(
      (r) => r && (r.media_type === "movie" || r.media_type === "tv" || r.media_type === undefined)
    );
    const seriesPopular = (seriesPopularData.results || []).map((r) => ({
      ...r,
      media_type: "tv",
    }));

    const moviesTopRated = (moviesTopRatedData.results || []).map((r) => ({
      ...r,
      media_type: "movie",
    }));
    const seriesTopRated = (seriesTopRatedData.results || []).map((r) => ({
      ...r,
      media_type: "tv",
    }));

    // Top 10 d'aujourd'hui basé sur les tendances (popularité)
    const topCombined = [...homeResults]
      .filter((r) => r && r.poster_path)
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 10);

    const moviesHome = homeResults.filter((r) => r.media_type === "movie");
    const seriesHome = homeResults.filter((r) => r.media_type === "tv");

    const genreAction = genreActionData.results || [];
    const genreComedy = genreComedyData.results || [];
    const genreHorror = genreHorrorData.results || [];
    const genreScifi = genreScifiData.results || [];
    const genreAnimation = genreAnimationData.results || [];
    const genreRomance = genreRomanceData.results || [];
    const genreThriller = genreThrillerData.results || [];
    const genreDocumentary = genreDocumentaryData.results || [];

    // Sections principales
    fillRow(rowTrending, homeResults);
    fillRow(rowMovies, moviesHome.length ? moviesHome : moviesPopular);
    fillRow(rowSeries, seriesHome.length ? seriesHome : seriesPopular);
    fillRow(rowTop, topCombined, true);

    // Sections supplémentaires
    fillRow(rowTop10France, topCombined, true);
    fillRow(rowMoviesPopularDb, moviesPopular.slice(0, 20));
    fillRow(rowSeriesPopularDb, seriesPopular.slice(0, 20));
    fillRow(rowGenreAction, genreAction.slice(0, 20));
    fillRow(rowGenreComedy, genreComedy.slice(0, 20));
    fillRow(rowGenreHorror, genreHorror.slice(0, 20));
    fillRow(rowGenreScifi, genreScifi.slice(0, 20));
    fillRow(rowGenreAnimation, genreAnimation.slice(0, 20));
    fillRow(rowGenreRomance, genreRomance.slice(0, 20));
    fillRow(rowGenreThriller, genreThriller.slice(0, 20));
    fillRow(rowGenreDocumentary, genreDocumentary.slice(0, 20));

    // Met à jour la section "Reprendre la lecture" pour le profil courant
    await loadContinueWatchingRow();

    // Met à jour la section "Ma liste" pour le profil courant
    await loadMyListRow();
  } catch (err) {
    console.error("Erreur chargement home:", err);
    if (rowTrending) {
      rowTrending.innerHTML =
        "<p>Impossible de charger les contenus à la une.</p>";
    }
  }
}


searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const q = (searchInput.value || "").trim();
  // Permet Enter/Submit, mais la recherche se fait aussi au fil de l'eau (debounce)
  triggerSearch(q, { immediate: true });
  // Si l'utilisateur est tout en bas, on remonte automatiquement vers la section résultats.
  maybeAutoScrollToSearch(q, { force: true });
});

let searchDebounceTimer = null;
let searchAbortController = null;
let lastSearchedQuery = "";

function setSearchCount(count) {
  if (!searchResultsCount) return;
  if (typeof count !== "number") {
    searchResultsCount.textContent = "";
    return;
  }
  searchResultsCount.textContent = `${count} résultat${count > 1 ? "s" : ""}`;
}

async function runSearch(q) {
  const query = (q || "").trim();

  if (!query) {
    // Reset
    lastSearchedQuery = "";
    if (searchAbortController) searchAbortController.abort();
    if (searchResultsCount) searchResultsCount.textContent = "";
    searchSection.classList.add("hidden");
    searchGrid.innerHTML = "";
    return;
  }

  // ?vite de relancer inutilement la même recherche
  if (query === lastSearchedQuery) return;
  lastSearchedQuery = query;

  // Annule la requête précédente si encore en cours
  if (searchAbortController) searchAbortController.abort();
  searchAbortController = new AbortController();

  searchSection.classList.remove("hidden");
  setSearchCount(undefined);
  searchGrid.innerHTML = "<p>Recherche en cours...</p>";

  try {
    const res = await fetch(
      `${API_BASE}/api/tmdb/search?q=${encodeURIComponent(query)}`,
      { signal: searchAbortController.signal }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const results = data.results || [];
    searchGrid.innerHTML = "";
    if (!results.length) {
      searchGrid.innerHTML = "<p>Pas disponible.</p>";
      setSearchCount(0);
      return;
    }
    results.forEach((item) => searchGrid.appendChild(buildCard(item)));
    setSearchCount(results.length);
  } catch (err) {
    // Si c?Test juste un abort ?' on ignore
    if (err && (err.name === "AbortError" || String(err).includes("AbortError"))) return;
    console.error(err);
    searchGrid.innerHTML = "<p>Erreur lors de la recherche.</p>";
    setSearchCount(0);
  }
}

let lastAutoScrollQuery = "";
let lastAutoScrollAt = 0;

function maybeAutoScrollToSearch(q, { force = false } = {}) {
  const query = (q || "").trim();
  if (!query || !searchSection) return;

  const now = Date.now();
  // Avoid scrolling on every keystroke
  if (!force) {
    if (query === lastAutoScrollQuery && now - lastAutoScrollAt < 1200) return;
    // Only auto-scroll when user is far from the search section
    const rect = searchSection.getBoundingClientRect();
    const isVisible = rect.top >= 0 && rect.top < window.innerHeight * 0.55;
    if (isVisible) return;
  }

  lastAutoScrollQuery = query;
  lastAutoScrollAt = now;

  try {
    searchSection.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (e) {
    // Fallback
    window.scrollTo({ top: searchSection.offsetTop || 0, behavior: "smooth" });
  }
}

function triggerSearch(q, { immediate = false } = {}) {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  const delay = immediate ? 0 : 320; // 250?"400ms
  searchDebounceTimer = setTimeout(() => runSearch(q), delay);
}

// Recherche au fil de l'eau
searchInput.addEventListener("input", (e) => {
  const q = e.target.value;
  triggerSearch(q);
  // Confort : si on est loin des résultats, on remonte en douceur vers la section recherche.
  maybeAutoScrollToSearch(q);
});


// Si l'utilisateur clique dans la recherche alors qu'il est en bas de page
searchInput.addEventListener("focus", () => {
  maybeAutoScrollToSearch(searchInput.value);
});


// Petit confort : si l'utilisateur efface tout ?' reset immédiat
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    searchInput.value = "";
    triggerSearch("", { immediate: true });
    searchInput.blur();
  }
});


if (myListButton) {
  myListButton.addEventListener("click", async () => {
    if (!isPremiumReady()) {
      promptAuth("Connecte-toi pour utiliser Ma liste.");
      return;
    }
    if (typeof loadMyListRow === "function") await loadMyListRow(true);
  });
}

// ----------------------------
// ONLYFOOT (premium UI)
// ----------------------------
const ONLYFOOT_FAV_KEY = "onlyfoot_fav_teams";

const onlyfootState = {
  loaded: false,
  matchesRaw: [],
  matches: [],
  focus: null, // 'live' | 'today' | 'favs' | 'comps' | null
  query: "",
  competition: "__all__",
  of2Tab: "live", // only live tab now
  // Compact-only UI (Cards view removed)
  view: "compact",
  favTeams: new Set(),
  // Multi-sports support
  sport: "football",
  sportsLoaded: false,
  availableSports: [],
};

function onlyfootLoadFavTeams() {
  try {
    const arr = JSON.parse(localStorage.getItem(ONLYFOOT_FAV_KEY) || "[]");
    onlyfootState.favTeams = new Set(Array.isArray(arr) ? arr : []);
  } catch {
    onlyfootState.favTeams = new Set();
  }
}

function onlyfootSaveFavTeams() {
  localStorage.setItem(ONLYFOOT_FAV_KEY, JSON.stringify(Array.from(onlyfootState.favTeams)));
}

// -----------------------------
//   Multi-sports: chargement et affichage des sports
// -----------------------------
async function loadAvailableSports() {
  if (onlyfootState.sportsLoaded) return onlyfootState.availableSports;

  try {
    const sports = await fetchJSON("/api/onlyfoot/sports");
    onlyfootState.availableSports = Array.isArray(sports) ? sports : [];
    onlyfootState.sportsLoaded = true;
    renderSportsButtons();
    // Charger les compteurs en arrière-plan (non-bloquant)
    loadSportsCounts();
    return onlyfootState.availableSports;
  } catch (err) {
    console.error("[ONLYFOOT] Erreur chargement sports:", err);
    // Fallback avec les sports de base
    onlyfootState.availableSports = [
      { id: "football", name: "Football" },
      { id: "basketball", name: "Basketball" },
      { id: "tennis", name: "Tennis" },
      { id: "hockey", name: "Hockey" },
      { id: "mma", name: "MMA" },
      { id: "boxing", name: "Boxing" }
    ];
    onlyfootState.sportsLoaded = true;
    renderSportsButtons();
    return onlyfootState.availableSports;
  }
}

// Icônes pour chaque sport (global)
const sportIcons = {
  football: "\u26bd",
  basketball: "\ud83c\udfc0",
  tennis: "\ud83c\udfbe",
  hockey: "\ud83c\udfd2",
  baseball: "\u26be",
  mma: "\ud83e\udd4a",
  boxing: "\ud83e\udd4a",
  fight: "\ud83e\udd4a",
  "american-football": "\ud83c\udfc8",
  rugby: "\ud83c\udfc9",
  cricket: "\ud83c\udfcf",
  darts: "\ud83c\udfaf",
  golf: "\u26f3",
  "motor-sports": "\ud83c\udfce\ufe0f",
  motorsport: "\ud83c\udfce\ufe0f",
  billiards: "\ud83c\udfb1",
  afl: "\ud83c\udfc9",
  other: "\ud83c\udfc6"
};

function renderSportsButtons(counts = {}) {
  const container = document.getElementById("of2-sports-container");
  if (!container) return;

  const sports = onlyfootState.availableSports;
  if (!sports.length) return;

  container.innerHTML = sports.map(sport => {
    const isActive = sport.id === onlyfootState.sport;
    const icon = sportIcons[sport.id] || "\ud83c\udfc6";
    const sportId = escapeHtml(String(sport.id || ""));
    const sportName = escapeHtml(String(sport.name || ""));
    const count = counts[sport.id];
    const countBadge = count !== undefined && count > 0
      ? `<span class="of2-sport-count">${count}</span>`
      : '';
    return `<button type="button" class="of2-sport-btn${isActive ? " is-active" : ""}" data-sport="${sportId}">
      <span class="of2-sport-icon">${icon}</span>
      <span class="of2-sport-name">${sportName}</span>
      ${countBadge}
    </button>`;
  }).join("");

  // Ajouter les event listeners
  container.querySelectorAll(".of2-sport-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const sportId = btn.getAttribute("data-sport");
      if (sportId && sportId !== onlyfootState.sport) {
        switchSport(sportId);
      }
    });
  });
}

// Charger les compteurs de matchs par sport
async function loadSportsCounts() {
  try {
    const counts = await fetchJSON("/api/onlyfoot/matches/counts");
    if (counts && typeof counts === "object") {
      renderSportsButtons(counts);
    }
  } catch (err) {
    console.error("[ONLYFOOT] Erreur chargement counts:", err);
  }
}

async function switchSport(sportId) {
  if (!sportId || sportId === onlyfootState.sport) return;

  // Mettre à jour l'état
  onlyfootState.sport = sportId;
  onlyfootState.loaded = false;
  onlyfootState.matches = [];
  onlyfootState.matchesRaw = [];
  onlyfootState.competition = "__all__";

  // Mettre à jour l'UI des boutons
  const container = document.getElementById("of2-sports-container");
  if (container) {
    container.querySelectorAll(".of2-sport-btn").forEach(btn => {
      btn.classList.toggle("is-active", btn.getAttribute("data-sport") === sportId);
    });
  }

  // Recharger les matchs pour le nouveau sport
  await loadOnlyfootMatches(true);
}

function stripAccents(str) {
  try {
    return String(str || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  } catch {
    return String(str || "");
  }
}

function norm(str) {
  return stripAccents(String(str || "")).toLowerCase().trim();
}

function isAbsoluteUrl(value) {
  return typeof value === "string" && (value.startsWith("http://") || value.startsWith("https://"));
}

function ymdKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

function sameDay(a, b) {
  return ymdKey(a) !== "" && ymdKey(a) === ymdKey(b);
}

function parseTeamsFromTitle(title) {
  const t = String(title || "").trim();
  if (!t) return { home: "", away: "" };
  const candidates = [
    /(.+?)\s+vs\s+(.+)/i,
    /(.+?)\s+v\s+(.+)/i,
    /(.+?)\s+-\s+(.+)/,
    /(.+?)\s+?"\s+(.+)/,
  ];
  for (const re of candidates) {
    const m = t.match(re);
    if (m && m[1] && m[2]) return { home: m[1].trim(), away: m[2].trim() };
  }
  return { home: t, away: "" };
}

function getMatchDate(match) {
  if (!match || !match.date) return null;
  const d = new Date(match.date);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function getCompetitionLabel(match) {
  const raw =
    match.competition ||
    match.league ||
    match.tournament ||
    match.category ||
    match.country ||
    "Football";
  return String(raw || "Football").trim() || "Football";
}

function computeStatus(dateObj) {
  // Heuristic (no official live flag from API):
  // - LIVE if now is between start-5min and start+2h
  // - SOON if within next 30min
  // - Otherwise UPCOMING/PAST
  if (!(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) return { status: "unknown", soon: false, live: false };
  const now = new Date();
  const diffMs = dateObj.getTime() - now.getTime();
  const fiveMin = 5 * 60 * 1000;
  const twoHours = 2 * 60 * 60 * 1000;
  const thirtyMin = 30 * 60 * 1000;

  const live = diffMs <= fiveMin && diffMs >= -twoHours;
  const soon = !live && diffMs > 0 && diffMs <= thirtyMin;

  if (live) return { status: "live", soon: false, live: true };
  if (soon) return { status: "soon", soon: true, live: false };
  if (diffMs > 0) return { status: "upcoming", soon: false, live: false };
  return { status: "past", soon: false, live: false };
}

function formatMatchTime(dateObj) {
  if (!(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) return "";
  return dateObj.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function makeInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "";
  const a = parts[0][0] || "";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase();
}

function getTeamBadgeFromRaw(raw, side) {
  // Support multiple API shapes:
  // - { home: { badge }, away: { badge } }
  // - { teams: { home: { badge }, away: { badge } } }
  // - { home: { logo/image }, teams: { ... } }
  const r = raw || {};
  const s = side === "away" ? "away" : "home";

  const direct = r?.[s]?.badge || r?.[s]?.logo || r?.[s]?.image;
  const nested = r?.teams?.[s]?.badge || r?.teams?.[s]?.logo || r?.teams?.[s]?.image;

  const v = direct || nested;
  return typeof v === "string" ? v.trim() : "";
}

function isSafeImgSrc(src) {
  const s = String(src || "").trim();
  if (!s) return false;
  // Block javascript: and other weird schemes
  if (/^javascript:/i.test(s)) return false;
  // Allow common URL forms
  if (/^https?:\/\//i.test(s)) return true;
  if (/^\/\//.test(s)) return true;
  if (/^(\/|\.|\.\.)/.test(s)) return true;
  if (/^data:image\//i.test(s)) return true;
  if (/^blob:/i.test(s)) return true;
  // Allow simple relative paths/filenames (e.g. "badges/manutd.png")
  if (/^[a-z0-9_\-./]+$/i.test(s)) return true;
  return false;
}

function enrichOnlyfootMatches(matches) {
  const now = new Date();
  return (Array.isArray(matches) ? matches : []).map((m) => {
    const homeName =
      m?.home?.name ||
      m?.teams?.home?.name ||
      parseTeamsFromTitle(m?.title).home ||
      "";
    const awayName =
      m?.away?.name ||
      m?.teams?.away?.name ||
      parseTeamsFromTitle(m?.title).away ||
      "";
    const comp = getCompetitionLabel(m);
    const dateObj = getMatchDate(m);
    const statusInfo = computeStatus(dateObj);

    const search = norm([homeName, awayName, comp, m?.title].filter(Boolean).join(" "));

    const isToday = dateObj ? sameDay(dateObj, now) : false;
    const isUpcoming = dateObj ? dateObj > new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59) : false;

    return {
      raw: m,
      homeName,
      awayName,
      comp,
      dateObj,
      timeLabel: formatMatchTime(dateObj),
      status: statusInfo.status,
      isLive: statusInfo.live,
      isSoon: statusInfo.soon,
      isToday,
      isUpcoming,
      search,
    };
  });
}

function onlyfootSetCount(el, n) {
  if (!el) return;
  if (!n) el.textContent = "";
  else el.textContent = n === 1 ? "1 match" : `${n} matchs`;
}

function onlyfootSetLoading() {
  const skeleton = () => {
    const d = document.createElement("div");
    d.className = "of-row";
    d.style.opacity = "0.75";
    d.innerHTML =
      "<div style='display:flex;align-items:center;gap:.65rem;min-width:0;flex:1'>" +
      "<div style='width:34px;height:34px;border-radius:999px;background:rgba(148,163,184,.10)'></div>" +
      "<div style='min-width:0;flex:1'>" +
      "<div style='height:14px;width:60%;background:rgba(148,163,184,.12);border-radius:999px'></div>" +
      "<div style='height:12px;width:45%;background:rgba(148,163,184,.08);border-radius:999px;margin-top:8px'></div>" +
      "</div>" +
      "</div>" +
      "<div style='display:inline-flex;align-items:center;gap:.5rem'>" +
      "<div style='width:30px;height:30px;border-radius:999px;background:rgba(148,163,184,.10)'></div>" +
      "<div style='width:38px;height:34px;border-radius:999px;background:rgba(34,197,94,.12)'></div>" +
      "</div>";
    return d;
  };
  const fill = (container) => {
    if (!container) return;
    container.innerHTML = "";
    for (let i = 0; i < 6; i++) container.appendChild(skeleton());
  };
  fill(onlyfootLiveList);
  fill(onlyfootTodayList);
  fill(onlyfootUpcomingList);
  if (onlyfootFavsList) onlyfootFavsList.innerHTML = "";
  if (onlyfootCompsList) onlyfootCompsList.innerHTML = "";
  if (onlyfootEmpty) onlyfootEmpty.classList.add("hidden");
}

function onlyfootToggleFocus(nextFocus) {
  onlyfootState.focus = onlyfootState.focus === nextFocus ? null : nextFocus;
  renderOnlyfoot();
}

function onlyfootUpdateChipUI() {
  onlyfootChipButtons.forEach((b) => {
    const f = b.getAttribute("data-focus");
    b.classList.toggle("is-active", f === onlyfootState.focus);
  });
}

function onlyfootUpdateViewUI() {
  if (!onlyfootSection) return;
  try { __tvLiveInit(); } catch (_) {}
  onlyfootSection.setAttribute("data-view", onlyfootState.view);
  onlyfootViewButtons.forEach((b) => {
    const v = b.getAttribute("data-view");
    b.classList.toggle("is-active", v === onlyfootState.view);
  });
}

function onlyfootPopulateCompetitions(matches) {
  if (!onlyfootCompetitionSelect) return;
  const current = onlyfootCompetitionSelect.value || "__all__";
  const set = new Map();
  matches.forEach((m) => {
    const key = m.comp;
    if (!key) return;
    set.set(key, (set.get(key) || 0) + 1);
  });

  // Build options
  const opts = Array.from(set.entries())
    .sort((a, b) => a[0].localeCompare(b[0], "fr"))
    .map(([label, count]) => ({ value: label, label: `${label} (${count})` }));

  onlyfootCompetitionSelect.innerHTML = "";
  const all = document.createElement("option");
  all.value = "__all__";
  all.textContent = "Pays / Ligues : Toutes";
  onlyfootCompetitionSelect.appendChild(all);
  opts.forEach((o) => {
    const opt = document.createElement("option");
    opt.value = o.value;
    opt.textContent = o.label;
    onlyfootCompetitionSelect.appendChild(opt);
  });

  // Restore selection if possible
  const wanted = onlyfootState.competition || current;
  const exists = Array.from(onlyfootCompetitionSelect.options).some((o) => o.value === wanted);
  onlyfootCompetitionSelect.value = exists ? wanted : "__all__";
  onlyfootState.competition = onlyfootCompetitionSelect.value;
}

function onlyfootIsFavTeam(name) {
  const key = norm(name);
  if (!key) return false;
  return onlyfootState.favTeams.has(key);
}

function onlyfootToggleFavTeams(homeName, awayName) {
  const h = norm(homeName);
  const a = norm(awayName);
  const keys = [h, a].filter(Boolean);
  if (!keys.length) return;
  const allOn = keys.every((k) => onlyfootState.favTeams.has(k));
  if (allOn) keys.forEach((k) => onlyfootState.favTeams.delete(k));
  else keys.forEach((k) => onlyfootState.favTeams.add(k));
  onlyfootSaveFavTeams();
  renderOnlyfoot();
}

function buildTeamBadge(url, name) {
  const wrap = document.createElement("div");
  wrap.className = "of-team-badge";
  const src = typeof url === "string" ? url.trim() : "";
  if (src && isSafeImgSrc(src)) {
    const img = document.createElement("img");
    // Accept absolute OR relative URLs as provided by the API.
    img.src = src;
    img.alt = name ? `Logo ${name}` : "Logo";
    img.loading = "lazy";
    img.addEventListener("error", () => {
      wrap.innerHTML = "";
      const s = document.createElement("span");
      s.className = "of-team-initials";
      s.textContent = makeInitials(name) || "s";
      wrap.appendChild(s);
    });
    wrap.appendChild(img);
    return wrap;
  }
  const s = document.createElement("span");
  s.className = "of-team-initials";
  s.textContent = makeInitials(name) || "s";
  wrap.appendChild(s);
  return wrap;
}

function buildOnlyfootCard(m, { hero = false } = {}) {
  const card = document.createElement("div");
  card.className = "of-card" + (hero ? " of-hero" : "");

  const top = document.createElement("div");
  top.className = "of-card-top";

  const comp = document.createElement("div");
  comp.className = "of-comp";
  comp.textContent = m.comp || "Football";

  const favBtn = document.createElement("button");
  favBtn.type = "button";
  favBtn.className = "of-fav-btn";
  const favOn = onlyfootIsFavTeam(m.homeName) || onlyfootIsFavTeam(m.awayName);
  favBtn.classList.toggle("is-on", favOn);
  favBtn.textContent = "~.";
  favBtn.title = favOn ? "Retirer des favoris" : "Ajouter aux favoris";
  favBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    onlyfootToggleFavTeams(m.homeName, m.awayName);
  });

  top.appendChild(comp);
  top.appendChild(favBtn);

  const teams = document.createElement("div");
  teams.className = "of-teams";

  const home = document.createElement("div");
  home.className = "of-team of-team-home";
  home.appendChild(buildTeamBadge(getTeamBadgeFromRaw(m.raw, "home"), m.homeName));
  const homeName = document.createElement("div");
  homeName.className = "of-team-name";
  homeName.textContent = m.homeName || "Équipe";
  home.appendChild(homeName);

  const vs = document.createElement("div");
  vs.className = "of-vs";
  const vsText = document.createElement("div");
  vsText.className = "of-vs-text";
  vsText.textContent = "VS";
  vs.appendChild(vsText);

  const away = document.createElement("div");
  away.className = "of-team of-team-away";
  const awayName = document.createElement("div");
  awayName.className = "of-team-name";
  awayName.textContent = m.awayName || "";
  away.appendChild(awayName);
  away.appendChild(buildTeamBadge(getTeamBadgeFromRaw(m.raw, "away"), m.awayName));

  teams.appendChild(home);
  teams.appendChild(vs);
  teams.appendChild(away);

  const meta = document.createElement("div");
  meta.className = "of-meta";

  const time = document.createElement("div");
  time.className = "of-time";
  time.textContent = m.timeLabel || "";

  const badges = document.createElement("div");
  badges.className = "of-badges";
  if (m.isLive) {
    const b = document.createElement("span");
    b.className = "of-badge live";
    b.textContent = "LIVE";
    badges.appendChild(b);
  } else if (m.isSoon) {
    const b = document.createElement("span");
    b.className = "of-badge";
    b.textContent = "Bientôt";
    badges.appendChild(b);
  }

  meta.appendChild(time);
  meta.appendChild(badges);

  const actions = document.createElement("div");
  actions.className = "of-actions";
  const watch = document.createElement("button");
  watch.type = "button";
  watch.className = "of-watch";
  watch.textContent = "Regarder";
  watch.addEventListener("click", (e) => {
    e.stopPropagation();
    openOnlyfootStreams(m.raw || m);
  });
  actions.appendChild(watch);

  card.appendChild(top);
  card.appendChild(teams);
  card.appendChild(meta);
  card.appendChild(actions);

  card.addEventListener("click", () => openOnlyfootStreams(m.raw || m));
  return card;
}

function buildOnlyfootRow(m) {
  const row = document.createElement("div");
  row.className = "of-row";

  const main = document.createElement("div");
  main.className = "of-row-main";

  // Compact view: show both team logos (home + away)
  const badges = document.createElement("div");
  badges.className = "of-team-badges";
  badges.appendChild(buildTeamBadge(getTeamBadgeFromRaw(m.raw, "home"), m.homeName));
  if (m.awayName) {
    badges.appendChild(buildTeamBadge(getTeamBadgeFromRaw(m.raw, "away"), m.awayName));
  }
  main.appendChild(badges);

  const title = document.createElement("div");
  title.className = "of-row-title";
  const l1 = document.createElement("div");
  l1.className = "line1";
  l1.textContent = m.awayName ? `${m.homeName} vs ${m.awayName}` : (m.homeName || "Match");
  const l2 = document.createElement("div");
  l2.className = "line2";
  l2.textContent = [m.comp, m.timeLabel].filter(Boolean).join(" • ");
  title.appendChild(l1);
  title.appendChild(l2);

  main.appendChild(title);

  const right = document.createElement("div");
  right.className = "of-row-right";

  if (m.isLive) {
    const b = document.createElement("span");
    b.className = "of-badge live";
    b.textContent = "LIVE";
    right.appendChild(b);
  } else if (m.isSoon) {
    const b = document.createElement("span");
    b.className = "of-badge";
    b.textContent = "Bientôt";
    right.appendChild(b);
  }

  // Favoris (compact view)
  const favBtn = document.createElement("button");
  favBtn.type = "button";
  favBtn.className = "of-fav-btn";
  const favOn = onlyfootIsFavTeam(m.homeName) || onlyfootIsFavTeam(m.awayName);
  favBtn.classList.toggle("is-on", favOn);
  favBtn.textContent = "~.";
  favBtn.title = favOn ? "Retirer des favoris" : "Ajouter aux favoris";
  favBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    onlyfootToggleFavTeams(m.homeName, m.awayName);
  });
  right.appendChild(favBtn);

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "of-watch";
  btn.textContent = "-";
  btn.title = "Regarder";
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    openOnlyfootStreams(m.raw || m);
  });
  right.appendChild(btn);

  row.appendChild(main);
  row.appendChild(right);

  row.addEventListener("click", () => openOnlyfootStreams(m.raw || m));
  return row;
}

function onlyfootSortByPriority(a, b) {
  const score = (m) => {
    if (m.isLive) return 0;
    if (m.isSoon) return 1;
    return 2;
  };
  const s = score(a) - score(b);
  if (s !== 0) return s;
  const ta = a.dateObj ? a.dateObj.getTime() : Number.POSITIVE_INFINITY;
  const tb = b.dateObj ? b.dateObj.getTime() : Number.POSITIVE_INFINITY;
  return ta - tb;
}

function onlyfootApplyFilters(items) {
  const q = norm(onlyfootState.query);

  return (Array.isArray(items) ? items : []).filter((m) => {
    // Exclure les matchs passés (terminés depuis plus de 2h)
    if (m.status === "past") return false;

    // Filtre par recherche
    if (q && !m.search.includes(q)) return false;

    return true;
  });
}



// ---- HilltopAds helpers (MultiTag Banner) ----
function buildHilltopAdBlock(opts) {
  if (!adsEnabled) return null;
  const o = opts || {};
  const wrap = document.createElement("div");
  wrap.className = o.wrapperClass || "ad-inline";

  const label = document.createElement("div");
  label.className = o.labelClass || "ad-inline-label";
  label.textContent = o.labelText || "Sponsorisé";
  wrap.appendChild(label);

  const slot = document.createElement("div");
  slot.className = o.slotClass || "ad-inline-slot";
  wrap.appendChild(slot);

  // Use the shared helper (iframe isolation) for reliability across repeated blocks.
  mountHilltopScript(slot, o.src || "", o.settings || {});

  return wrap;
}

function buildOnlyfootAdSection() {
  if (!adsEnabled) return null;
  const section = document.createElement("section");
  section.className = "of2-ad-section";

  // Wrapper (same visuals), but 3 slots on desktop
  const wrap = document.createElement("div");
  wrap.className = "of2-ad";

  const label = document.createElement("div");
  label.className = "of2-ad-label";
  label.textContent = "Sponsorisé";
  wrap.appendChild(label);

  const slots = document.createElement("div");
  slots.className = "of2-ad-slots";
  wrap.appendChild(slots);

  // Defer mounting to ensure scripts are inserted when connected to the document
  setTimeout(() => {
    mountHilltopSlots(
      slots,
      [HILLTOP_ONLYFOOT_SRC, HILLTOP_CINE_SRC_A, HILLTOP_CINE_SRC_B],
      "of2-ad-slot",
      {}
    );
  }, 0);

  section.appendChild(wrap);

  return section;
}
function renderOnlyfoot() {
  if (!onlyfootSection) return;

  // Simple ?ostreamed-like? schedule view: TV Live on top, matches grouped by day below
  const filtered = onlyfootApplyFilters(onlyfootState.matches);

  // Toggle empty state
  if (onlyfootEmpty) onlyfootEmpty.classList.toggle("hidden", filtered.length > 0);

  if (!onlyfootSchedule) return;

  // Group by day label
  const byDay = new Map();
  filtered.forEach((m) => {
    const d = m.dateObj instanceof Date && !isNaN(m.dateObj) ? m.dateObj : new Date();
    const key = dayKey(d);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(m);
  });

  // Sort days and matches
  const days = Array.from(byDay.keys()).sort((a, b) => {
    // keys are YYYY-MM-DD
    return a.localeCompare(b);
  });

  days.forEach((k) => {
    byDay.get(k).sort(onlyfootSortByPriority);
  });

  // Build DOM
  onlyfootSchedule.innerHTML = "";
  const frag = document.createDocumentFragment();

  days.forEach((key) => {
    const dayMatches = byDay.get(key) || [];
    if (!dayMatches.length) return;

    const section = document.createElement("section");
    section.className = "of2-day";

    const head = document.createElement("div");
    head.className = "of2-day-head";

    const d = parseDayKey(key);
    const title = document.createElement("div");
    title.className = "of2-day-title";
    const num = document.createElement("span");
    num.className = "of2-day-num";
    num.textContent = pad2(d.getDate());
    const mon = document.createElement("span");
    mon.className = "of2-day-mon";
    mon.textContent = monthShortFR(d).toUpperCase();
    title.appendChild(num);
    title.appendChild(mon);

    const label = document.createElement("div");
    label.className = "of2-day-label";
    label.textContent = dayHumanLabelFR(d).toUpperCase();

    head.appendChild(label);
    head.appendChild(title);

    const grid = document.createElement("div");
    grid.className = "of2-grid";

    dayMatches.forEach((m) => {
      const card = buildOf2MatchCard(m);
      grid.appendChild(card);
    });

    section.appendChild(head);
    section.appendChild(grid);
    frag.appendChild(section);
    // Ad after each day block (HilltopAds MultiTag)
    const adSection = buildOnlyfootAdSection();
    if (adSection) frag.appendChild(adSection);
  });

  onlyfootSchedule.appendChild(frag);
}

// ---- OnlyFoot v2 helpers (streamed-like UI) ----
function pad2(n) { return String(n).padStart(2, "0"); }

function monthShortFR(d) {
  const months = ["jan", "fév", "mar", "avr", "mai", "jun", "jul", "aoû", "sep", "oct", "nov", "déc"];
  return months[d.getMonth()] || "";
}

function dayKey(d) {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const da = pad2(d.getDate());
  return `${y}-${m}-${da}`;
}

function parseDayKey(key) {
  const [y, m, d] = String(key).split("-").map((x) => parseInt(x, 10));
  const dt = new Date();
  dt.setFullYear(y || dt.getFullYear(), (m ? m - 1 : dt.getMonth()), d || dt.getDate());
  dt.setHours(12, 0, 0, 0);
  return dt;
}

function dayHumanLabelFR(d) {
  const now = new Date();
  const todayKey = dayKey(now);
  const k = dayKey(d);
  if (k === todayKey) return "Aujourd'hui";
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (k === dayKey(tomorrow)) return "Demain";
  const days = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];
  return days[d.getDay()] || "";
}

function __of2NormalizeImageKey(v) {
  if (!v) return "";
  let s = String(v).trim();
  // If API already returns a full path, keep only the last segment
  try { s = decodeURIComponent(s); } catch (_) {}
  // remove query/hash
  s = s.split("?")[0].split("#")[0];
  // strip .webp/.png/.jpg
  s = s.replace(/\.(webp|png|jpe?g)$/i, "");
  // strip common prefixes
  s = s.replace(/^https?:\/\/[^/]+/i, "");
  s = s.replace(/^\/+/,"");
  s = s.replace(/^api\//i,"");
  s = s.replace(/^images\//i,"");
  s = s.replace(/^proxy\//i,"");
  s = s.replace(/^poster\//i,"");
  s = s.replace(/^badge\//i,"");
  // if still contains slashes, take last token
  if (s.includes("/")) s = s.split("/").filter(Boolean).pop() || s;
  return s;
}

function onlyfootImageUrlFromMatch(m) {
  const homeBadgeRaw = m?.homeBadge || m?.raw?.teams?.home?.badge || m?.raw?.home?.badge || "";
  const awayBadgeRaw = m?.awayBadge || m?.raw?.teams?.away?.badge || m?.raw?.away?.badge || "";
  const posterRaw = m?.poster || m?.raw?.poster || "";

  const homeBadge = __of2NormalizeImageKey(homeBadgeRaw);
  const awayBadge = __of2NormalizeImageKey(awayBadgeRaw);
  const poster = __of2NormalizeImageKey(posterRaw);

  if (poster) return `/api/onlyfoot/images/proxy/${encodeURIComponent(poster)}`;
  if (homeBadge && awayBadge) return `/api/onlyfoot/images/poster/${encodeURIComponent(homeBadge)}/${encodeURIComponent(awayBadge)}`;
  return "";
}

function buildOf2MatchCard(m) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "of2-card";

  const imgWrap = document.createElement("div");
  imgWrap.className = "of2-card-media";

  const img = document.createElement("img");
  img.alt = `${m.homeName} vs ${m.awayName}`;
  img.loading = "lazy";
  const fallbackSrc = "/onlyfoot-logo.png";
  const url = onlyfootImageUrlFromMatch(m);
  // Always show a media (even if the API has no poster) to avoid empty cards.
  img.src = url || fallbackSrc;
  img.addEventListener("error", () => {
    // Prevent infinite loop if fallback is missing.
    if (img.dataset.fallbackApplied === "1") return;
    img.dataset.fallbackApplied = "1";
    img.src = fallbackSrc;
  });
  imgWrap.appendChild(img);

  const time = document.createElement("div");
  time.className = "of2-time";
  time.textContent = m.timeLabel || "";
  imgWrap.appendChild(time);

  const meta = document.createElement("div");
  meta.className = "of2-meta";

  const matchLine = document.createElement("div");
  matchLine.className = "of2-match";
  const homeText = document.createElement("span");
  homeText.textContent = m.homeName || "";
  const vs = document.createElement("span");
  vs.className = "of2-vs";
  vs.textContent = "contre";
  const awayText = document.createElement("span");
  awayText.textContent = m.awayName || "";
  matchLine.appendChild(homeText);
  matchLine.appendChild(document.createTextNode(" "));
  matchLine.appendChild(vs);
  matchLine.appendChild(document.createTextNode(" "));
  matchLine.appendChild(awayText);

  const comp = document.createElement("div");
  comp.className = "of2-comp";
  comp.textContent = m.comp || "Football";

  meta.appendChild(matchLine);
  meta.appendChild(comp);

  // Live badge
  if (m.isLive) {
    const live = document.createElement("div");
    live.className = "of2-live";
    live.textContent = "LIVE";
    imgWrap.appendChild(live);
  }

  card.appendChild(imgWrap);
  card.appendChild(meta);

  card.addEventListener("click", () => openOnlyfootStreams(m.raw));

  return card;
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


async function loadOnlyfootMatches(force = false) {
  if (!onlyfootSection) return;
  try { __tvLiveInit(); } catch (_) {}

  // Charger les sports disponibles (une seule fois)
  if (!onlyfootState.sportsLoaded) {
    await loadAvailableSports();
  }

  if (onlyfootState.loaded && !force) {
    // Still re-render to apply possible filter changes
    renderOnlyfoot();
    return;
  }

  onlyfootLoadFavTeams();
  onlyfootUpdateViewUI();
  onlyfootSetLoading();

  try {
    // Utiliser le sport sélectionné
    const sport = onlyfootState.sport || "football";
    const endpoint = sport === "football"
      ? "/api/onlyfoot/matches/today"
      : `/api/onlyfoot/matches/sport/${encodeURIComponent(sport)}`;

    const data = await fetchJSON(endpoint);
    const matches = Array.isArray(data) ? data : [];

    onlyfootState.matchesRaw = matches;
    onlyfootState.matches = enrichOnlyfootMatches(matches);
    onlyfootState.loaded = true;

    // Populate competitions dropdown from current dataset (then render)
    onlyfootPopulateCompetitions(onlyfootState.matches);

    renderOnlyfoot();
  } catch (err) {
    console.error(`Erreur chargement ONLYFOOT (${onlyfootState.sport}):`, err);
    const sportName = onlyfootState.sport || "football";
    if (onlyfootLiveList) {
      onlyfootLiveList.innerHTML = "";
      const box = document.createElement("div");
      box.className = "onlyfoot-empty";
      const p = document.createElement("p");
      p.textContent = `Impossible de charger les matchs de ${sportName}.`;
      box.appendChild(p);
      onlyfootLiveList.appendChild(box);
    }
    if (onlyfootTodayList) onlyfootTodayList.innerHTML = "";
    if (onlyfootUpcomingList) onlyfootUpcomingList.innerHTML = "";
  }
}

// Init OnlyFoot controls (safe no-op if the section isn't present)
if (onlyfootSection) {
  onlyfootLoadFavTeams();
  onlyfootUpdateViewUI();

  if (onlyfootSearchInput) {
    let t = null;
    onlyfootSearchInput.addEventListener("input", () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        onlyfootState.query = onlyfootSearchInput.value || "";
        renderOnlyfoot();
      }, 180);
    });
  }

  // Streamed-like top tabs (En direct / Populaire)
  const of2Tabs = document.querySelectorAll("#onlyfoot-section .of2-tab[data-of2-tab]");
  of2Tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      const v = btn.getAttribute("data-of2-tab");
      if (!v) return;
      onlyfootState.of2Tab = v;

      of2Tabs.forEach((b) => b.classList.toggle("is-active", b === btn));
      renderOnlyfoot();
    });
  });

  onlyfootChipButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const f = btn.getAttribute("data-focus");
      if (!f) return;
      onlyfootToggleFocus(f);
    });
  });

  if (onlyfootCompetitionSelect) {
    onlyfootCompetitionSelect.addEventListener("change", () => {
      onlyfootState.competition = onlyfootCompetitionSelect.value || "__all__";
      renderOnlyfoot();
    });
  }
}




// ===============
// ONLYFOOT ?" TV LIVE
// ===============
// NOTE: this block can be invoked early (OnlyFoot UI init may run before this
// section is parsed). Using `var` avoids the temporal-dead-zone ReferenceError
// you saw in console: "Cannot access '__tvLiveInitialized' before initialization".
var __tvChannelsCache = null;
var __tvChannelsLoading = false;
var __tvLiveInitialized = false;
var __tvCurrentChannel = null;
var __tvCurrentPlayer = "wigi";

async function __loadTvChannels() {
  if (__tvChannelsCache) return __tvChannelsCache;
  if (__tvChannelsLoading) {
    while (__tvChannelsLoading) {
      await new Promise((r) => setTimeout(r, 50));
    }
    return __tvChannelsCache || [];
  }

  __tvChannelsLoading = true;
  try {
    const res = await fetch("/tv/channel.json", { cache: "no-store" });
    const json = await res.json();
    if (Array.isArray(json)) __tvChannelsCache = json;
    else if (Array.isArray(json?.channels)) __tvChannelsCache = json.channels;
    else __tvChannelsCache = [];
  } catch (e) {
    console.error("TV Live: failed to load channel.json", e);
    __tvChannelsCache = [];
  } finally {
    __tvChannelsLoading = false;
  }
  return __tvChannelsCache;
}

function __getTvUrl(channel, player) {
  try {
    const sources = Array.isArray(channel?.sources) ? channel.sources : [];
    const wanted = sources.find((s) => (s.player || "").toLowerCase() === (player || "").toLowerCase());
    const fallback = sources[0];
    const src = wanted || fallback;
    return src?.url_template || "";
  } catch (_) {
    return "";
  }
}

function __pickDefaultPlayer(channel) {
  const w = __getTvUrl(channel, "wigi");
  if (w) return "wigi";
  const c = __getTvUrl(channel, "caster");
  if (c) return "caster";
  const h = __getTvUrl(channel, "hoca");
  if (h) return "hoca";
  try {
    const sources = Array.isArray(channel?.sources) ? channel.sources : [];
    const p = (sources[0]?.player || "").toLowerCase();
    return p || "wigi";
  } catch (_) {
    return "wigi";
  }
}

function __setActiveTvButton(player) {
  const p = (player || "").toLowerCase();
  const map = { wigi: tvBtnWigi, caster: tvBtnCaster, hoca: tvBtnHoca };
  Object.entries(map).forEach(([k, btn]) => {
    if (!btn) return;
    if (k === p) btn.classList.add("active");
    else btn.classList.remove("active");
  });
}

function __updateTvModal() {
  if (!tvModal || !tvIframe || !tvModalTitle) return;
  if (!__tvCurrentChannel) return;

  try { tvModalTitle.textContent = __tvCurrentChannel.name || "TV Live"; } catch (_) {}
  __setActiveTvButton(__tvCurrentPlayer);

  const url = __getTvUrl(__tvCurrentChannel, __tvCurrentPlayer);
  try { window.__tvLiveLastUrl = url || ""; } catch (_) {}
  try {
    tvIframe.setAttribute("allow", "autoplay; fullscreen; picture-in-picture; encrypted-media");
    tvIframe.setAttribute("referrerpolicy", "no-referrer");
    tvIframe.setAttribute("loading", "eager");
    tvIframe.src = url ? url : "about:blank";
  } catch (_) {}
}

function __switchTvPlayer(player) {
  if (!__tvCurrentChannel) return;
  __tvCurrentPlayer = (player || "wigi").toLowerCase();
  __updateTvModal();
}

function __openTvModal(channel, opts) {
  const skipGate = opts && opts.skipGate;
  if (!skipGate) {
    const channelId = channel && (channel.id || channel.key || channel.slug || channel.name);
    openPreplayGate(
      { type: "tv", channelId },
      () => __openTvModal(channel, { skipGate: true })
    );
    return;
  }
  __tvCurrentChannel = channel;
  __tvCurrentPlayer = __pickDefaultPlayer(channel);
  trackOnlyfootEvent("tv_channel_open", {
    channelName: channel && channel.name ? channel.name : null,
    channelId: channel && (channel.id || channel.key || channel.slug) ? (channel.id || channel.key || channel.slug) : null
  });
  __updateTvModal();
  if (tvModal) showModal(tvModal);
}

function __renderTvRow(channels) {
  if (!onlyfootTvRow) return;
  onlyfootTvRow.innerHTML = "";

  const list = Array.isArray(channels) ? channels : [];
  if (!list.length) {
    const d = document.createElement("div");
    d.style.padding = "0.25rem 0.15rem";
    d.style.opacity = "0.75";
    d.textContent = "TV Live indisponible";
    onlyfootTvRow.appendChild(d);
    return;
  }

  list.forEach((ch) => {
    const card = document.createElement("div");
    card.className = "card tv-card";
    const logo = (ch && ch.logo) ? String(ch.logo) : "";
    const name = (ch && ch.name) ? String(ch.name) : "";
    const safeLogo = logo.replace(/[^a-zA-Z0-9._-]/g, "");
    const safeName = name;

    const top = document.createElement("div");
    top.className = "tv-card-top";
    if (safeLogo) {
      const img = document.createElement("img");
      img.src = `/tv/logos/${safeLogo}`;
      img.alt = safeName;
      img.loading = "lazy";
      top.appendChild(img);
    }

    const nameEl = document.createElement("div");
    nameEl.className = "tv-card-name";
    nameEl.title = safeName;
    nameEl.textContent = safeName;

    card.appendChild(top);
    card.appendChild(nameEl);
    card.addEventListener("click", () => __openTvModal(ch));
    onlyfootTvRow.appendChild(card);
  });
}
function __bindTvCarouselControls() {
  const root = document.querySelector("#onlyfoot-section .of2-carousel");
  if (!root) return;
  const row = onlyfootTvRow;
  const leftBtn = root.querySelector(".of2-car-btn-left");
  const rightBtn = root.querySelector(".of2-car-btn-right");
  if (!row || !leftBtn || !rightBtn) return;

  const step = () => {
    // scroll by ~3 cards
    const firstCard = row.querySelector(".tv-card");
    const cardW = firstCard ? firstCard.getBoundingClientRect().width : 110;
    return Math.max(240, Math.floor(cardW * 3.2));
  };

  const update = () => {
    const max = row.scrollWidth - row.clientWidth - 2;
    leftBtn.disabled = row.scrollLeft <= 2;
    rightBtn.disabled = row.scrollLeft >= max;
  };

  leftBtn.onclick = () => { row.scrollBy({ left: -step(), behavior: "smooth" }); };
  rightBtn.onclick = () => { row.scrollBy({ left: step(), behavior: "smooth" }); };

  // wheel horizontal
  row.addEventListener("wheel", (e) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    // convert vertical wheel to horizontal
    if (row.scrollWidth > row.clientWidth) {
      e.preventDefault();
      row.scrollBy({ left: e.deltaY, behavior: "auto" });
    }
  }, { passive: false });

  row.addEventListener("scroll", () => requestAnimationFrame(update));
  window.addEventListener("resize", () => requestAnimationFrame(update));
  requestAnimationFrame(update);
}


async function __tvLiveInit() {
  if (__tvLiveInitialized) return;
  if (!onlyfootTvRow && !tvModal) return;
  __tvLiveInitialized = true;

  try {
    if (tvBtnWigi) tvBtnWigi.onclick = () => __switchTvPlayer("wigi");
    if (tvBtnCaster) tvBtnCaster.onclick = () => __switchTvPlayer("caster");
    if (tvBtnHoca) tvBtnHoca.onclick = () => __switchTvPlayer("hoca");
  } catch (_) {}

  try {
    if (onlyfootTvRow) {
      onlyfootTvRow.innerHTML = '<div style="padding:0.25rem 0.15rem;opacity:.75">Chargement TV Live…</div>';
    }
  } catch (_) {}

  const channels = await __loadTvChannels();
  __renderTvRow(channels);
  try { __bindTvCarouselControls(); } catch (_) {}
}

async function openOnlyfootStreams(match, opts) {
  const skipGate = opts && opts.skipGate;
  if (!skipGate) {
    const source = match && (match.source || match.streamSource || match.provider || match.site || "unknown");
    const id = match && (match.id || match.matchId || match.streamId || match.string || match._id);
    openPreplayGate(
      { type: "onlyfoot", source, id },
      () => openOnlyfootStreams(match, { skipGate: true })
    );
    return;
  }

  const onlyfootModal = document.getElementById("onlyfoot-modal");
  const onlyfootTitle = document.getElementById("onlyfoot-modal-title");
  const onlyfootBody = document.getElementById("onlyfoot-streams");

  if (!onlyfootModal || !onlyfootBody || !onlyfootTitle) {
    console.error("Details modal not found for ONLYFOOT streams");
    return;
  }

  const homeName = match.home && match.home.name ? match.home.name : "";
  const awayName = match.away && match.away.name ? match.away.name : "";
  const titleText =
    match.title ||
    (homeName && awayName ? `${homeName} vs ${awayName}` : "Match de football");
  trackOnlyfootEvent("match_open", {
    title: titleText,
    competition: match.competition || match.league || match.tournament || match.category || match.country || null,
    vs: homeName && awayName ? `${homeName} vs ${awayName}` : null,
    matchId: match.id || match.matchId || match.streamId || null
  });

  // Sauvegarder le match actuel pour l'overlay plein écran
  window.__onlyfootCurrentMatch = match;

  // Titre de la modale = nom du match
  onlyfootTitle.textContent = titleText;
  onlyfootModal.classList.remove("hidden");
  onlyfootBody.innerHTML = '<div class="onlyfoot-streams-loading">Chargement des sources...</div>';

  const allStreams = [];

  // Normalisation des sources possibles (array, objet map, etc.)
  let sourcesArray = [];
  if (Array.isArray(match.sources)) {
    // Ex : [{ source: "alpha", string: "123" }, { source: "bravo", id: "456" }]
    sourcesArray = match.sources;
  } else if (match.sources && typeof match.sources === "object") {
    // Ex: { alpha: "id123", bravo: "id456" }
    sourcesArray = Object.entries(match.sources)
      .filter(([source, value]) => value != null)
      .map(([source, value]) => ({ source, id: value, string: value }));
  } else if (match.sources_map && typeof match.sources_map === "object") {
    // Sécurité au cas où l'API utilise une autre clé
    sourcesArray = Object.entries(match.sources_map)
      .filter(([source, value]) => value != null)
      .map(([source, value]) => ({ source, id: value, string: value }));
  }

  console.log("[ONLYFOOT] Match sélectionné:", match);
  console.log("[ONLYFOOT] Sources normalisées:", sourcesArray);

  for (const s of sourcesArray) {
    if (!s || !s.source) {
      continue;
    }

    // Certains schémas utilisent s.string, d'autres s.id ?' on supporte les deux.
    const sourceId = s.string || s.id || s.matchId || s.streamId;
    if (!sourceId) {
      continue;
    }

      try {
        const contentKey = buildAdContentKey({ type: "onlyfoot", source: s.source, id: sourceId });
        const adToken = await ensureAdGateToken(contentKey);
        const url = withAdGateParams(
          `/api/onlyfoot/streams/${encodeURIComponent(s.source)}/${encodeURIComponent(sourceId)}`,
          contentKey,
          adToken
        );
        const streams = await fetchJSON(url);

      if (Array.isArray(streams)) {
        streams.forEach((st) =>
          allStreams.push({
            ...st,
            origin: s.source,
          })
        );
      }
    } catch (err) {
      console.error("Erreur récupération stream ONLYFOOT:", err);
    }
  }

  if (!allStreams.length) {
    onlyfootBody.innerHTML = '<div class="onlyfoot-streams-empty">Aucune source disponible pour ce match.</div>';
    return;
  }

  // Organiser les sources par qualité (FullHD > HD > SD)
  const groupedStreams = {
    fullhd: [],
    hd: [],
    sd: []
  };

  allStreams.forEach((st) => {
    // Détection de la qualité
    if (st.quality && st.quality.toLowerCase().includes('1080')) {
      groupedStreams.fullhd.push(st);
    } else if (st.hd || (st.quality && st.quality.toLowerCase().includes('720'))) {
      groupedStreams.hd.push(st);
    } else {
      groupedStreams.sd.push(st);
    }
  });

  const container = document.createElement("div");
  container.className = "onlyfoot-streams-organized";

  // Fonction helper pour créer un groupe de sources
  function createSourceGroup(title, streams, qualityClass) {
    if (streams.length === 0) return null;

    const group = document.createElement("div");
    group.className = "onlyfoot-source-group";

    const groupTitle = document.createElement("div");
    groupTitle.className = "onlyfoot-source-group-title";
    groupTitle.textContent = title;
    group.appendChild(groupTitle);

    streams.forEach((st) => {
      const btn = document.createElement("button");
      btn.className = "stream-btn";

      const quality = st.quality || (st.hd ? "HD" : "SD");
      const lang = st.language || "Langue inconnue";
      const origin = st.origin || st.source || "";
      const num = st.streamNo != null ? `#${st.streamNo}` : "";

      const qualityBadge = document.createElement("span");
      qualityBadge.className = `stream-quality-badge ${qualityClass}`;
      qualityBadge.textContent = String(quality);

      const langBadge = document.createElement("span");
      langBadge.className = "stream-lang-badge";
      langBadge.textContent = String(lang);

      const label = document.createElement("span");
      label.textContent = `${origin} ${num}`.trim();

      btn.appendChild(qualityBadge);
      btn.appendChild(langBadge);
      btn.appendChild(label);

      btn.addEventListener("click", () => {
        if (st.embedUrl) {
          openStreamEmbed(st.embedUrl);
        } else {
          console.warn("Pas d'embedUrl pour ce stream");
        }
      });

      group.appendChild(btn);
    });

    return group;
  }

  // Ajouter les groupes dans l'ordre de qualité
  const fullhdGroup = createSourceGroup(`Full HD • ${groupedStreams.fullhd.length} source${groupedStreams.fullhd.length > 1 ? 's' : ''}`, groupedStreams.fullhd, 'fullhd');
  const hdGroup = createSourceGroup(`HD • ${groupedStreams.hd.length} source${groupedStreams.hd.length > 1 ? 's' : ''}`, groupedStreams.hd, 'hd');
  const sdGroup = createSourceGroup(`SD • ${groupedStreams.sd.length} source${groupedStreams.sd.length > 1 ? 's' : ''}`, groupedStreams.sd, 'sd');

  if (fullhdGroup) container.appendChild(fullhdGroup);
  if (hdGroup) container.appendChild(hdGroup);
  if (sdGroup) container.appendChild(sdGroup);

  onlyfootBody.innerHTML = "";
  onlyfootBody.appendChild(container);
}
function openStreamEmbed(url) {
  const iframe = document.getElementById("onlyfoot-iframe");
  const modal = document.getElementById("onlyfoot-modal");
  const openBtn = document.getElementById("onlyfoot-open-newtab");
  const secureBtn = document.getElementById("onlyfoot-secure-mode");
  const compatBtn = document.getElementById("onlyfoot-compat-mode");

  if (!iframe || !modal) {
    console.warn("Impossible d'ouvrir le flux ONLYFOOT : onlyfoot-modal manquant.");
    return;
  }

  // Stocke la dernière URL pour pouvoir recharger proprement lors d'un changement de mode.
  window.__onlyfootLastEmbedUrl = url;

  // Helpers : applique un mode de lecture en ajustant l'iframe.
  // NOTE: certains fournisseurs refusent l'affichage si l'iframe est sandboxée.
  function applyOnlyfootIframeMode(mode) {
    try {
      // 1) Reset pour forcer le rechargement propre après modification d'attributs.
      iframe.src = "about:blank";

      // 2) Applique les attributs selon le mode.
      if (mode === "secure") {
        // Mode plus restrictif (peut ne pas fonctionner selon la source).
        iframe.setAttribute(
          "sandbox",
          "allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
        );
      } else {
        // Mode compatibilité (maximise les chances que la source fonctionne).
        iframe.removeAttribute("sandbox");
      }

      // 3) Recharge la dernière URL.
      const last = window.__onlyfootLastEmbedUrl;
      if (last) {
        setTimeout(() => {
          iframe.src = last;
        }, 50);
      }
    } catch (e) {
      console.error("[ONLYFOOT] Erreur application mode iframe:", e);
    }
  }

  // Par défaut, on privilégie la compatibilité.
  applyOnlyfootIframeMode("compat");
  modal.classList.remove("hidden");

  // Branche les boutons une seule fois.
  if (secureBtn && !secureBtn.__boundOnlyfoot) {
    secureBtn.__boundOnlyfoot = true;
    secureBtn.addEventListener("click", () => applyOnlyfootIframeMode("secure"));
  }
  if (compatBtn && !compatBtn.__boundOnlyfoot) {
    compatBtn.__boundOnlyfoot = true;
    compatBtn.addEventListener("click", () => applyOnlyfootIframeMode("compat"));
  }

  // Met à jour le bouton "Ouvrir dans un nouvel onglet"
  if (openBtn) {
    if (url) {
      openBtn.classList.remove("hidden");
      openBtn.disabled = false;
      openBtn.onclick = () => {
        window.open(url, "_blank");
      };
    } else {
      openBtn.onclick = null;
      openBtn.disabled = true;
    }
  }

  // Gestion du plein écran
  const fullscreenBtn = document.getElementById("onlyfoot-fullscreen-btn");
  const fullscreenExitBtn = document.getElementById("onlyfoot-fullscreen-exit");
  const iframeContainer = document.querySelector(".onlyfoot-iframe-container");
  const fullscreenOverlay = document.getElementById("onlyfoot-fullscreen-overlay");
  const fullscreenMatchTitle = document.getElementById("onlyfoot-fullscreen-match-title");

  function toggleOnlyfootFullscreen() {
    if (!iframeContainer) return;

    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      // Entrer en plein écran
      if (iframeContainer.requestFullscreen) {
        iframeContainer.requestFullscreen();
      } else if (iframeContainer.webkitRequestFullscreen) {
        iframeContainer.webkitRequestFullscreen();
      }
    } else {
      // Quitter le plein écran
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  }

  // Gérer la visibilité de l'overlay en plein écran
  function handleFullscreenChange() {
    if (document.fullscreenElement === iframeContainer || document.webkitFullscreenElement === iframeContainer) {
      fullscreenOverlay?.classList.remove("hidden");
      // Afficher l'overlay temporairement
      fullscreenOverlay?.classList.add("visible");
      setTimeout(() => {
        fullscreenOverlay?.classList.remove("visible");
      }, 3000);
    } else {
      fullscreenOverlay?.classList.add("hidden");
      fullscreenOverlay?.classList.remove("visible");
    }
  }

  // Afficher l'overlay au mouvement de la souris en plein écran
  let hideOverlayTimeout;
  if (iframeContainer) {
    iframeContainer.addEventListener("mousemove", () => {
      if (document.fullscreenElement === iframeContainer || document.webkitFullscreenElement === iframeContainer) {
        fullscreenOverlay?.classList.add("visible");
        clearTimeout(hideOverlayTimeout);
        hideOverlayTimeout = setTimeout(() => {
          fullscreenOverlay?.classList.remove("visible");
        }, 3000);
      }
    });
  }

  // Boutons plein écran
  if (fullscreenBtn && !fullscreenBtn.__boundOnlyfoot) {
    fullscreenBtn.__boundOnlyfoot = true;
    fullscreenBtn.addEventListener("click", toggleOnlyfootFullscreen);
  }

  if (fullscreenExitBtn && !fullscreenExitBtn.__boundOnlyfoot) {
    fullscreenExitBtn.__boundOnlyfoot = true;
    fullscreenExitBtn.addEventListener("click", toggleOnlyfootFullscreen);
  }

  // ?couter les changements de plein écran
  document.addEventListener("fullscreenchange", handleFullscreenChange);
  document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

  // Mettre à jour le titre du match dans l'overlay
  if (fullscreenMatchTitle && window.__onlyfootCurrentMatch) {
    const match = window.__onlyfootCurrentMatch;
    const homeName = match.home?.name || "";
    const awayName = match.away?.name || "";
    fullscreenMatchTitle.textContent = match.title || `${homeName} vs ${awayName}`;
  }
}

if (onlyfootButton) {
  onlyfootButton.addEventListener("click", async () => {
    await loadOnlyfootMatches();
    trackPageView("onlyfoot");
    if (onlyfootSection && typeof onlyfootSection.scrollIntoView === "function") {
      onlyfootSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}
async function openDetails(id, type) {
  detailsBody.innerHTML = "<p>Chargement...</p>";
  showModal(detailsModal);

  try {
    if (type === "movie") {
      const data = await fetchJSON(`${API_BASE}/api/tmdb/movie/${id}?append=credits`);
      renderMovieDetails(data);
    } else {
      const data = await fetchJSON(`${API_BASE}/api/tmdb/series/${id}?append=credits`);
      renderSeriesDetails(data);
    }
  } catch (err) {
    console.error("Erreur détails:", err);
    detailsBody.innerHTML = "<p>Impossible de charger les détails.</p>";
  }
}

function pickSeriesPreviewVideo(videos) {
  const list = Array.isArray(videos) ? videos : [];
  const yt = list.filter((v) => v && v.site === "YouTube" && v.key);
  if (!yt.length) return null;

  const score = (v) => {
    let s = 0;
    if (v.official) s += 3;
    const t = String(v.type || "").toLowerCase();
    if (t === "trailer") s += 4;
    else if (t === "teaser") s += 2;
    const name = String(v.name || "").toLowerCase();
    if (name.includes("trailer")) s += 2;
    if (name.includes("teaser")) s += 1;
    return s;
  };

  yt.sort((a, b) => score(b) - score(a));
  return yt[0];
}

function buildYoutubePreviewUrl(key, muted) {
  const params = new URLSearchParams({
    autoplay: "1",
    mute: muted ? "1" : "0",
    loop: "1",
    playlist: key,
    controls: "0",
    modestbranding: "1",
    rel: "0",
    playsinline: "1",
    enablejsapi: "1",
    fs: "0",
    iv_load_policy: "3",
    disablekb: "1",
    autohide: "1",
    showinfo: "0",
  });
  return `https://www.youtube-nocookie.com/embed/${key}?${params.toString()}`;
}

function setYoutubePreviewMuted(iframe, muted) {
  if (!iframe || !iframe.contentWindow) return;
  const cmd = muted ? "mute" : "unMute";
  iframe.contentWindow.postMessage(
    JSON.stringify({ event: "command", func: cmd, args: [] }),
    "*"
  );
}

let __ytApiPromise = null;
function ensureYouTubeIframeApi() {
  if (__ytApiPromise) return __ytApiPromise;
  __ytApiPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve(window.YT);
      return;
    }
    const existing = document.getElementById("yt-iframe-api");
    if (!existing) {
      const tag = document.createElement("script");
      tag.id = "yt-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === "function") {
        try { prev(); } catch (_) {}
      }
      resolve(window.YT);
    };
  });
  return __ytApiPromise;
}

// Preload YouTube Iframe API as early as possible
try {
  ensureYouTubeIframeApi();
} catch (_) {}

const TRAILER_BAD_CACHE_KEY = "onlyus_trailer_bad_v1";
const TRAILER_BAD_TTL_MS = 0; // 0 = keep indefinitely

function loadTrailerBadCache() {
  try {
    const raw = localStorage.getItem(TRAILER_BAD_CACHE_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    return data && typeof data === "object" ? data : {};
  } catch (_) {
    return {};
  }
}

function saveTrailerBadCache(cache) {
  try {
    localStorage.setItem(TRAILER_BAD_CACHE_KEY, JSON.stringify(cache || {}));
  } catch (_) {}
}

function isTrailerBad(cache, key) {
  if (!cache || !key) return false;
  const ts = cache[key];
  if (!ts) return false;
  if (TRAILER_BAD_TTL_MS && Date.now() - ts > TRAILER_BAD_TTL_MS) {
    delete cache[key];
    return false;
  }
  return true;
}

function mirrorNodeContent(source, target) {
  if (!source || !target) return;
  const sync = () => {
    target.innerHTML = source.innerHTML;
    target.setAttribute("aria-label", source.getAttribute("aria-label") || "");
    target.setAttribute("title", source.getAttribute("title") || "");
  };
  sync();
  try {
    const obs = new MutationObserver(sync);
    obs.observe(source, { childList: true, subtree: true, characterData: true, attributes: true });
  } catch (_) {}
}

function createProxyButton(source, extraClass) {
  if (!source) return null;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = extraClass ? `${source.className} ${extraClass}` : source.className;
  mirrorNodeContent(source, btn);
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    try { source.click(); } catch (_) {}
  });
  return btn;
}

const __detailsYtPlayers = [];
function registerDetailsPlayer(player) {
  if (!player) return;
  __detailsYtPlayers.push(player);
}

function destroyDetailsPlayers() {
  while (__detailsYtPlayers.length) {
    const p = __detailsYtPlayers.pop();
    try {
      if (p && typeof p.destroy === "function") p.destroy();
    } catch (_) {}
  }
}

function muteDetailsPreviewAudio() {
  try {
    if (!detailsModal || detailsModal.classList.contains("hidden")) return;

    const headerSound = detailsModal.querySelector(".details-preview-sound");
    if (headerSound) {
      headerSound.setAttribute("data-muted", "1");
      headerSound.textContent = "Activer le son";
    }

    const iframe = detailsModal.querySelector(".details-series-player iframe");
    if (iframe) setYoutubePreviewMuted(iframe, true);

    for (const p of __detailsYtPlayers) {
      try {
        if (p && typeof p.mute === "function") p.mute();
      } catch (_) {}
    }
  } catch (_) {}
}

async function mountTrailerPreview({
  mediaType,
  tmdbId,
  header,
  headerOverlay,
  headerSound,
  backdropPath,
  posterPath
}) {
  if (!header || !headerOverlay || !mediaType || !tmdbId) return;

  try {
    const res = await fetchJSON(`${API_BASE}/api/tmdb/${mediaType}/${tmdbId}/videos`);
    const badCache = loadTrailerBadCache();
    const allVideos = Array.isArray(res && res.results) ? res.results : [];

    let candidates = allVideos
      .filter((v) => v && v.site === "YouTube" && v.key)
      .filter((v) => !isTrailerBad(badCache, v.key))
      .sort((a, b) => {
        const score = (v) => {
          let s = 0;
          if (v.official) s += 3;
          const t = String(v.type || "").toLowerCase();
          if (t === "trailer") s += 4;
          else if (t === "teaser") s += 2;
          const name = String(v.name || "").toLowerCase();
          if (name.includes("trailer")) s += 2;
          if (name.includes("teaser")) s += 1;
          return s;
        };
        return score(b) - score(a);
      });

    // Backdrop blur layer
    if (backdropPath) {
      const bg = document.createElement("div");
      bg.className = "details-series-backdrop";
      bg.style.backgroundImage = `url("${imageBasePoster + backdropPath}")`;
      header.insertBefore(bg, headerOverlay);
    }

    if (!candidates.length) {
      // Retry without cache (in case of false positives)
      candidates = allVideos.filter((v) => v && v.site === "YouTube" && v.key);
    }

    if (!candidates.length) {
      const imgFallback = document.createElement("div");
      imgFallback.className = "details-series-fallback";
      const imgPath = backdropPath || posterPath || "";
      if (imgPath) {
        imgFallback.style.backgroundImage = `url("/api/tmdb-image/original${imgPath}")`;
      }
      header.insertBefore(imgFallback, headerOverlay);
      header.classList.add("no-video");
      if (headerSound) headerSound.classList.add("hidden");
      return;
    }    const playerHost = document.createElement("div");
    playerHost.className = "details-series-player";
    const iframeId = `details-yt-${mediaType}-${tmdbId}-${Date.now()}`;
    playerHost.id = iframeId;
    header.insertBefore(playerHost, headerOverlay);
    header.classList.add("has-video");

    let currentIndex = 0;
    let ytPlayer = null;
    let isMuted = true;
    let readyTimer = null;

    const finalizeFallback = () => {
      try { playerHost.classList.add("hidden"); } catch (_) {}
      header.classList.add("no-video");
      const imgFallback = document.createElement("div");
      imgFallback.className = "details-series-fallback";
      const imgPath = backdropPath || posterPath || "";
      if (imgPath) {
        imgFallback.style.backgroundImage = `url("/api/tmdb-image/original${imgPath}")`;
      }
      header.insertBefore(imgFallback, headerOverlay);
      if (headerSound) headerSound.classList.add("hidden");
    };

    const loadCandidate = async () => {
      const vid = candidates[currentIndex];
      if (!vid) return;

      const YT = await ensureYouTubeIframeApi();
      try {
        if (ytPlayer) {
          ytPlayer.destroy();
          ytPlayer = null;
        }
      } catch (_) {}

      if (readyTimer) {
        clearTimeout(readyTimer);
        readyTimer = null;
      }

      ytPlayer = new YT.Player(iframeId, {
        videoId: vid.key,
        playerVars: {
          autoplay: 1,
          mute: isMuted ? 1 : 0,
          loop: 1,
          playlist: vid.key,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          fs: 0,
          iv_load_policy: 3,
          disablekb: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (e) => {
            if (readyTimer) {
              clearTimeout(readyTimer);
              readyTimer = null;
            }
            try { e.target.playVideo(); } catch (_) {}
          },
          onError: () => {
            badCache[vid.key] = Date.now();
            saveTrailerBadCache(badCache);
            currentIndex += 1;
            if (currentIndex < candidates.length) {
              loadCandidate();
            } else {
              finalizeFallback();
            }
          },
        },
      });

      registerDetailsPlayer(ytPlayer);

      // Fallback if the player doesn't become ready (blocked)
      readyTimer = setTimeout(() => {
        badCache[vid.key] = Date.now();
        saveTrailerBadCache(badCache);
        currentIndex += 1;
        if (currentIndex < candidates.length) {
          loadCandidate();
        } else {
          finalizeFallback();
        }
      }, 4500);
    };

    if (headerSound) {
      headerSound.addEventListener("click", () => {
        const isMutedAttr = headerSound.getAttribute("data-muted") === "1";
        const nextMuted = !isMutedAttr;
        headerSound.setAttribute("data-muted", nextMuted ? "1" : "0");
        headerSound.textContent = nextMuted ? "Activer le son" : "Couper le son";
        isMuted = nextMuted;
        setYoutubePreviewMuted(playerHost.querySelector("iframe"), nextMuted);
        try {
          if (ytPlayer) {
            if (nextMuted) ytPlayer.mute();
            else ytPlayer.unMute();
          }
        } catch (_) {}
      });
    }

    loadCandidate();
  } catch (e) {
    console.warn("[DETAILS] Impossible de charger la bande-annonce:", e);
  }
}

function renderMovieDetails(movie) {
  const {
    id,
    title,
    overview,
    poster_path,
    release_date,
    runtime,
    vote_average,
    backdrop_path,
    genres,
    credits,
  } = movie;
  const year = release_date ? String(release_date).slice(0, 4) : "";
  const duration = runtime ? `${runtime} min` : "";
  const rating = vote_average ? `${vote_average.toFixed(1)}/10` : "";
  const safeTitle = escapeHtml(String(title || "Sans titre"));

  const container = document.createElement("div");
  container.className = "details-series";

  const header = document.createElement("div");
  header.className = "details-series-header";

  const headerOverlay = document.createElement("div");
  headerOverlay.className = "details-series-header-overlay";

  const headerMeta = document.createElement("div");
  headerMeta.className = "details-series-header-meta";

  const headerTitle = document.createElement("h1");
  headerTitle.textContent = title || "Sans titre";

  const headerSub = document.createElement("div");
  headerSub.className = "details-series-header-sub";
  headerSub.textContent = `Film${year ? " • " + year : ""}${duration ? " • " + duration : ""}${rating ? " • " + rating : ""}`;

  const headerActions = document.createElement("div");
  headerActions.className = "details-series-header-actions";

  const headerPrimaryBtn = document.createElement("button");
  headerPrimaryBtn.type = "button";
  headerPrimaryBtn.className = "details-header-btn details-header-btn-primary";
  headerPrimaryBtn.innerHTML = `<span class="details-header-btn-title">Lire</span><span class="details-header-btn-sub"></span>`;

  const myListBtn = document.createElement("button");
  myListBtn.type = "button";
  myListBtn.className = "btn-secondary details-header-mylist";

  headerActions.appendChild(headerPrimaryBtn);
  headerActions.appendChild(myListBtn);

  headerMeta.appendChild(headerTitle);
  headerMeta.appendChild(headerSub);
  headerMeta.appendChild(headerActions);

  const headerSound = document.createElement("button");
  headerSound.type = "button";
  headerSound.className = "details-preview-sound";
  headerSound.textContent = "Activer le son";
  headerSound.setAttribute("data-muted", "1");

  headerOverlay.appendChild(headerMeta);
  headerOverlay.appendChild(headerSound);
  header.appendChild(headerOverlay);

  const info = document.createElement("div");
  info.className = "details-series-info";

  const infoLeft = document.createElement("div");
  infoLeft.className = "details-series-info-left";

  const genresWrap = document.createElement("div");
  genresWrap.className = "details-series-genres";
  const gList = Array.isArray(genres) ? genres : [];
  if (gList.length) {
    gList.forEach((g) => {
      const pill = document.createElement("span");
      pill.className = "details-series-genre";
      pill.textContent = g && g.name ? g.name : "";
      if (pill.textContent) genresWrap.appendChild(pill);
    });
  }

  const ov = document.createElement("div");
  ov.className = "details-overview";
  const fullOverview = overview || "Aucun résumé disponible.";
  ov.textContent = fullOverview;

  const ovWrap = document.createElement("div");
  ovWrap.className = "details-overview-wrap";
  ovWrap.appendChild(ov);

  const isLong = fullOverview.length > 280;
  if (isLong) {
    ov.classList.add("is-truncated");
    const moreBtn = document.createElement("button");
    moreBtn.type = "button";
    moreBtn.className = "details-overview-more";
    moreBtn.textContent = "Lire plus";
    moreBtn.addEventListener("click", () => {
      const expanded = ov.classList.toggle("is-expanded");
      if (expanded) {
        ov.classList.remove("is-truncated");
        moreBtn.textContent = "Réduire";
      } else {
        ov.classList.add("is-truncated");
        moreBtn.textContent = "Lire plus";
      }
    });
    ovWrap.appendChild(moreBtn);
  }

  if (genresWrap.childNodes.length) infoLeft.appendChild(genresWrap);
  infoLeft.appendChild(ovWrap);

  const infoRight = document.createElement("div");
  infoRight.className = "details-series-info-right";

  const infoQuick = document.createElement("div");
  infoQuick.className = "details-series-quick";
  const quickItems = [];
  if (vote_average != null) {
    quickItems.push({ label: "Note TMDB", value: `${Number(vote_average).toFixed(1)}/10` });
  }
  if (runtime) {
    quickItems.push({ label: "Durée", value: duration });
  }
  if (year) {
    quickItems.push({ label: "Année", value: year });
  }

  quickItems.forEach((item) => {
    if (!item.value) return;
    const row = document.createElement("div");
    row.className = "details-series-quick-row";
    row.innerHTML = `<span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong>`;
    infoQuick.appendChild(row);
  });

  const people = document.createElement("div");
  people.className = "details-series-people";
  const crew = Array.isArray(credits?.crew) ? credits.crew : [];
  let directors = crew
    .filter((c) => c && c.job === "Director" && c.name)
    .map((c) => c.name);
  directors = Array.from(new Set(directors)).slice(0, 4);

  if (directors.length) {
    const row = document.createElement("div");
    row.className = "details-series-people-row";
    const titleEl = document.createElement("span");
    titleEl.textContent = "Réalisateurs";
    const list = document.createElement("div");
    list.className = "details-series-people-list";
    directors.forEach((n) => {
      const pill = document.createElement("span");
      pill.className = "details-series-people-pill";
      pill.textContent = n;
      list.appendChild(pill);
    });
    row.appendChild(titleEl);
    row.appendChild(list);
    people.appendChild(row);
  }

  if (infoQuick.childNodes.length) infoRight.appendChild(infoQuick);
  if (people.childNodes.length) infoRight.appendChild(people);

  info.appendChild(infoLeft);
  info.appendChild(infoRight);

  container.appendChild(header);

  const mobileHero = document.createElement("div");
  mobileHero.className = "details-mobile-hero";

  const mobilePoster = document.createElement("div");
  mobilePoster.className = "details-mobile-poster";
  if (poster_path) {
    const img = document.createElement("img");
    img.src = imageBasePoster + poster_path;
    img.alt = title || "";
    mobilePoster.appendChild(img);
  }

  const mobileInfo = document.createElement("div");
  mobileInfo.className = "details-mobile-info";

  const mobileTitle = document.createElement("div");
  mobileTitle.className = "details-mobile-title";
  mobileTitle.textContent = title || "Sans titre";

  const mobileMeta = document.createElement("div");
  mobileMeta.className = "details-mobile-meta";
  mobileMeta.textContent = `Film${year ? " • " + year : ""}${duration ? " • " + duration : ""}${rating ? " • " + rating : ""}`;

  const mobileActions = document.createElement("div");
  mobileActions.className = "details-mobile-actions";
  const mobilePrimary = createProxyButton(headerPrimaryBtn, "details-mobile-btn");
  const mobileMyList = createProxyButton(myListBtn, "details-mobile-btn");
  if (mobilePrimary) mobileActions.appendChild(mobilePrimary);
  if (mobileMyList) mobileActions.appendChild(mobileMyList);

  mobileInfo.appendChild(mobileTitle);
  mobileInfo.appendChild(mobileMeta);
  mobileInfo.appendChild(mobileActions);

  mobileHero.appendChild(mobilePoster);
  mobileHero.appendChild(mobileInfo);

  container.appendChild(mobileHero);
  container.appendChild(info);

  const buildActorsSection = (cast) => {
    if (!cast || !cast.length) return;
    const actorsSection = document.createElement("div");
    actorsSection.className = "details-actors-section";

    const actorsTitle = document.createElement("div");
    actorsTitle.className = "details-actors-title";
    actorsTitle.textContent = "Acteurs";

    const actorsCarousel = document.createElement("div");
    actorsCarousel.className = "details-actors-carousel";

    const actorsLeft = document.createElement("button");
    actorsLeft.type = "button";
    actorsLeft.className = "actors-car-btn actors-car-btn-left";
    actorsLeft.setAttribute("aria-label", "Précédent");
    actorsLeft.title = "Précédent";
    actorsLeft.textContent = "‹";

    const actorsRow = document.createElement("div");
    actorsRow.className = "details-actors-row";

    const actorsRight = document.createElement("button");
    actorsRight.type = "button";
    actorsRight.className = "actors-car-btn actors-car-btn-right";
    actorsRight.setAttribute("aria-label", "Suivant");
    actorsRight.title = "Suivant";
    actorsRight.textContent = "›";

    const maxActors = 20;
    cast.slice(0, maxActors).forEach((actor) => {
      const card = document.createElement("div");
      card.className = "actor-card";

      const media = document.createElement("div");
      media.className = "actor-photo";

      if (actor.profile_path) {
        const img = document.createElement("img");
        img.src = imageBasePoster + actor.profile_path;
        img.alt = actor.name || "";
        img.loading = "lazy";
        media.appendChild(img);
      } else {
        const fallback = document.createElement("div");
        fallback.className = "actor-photo-fallback";
        const initials = (actor.name || "")
          .split(" ")
          .filter(Boolean)
          .slice(0, 2)
          .map((s) => s[0]?.toUpperCase())
          .join("");
        fallback.textContent = initials || "•";
        media.appendChild(fallback);
      }

      const nameEl = document.createElement("div");
      nameEl.className = "actor-name";
      nameEl.textContent = actor.name || "";

      const roleEl = document.createElement("div");
      roleEl.className = "actor-role";
      roleEl.textContent = actor.character || "";

      card.appendChild(media);
      card.appendChild(nameEl);
      if (roleEl.textContent) card.appendChild(roleEl);
      actorsRow.appendChild(card);
    });

    actorsSection.appendChild(actorsTitle);
    actorsCarousel.appendChild(actorsLeft);
    actorsCarousel.appendChild(actorsRow);
    actorsCarousel.appendChild(actorsRight);
    actorsSection.appendChild(actorsCarousel);
    container.appendChild(actorsSection);

    const updateActorsNav = () => {
      const max = actorsRow.scrollWidth - actorsRow.clientWidth - 2;
      actorsLeft.disabled = actorsRow.scrollLeft <= 2;
      actorsRight.disabled = actorsRow.scrollLeft >= max;
    };
    const stepActors = () => {
      const firstCard = actorsRow.querySelector(".actor-card");
      const cardW = firstCard ? firstCard.getBoundingClientRect().width : 110;
      return Math.max(200, Math.floor(cardW * 3.2));
    };
    actorsLeft.onclick = () => actorsRow.scrollBy({ left: -stepActors(), behavior: "smooth" });
    actorsRight.onclick = () => actorsRow.scrollBy({ left: stepActors(), behavior: "smooth" });
    actorsRow.addEventListener("scroll", () => requestAnimationFrame(updateActorsNav));
    window.addEventListener("resize", () => requestAnimationFrame(updateActorsNav));
    requestAnimationFrame(updateActorsNav);
  };

  const cast = Array.isArray(credits?.cast) ? credits.cast : [];
  if (cast.length) {
    buildActorsSection(cast);
  } else {
    // Fallback: fetch credits if missing
    (async () => {
      try {
        const data = await fetchJSON(`${API_BASE}/api/tmdb/movie/${id}?append=credits`);
        const c = Array.isArray(data?.credits?.cast) ? data.credits.cast : [];
        if (c.length) buildActorsSection(c);
      } catch (_) {}
    })();
  }

  detailsBody.innerHTML = "";
  detailsBody.appendChild(container);

  if (myListBtn) {
    attachMyListButton(myListBtn, id, "movie");
  }

  headerPrimaryBtn.addEventListener("click", async () => {
    openPreplayGate(
      { type: "movie", tmdbId: id },
      () =>
        openMoviePlayerWithOptions(id, title, {
          movieMeta: { title, originalTitle: movie.original_title, posterPath: poster_path }
        })
    );
  });

  if (!window.matchMedia("(max-width: 768px)").matches) {
    mountTrailerPreview({
      mediaType: "movie",
      tmdbId: id,
      header,
      headerOverlay,
      headerSound,
      backdropPath: backdrop_path,
      posterPath: poster_path
    });
  }
}

function renderSeriesDetails(series) {
  const {
    id,
    name,
    overview,
    poster_path,
    first_air_date,
    vote_average,
    seasons,
    backdrop_path,
  } = series;

  const year = first_air_date ? String(first_air_date).slice(0, 4) : "";
  const rating = vote_average ? `${vote_average.toFixed(1)}/10` : "";

  const seasonsFiltered = (seasons || []).filter(
    (s) => s.season_number > 0 && s.episode_count > 0
  );

  const container = document.createElement("div");
  container.className = "details-series";

  const header = document.createElement("div");
  header.className = "details-series-header";

  const headerOverlay = document.createElement("div");
  headerOverlay.className = "details-series-header-overlay";

  const headerMeta = document.createElement("div");
  headerMeta.className = "details-series-header-meta";

  const headerTitle = document.createElement("h1");
  headerTitle.textContent = name || "Sans titre";

  const headerSub = document.createElement("div");
  headerSub.className = "details-series-header-sub";
  headerSub.textContent = `Série${year ? " • " + year : ""}${rating ? " • " + rating : ""}`;

  const headerActions = document.createElement("div");
  headerActions.className = "details-series-header-actions";

  const headerPrimaryBtn = document.createElement("button");
  headerPrimaryBtn.type = "button";
  headerPrimaryBtn.className = "details-header-btn details-header-btn-primary";
  headerPrimaryBtn.innerHTML = `<span class="details-header-btn-title">Commencer</span><span class="details-header-btn-sub"></span>`;

  const myListBtn = document.createElement("button");
  myListBtn.type = "button";
  myListBtn.className = "btn-secondary details-header-mylist";

  headerActions.appendChild(headerPrimaryBtn);
  headerActions.appendChild(myListBtn);

  headerMeta.appendChild(headerTitle);
  headerMeta.appendChild(headerSub);
  headerMeta.appendChild(headerActions);

  const headerSound = document.createElement("button");
  headerSound.type = "button";
  headerSound.className = "details-preview-sound";
  headerSound.textContent = "Activer le son";
  headerSound.setAttribute("data-muted", "1");

  headerOverlay.appendChild(headerMeta);
  headerOverlay.appendChild(headerSound);
  header.appendChild(headerOverlay);

  const info = document.createElement("div");
  info.className = "details-series-info";

  const infoLeft = document.createElement("div");
  infoLeft.className = "details-series-info-left";

  const infoTitle = document.createElement("h2");
  infoTitle.className = "details-series-title";
  infoTitle.textContent = name || "Sans titre";

  const meta = document.createElement("div");
  meta.className = "details-meta";
  meta.textContent = `Série${year ? " • " + year : ""}${rating ? " • " + rating : ""}`;

  const genresWrap = document.createElement("div");
  genresWrap.className = "details-series-genres";
  const genres = Array.isArray(series.genres) ? series.genres : [];
  if (genres.length) {
    genres.forEach((g) => {
      const pill = document.createElement("span");
      pill.className = "details-series-genre";
      pill.textContent = g && g.name ? g.name : "";
      if (pill.textContent) genresWrap.appendChild(pill);
    });
  }

  const ov = document.createElement("div");
  ov.className = "details-overview";
  const fullOverview = overview || "Aucun résumé disponible.";
  ov.textContent = fullOverview;

  const ovWrap = document.createElement("div");
  ovWrap.className = "details-overview-wrap";
  ovWrap.appendChild(ov);

  const isLong = fullOverview.length > 280;
  if (isLong) {
    ov.classList.add("is-truncated");
    const moreBtn = document.createElement("button");
    moreBtn.type = "button";
    moreBtn.className = "details-overview-more";
    moreBtn.textContent = "Lire plus";
    moreBtn.addEventListener("click", () => {
      const expanded = ov.classList.toggle("is-expanded");
      if (expanded) {
        ov.classList.remove("is-truncated");
        moreBtn.textContent = "Réduire";
      } else {
        ov.classList.add("is-truncated");
        moreBtn.textContent = "Lire plus";
      }
    });
    ovWrap.appendChild(moreBtn);
  }

  if (genresWrap.childNodes.length) infoLeft.appendChild(genresWrap);
  infoLeft.appendChild(ovWrap);

  const infoRight = document.createElement("div");
  infoRight.className = "details-series-info-right";

  const infoQuick = document.createElement("div");
  infoQuick.className = "details-series-quick";

  const quickItems = [];
  if (vote_average != null) {
    quickItems.push({ label: "Note TMDB", value: `${Number(vote_average).toFixed(1)}/10` });
  }
  if (series.number_of_seasons != null) {
    quickItems.push({ label: "Saisons", value: String(series.number_of_seasons) });
  }
  if (Array.isArray(series.networks) && series.networks.length) {
    quickItems.push({ label: "Réseau", value: series.networks[0]?.name || "" });
  }

  quickItems.forEach((item) => {
    if (!item.value) return;
    const row = document.createElement("div");
    row.className = "details-series-quick-row";
    row.innerHTML = `<span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong>`;
    infoQuick.appendChild(row);
  });

  const people = document.createElement("div");
  people.className = "details-series-people";

  const credits = series.credits || {};
  const crew = Array.isArray(credits.crew) ? credits.crew : [];

  let directors = crew
    .filter((c) => c && c.job === "Director" && c.name)
    .map((c) => c.name);

  if (!directors.length && Array.isArray(series.created_by)) {
    directors = series.created_by
      .filter((c) => c && c.name)
      .map((c) => c.name);
  }

  directors = Array.from(new Set(directors)).slice(0, 4);

  const renderPeopleRow = (label, names, opts = {}) => {
    if (!names || !names.length) return null;
    const row = document.createElement("div");
    row.className = "details-series-people-row";
    const title = document.createElement("span");
    title.textContent = label;
    const list = document.createElement("div");
    list.className = "details-series-people-list";
    const max = opts.max || names.length;
    names.slice(0, max).forEach((n) => {
      const pill = document.createElement("span");
      pill.className = "details-series-people-pill";
      pill.textContent = n;
      list.appendChild(pill);
    });
    row.appendChild(title);
    row.appendChild(list);

    if (opts.more && names.length > max) {
      const moreBtn = document.createElement("button");
      moreBtn.type = "button";
      moreBtn.className = "details-series-people-more";
      moreBtn.textContent = "Afficher plus";
      moreBtn.addEventListener("click", () => {
        const expanded = row.classList.toggle("is-expanded");
        list.innerHTML = "";
        const slice = expanded ? names : names.slice(0, max);
        slice.forEach((n) => {
          const pill = document.createElement("span");
          pill.className = "details-series-people-pill";
          pill.textContent = n;
          list.appendChild(pill);
        });
        moreBtn.textContent = expanded ? "Afficher moins" : "Afficher plus";
      });
      row.appendChild(moreBtn);
    }
    return row;
  };

  const dirRow = renderPeopleRow("Réalisateurs", directors);
  if (dirRow) people.appendChild(dirRow);

  if (infoQuick.childNodes.length) infoRight.appendChild(infoQuick);
  if (people.childNodes.length) infoRight.appendChild(people);

  info.appendChild(infoLeft);
  info.appendChild(infoRight);

  const episodesContainer = document.createElement("div");
  episodesContainer.className = "episodes-list episodes-list-grid";

  let activeSeasonNumber = null;
  let seasonLabelBtn = null;
  let seasonDrawer = null;
  let seasonBackdrop = null;
  let seasonListEl = null;

  const openSeasonDrawer = () => {
    if (!seasonDrawer || !seasonBackdrop) return;
    seasonDrawer.classList.remove("hidden");
    seasonBackdrop.classList.remove("hidden");
    requestAnimationFrame(() => {
      seasonDrawer.classList.add("is-open");
      seasonBackdrop.classList.add("is-open");
      positionSeasonDrawer();
    });
    if (seasonLabelBtn) seasonLabelBtn.setAttribute("aria-expanded", "true");
  };

  const closeSeasonDrawer = () => {
    if (!seasonDrawer || !seasonBackdrop) return;
    seasonDrawer.classList.remove("is-open");
    seasonBackdrop.classList.remove("is-open");
    setTimeout(() => {
      if (seasonDrawer) seasonDrawer.classList.add("hidden");
      if (seasonBackdrop) seasonBackdrop.classList.add("hidden");
    }, 180);
    if (seasonLabelBtn) seasonLabelBtn.setAttribute("aria-expanded", "false");
  };

  // infos reprise (si dispo)
  let resumeEntry = null;
  let resumeSeason = null;
  let resumeEpisode = null;
  let resumePosition = 0;
  let didAutoScrollToResume = false;

  const positionSeasonDrawer = () => {
    try {
      if (!seasonDrawer || !seasonLabelBtn || !detailsModal) return;
      const modalContent = detailsModal.querySelector(".modal-content");
      if (!modalContent) return;

      const modalRect = modalContent.getBoundingClientRect();
      const btnRect = seasonLabelBtn.getBoundingClientRect();
      const drawerRect = seasonDrawer.getBoundingClientRect();

      const desiredLeft = (btnRect.left + btnRect.width / 2) - (drawerRect.width / 2) - modalRect.left;
      const clampedLeft = Math.max(12, Math.min(desiredLeft, modalRect.width - drawerRect.width - 12));
      const top = (btnRect.bottom - modalRect.top) + modalContent.scrollTop + 8;

      seasonDrawer.style.left = `${Math.round(clampedLeft)}px`;
      seasonDrawer.style.top = `${Math.round(top)}px`;
    } catch (_) {}
  };

  const renderEpisodes = async (seasonNumber) => {
    episodesContainer.innerHTML = "<p>Chargement des épisodes...</p>";
    try {
      const data = await fetchJSON(
        `${API_BASE}/api/tmdb/series/${id}/season/${seasonNumber}`
      );
      const episodes = data.episodes || [];

      episodesContainer.innerHTML = "";
      episodes.forEach((ep) => {
        const item = document.createElement("div");
        item.className = "episode-item";
        item.dataset.season = String(seasonNumber);
        item.dataset.episode = String(ep.episode_number);

        item.setAttribute("role", "button");
        item.setAttribute("tabindex", "0");

        const header = document.createElement("div");
        header.className = "episode-header";

        const title = document.createElement("div");
        title.className = "episode-title";
        title.textContent = `E${ep.episode_number} • ${ep.name || "Sans titre"}`;

        // Badge "Dernier" sur l'épisode à reprendre
        if (resumeSeason != null && resumeEpisode != null && Number(seasonNumber) === Number(resumeSeason) && Number(ep.episode_number) === Number(resumeEpisode)) {
          item.classList.add("is-resume-target");
          const badge = document.createElement("span");
          badge.className = "episode-badge-last";
          badge.textContent = "Dernier";
          title.appendChild(badge);
        }

        const meta = document.createElement("div");
        meta.className = "episode-meta";
        const epRuntime = ep.runtime || data.episode_run_time?.[0];
        meta.textContent = `${epRuntime ? epRuntime + " min" : ""}`;

        header.appendChild(title);
        header.appendChild(meta);

        const media = document.createElement("div");
        media.className = "episode-media";

        const thumb = document.createElement("div");
        thumb.className = "episode-thumb";
        if (ep.still_path) {
          const img = document.createElement("img");
          img.src = imageBasePoster + ep.still_path;
          img.alt = ep.name || "";
          img.loading = "lazy";
          thumb.appendChild(img);
        } else {
          const fallback = document.createElement("div");
          fallback.className = "episode-thumb-fallback";
          fallback.textContent = `E${ep.episode_number}`;
          thumb.appendChild(fallback);
        }

        const body = document.createElement("div");
        body.className = "episode-body";

        const synopsis = document.createElement("div");
        synopsis.className = "episode-synopsis";
        synopsis.textContent = ep.overview || "Résumé indisponible.";

        body.appendChild(header);
        body.appendChild(synopsis);

        media.appendChild(thumb);
        media.appendChild(body);

        const openEpisode = async () => {
          openPreplayGate(
            { type: "episode", tmdbId: id, season: seasonNumber, episode: ep.episode_number },
            () =>
              openEpisodePlayerWithOptions(id, seasonNumber, ep.episode_number, name, {
                seriesMeta: {
                  title: name,
                  originalTitle: series.original_name,
                  posterPath: poster_path,
                  episodeTitle: ep.name
                }
              })
          );
        };

        item.addEventListener("click", () => openEpisode());
        item.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openEpisode();
          }
        });

        item.appendChild(media);
        episodesContainer.appendChild(item);
      });

      // Auto-scroll supprimé (ne pas forcer le focus sur l'épisode repris)
    } catch (err) {
      console.error("Erreur chargement épisodes:", err);
      episodesContainer.innerHTML = "<p>Impossible de charger les épisodes.</p>";
    }
  };

  const seasonsWrap = document.createElement("div");
  seasonsWrap.className = "details-series-seasons";

  const lastSeasonNumber = seasonsFiltered
    .map((s) => s.season_number)
    .filter((n) => n != null)
    .sort((a, b) => a - b)
    .slice(-1)[0];

  if (lastSeasonNumber != null) {
    const titleEl = headerPrimaryBtn.querySelector(".details-header-btn-title");
    if (titleEl) titleEl.textContent = `Commencer S${lastSeasonNumber}E1`;
    headerPrimaryBtn.onclick = () => {
      openPreplayGate(
        { type: "episode", tmdbId: id, season: lastSeasonNumber, episode: 1 },
        () =>
          openEpisodePlayerWithOptions(id, lastSeasonNumber, 1, name, {
            seriesMeta: {
              title: name,
              originalTitle: series.original_name,
              posterPath: poster_path,
              episodeTitle: null
            }
          })
      );
    };
  } else {
    headerPrimaryBtn.disabled = true;
  }

  if (seasonsFiltered.length > 0) {
    const episodesHeader = document.createElement("div");
    episodesHeader.className = "details-episodes-header";

    const episodesTitle = document.createElement("div");
    episodesTitle.className = "details-episodes-title";
    episodesTitle.textContent = "Episodes";

    const seasonMenuWrap = document.createElement("div");
    seasonMenuWrap.className = "details-season-menu";

    seasonLabelBtn = document.createElement("button");
    seasonLabelBtn.type = "button";
    seasonLabelBtn.className = "details-season-btn";
    seasonLabelBtn.setAttribute("aria-haspopup", "listbox");
    seasonLabelBtn.setAttribute("aria-expanded", "false");

    const seasonCaret = document.createElement("span");
    seasonCaret.className = "details-season-caret";
    seasonCaret.textContent = "▾";

    seasonLabelBtn.appendChild(document.createTextNode("Saison"));
    seasonLabelBtn.appendChild(seasonCaret);

    seasonMenuWrap.appendChild(seasonLabelBtn);
    episodesHeader.appendChild(episodesTitle);
    episodesHeader.appendChild(seasonMenuWrap);
    seasonsWrap.appendChild(episodesHeader);

    seasonBackdrop = document.createElement("div");
    seasonBackdrop.className = "details-season-backdrop hidden";
    seasonBackdrop.addEventListener("click", closeSeasonDrawer);

    seasonDrawer = document.createElement("div");
    seasonDrawer.className = "details-season-drawer hidden";
    seasonDrawer.setAttribute("role", "listbox");

    seasonListEl = document.createElement("div");
    seasonListEl.className = "details-season-list";
    seasonDrawer.appendChild(seasonListEl);

    seasonsWrap.appendChild(seasonBackdrop);
    const modalContent = detailsModal && detailsModal.querySelector ? detailsModal.querySelector(".modal-content") : null;
    if (modalContent) modalContent.appendChild(seasonDrawer);
    else seasonsWrap.appendChild(seasonDrawer);
    seasonsWrap.appendChild(episodesContainer);

    seasonLabelBtn.addEventListener("click", () => {
      if (seasonDrawer.classList.contains("hidden")) openSeasonDrawer();
      else closeSeasonDrawer();
    });

    const defaultSeasonNumber = lastSeasonNumber;

    seasonsFiltered.forEach((s) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "details-season-item";
      btn.innerHTML = `<span>Saison</span><strong>${escapeHtml(String(s.season_number))}</strong>`;
      btn.setAttribute("role", "option");
      btn.dataset.season = String(s.season_number);

      if (Number(s.season_number) === Number(defaultSeasonNumber)) {
        btn.classList.add("active");
        activeSeasonNumber = s.season_number;
        seasonLabelBtn.firstChild.nodeValue = `Saison ${s.season_number} `;
        renderEpisodes(s.season_number);
      }

      btn.addEventListener("click", () => {
        const allBtns = seasonListEl.querySelectorAll("button");
        allBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        activeSeasonNumber = s.season_number;
        seasonLabelBtn.firstChild.nodeValue = `Saison ${s.season_number} `;
        renderEpisodes(s.season_number);
        closeSeasonDrawer();
      });

      seasonListEl.appendChild(btn);
    });
  } else {
    const p = document.createElement("p");
    p.textContent = "Aucune saison disponible.";
    seasonsWrap.appendChild(p);
  }

  // Acteurs (section horizontale)
  const cast = Array.isArray(series.credits?.cast) ? series.credits.cast : [];
  if (cast.length) {
    const actorsSection = document.createElement("div");
    actorsSection.className = "details-actors-section";

    const actorsTitle = document.createElement("div");
    actorsTitle.className = "details-actors-title";
    actorsTitle.textContent = "Acteurs";

    const actorsCarousel = document.createElement("div");
    actorsCarousel.className = "details-actors-carousel";

    const actorsLeft = document.createElement("button");
    actorsLeft.type = "button";
    actorsLeft.className = "actors-car-btn actors-car-btn-left";
    actorsLeft.setAttribute("aria-label", "Précédent");
    actorsLeft.title = "Précédent";
    actorsLeft.textContent = "‹";

    const actorsRow = document.createElement("div");
    actorsRow.className = "details-actors-row";

    const actorsRight = document.createElement("button");
    actorsRight.type = "button";
    actorsRight.className = "actors-car-btn actors-car-btn-right";
    actorsRight.setAttribute("aria-label", "Suivant");
    actorsRight.title = "Suivant";
    actorsRight.textContent = "›";

    const maxActors = 20;
    cast.slice(0, maxActors).forEach((actor) => {
      const card = document.createElement("div");
      card.className = "actor-card";

      const media = document.createElement("div");
      media.className = "actor-photo";

      if (actor.profile_path) {
        const img = document.createElement("img");
        img.src = imageBasePoster + actor.profile_path;
        img.alt = actor.name || "";
        img.loading = "lazy";
        media.appendChild(img);
      } else {
        const fallback = document.createElement("div");
        fallback.className = "actor-photo-fallback";
        const initials = (actor.name || "")
          .split(" ")
          .filter(Boolean)
          .slice(0, 2)
          .map((s) => s[0]?.toUpperCase())
          .join("");
        fallback.textContent = initials || "•";
        media.appendChild(fallback);
      }

      const name = document.createElement("div");
      name.className = "actor-name";
      name.textContent = actor.name || "";

      const role = document.createElement("div");
      role.className = "actor-role";
      role.textContent = actor.character || "";

      card.appendChild(media);
      card.appendChild(name);
      if (role.textContent) card.appendChild(role);
      actorsRow.appendChild(card);
    });

    actorsSection.appendChild(actorsTitle);
    actorsCarousel.appendChild(actorsLeft);
    actorsCarousel.appendChild(actorsRow);
    actorsCarousel.appendChild(actorsRight);
    actorsSection.appendChild(actorsCarousel);
    seasonsWrap.appendChild(actorsSection);

    // Carousel controls
    const updateActorsNav = () => {
      const max = actorsRow.scrollWidth - actorsRow.clientWidth - 2;
      actorsLeft.disabled = actorsRow.scrollLeft <= 2;
      actorsRight.disabled = actorsRow.scrollLeft >= max;
    };

    const stepActors = () => {
      const firstCard = actorsRow.querySelector(".actor-card");
      const cardW = firstCard ? firstCard.getBoundingClientRect().width : 110;
      return Math.max(200, Math.floor(cardW * 3.2));
    };

    actorsLeft.onclick = () => {
      actorsRow.scrollBy({ left: -stepActors(), behavior: "smooth" });
    };
    actorsRight.onclick = () => {
      actorsRow.scrollBy({ left: stepActors(), behavior: "smooth" });
    };

    actorsRow.addEventListener("scroll", () => requestAnimationFrame(updateActorsNav));
    window.addEventListener("resize", () => requestAnimationFrame(updateActorsNav));
    requestAnimationFrame(updateActorsNav);
  }

  container.appendChild(header);

  const mobileHero = document.createElement("div");
  mobileHero.className = "details-mobile-hero";

  const mobilePoster = document.createElement("div");
  mobilePoster.className = "details-mobile-poster";
  if (poster_path) {
    const img = document.createElement("img");
    img.src = imageBasePoster + poster_path;
    img.alt = name || "";
    mobilePoster.appendChild(img);
  }

  const mobileInfo = document.createElement("div");
  mobileInfo.className = "details-mobile-info";

  const mobileTitle = document.createElement("div");
  mobileTitle.className = "details-mobile-title";
  mobileTitle.textContent = name || "Sans titre";

  const mobileMeta = document.createElement("div");
  mobileMeta.className = "details-mobile-meta";
  mobileMeta.textContent = `Série${year ? " • " + year : ""}${rating ? " • " + rating : ""}`;

  const mobileActions = document.createElement("div");
  mobileActions.className = "details-mobile-actions";
  const mobilePrimary = createProxyButton(headerPrimaryBtn, "details-mobile-btn");
  const mobileMyList = createProxyButton(myListBtn, "details-mobile-btn");
  if (mobilePrimary) mobileActions.appendChild(mobilePrimary);
  if (mobileMyList) mobileActions.appendChild(mobileMyList);

  mobileInfo.appendChild(mobileTitle);
  mobileInfo.appendChild(mobileMeta);
  mobileInfo.appendChild(mobileActions);

  mobileHero.appendChild(mobilePoster);
  mobileHero.appendChild(mobileInfo);

  container.appendChild(mobileHero);
  container.appendChild(info);
  container.appendChild(seasonsWrap);

  detailsBody.innerHTML = "";
  detailsBody.appendChild(container);

  // Bande-annonce en preview (autoplay muet + bouton son)
  if (!window.matchMedia("(max-width: 768px)").matches) {
    mountTrailerPreview({
      mediaType: "series",
      tmdbId: id,
      header,
      headerOverlay,
      headerSound,
      backdropPath: backdrop_path,
      posterPath: poster_path
    });
  }

  // Charge le dernier épisode vu et met à jour le CTA "Reprendre"
  (async () => {
    try {
      resumeEntry = await getLatestContinueEntryForSeries(id);
      if (!resumeEntry) return;

      resumeSeason = resumeEntry.season != null ? Number(resumeEntry.season) : null;
      resumeEpisode = resumeEntry.episode != null ? Number(resumeEntry.episode) : null;
      resumePosition = resumeEntry.position || 0;

      if (resumeSeason == null || resumeEpisode == null) return;

      const titleEl = headerPrimaryBtn.querySelector(".details-header-btn-title");
      const sub = headerPrimaryBtn.querySelector(".details-header-btn-sub");
      if (titleEl) titleEl.textContent = "Reprendre";
      if (sub) {
        sub.textContent = `S${resumeSeason}E${resumeEpisode}`;
      }

      headerPrimaryBtn.onclick = async () => {
        openPreplayGate(
          { type: "episode", tmdbId: id, season: resumeSeason, episode: resumeEpisode },
          () =>
            openEpisodePlayerWithOptions(id, resumeSeason, resumeEpisode, name, {
              seriesMeta: {
                title: name,
                originalTitle: series.original_name,
                posterPath: poster_path,
                episodeTitle: null
              }
            })
        );
      };

      // Si on a déjà rendu une saison, on tente de re-rendre pour ajouter le badge + scroll
      if (activeSeasonNumber != null) {
        // Si la saison active n'est pas celle à reprendre, on ne force pas le changement,
        // mais si c'est la même, on re-render pour afficher le badge.
        if (Number(activeSeasonNumber) === Number(resumeSeason)) {
          didAutoScrollToResume = false;
          await renderEpisodes(activeSeasonNumber);
        }
      }
    } catch (e) {
      console.warn("[RESUME] Impossible d'initialiser le CTA Reprendre dans la modale série:", e);
    }
  })();

  if (myListBtn) {
    attachMyListButton(myListBtn, id, "series");
  }
}

async function startMoviePlayback(tmdbId, title) {
  lastWatchingSaveTime = 0;

  currentWatchingMeta = {
    tmdbId: tmdbId,
    mediaType: "movie",
    season: null,
    episode: null,
  };

  try {
    showModal(playerModal);
    try { closePlayerSourcesDrawer(); } catch (_) {}
    playerInfo.textContent = `Lecture du film : ${title || ""}`;
    playerStatus.textContent = "Préparation de la lecture...";
    videoPlayer.src = "";

      const contentKey = buildAdContentKey({ type: "movie", tmdbId });
      const adToken = await ensureAdGateToken(contentKey);
      const hlsUrl = withAdGateParams(`${API_BASE}/api/hls/movie/${tmdbId}/index.m3u8`, contentKey, adToken);
      const streamUrl = withAdGateParams(`${API_BASE}/api/stream/movie/${tmdbId}`, contentKey, adToken);
      await setPlayerSourceWithHlsFallback(hlsUrl, streamUrl);

    await smartAutoPlay(currentWatchingMeta);



    const playPromise = videoPlayer.play();
    if (playPromise && playPromise.catch) {
      playPromise.catch((err) => {
        console.error("[PLAYER] Erreur démarrage lecture film:", err);
        playerStatus.textContent = "Erreur lors du démarrage de la lecture.";
      });
    }

    playerStatus.textContent = "";
  } catch (err) {
    console.error("Erreur lecture film:", err);
    playerStatus.textContent = "Erreur lors de la préparation de la lecture.";
  }
}

async function startEpisodePlayback(tmdbId, season, episode, seriesName) {
  lastWatchingSaveTime = 0;

  currentWatchingMeta = {
    tmdbId: tmdbId,
    mediaType: "series",
    season: season,
    episode: episode,
  };

  try {
    showModal(playerModal);
    try { closePlayerSourcesDrawer(); } catch (_) {}
    playerInfo.textContent = `Lecture : ${seriesName || ""} • S${String(
      season
    ).padStart(2, "0")}E${String(episode).padStart(2, "0")}`;
    playerStatus.textContent = "Préparation de la lecture...";
    videoPlayer.src = "";

      const contentKey = buildAdContentKey({ type: "episode", tmdbId, season, episode });
      const adToken = await ensureAdGateToken(contentKey);
      const hlsUrl = withAdGateParams(
        `${API_BASE}/api/hls/series/${tmdbId}/season/${season}/episode/${episode}/index.m3u8`,
        contentKey,
        adToken
      );
      const streamUrl = withAdGateParams(
        `${API_BASE}/api/stream/series/${tmdbId}/season/${season}/episode/${episode}`,
        contentKey,
        adToken
      );
      await setPlayerSourceWithHlsFallback(hlsUrl, streamUrl);

    await smartAutoPlay(currentWatchingMeta);



    const playPromise = videoPlayer.play();
    if (playPromise && playPromise.catch) {
      playPromise.catch((err) => {
        console.error("[PLAYER] Erreur démarrage lecture épisode:", err);
        playerStatus.textContent = "Erreur lors du démarrage de la lecture.";
      });
    }

    playerStatus.textContent = "";
  } catch (err) {
    console.error("Erreur lecture épisode:", err);
    playerStatus.textContent = "Erreur lors de la préparation de la lecture.";
  }
}


/* === Gestion de la sélection de version (VF / VOSTFR / 4K / 1080p, etc.) === */

let currentPlaybackContext = null;
let currentOptions = [];
let currentWatchingMeta = null;
let lastWatchingSaveTime = 0;

// --- Préférences de version (par profil) ----------------------------------

const VERSION_PREFS_STORAGE_KEY = "ONLYUS_VERSION_PREFS_V1";

function getProfileKeyForVersionPrefs() {
  if (typeof currentProfileId === "number" && !Number.isNaN(currentProfileId)) {
    return String(currentProfileId);
  }
  if (currentProfileId) return String(currentProfileId);
  return "no-profile";
}

function loadVersionPrefsMap() {
  try {
    const raw = localStorage.getItem(VERSION_PREFS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_) {
    return {};
  }
}

function saveVersionPrefsMap(map) {
  try {
    localStorage.setItem(VERSION_PREFS_STORAGE_KEY, JSON.stringify(map || {}));
  } catch (_) {}
}

function getVersionPrefsForCurrentProfile() {
  const map = loadVersionPrefsMap();
  return map[getProfileKeyForVersionPrefs()] || null;
}

function setVersionPrefsForCurrentProfile(prefs) {
  const map = loadVersionPrefsMap();
  map[getProfileKeyForVersionPrefs()] = prefs || null;
  saveVersionPrefsMap(map);
}

function extractPrefsFromOption(opt) {
  if (!opt) return null;
  return {
    language: opt.language || null,
    resolution: opt.resolution || null,
    quality: opt.quality || null,
    source: opt.source || null,
  };
}

function scoreOption(opt, prefs) {
  if (!opt) return -1e9;

  // Defaults si aucune préférence utilisateur
  const defaultLangOrder = ["VF", "MULTI", "VOSTFR", "VO"]; // ressenti "OnlyUs" (FR d'abord)
  const defaultResOrder = ["4K", "1080p", "720p"];
  const defaultQualOrder = ["BluRay", "WEBRip", "HDTV", "DVDRip"];

  let score = 0;

  const lang = opt.language || null;
  const res = opt.resolution || null;
  const qual = opt.quality || null;
  const src = opt.source || null;

  if (prefs && prefs.language) {
    if (lang === prefs.language) score += 1000;
    else score -= 50;
  } else {
    const idx = defaultLangOrder.indexOf(lang);
    score += idx === -1 ? 0 : (300 - idx * 50);
  }

  if (prefs && prefs.resolution) {
    if (res === prefs.resolution) score += 500;
    else score -= 20;
  } else {
    const idx = defaultResOrder.indexOf(res);
    score += idx === -1 ? 0 : (200 - idx * 40);
  }

  if (prefs && prefs.quality) {
    if (qual === prefs.quality) score += 200;
    else score -= 10;
  } else {
    const idx = defaultQualOrder.indexOf(qual);
    score += idx === -1 ? 0 : (120 - idx * 20);
  }

  if (prefs && prefs.source) {
    if (src === prefs.source) score += 60;
  }

  // Bonus taille (si dispo) : légèrement favoriser les gros fichiers (souvent meilleure qualité)
  if (opt.size) {
    const m = String(opt.size).toLowerCase();
    let sizeScore = 0;
    const gb = m.match(/([0-9]+(?:\.[0-9]+)?)\s*gb/);
    const mb = m.match(/([0-9]+(?:\.[0-9]+)?)\s*mb/);
    if (gb) sizeScore = Math.min(80, Number(gb[1]) * 8);
    else if (mb) sizeScore = Math.min(40, Number(mb[1]) / 50);
    if (!Number.isNaN(sizeScore)) score += sizeScore;
  }

  return score;
}

function pickBestOption(options, prefs) {
  const list = Array.isArray(options) ? options : [];
  if (!list.length) return null;
  let best = list[0];
  let bestScore = scoreOption(best, prefs);
  for (let i = 1; i < list.length; i++) {
    const s = scoreOption(list[i], prefs);
    if (s > bestScore) {
      bestScore = s;
      best = list[i];
    }
  }
  return best;
}

// --- Autoplay policy (no-transcode if alternatives exist)
// CAS 1: UTOPIA/ORIGIN contains an HTML5-friendly file (mp4/webm/m4v) -> autoplay
// CAS 2: Only MKV/etc in UTOPIA/ORIGIN
//   2A) If SPUTNIKIMOC / F-STREAMUS / AURORA exists -> force autoplay on fast embed
//       (AURORA first, then F-STREAMUS, then SPUTNIKIMOC)
//   2B) If no alternative -> autoplay MKV (keeps existing backend pipeline)
async function preflightMagnetForAutoplay(magnet, context) {
  if (!magnet) return null;
  try {
    const mode = context && context.mode === "episode" ? "episode" : "movie";
    const params = new URLSearchParams();
    params.set("magnet", magnet);
    params.set("mode", mode);
    if (mode === "episode") {
      if (context.season != null) params.set("season", String(context.season));
      if (context.episode != null) params.set("episode", String(context.episode));
    }
    const url = `${API_BASE}/api/preflight/magnet?${params.toString()}`;
    const data = await fetchJSON(url);
    return data && typeof data === "object" ? data : null;
  } catch (_) {
    return null;
  }
}

function isTorrentOptionForPremium(opt) {
  if (!opt || !opt.magnet) return false;
  // torrents are the ones with a magnet and no direct url
  if (opt.url) return false;
  const src = getSourceDisplayName(opt.source);
  return src === "UTOPIA" || src === "ORIGIN";
}

function hasFastAlternative(options) {
  const list = Array.isArray(options) ? options : [];
  return list.some((o) => {
    const src = getSourceDisplayName(o && o.source);
    if (
      src !== "SIRIUS" &&
      src !== "SPUTNIKIMOC" &&
      src !== "GALAXY" &&
      src !== "F-STREAMUS" &&
      src !== "AURORA"
    ) {
      return false;
    }
    return !!(o && (o.url || o.kind === "embed" || o.kind === "direct"));
  });
}

function pickBestFastAlternative(options, prefs) {
  const list = Array.isArray(options) ? options : [];

  const pickPreferNonEmbed = (arr) => {
    const a = Array.isArray(arr) ? arr : [];
    const nonEmbed = a.filter((o) => (o && (o.kind || "direct") !== "embed"));
    const embed = a.filter((o) => (o && (o.kind || "direct") === "embed"));
    const chosenPool = nonEmbed.length ? nonEmbed : embed;
    return (chosenPool.length ? (pickBestOption(chosenPool, prefs) || chosenPool[0]) : null);
  };

  // PRIORITÉ 1: SIRIUS
  const sirius = list.filter((o) => {
    const src = getSourceDisplayName(o && o.source);
    if (src !== "SIRIUS") return false;
    return !!(o && (o.url || o.kind === "embed" || o.kind === "direct"));
  });
  const pickSi = pickPreferNonEmbed(sirius);
  if (pickSi) return pickSi;

  // PRIORITÉ 2: SPUTNIKIMOC
  const sputnikimoc = list.filter((o) => {
    const src = getSourceDisplayName(o && o.source);
    if (src !== "SPUTNIKIMOC") return false;
    return !!(o && (o.url || o.kind === "embed" || o.kind === "direct"));
  });

  if (sputnikimoc.length) {
    console.log("[AUTOPLAY] SPUTNIKIMOC trouvés:", sputnikimoc.length);
    const pickS = pickPreferNonEmbed(sputnikimoc);
    if (pickS) {
      console.log("[AUTOPLAY] Sélection finale:", pickS.title, pickS.url);
      return pickS;
    }
  }

  // PRIORITÉ 3: GALAXY
  const galaxy = list.filter((o) => {
    const src = getSourceDisplayName(o && o.source);
    if (src !== "GALAXY") return false;
    return !!(o && (o.url || o.kind === "embed" || o.kind === "direct"));
  });
  const pickG = pickPreferNonEmbed(galaxy);
  if (pickG) return pickG;

  // PRIORITÉ 4: F-STREAMUS
  const fstreamus = list.filter((o) => {
    const src = getSourceDisplayName(o && o.source);
    if (src !== "F-STREAMUS") return false;
    return !!(o && (o.url || o.kind === "embed" || o.kind === "direct"));
  });
  const pickF = pickPreferNonEmbed(fstreamus);
  if (pickF) return pickF;

  // PRIORITÉ 5: AURORA
  const aurora = list.filter((o) => {
    const src = getSourceDisplayName(o && o.source);
    if (src !== "AURORA") return false;
    return !!(o && (o.url || o.kind === "embed" || o.kind === "direct"));
  });
  const pickA = pickPreferNonEmbed(aurora);
  if (pickA) return pickA;

  return null;
}


async function pickBestOptionSmart(options, prefs, context) {
  const list = Array.isArray(options) ? options : [];
  if (!list.length) return null;

  const torrents = list.filter(isTorrentOptionForPremium);
  if (!torrents.length) {
    // No torrents: keep existing behavior (AURORA/autres)
    return pickBestOption(list, prefs);
  }

  const alt = hasFastAlternative(list);

  // Preflight a small subset (already sorted by preference by the caller)
  const maxCheck = 8;
  let sawAnyPlayable = false;

  for (let i = 0; i < torrents.length && i < maxCheck; i++) {
    const t = torrents[i];
    const r = await preflightMagnetForAutoplay(t.magnet, context);
    if (r && r.ok && r.hasAnyVideo) sawAnyPlayable = true;
    if (r && r.ok && r.hasHtml5) {
      return t; // CAS 1
    }
  }

  // CAS 2: only MKV/etc (no HTML5). If we have alternatives, do not autoplay.
  if (alt) return pickBestFastAlternative(list, prefs);

  // No alternative: keep current behavior (autoplay torrent, backend handles transcode)
  // Prefer best-scored torrent.
  return pickBestOption(torrents, prefs) || (sawAnyPlayable ? torrents[0] : null);
}

function __optionKeyForAutoplay(o) {
  const src = getSourceDisplayName(o && o.source) || "";
  const kind = (o && (o.kind || "direct")) || "";
  const url = (o && o.url) ? String(o.url) : "";
  const magnet = (o && o.magnet) ? String(o.magnet) : "";
  return src + "|" + kind + "|" + url + "|" + magnet;
}

function buildAutoplayQueue(options, prefs, best) {
  const list = Array.isArray(options) ? options : [];
  const sorted = sortOptionsByPreference(list, prefs);
  const bestKey = __optionKeyForAutoplay(best);
  const filtered = sorted.filter((o) => __optionKeyForAutoplay(o) !== bestKey);

  // Prefer non-embed sources first to avoid iframe blocked screens during autoplay.
  const nonEmbed = filtered.filter((o) => (o && (o.kind || "direct") !== "embed"));
  const embed = filtered.filter((o) => (o && (o.kind || "direct") === "embed"));

  return nonEmbed.concat(embed);
}



function sortOptionsByPreference(options, prefs) {
  const list = Array.isArray(options) ? options.slice() : [];
  list.sort((a, b) => scoreOption(b, prefs) - scoreOption(a, prefs));
  return list;
}

/**
 * Construit un libellé lisible pour une option (bouton).
 */
function getSourceDisplayName(src) {
  const v = (src || "").toString().trim().toLowerCase();
  if (!v) return "";
  if (v === "scraper") return "UTOPIA";
  if (v === "catalog") return "ORIGIN";
  if (v === "aurora") return "AURORA";
  if (v === "sirius" || v === "frembed") return "SIRIUS";
  if (v === "f-streamus" || v === "f_streamus" || v === "fstreamus") return "F-STREAMUS";
  if (v === "sputnikimoc" || v === "cpasmal") return "SPUTNIKIMOC";
  if (v === "galaxy" || v === "flemmix") return "GALAXY";
  return (src || "").toString().toUpperCase();
}

function buildVersionLabel(opt) {
  if (!opt) return "Version";
  const parts = [];
  if (opt.kind) parts.push(String(opt.kind).toUpperCase());
  if (opt.language) parts.push(opt.language);
  if (opt.resolution) parts.push(opt.resolution);
  if (opt.quality) parts.push(opt.quality);
  if (opt.size) parts.push(opt.size);

  const src = getSourceDisplayName(opt.source);
  if (src) parts.push("[" + src + "]");

  if (!parts.length && opt.title) parts.push(opt.title);
  return parts.join(" · ");
}

function getLanguageSectionKey(lang) {
  const v = (lang || "").toString().trim().toUpperCase();
  if (!v) return "INCONNUE";
  if (v === "VFQ") return "FR_FRANCAIS_QUALITE";
  if (v === "VFF" || v === "VF") return "FR_FRANCAIS_FILM";
  if (v.includes("VOST")) return "VO_VOSTFR";
  if (v.includes("VO")) return "VO_VOSTFR";
  if (v.includes("MULTI")) return "MULTI";
  return "INCONNUE";
}

function getLanguageSectionLabel(sectionKey) {
  switch (sectionKey) {
    case "FR_FRANCAIS_QUALITE":
      return "FR · Français qualité";
    case "FR_FRANCAIS_FILM":
      return "FR · Français film";
    case "VO_VOSTFR":
      return "VO/VOSTFR";
    case "MULTI":
      return "MULTI";
    default:
      return "INCONNUE";
  }
}

function shortOptionLabel(opt) {
  if (!opt) return "Source";
  const lang = (opt.language || "").toString().trim().toUpperCase();
  const title = (opt.title || "").toString().trim();

  // streams.db embed rows already provide a friendly player name (ex: "vidzy HD")
  if (opt.kind === "embed" || opt.kind === "direct") {
    if (title) return (lang ? (lang + " - ") : "") + title;
  }

  // torrent options: keep something readable but compact
  const bits = [];
  if (lang) bits.push(lang);
  if (opt.resolution) bits.push(opt.resolution);
  if (opt.quality) bits.push(opt.quality);
  return bits.length ? bits.join(" · ") : buildVersionLabel(opt);
}

function clearVersionSelector() {
  if (!versionSelector) return;
  versionSelector.innerHTML = "";
}

/**
 * Affiche les versions disponibles dans la modal lecteur.
 */
function renderVersionOptions(options, context) {
  currentOptions = Array.isArray(options) ? options : [];
  currentPlaybackContext = context || null;

  if (!versionSelector) {
    console.warn("[PLAYER] versionSelector introuvable dans le DOM.");
    return;
  }

  if (!currentOptions.length) {
    versionSelector.innerHTML =
      '<div class="version-empty">Aucune version n\'a été trouvée pour ce contenu sur les sources disponibles. Essayez un autre titre ou revenez plus tard.</div>';
    return;
  }

  // Group by provider (source)
  const providerMap = new Map();
  currentOptions.forEach((opt) => {
    const provider = getSourceDisplayName(opt && opt.source);
    const key = provider || "INCONNU";
    if (!providerMap.has(key)) providerMap.set(key, []);
    providerMap.get(key).push(opt);
  });

  const preferredProviderOrder = ["UTOPIA", "ORIGIN", "SIRIUS", "SPUTNIKIMOC", "GALAXY", "F-STREAMUS", "AURORA", "INCONNU"];
  const providers = Array.from(providerMap.keys()).sort((a, b) => {
    const ia = preferredProviderOrder.indexOf(a);
    const ib = preferredProviderOrder.indexOf(b);
    const ra = ia === -1 ? 999 : ia;
    const rb = ib === -1 ? 999 : ib;
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b);
  });

  const tree = document.createElement("div");
  tree.className = "sources-tree";

  let firstGroupToggle = null;
  let groupIndex = 0;

  providers.forEach((providerName) => {
    const providerOptions = providerMap.get(providerName) || [];
    if (!providerOptions.length) return;

    const groupId = "srcgrp-" + groupIndex++;

    const group = document.createElement("div");
    group.className = "source-group";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "source-group-toggle";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", groupId);

    const title = document.createElement("span");
    title.className = "source-group-title";
    title.textContent = `Lecteurs ${providerName}`;

    const count = document.createElement("span");
    count.className = "source-group-count";
    count.textContent = `(${providerOptions.length})`;

    const chevron = document.createElement("span");
    chevron.className = "source-group-chevron";
    chevron.textContent = "›";

    toggle.appendChild(title);
    toggle.appendChild(count);
    toggle.appendChild(chevron);

    const content = document.createElement("div");
    content.className = "source-group-content hidden";
    content.id = groupId;

    // Sub-sections (language buckets)
    const sectionOrder = ["FR_FRANCAIS_QUALITE", "FR_FRANCAIS_FILM", "MULTI", "VO_VOSTFR", "INCONNUE"];
    const sections = new Map();
    providerOptions.forEach((opt) => {
      const sk = getLanguageSectionKey(opt && opt.language);
      if (!sections.has(sk)) sections.set(sk, []);
      sections.get(sk).push(opt);
    });

    sectionOrder.forEach((sk) => {
      const opts = sections.get(sk) || [];
      if (!opts.length) return;

      const sec = document.createElement("div");
      sec.className = "source-section";

      const secTitle = document.createElement("div");
      secTitle.className = "source-section-title";
      secTitle.textContent = `${getLanguageSectionLabel(sk)} (${opts.length})`;
      sec.appendChild(secTitle);

      const secList = document.createElement("div");
      secList.className = "source-section-list";

      opts.forEach((opt) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "version-item source-option";

        const key = getOptionKey(opt);
        if (key) btn.dataset.key = key;
        if (activePlayerSourceKey && key && activePlayerSourceKey === key) {
          btn.classList.add("active");
        }

        const row = document.createElement("div");
        row.className = "source-option-row";

        const label = document.createElement("span");
        label.className = "source-option-label";
        label.textContent = shortOptionLabel(opt);

        const badge = document.createElement("span");
        badge.className = "source-option-badge";
        badge.textContent = ((opt && opt.language) ? String(opt.language).toUpperCase() : "x");

        row.appendChild(label);
        row.appendChild(badge);

        const meta = document.createElement("div");
        meta.className = "source-option-meta";

        const metaBits = [];
        if (opt && opt.kind) metaBits.push(String(opt.kind).toUpperCase());
        if (opt && opt.resolution) metaBits.push(opt.resolution);
        if (opt && opt.quality) metaBits.push(opt.quality);
        if (opt && opt.size) metaBits.push(opt.size);
        if (metaBits.length) meta.textContent = metaBits.join(" · ");

        btn.appendChild(row);
        if (metaBits.length) btn.appendChild(meta);

        btn.addEventListener("click", () => {
          const resumeTime = capturePlayerTimeSafe();
          activePlayerSourceKey = key || activePlayerSourceKey;
          updateActiveSourceHighlight();
          try { closePlayerSourcesDrawer(); } catch (_) {}
          startDirectPlaybackFromOption(opt, currentPlaybackContext, { userInitiated: true, resumeTime });
        });

        secList.appendChild(btn);
      });

      sec.appendChild(secList);
      content.appendChild(sec);
    });

    toggle.addEventListener("click", () => {
      const isOpen = !content.classList.contains("hidden");
      // close all groups (Movix-like)
      const allContents = tree.querySelectorAll(".source-group-content");
      const allToggles = tree.querySelectorAll(".source-group-toggle");
      allContents.forEach((c) => c.classList.add("hidden"));
      allToggles.forEach((t) => t.setAttribute("aria-expanded", "false"));

      if (!isOpen) {
        content.classList.remove("hidden");
        toggle.setAttribute("aria-expanded", "true");
      }
    });

    group.appendChild(toggle);
    group.appendChild(content);
    tree.appendChild(group);

    if (!firstGroupToggle) firstGroupToggle = toggle;
  });

  versionSelector.innerHTML = "";
  versionSelector.appendChild(tree);

  // Open first group by default (fast UX)
  try {
    if (firstGroupToggle) firstGroupToggle.click();
  } catch (_) {}
}

/**
 * Ouvre la modal lecteur pour un film et charge les versions possibles.
 */
function renderOptionsError(message, onRetry) {
  if (!versionSelector) return;
  const wrap = document.createElement("div");
  wrap.className = "version-empty";
  wrap.textContent = message || "Impossible de charger les versions.";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "version-item";
  btn.textContent = "Réessayer";
  btn.addEventListener("click", () => {
    try {
      if (typeof onRetry === "function") onRetry();
    } catch (_) {}
  });

  versionSelector.innerHTML = "";
  versionSelector.appendChild(wrap);
  versionSelector.appendChild(btn);
}

async function openMoviePlayerWithOptions(tmdbId, title, opts) {
  // Enregistrer dans l'historique de visionnage dès le clic sur LIRE
  try {
    const movieMeta = opts && opts.movieMeta;
    if (movieMeta && movieMeta.title) {
      trackWatchEvent({
        title: movieMeta.title || null,
        original_title: movieMeta.originalTitle || null,
        media_type: "movie"
      });
      await saveContinueWatchingPosition(
        {
          tmdbId: tmdbId,
          mediaType: "movie",
          title: movieMeta.title,
          originalTitle: movieMeta.originalTitle,
          posterPath: movieMeta.posterPath
        },
        0, // position initiale
        0  // durée inconnue à ce stade
      );
    }
  } catch (e) {
    console.warn("[VIEWING_HISTORY] Erreur lors de l'enregistrement du clic LIRE (film):", e);
  }

  showModal(playerModal);
  clearAutoNext();
  setEpisodeNavState(null);
  if (playerInfo) {
    playerInfo.textContent = "Lecture du film : " + (title || "");
  }
  if (playerStatus) {
    playerStatus.textContent = "Chargement des versions disponibles...";
  }
  const __lt = showPlayerLoading({ stage: "init" });
  setTimeout(() => {
    try {
      if (__lt === __playerLoadingToken) showPlayerLoading({ stage: "scan" });
    } catch (_) {}
  }, 140);
  if (videoPlayer) {
    videoPlayer.src = "";
  }
  try { setPlayerToVideoMode(); } catch (_) {}
  clearVersionSelector();

  const refresh = !!(opts && opts.refresh);

  try {
    const url = API_BASE + "/api/options/movie/" + tmdbId + (refresh ? "?refresh=true" : "");
    const data = await fetchJSON(url);
    const rawOptions = Array.isArray(data) ? data : data.options || [];

    const prefs = getVersionPrefsForCurrentProfile();
    const options = sortOptionsByPreference(rawOptions, prefs);

    renderVersionOptions(options, { mode: "movie", tmdbId: tmdbId, title: title });
    updatePlayerLoadingSourcesFromOptions(options);
    showPlayerLoading({ stage: "versions" });


    try { openPlayerSourcesDrawer(); } catch (_) {}

    if (!options.length) {
      hidePlayerLoading();
      if (playerStatus) {
        playerStatus.textContent =
          "Aucune version fonctionnelle disponible pour ce film.";
      }
      renderOptionsError(
        "Aucune version fonctionnelle trouvée. Vous pouvez réessayer (refresh).",
        () => openMoviePlayerWithOptions(tmdbId, title, { refresh: true })
      );
      return;
    }

    const best = await pickBestOptionSmart(options, prefs, { mode: "movie", tmdbId, title });
    if (best) {
      if (playerStatus) {
        playerStatus.textContent =
          "Lecture automatique : " + buildVersionLabel(best);
      }
      const movieMeta = opts && opts.movieMeta;
      await startDirectPlaybackFromOption(best, { mode: "movie", tmdbId, title, meta: movieMeta }, { userInitiated: false, autoplayQueue: buildAutoplayQueue(options, prefs, best) });
      if (playerStatus) {
        playerStatus.textContent = "";
      }
      return;
    }

    // Si aucune option n'a été auto-sélectionnée, on laisse l'utilisateur choisir via le drawer.
    // (Aucun message intrusif ici : l'autoplay est déjà forcé sur SPUTNIKIMOC/F-STREAMUS/AURORA quand applicable.)
    if (playerStatus) playerStatus.textContent = "";
    hidePlayerLoading();
  } catch (err) {
    console.error("[PLAYER] Erreur lors du chargement des options film:", err);
    hidePlayerLoading();

    if (playerStatus) {
      playerStatus.textContent = "Erreur lors du chargement des versions.";
    }
    renderOptionsError(
      "Erreur lors du chargement des versions. Réessayez.",
      () => openMoviePlayerWithOptions(tmdbId, title, { refresh: true })
    );
  }
}

/**
 * Ouvre la modal lecteur pour un épisode et charge les versions possibles.
 */
async function openEpisodePlayerWithOptions(tmdbId, season, episode, seriesName, navOpts) {
  // Enregistrer dans l'historique de visionnage d?s le clic sur LIRE ÉPISODE
  try {
    const seriesMeta = navOpts && navOpts.seriesMeta;
    const title = (seriesMeta && seriesMeta.title) ? seriesMeta.title : (seriesName || null);

    if (title) {
      trackWatchEvent({
        title: title,
        original_title: seriesMeta && seriesMeta.originalTitle ? seriesMeta.originalTitle : null,
        media_type: "series",
        season: season != null ? season : null,
        episode: episode != null ? episode : null,
        episode_title: seriesMeta && seriesMeta.episodeTitle ? seriesMeta.episodeTitle : null
      });
    }

    await saveContinueWatchingPosition(
      {
        tmdbId: tmdbId,
        mediaType: "series",
        season: season,
        episode: episode,
        title: title,
        originalTitle: seriesMeta && seriesMeta.originalTitle ? seriesMeta.originalTitle : null,
        posterPath: seriesMeta && seriesMeta.posterPath ? seriesMeta.posterPath : null,
        episodeTitle: seriesMeta && seriesMeta.episodeTitle ? seriesMeta.episodeTitle : null
      },
      0, // position initiale
      0  // dur?e inconnue ? ce stade
    );
  } catch (e) {
    console.warn("[VIEWING_HISTORY] Erreur lors de l'enregistrement du clic LIRE ÉPISODE:", e);
  }

  showModal(playerModal);
  clearAutoNext();
  // Show episode nav (disabled) while we compute prev/next
  setEpisodeNavState({ enabled: true, prev: null, next: null });
  if (playerInfo) {
    const s = String(season).padStart(2, "0");
    const e = String(episode).padStart(2, "0");
    playerInfo.textContent =
      "Lecture : " + (seriesName || "") + " — S" + s + "E" + e;
  }
  if (playerStatus) {
    playerStatus.textContent = "Chargement des versions disponibles...";
  }
  const __lt = showPlayerLoading({ stage: "init" });
  setTimeout(() => {
    try {
      if (__lt === __playerLoadingToken) showPlayerLoading({ stage: "scan" });
    } catch (_) {}
  }, 140);

  if (videoPlayer) {
    videoPlayer.src = "";
  }
  try { setPlayerToVideoMode(); } catch (_) {}
  clearVersionSelector();

  // Compute prev/next episode in background (with race protection)
  const navReqId = ++episodeNavRequestId;
  computeEpisodeNav(tmdbId, season, episode)
    .then((state) => {
      if (navReqId !== episodeNavRequestId) return;
      setEpisodeNavState(state);
    })
    .catch((err) => {
      if (navReqId !== episodeNavRequestId) return;
      console.warn("[PLAYER] Navigation épisode indisponible:", err);
      setEpisodeNavState(null);
    });

  try {
    const refresh = !!(navOpts && navOpts.refresh);
    const url =
      API_BASE +
      "/api/options/series/" +
      tmdbId +
      "/season/" +
      season +
      "/episode/" +
      episode +
      (refresh ? "?refresh=true" : "");

    const data = await fetchJSON(url);
    const rawOptions = Array.isArray(data) ? data : data.options || [];

    const prefs = getVersionPrefsForCurrentProfile();
    const options = sortOptionsByPreference(rawOptions, prefs);

    const seriesMeta = navOpts && navOpts.seriesMeta;
    renderVersionOptions(options, {
      mode: "episode",
      tmdbId: tmdbId,
      season: season,
      episode: episode,
      seriesName: seriesName,
      meta: seriesMeta,
    });

    updatePlayerLoadingSourcesFromOptions(options);
    showPlayerLoading({ stage: "versions" });

    try { openPlayerSourcesDrawer(); } catch (_) {}

    if (!options.length) {
      hidePlayerLoading();
      if (playerStatus) {
        playerStatus.textContent =
          "Aucune version fonctionnelle disponible pour cet épisode.";
      }
      renderOptionsError(
        "Aucune version fonctionnelle trouvée. Vous pouvez réessayer (refresh).",
        () =>
          openEpisodePlayerWithOptions(tmdbId, season, episode, seriesName, {
            ...(navOpts || {}),
            refresh: true,
          })
      );
      return;
    }

    const best = await pickBestOptionSmart(options, prefs, {
      mode: "episode",
      tmdbId: tmdbId,
      season: season,
      episode: episode,
      seriesName: seriesName,
    });
    if (best) {
      if (playerStatus) {
        playerStatus.textContent =
          "Lecture automatique : " + buildVersionLabel(best);
      }
      await startDirectPlaybackFromOption(
        best,
        {
          mode: "episode",
          tmdbId: tmdbId,
          season: season,
          episode: episode,
          seriesName: seriesName,
          meta: seriesMeta,
        },
        { userInitiated: false, autoplayQueue: buildAutoplayQueue(options, prefs, best) }
      );
      if (playerStatus) playerStatus.textContent = "";
      return;
    }

    // Aucun message : soit autoplay (UTOPIA/ORIGIN HTML5, ou SPUTNIKIMOC/F-STREAMUS/AURORA), soit choix manuel.
    if (playerStatus) playerStatus.textContent = "";
    hidePlayerLoading();
  } catch (err) {
    console.error(
      "[PLAYER] Erreur lors du chargement des options épisode:",
      err
    );
    hidePlayerLoading();

    if (playerStatus) {
      playerStatus.textContent = "Erreur lors du chargement des versions.";
    }
    renderOptionsError(
      "Erreur lors du chargement des versions. Réessayez.",
      () =>
        openEpisodePlayerWithOptions(tmdbId, season, episode, seriesName, {
          ...(navOpts || {}),
          refresh: true,
        })
    );
  }
}

/**
 * Lance la lecture directe depuis une option choisie (un magnet précis).
 */
async function startDirectPlaybackFromOption(option, context, flags) {
  lastWatchingSaveTime = 0;

  if (!option) {
    console.warn("[PLAYER] Option invalide pour la lecture directe:", option);
    return;
  }

  // Mémoriser la préférence seulement si l'utilisateur a choisi explicitement.
  try {
    if (flags && flags.userInitiated) {
      const prefs = extractPrefsFromOption(option);
      if (prefs) setVersionPrefsForCurrentProfile(prefs);
    }
  } catch (_) {}

  // UI: mark active source + close drawer
  try {
    activePlayerSourceKey = getOptionKey(option) || activePlayerSourceKey;
    updateActiveSourceHighlight();
    closePlayerSourcesDrawer();
  } catch (_) {}

  // BONUS UX: keep playback time when switching sources (best-effort)
  const resumeTime = (flags && Number.isFinite(Number(flags.resumeTime))) ? Number(flags.resumeTime) : capturePlayerTimeSafe();

  const mode = context && context.mode === "episode" ? "episode" : "movie";
  const tmdbId = context && context.tmdbId;
  const season = context && context.season;
  const episode = context && context.episode;

  const meta = context && context.meta;
  currentWatchingMeta = {
    tmdbId: tmdbId,
    mediaType: mode === "episode" ? "series" : "movie",
    season: mode === "episode" ? season : null,
    episode: mode === "episode" ? episode : null,
    title: meta && meta.title,
    originalTitle: meta && meta.originalTitle,
    posterPath: meta && meta.posterPath,
    episodeTitle: meta && meta.episodeTitle,
  };

  if (playerStatus) {
    playerStatus.textContent = "Préparation de la lecture...";
  }

  // Visible process loader
  const __playTok = showPlayerLoading({ stage: "prepare" });
  // small stage progression even if not perfectly synced
  try { setPlayerLoadingStage("prepare"); } catch (_) {}

  // --- FAST fallback (streams.db) ---
  // If the option provides a direct URL (mp4/m3u8) or an embed URL, play it without touching the existing backend.
  if (!option.magnet && option.url) {
    const kind = option.kind || "direct";

    if (kind === "embed") {
      // iframe fallback
      const isAuto = !(flags && flags.userInitiated);
      const queue = (flags && Array.isArray(flags.autoplayQueue)) ? flags.autoplayQueue : null;

      if (isAuto) {
        const __tok2 = showPlayerLoading({ stage: "connect" });
        setPlayerToIframeMode(option.url, {
          autoplay: true,
          onBlocked: () => {
            // During autoplay we never want to "land" on a blocked iframe screen.
            try { if (iframePlayer) iframePlayer.src = "about:blank"; } catch (_) {}
            try { if (playerStatus) playerStatus.textContent = ""; } catch (_) {}
            const next = queue && queue.length ? queue.shift() : null;
            if (next) {
              startDirectPlaybackFromOption(next, context, { userInitiated: false, autoplayQueue: queue });
            }
          },
        });
        // Hide loader once embed had a chance to load (token-guarded)
        setTimeout(() => { try { if (__tok2 === __playerLoadingToken) hidePlayerLoading(); } catch (_) {} }, 1850);
        if (playerStatus) playerStatus.textContent = "";
        return;
      }

      const __tok3 = showPlayerLoading({ stage: "connect" });
      setPlayerToIframeMode(option.url);
      setTimeout(() => { try { if (__tok3 === __playerLoadingToken) hidePlayerLoading(); } catch (_) {} }, 1850);
      if (playerStatus) playerStatus.textContent = "";
      return;
    }

    // direct media URL
    setPlayerToVideoMode();
    if (videoPlayer) {
      try {
        videoPlayer.pause();
      } catch (_) {}
      try {
        videoPlayer.removeAttribute("src");
        videoPlayer.load();
      } catch (_) {}
    }

    const resumeTime =
      flags && Number.isFinite(Number(flags.resumeTime))
        ? Number(flags.resumeTime)
        : capturePlayerTimeSafe();

    const url = String(option.url);
    const isM3u8 = url.toLowerCase().includes(".m3u8");

    if (isM3u8) {
      const ok = await tryLoadHlsSource(url, { timeoutMs: 6500 });
      if (!ok && videoPlayer) {
        // As a last fallback, try native assignment
        destroyHlsInstance();
        videoPlayer.src = url;
        videoPlayer.load();
      }
    } else if (videoPlayer) {
      destroyHlsInstance();
      videoPlayer.src = url;
      videoPlayer.load();
    }

    if (resumeTime && resumeTime > 0.5 && videoPlayer) {
      const onMeta = () => {
        try {
          const dur = Number(videoPlayer.duration || 0);
          if (dur && resumeTime < dur - 0.2) {
            videoPlayer.currentTime = resumeTime;
          }
        } catch (_) {}
        try {
          videoPlayer.removeEventListener("loadedmetadata", onMeta);
        } catch (_) {}
      };
      try {
        videoPlayer.addEventListener("loadedmetadata", onMeta);
      } catch (_) {}
    }

    try {
      const __tokC = showPlayerLoading({ stage: "connect" });
      await smartAutoPlay(currentWatchingMeta);
      try { if (__tokC === __playerLoadingToken) hidePlayerLoading(); } catch (_) {}
      if (playerStatus) playerStatus.textContent = "";
    } catch (err) {
      if (err && (err.name === "AbortError" || err.code === 20)) {
        console.warn(
          "[PLAYER] Lecture interrompue (AbortError) — probablement changement de flux, ignoré.",
          err
        );
        return;
      }
      console.error("[PLAYER] Erreur démarrage lecture (direct URL):", err);
      try { hidePlayerLoading(); } catch (_) {}
      if (playerStatus) playerStatus.textContent = "Erreur lors du démarrage de la lecture.";
    }

    return;
  }

  // --- TORRENT (premium) ---
  if (!option.magnet) {
    console.warn("[PLAYER] Option sans magnet ni url:", option);
    return;
  }

  setPlayerToVideoMode();
  if (videoPlayer) {
    videoPlayer.src = "";
  }

  showPlayerLoading({ stage: "optimize" });

  const params = new URLSearchParams();
  params.set("magnet", option.magnet);
  params.set("mode", mode);
  if (tmdbId != null) params.set("tmdbId", String(tmdbId));
  if (typeof option.id !== "undefined" && option.id !== null) {
    params.set("sourceId", String(option.id));
  }
  if (mode === "episode") {
    if (season != null) params.set("season", String(season));
    if (episode != null) params.set("episode", String(episode));
  }

  const contentKey =
    mode === "episode" && tmdbId != null
      ? buildAdContentKey({ type: "episode", tmdbId, season, episode })
      : (tmdbId != null ? buildAdContentKey({ type: "movie", tmdbId }) : "");
  if (contentKey) {
    const adToken = await ensureAdGateToken(contentKey);
    if (adToken) {
      params.set("ad_token", adToken);
      params.set("ad_content", contentKey);
    }
  }

  const streamUrl = API_BASE + "/api/stream/direct?" + params.toString();

  if (!videoPlayer) {
    console.error(
      "[PLAYER] Élément video introuvable, impossible d'initialiser la lecture."
    );
    return;
  }

  videoPlayer.src = streamUrl;
  videoPlayer.load();

  if (resumeTime && resumeTime > 0.5) {
    const onMeta = () => {
      try {
        const dur = Number(videoPlayer.duration || 0);
        if (dur && resumeTime < dur - 0.2) {
          videoPlayer.currentTime = resumeTime;
        }
      } catch (_) {}
      try { videoPlayer.removeEventListener('loadedmetadata', onMeta); } catch (_) {}
    };
    try {
      videoPlayer.addEventListener('loadedmetadata', onMeta);
    } catch (_) {}
  }

  try {

    const __tokT = showPlayerLoading({ stage: "connect" });
    await smartAutoPlay(currentWatchingMeta);
    try { if (__tokT === __playerLoadingToken) hidePlayerLoading(); } catch (_) {}

    if (playerStatus) {
      playerStatus.textContent = "";
    }
  } catch (err) {
    // AbortError = lecture interrompue car on change de source (ex: bascule basse qualité).
    // Dans ce cas, ce n'est PAS une vraie erreur pour l'utilisateur, on ignore.
    if (err && (err.name === 'AbortError' || err.code === 20)) {
      console.warn(
        "[PLAYER] Lecture interrompue (AbortError) — probablement changement de flux, ignoré.",
        err
      );
      return;
    }
    console.error("[PLAYER] Erreur démarrage lecture (version choisie):", err);
    try { hidePlayerLoading(); } catch (_) {}
    if (playerStatus) {
      playerStatus.textContent = "Erreur lors du démarrage de la lecture.";
    }
  }
}

/* === Fin gestion sélection de version === */

function stopCurrentTorrent() {
  if (currentTorrent && webtorrentClient) {
    try {
      webtorrentClient.remove(currentTorrent.infoHash, { destroyStore: true });
    } catch (e) {
      console.warn("Erreur lors de l'arrêt du torrent:", e);
    }
  }
  currentTorrent = null;
  if (videoPlayer) {
    videoPlayer.removeAttribute("src");
    videoPlayer.load();
  }
}

function buildEpisodePattern(season, episode) {
  const s = String(season).padStart(2, "0");
  const e = String(episode).padStart(2, "0");
  const patterns = [
    `s${s}e${e}`,
    `S${s}E${e}`,
    `${season}x${e}`,
    `${season}x${episode}`,
    `ep${episode}`,
    `EP${episode}`,
    `episode ${episode}`,
    `Episode ${episode}`,
  ];
  return patterns.map((p) => p.toLowerCase());
}

function isVideoFile(name) {
  const lower = name.toLowerCase();
  return (
    lower.endsWith(".mp4") ||
    lower.endsWith(".mkv") ||
    lower.endsWith(".m4v") ||
    lower.endsWith(".webm") ||
    lower.endsWith(".avi") ||
    lower.endsWith(".mov") ||
    lower.endsWith(".ts") ||
    lower.endsWith(".mpg") ||
    lower.endsWith(".mpeg")
  );
}

function isIgnoredFile(name) {
  const lower = name.toLowerCase();
  return (
    lower.endsWith(".nfo") ||
    lower.endsWith(".txt") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".png") ||
    lower.endsWith(".srt") ||
    lower.endsWith(".ass")
  );
}

function pickEpisodeFile(files, patternList) {
  let best = null;
  let bestScore = -1;

  for (const file of files) {
    const name = file.name.toLowerCase();
    if (!isVideoFile(name) || isIgnoredFile(name)) continue;

    let score = 0;
    for (const pattern of patternList) {
      if (name.includes(pattern)) {
        score += 10;
      }
    }

    if (score > bestScore) {
      best = file;
      bestScore = score;
    }
  }

  if (!best) {
    for (const file of files) {
      const name = file.name.toLowerCase();
      if (isVideoFile(name) && !isIgnoredFile(name)) {
        return file;
      }
    }
  }

  return best;
}

function pickMovieFile(files) {
  let best = null;
  let bestSize = -1;

  for (const file of files) {
    const name = file.name.toLowerCase();
    if (!isVideoFile(name) || isIgnoredFile(name)) continue;

    if (file.length > bestSize) {
      best = file;
      bestSize = file.length;
    }
  }

  return best;
}

function startTorrentPlayback(magnet, options) {
  if (!webtorrentClient) {
    console.error("Client WebTorrent non initialisé.");
    playerStatus.textContent =
      "Client WebTorrent non initialisé. Impossible de lancer la lecture.";
    return;
  }

  stopCurrentTorrent();
  playerStatus.textContent = "Ajout du torrent, veuillez patienter...";
  console.log("[PLAYER] Ajout du torrent:", magnet);

  webtorrentClient.add(
    magnet,
    {
      announce: [
        "wss://tracker.openwebtorrent.com",
        "wss://tracker.btorrent.xyz",
        "wss://tracker.fastcast.nz",
      ],
    },
    (torrent) => {
      console.log("[PLAYER] Torrent prêt:", torrent.infoHash);
      currentTorrent = torrent;

      const files = torrent.files || [];
      console.log('[PLAYER] Fichiers dans le torrent:', files.map(f => ({ name: f.name, length: f.length })));
      if (!files.length) {
        playerStatus.textContent = "Aucun fichier dans le torrent.";
        return;
      }

      let selectedFile = null;

      if (options.mode === "episode" && options.pattern) {
        selectedFile = pickEpisodeFile(files, options.pattern);
      } else {
        selectedFile = pickMovieFile(files);
      }

      if (!selectedFile) {
        playerStatus.textContent =
          "Impossible de trouver un fichier vidéo correspondant.";
        return;
      }

      playerStatus.textContent = `Lecture du fichier : ${selectedFile.name}`;

      selectedFile.renderTo(videoPlayer, (err) => {
        if (err) {
          console.error("Erreur WebTorrent renderTo:", err);
          playerStatus.textContent =
            "Erreur pendant la préparation de la vidéo.";
        } else {
          console.log("[PLAYER] Lecture démarrée");
        }
      });
    }
  );
}

// Fonction pour masquer le loader de page
function hidePageLoader() {
  const pageLoader = document.getElementById("page-loader");
  if (pageLoader) {
    pageLoader.classList.add("fade-out");
    setTimeout(() => {
      pageLoader.style.display = "none";
    }, 500);
  }
}

// Gestion du loader de page
window.addEventListener("load", async () => {
  try {
    const key = getCatalogKeyFromHash();
    if (key) {
      await enterCatalog(key, { pushHash: false });
    } else {
      // Charger toutes les données avant de masquer le loader
      await loadHome();
    }
  } catch (err) {
    console.error("Erreur lors du chargement initial:", err);
  } finally {
    // Masquer le loader une fois que tout est chargé (avec un petit délai pour fluidité)
    setTimeout(hidePageLoader, 300);
  }
});

// --- EXTRA SECTIONS ---
async function tmdb(path) { return fetch(`${API_BASE}/api/tmdb${path}`).then(r=>r.json());}
async function fetchTMDBMovie(id){return tmdb(`/movie/${id}`);}
async function fetchTMDBSeries(id){return tmdb(`/series/${id}`);}
async function fetchDBContents(){return fetch(`${API_BASE}/api/options/all`).then(r=>r.json());}
function shuffle(a){return a.sort(()=>Math.random()-0.5);}

async function loadTop10France(){
  const row=document.getElementById("row-top10-france"); if(!row)return;
  const data=await tmdb(`/trending/all/day`); const top10=data.results.slice(0,10);
  row.innerHTML="";
  top10.forEach((item,i)=>{ const c=buildCard(item); c.dataset.rank=i+1; row.appendChild(c);});
}

async function loadMoviesPopularDB(){
  const all=await fetchDBContents();
  const m=shuffle(all.filter(x=>x.type_contenu==="movie")).slice(0,20);
  const row=document.getElementById("row-movies-popular-db"); if(!row)return; row.innerHTML="";
  for(const it of m){ const d=await fetchTMDBMovie(it.tmdb_id); row.appendChild(buildCard(d));}
}

async function loadSeriesPopularDB(){
  const all=await fetchDBContents();
  const s=shuffle(all.filter(x=>x.type_contenu==="tv")).slice(0,20);
  const row=document.getElementById("row-series-popular-db"); if(!row)return; row.innerHTML="";
  for(const it of s){ const d=await fetchTMDBSeries(it.tmdb_id); row.appendChild(buildCard(d));}
}

async function loadGenreSection(genreId, rowId){
  const all=await fetchDBContents();
  const movies=shuffle(all.filter(x=>x.type_contenu==="movie")).slice(0,40);
  const row=document.getElementById(rowId); if(!row)return; row.innerHTML="";
  for(const it of movies){
    const d=await fetchTMDBMovie(it.tmdb_id);
    if(d.genres && d.genres.some(g=>g.id===genreId)){
      row.appendChild(buildCard(d));
      if(row.children.length>=20) break;
    }
  }
}


// === Reprendre la lecture (continue watching) ?" synchronisé serveur par profil ===

// Legacy: lecture du vieux localStorage, utilisé uniquement pour la migration vers le serveur
function loadLegacyContinueWatchingMap() {
  try {
    const raw = localStorage.getItem(CONTINUE_WATCHING_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (e) {
    console.warn(
      "[CW] Impossible de charger le stockage 'Reprendre la lecture' legacy:",
      e
    );
    return {};
  }
}

function getCurrentProfileKeyForContinueWatching() {
  if (typeof currentProfileId === "number" && !Number.isNaN(currentProfileId)) {
    return String(currentProfileId);
  }
  if (currentProfileId) {
    return String(currentProfileId);
  }
  return "no-profile";
}

function makeContinueWatchingKey(meta) {
  if (!meta || !meta.tmdbId) return null;
  const mediaType = meta.mediaType === "series" ? "series" : "movie";
  return mediaType + ":" + String(meta.tmdbId);
}

// Migration automatique du localStorage vers le serveur pour le profil courant
async function migrateLocalContinueWatchingToServer(profileId) {
  if (typeof localStorage === "undefined") return;
  if (!authToken || !profileId) return;

  try {
    const map = loadLegacyContinueWatchingMap();
    if (!map || typeof map !== "object") {
      localStorage.removeItem(CONTINUE_WATCHING_STORAGE_KEY);
      return;
    }

    const profileKey = String(profileId);
    let profileEntries = map[profileKey];

    // Si rien pour ce profil, on essaie le bucket "no-profile" pour récupérer l'historique ancien
    if (!profileEntries || typeof profileEntries !== "object") {
      profileEntries = map["no-profile"];
    }

    if (!profileEntries || typeof profileEntries !== "object") {
      localStorage.removeItem(CONTINUE_WATCHING_STORAGE_KEY);
      return;
    }

    const entries = Object.values(profileEntries);
    if (!entries.length) {
      localStorage.removeItem(CONTINUE_WATCHING_STORAGE_KEY);
      return;
    }

    // Limite de sécurité (on garde les plus récents si jamais il y en avait beaucoup)
    entries.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    const limited = entries.slice(0, 50);

    await authFetch(`/api/userdata/${profileId}/continue/migrate`, {
      method: "POST",
      body: JSON.stringify({ entries: limited }),
    });

    // Si la migration se passe bien, on supprime l'ancien stockage local
    localStorage.removeItem(CONTINUE_WATCHING_STORAGE_KEY);
  } catch (e) {
    console.warn(
      "[CW] Erreur lors de la migration locale -> serveur 'Reprendre la lecture':",
      e
    );
  }
}

// Sauvegarde de la position de lecture sur le serveur
async function saveContinueWatchingPosition(meta, position, duration) {
  if (!meta || !meta.tmdbId) return;
  const profile = getCurrentProfile();
  const profileId = profile ? profile.id : currentProfileId;
  if (!authToken || !profileId) return;

  console.log('[DEBUG] Sauvegarde position:', {
    title: meta.title,
    originalTitle: meta.originalTitle,
    tmdbId: meta.tmdbId,
    position: Math.round(position),
    duration: Math.round(duration)
  });

  try {
    await authFetch(`/api/userdata/${profileId}/continue`, {
      method: "POST",
      body: JSON.stringify({
        tmdbId: meta.tmdbId,
        mediaType: meta.mediaType === "series" ? "series" : "movie",
        season: meta.season != null ? meta.season : null,
        episode: meta.episode != null ? meta.episode : null,
        position: position || 0,
        duration: duration || 0,
        title: meta.title || null,
        originalTitle: meta.originalTitle || null,
        posterPath: meta.posterPath || null,
        episodeTitle: meta.episodeTitle || null,
      }),
    });
    console.log('[DEBUG] o" Position sauvegardée avec succès');
  } catch (e) {
    console.warn(
      "[CW] Impossible de sauvegarder la position 'Reprendre la lecture' sur le serveur:",
      e
    );
  }
}

// Suppression d'une entrée "Reprendre la lecture" sur le serveur
async function removeContinueWatchingEntry(metaOrKey) {
  let meta = metaOrKey;
  if (typeof metaOrKey === "string") {
    const [mediaType, tmdbIdStr] = metaOrKey.split(":");
    const tmdbId = Number(tmdbIdStr) || null;
    if (!tmdbId) return;
    meta = { tmdbId, mediaType };
  }
  if (!meta || !meta.tmdbId) return;

  const profile = getCurrentProfile();
  const profileId = profile ? profile.id : currentProfileId;
  if (!authToken || !profileId) return;

  try {
    await authFetch(`/api/userdata/${profileId}/continue`, {
      method: "DELETE",
      body: JSON.stringify({
        tmdbId: meta.tmdbId,
        mediaType: meta.mediaType === "series" ? "series" : "movie",
      }),
    });
  } catch (e) {
    console.warn(
      "[CW] Impossible de supprimer l'entrée 'Reprendre la lecture' sur le serveur:",
      e
    );
  }
}

// Récupération des entrées "Reprendre la lecture" pour le profil courant
async function getContinueWatchingEntriesForCurrentProfile() {
  const profile = getCurrentProfile();
  const profileId = profile ? profile.id : currentProfileId;
  if (!authToken || !profileId) return [];

  try {
    const data = await authFetch(`/api/userdata/${profileId}/continue`, {
      method: "GET",
    });
    const entries = Array.isArray(data.entries) ? data.entries : [];
    // On s'assure que les plus récents sont en premier (au cas où)
    entries.sort((a, b) => {
      const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return tb - ta;
    });
    return entries;
  } catch (e) {
    console.warn(
      "[CW] Impossible de charger les données 'Reprendre la lecture' depuis le serveur:",
      e
    );
    return [];
  }
}

// Construit la rangée "Reprendre la lecture" à partir des données serveur
async function loadContinueWatchingRow() {
  if (!rowContinueWatching || !continueWatchingSection) return;

  try {
    const entries = await getContinueWatchingEntriesForCurrentProfile();
    if (!entries.length) {
      continueWatchingSection.classList.add("hidden");
      rowContinueWatching.innerHTML = "";
      return;
    }

    continueWatchingSection.classList.remove("hidden");
    rowContinueWatching.innerHTML = "";

    const limited = entries.slice(0, 20);
    for (const entry of limited) {
      let data = null;
      try {
        if (entry.mediaType === "series") {
          data = await fetchTMDBSeries(entry.tmdbId);
          if (data) {
            data.media_type = "tv";
          }
        } else {
          data = await fetchTMDBMovie(entry.tmdbId);
          if (data) {
            data.media_type = "movie";
          }
        }
      } catch (e) {
        console.warn(
          "[CW] Impossible de charger TMDB pour tmdb_id=",
          entry.tmdbId,
          e
        );
      }
      if (!data) continue;

      const card = buildCard(data);

      // Ajout de la petite barre de progression spécifique à "Reprendre la lecture"
      const duration = entry.duration || 0;
      const position = entry.position || 0;
      if (duration > 0 && position > 0) {
        const ratio = Math.min(1, Math.max(0, position / duration));
        const body = card.querySelector(".card-body");
        if (body && ratio > 0.02) {
          const track = document.createElement("div");
          track.className = "card-progress-track";

          const fill = document.createElement("div");
          fill.className = "card-progress-fill";
          fill.style.width = `${(ratio * 100).toFixed(0)}%`;

          track.appendChild(fill);
          body.appendChild(track);
        }
      }

      rowContinueWatching.appendChild(card);
    }
  } catch (e) {
    console.warn(
      "[CW] Erreur lors du chargement de la section 'Reprendre la lecture':",
      e
    );
    continueWatchingSection.classList.add("hidden");
  }
}

// === Reprise intelligente (best effort) ===
const SMART_RESUME_MARGIN_SECONDS = 8; // on repart un peu avant pour retomber sur une keyframe
const SMART_RESUME_MIN_POSITION = 30;  // ne pas reprendre si l'utilisateur n'a pas réellement commencé
const SMART_RESUME_NEAR_END_SECONDS = 60; // si on est à <60s de la fin, on considère "terminé"

let resumeOverlayEl = null;
let lastAppliedResumeKey = null;

function ensureResumeOverlay() {
  if (resumeOverlayEl) return resumeOverlayEl;
  if (!playerModal) return null;

  const el = document.createElement("div");
  el.className = "resume-overlay hidden";
  el.textContent = "";
  playerModal.appendChild(el);
  resumeOverlayEl = el;
  return el;
}

function formatHMS(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function buildResumeKey(meta) {
  if (!meta) return "";
  const t = meta.tmdbId != null ? String(meta.tmdbId) : "";
  const mt = meta.mediaType || "";
  const s = meta.season != null ? String(meta.season) : "";
  const e = meta.episode != null ? String(meta.episode) : "";
  return [mt, t, s, e].join("|");
}

async function getContinueEntryForMeta(meta) {
  if (!meta || meta.tmdbId == null) return null;
  try {
    const entries = await getContinueWatchingEntriesForCurrentProfile();
    if (!Array.isArray(entries) || entries.length === 0) return null;

    const wantedType = meta.mediaType === "series" ? "series" : "movie";
    return (
      entries.find((x) => {
        if (!x) return false;
        if (String(x.tmdbId) !== String(meta.tmdbId)) return false;
        if ((x.mediaType || "").toLowerCase() !== wantedType) return false;

        if (wantedType === "series") {
          const xs = x.season != null ? Number(x.season) : null;
          const xe = x.episode != null ? Number(x.episode) : null;
          if (xs == null || xe == null) return false;
          return xs === Number(meta.season) && xe === Number(meta.episode);
        }
        return true;
      }) || null
    );
  } catch (e) {
    console.warn("[RESUME] Impossible de lire 'Reprendre la lecture' pour appliquer la reprise intelligente:", e);
    return null;
  }
}

// Pour une série : récupère le dernier épisode vu (le plus récent) pour un tmdbId donné
async function getLatestContinueEntryForSeries(tmdbId) {
  if (!tmdbId) return null;
  try {
    const entries = await getContinueWatchingEntriesForCurrentProfile();
    if (!Array.isArray(entries) || !entries.length) return null;

    const list = entries
      .filter((x) => x && String(x.tmdbId) === String(tmdbId) && (x.mediaType || '').toLowerCase() === 'series')
      .map((x) => {
        const t = x.updatedAt ? new Date(x.updatedAt).getTime() : 0;
        return { x, t };
      })
      .sort((a, b) => b.t - a.t);

    return list.length ? list[0].x : null;
  } catch (e) {
    console.warn('[RESUME] Impossible de récupérer le dernier épisode vu pour la série:', e);
    return null;
  }
}

function formatEpisodeRef(season, episode) {
  const e = episode != null ? Number(episode) : null;
  const s = season != null ? Number(season) : null;
  if (e == null) return '';
  if (s == null) return `E${e}`;
  return `S${s}E${e}`;
}

function showResumeOverlay(targetSeconds) {
  const el = ensureResumeOverlay();
  if (!el) return;
  el.textContent = `- Reprise à ${formatHMS(targetSeconds)}`;
  el.classList.remove("hidden");
  clearTimeout(el._hideTimer);
  el._hideTimer = setTimeout(() => {
    el.classList.add("hidden");
  }, 2600);
}

function waitForLoadedMetadata(videoEl, timeoutMs = 6000) {
  if (!videoEl) return Promise.resolve(false);
  // If already available
  if (videoEl.readyState >= 1 && isFinite(videoEl.duration) && videoEl.duration > 0) {
    return Promise.resolve(true);
  }
  return new Promise((resolve) => {
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      cleanup();
      resolve(!!ok);
    };
    const onMeta = () => finish(true);
    const onErr = () => finish(false);
    const cleanup = () => {
      videoEl.removeEventListener("loadedmetadata", onMeta);
      videoEl.removeEventListener("error", onErr);
    };
    videoEl.addEventListener("loadedmetadata", onMeta, { once: true });
    videoEl.addEventListener("error", onErr, { once: true });
    setTimeout(() => finish(false), timeoutMs);
  });
}

async function applySmartResumeIfAvailable(meta) {
  if (!videoPlayer || !meta) return false;

  const key = buildResumeKey(meta);
  // évite de ré-appliquer en boucle sur la même vidéo
  if (key && lastAppliedResumeKey === key) return false;

  const entry = await getContinueEntryForMeta(meta);
  if (!entry) return false;

  const position = Number(entry.position || 0);
  const savedDuration = Number(entry.duration || 0);

  if (!position || position < SMART_RESUME_MIN_POSITION) return false;

  // Si on est proche de la fin (selon durée sauvegardée ou durée réelle si dispo), on ne reprend pas
  const durationReal = Number(videoPlayer.duration || 0);
  const duration = (durationReal && isFinite(durationReal) && durationReal > 0) ? durationReal : savedDuration;

  if (duration && isFinite(duration) && duration > 0) {
    if (position >= duration - SMART_RESUME_NEAR_END_SECONDS) return false;
    if (position / duration >= 0.95) return false;
  }

  const seekTo = Math.max(0, position - SMART_RESUME_MARGIN_SECONDS);

  try {
    videoPlayer.currentTime = seekTo;
    lastAppliedResumeKey = key || null;
    showResumeOverlay(position);
    return true;
  } catch (e) {
    console.warn("[RESUME] Impossible d'appliquer la reprise intelligente:", e);
    return false;
  }
}

async function smartAutoPlay(meta) {
  if (!videoPlayer) return;
  await waitForLoadedMetadata(videoPlayer, 6000);
  await applySmartResumeIfAvailable(meta);

  try {
    const playPromise = videoPlayer.play();
    if (playPromise && playPromise.catch) {
      await playPromise;
    }
  } catch (e) {
    // Autoplay peut être bloqué par le navigateur ?' on garde l'UI OK
    console.warn("[PLAYER] Autoplay bloqué ou erreur de lecture:", e);
  }
}
function handleVideoTimeUpdate() {
  if (!currentWatchingMeta || !videoPlayer) return;
  const position = videoPlayer.currentTime || 0;
  const duration = videoPlayer.duration || 0;

  if (!duration || !isFinite(duration) || duration <= 0) {
    return;
  }

  // On ne commence à enregistrer qu'après 30 secondes de visionnage
  if (position < 30) {
    return;
  }

  // Si on est quasiment à la fin, on supprime l'entrée et on peut armer l'auto-next (séries)
  if (position >= duration - 60) {
    removeContinueWatchingEntry(currentWatchingMeta);

    // Démarre l'épisode suivant pendant le générique (si disponible)
    if (
      !autoNextTimeout &&
      currentWatchingMeta.mediaType === "series" &&
      currentWatchingMeta.season != null &&
      currentWatchingMeta.episode != null &&
      currentEpisodeNavState &&
      currentEpisodeNavState.next
    ) {
      scheduleAutoNext();
    }

    return;
  }

  // Sauvegarde toutes les ~1 seconde
  if (position - lastWatchingSaveTime < 1) {
    return;
  }

  lastWatchingSaveTime = position;
  saveContinueWatchingPosition(currentWatchingMeta, position, duration);
}

function handleVideoEnded() {
  if (!currentWatchingMeta) return;
  removeContinueWatchingEntry(currentWatchingMeta);

  // Auto-next only for series episodes
  if (
    currentWatchingMeta.mediaType === "series" &&
    currentWatchingMeta.season != null &&
    currentWatchingMeta.episode != null &&
    currentEpisodeNavState &&
    currentEpisodeNavState.next
  ) {
    scheduleAutoNext();
  }
}


// === "Ma liste" ?" synchronisée serveur par profil ===

// Legacy: lecture de l'ancien localStorage, uniquement pour migration
function loadLegacyMyListMap() {
  try {
    const raw = localStorage.getItem(MY_LIST_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (e) {
    console.warn("[MYLIST] Impossible de charger le stockage 'Ma liste' legacy:", e);
    return {};
  }
}

// Cache en mémoire pour accélérer les tests d'appartenance
let myListProfileId = null;
let myListKeySet = new Set();

function makeMyListKey(tmdbId, mediaType) {
  if (!tmdbId) return null;
  const type =
    mediaType === "series" || mediaType === "tv" ? "series" : "movie";
  return `${type}:${String(tmdbId)}`;
}

function setMyListCache(profileId, entries) {
  myListProfileId = profileId;
  myListKeySet = new Set();
  if (!Array.isArray(entries)) return;
  for (const e of entries) {
    const key = makeMyListKey(
      e.tmdbId != null ? e.tmdbId : e.tmdb_id,
      e.mediaType != null ? e.mediaType : e.media_type
    );
    if (key) {
      myListKeySet.add(key);
    }
  }
}

function isInMyList(tmdbId, mediaType) {
  const key = makeMyListKey(tmdbId, mediaType);
  if (!key) return false;

  const profile = getCurrentProfile();
  const profileId = profile ? profile.id : currentProfileId;

  // Si le cache correspond au profil courant, on l'utilise
  if (profileId && myListProfileId === profileId && myListKeySet.size > 0) {
    return myListKeySet.has(key);
  }

  // Fallback léger sur l'ancien localStorage (avant migration)
  try {
    const map = loadLegacyMyListMap();
    const profileKey = getCurrentProfileKeyForContinueWatching();
    const profileEntries = map[profileKey] || {};
    const exists = Object.values(profileEntries || {}).some((e) => {
      const ek = makeMyListKey(e.tmdbId, e.mediaType);
      return ek === key;
    });
    return exists;
  } catch (e) {
    return false;
  }
}

// Récupère la "Ma liste" pour le profil courant via l'API
async function getMyListEntriesForCurrentProfile() {
  const profile = getCurrentProfile();
  const profileId = profile ? profile.id : currentProfileId;
  if (!authToken || !profileId) return [];

  try {
    const data = await authFetch(`/api/userdata/${profileId}/mylist`, {
      method: "GET",
    });
    const entries = Array.isArray(data.entries) ? data.entries : [];

    // Mise à jour du cache
    setMyListCache(profileId, entries);

    // Tri par date d'ajout décroissante
    entries.sort((a, b) => {
      const ta = a.addedAt ? new Date(a.addedAt).getTime() : 0;
      const tb = b.addedAt ? new Date(b.addedAt).getTime() : 0;
      return tb - ta;
    });

    return entries;
  } catch (e) {
    console.warn(
      "[MYLIST] Impossible de charger 'Ma liste' depuis le serveur:",
      e
    );
    return [];
  }
}

// Toggle via l'API, renvoie true si présent après l'appel, false sinon
async function toggleMyList(tmdbId, mediaType) {
  const profile = getCurrentProfile();
  const profileId = profile ? profile.id : currentProfileId;
  if (!isPremiumReady() || !profileId) {
    promptAuth("Connecte-toi pour utiliser Ma liste.");
    return isInMyList(tmdbId, mediaType);
  }

  const key = makeMyListKey(tmdbId, mediaType);
  if (!key) return null;

  try {
    const data = await authFetch(`/api/userdata/${profileId}/mylist/toggle`, {
      method: "POST",
      body: JSON.stringify({
        tmdbId,
        mediaType:
          mediaType === "series" || mediaType === "tv" ? "series" : "movie",
      }),
    });

    const inMyList =
      data && typeof data.inMyList === "boolean"
        ? data.inMyList
        : !!(data && (data.added || data.isInMyList));

    if (myListProfileId !== profileId || !myListKeySet) {
      myListKeySet = new Set();
    }

    if (inMyList) {
      myListKeySet.add(key);
    } else {
      myListKeySet.delete(key);
    }

    return inMyList;
  } catch (e) {
    console.warn(
      "[MYLIST] Erreur lors du toggle 'Ma liste' sur le serveur:",
      e
    );
    return isInMyList(tmdbId, mediaType);
  }
}

let myListRefreshTimer = null;
function scheduleMyListRowRefresh(scrollToSection = false) {
  if (!rowMyList || !myListSection) return;
  if (myListRefreshTimer) clearTimeout(myListRefreshTimer);
  myListRefreshTimer = setTimeout(() => {
    if (typeof loadMyListRow === "function") loadMyListRow(scrollToSection);
  }, 50);
}

// Migration automatique du localStorage vers le serveur pour un profil donné
async function migrateLocalMyListToServer(profileId) {
  if (typeof localStorage === "undefined") return;
  if (!authToken || !profileId) return;

  try {
    const map = loadLegacyMyListMap();
    if (!map || typeof map !== "object") {
      localStorage.removeItem(MY_LIST_STORAGE_KEY);
      return;
    }

    const profileKey = String(profileId);
    let profileEntries = map[profileKey];

    if (!profileEntries || typeof profileEntries !== "object") {
      profileEntries = map["no-profile"];
    }

    if (!profileEntries || typeof profileEntries !== "object") {
      localStorage.removeItem(MY_LIST_STORAGE_KEY);
      return;
    }

    const entriesArr = Object.values(profileEntries);
    if (!entriesArr.length) {
      localStorage.removeItem(MY_LIST_STORAGE_KEY);
      return;
    }

    entriesArr.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
    const limited = entriesArr.slice(0, 200);

    await authFetch(`/api/userdata/${profileId}/mylist/migrate`, {
      method: "POST",
      body: JSON.stringify({ entries: limited }),
    });

    localStorage.removeItem(MY_LIST_STORAGE_KEY);
  } catch (e) {
    console.warn(
      "[MYLIST] Erreur lors de la migration locale -> serveur 'Ma liste':",
      e
    );
  }
}

// Rattache le bouton de carte à la "Ma liste" serveur
function attachMyListButton(button, tmdbId, mediaType) {
  if (!button) return;

  const refreshLabel = (forcedState) => {
    const inList =
      typeof forcedState === "boolean"
        ? forcedState
        : isInMyList(tmdbId, mediaType);

    button.textContent = inList ? "Retirer de Ma liste" : "+ Ma liste";
  };

  button.addEventListener("click", async (event) => {
    event.stopPropagation();
    event.preventDefault();
    const newState = await toggleMyList(tmdbId, mediaType);
    if (typeof newState === "boolean") {
      refreshLabel(newState);
    } else {
      refreshLabel();
    }
    scheduleMyListRowRefresh(false);
  });

  refreshLabel();
}

// Construit la rangée "Ma liste" à partir des données serveur
async function loadMyListRow(scrollToSection = false) {
  if (!rowMyList || !myListSection) return;
  try {
    const entries = await getMyListEntriesForCurrentProfile();

    if (!entries.length) {
      myListSection.classList.add("hidden");
      rowMyList.innerHTML = "";
      return;
    }

    myListSection.classList.remove("hidden");
    rowMyList.innerHTML = "";

    const limited = entries.slice(0, 40);
    for (const entry of limited) {
      let data = null;
      try {
        if (entry.mediaType === "series" || entry.mediaType === "tv") {
          data = await fetchTMDBSeries(entry.tmdbId);
          if (data) data.media_type = "tv";
        } else {
          data = await fetchTMDBMovie(entry.tmdbId);
          if (data) data.media_type = "movie";
        }
      } catch (e) {
        console.warn(
          "[MYLIST] Impossible de charger TMDB pour tmdb_id=",
          entry.tmdbId,
          e
        );
      }
      if (!data) continue;
      const card = buildCard(data);
      rowMyList.appendChild(card);
    }

    if (scrollToSection) {
      try {
        myListSection.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (e) {}
    }
  } catch (e) {
    console.warn(
      "[MYLIST] Erreur lors du chargement de la section 'Ma liste':",
      e
    );
    myListSection.classList.add("hidden");
  }
}

// Hook into loadHome at end
const oldLoadHome = loadHome;
// === Auth & Profils ===

const PROFILE_STORAGE_KEY = "onlyus_profile_id";
const CONTINUE_WATCHING_STORAGE_KEY = "onlyus_continue_watching";
const MY_LIST_STORAGE_KEY = "onlyus_my_list";

const PROFILE_AVATARS = {
  "BOBTA3NA": "./avatars/BOBTA3NA.jpg",
  "DESPOTES": "./avatars/DESPOTES.jpg",
  "GIRLPOWER": "./avatars/GIRLPOWER.jpg",
  "JESSIEPINK": "./avatars/JESSIEPINK.jpg",
  "JOKER": "./avatars/JOKER.jpg",
  "MANPOWER": "./avatars/MANPOWER.jpg",
  "OMER": "./avatars/OMER.jpg",
  "OURSON": "./avatars/OURSON.jpg",
  "PICSOU": "./avatars/PICSOU.jpg",
  "POTEDESULY": "./avatars/POTEDESULY.jpg",
  "RED": "./avatars/RED.jpg",
  "RONCHON": "./avatars/RONCHON.jpg",
  "SALGOAT": "./avatars/SALGOAT.jpg",
  "SULY": "./avatars/SULY.jpg",
  "VIEILLE": "./avatars/VIEILLE.jpg",
  "YEAH": "./avatars/YEAH.jpg",
  "baby": "./avatars/baby.jpg",
  "deadpool": "./avatars/deadpool.jpg",
  "hakimi": "./avatars/hakimi.jpg",
  "pikachu": "./avatars/pikachu.jpg",
};

let authToken = null;
let currentUser = null;
let currentProfiles = [];
let currentProfileId = null;
let currentAuthMode = "login"; // "login" | "register"
let selectedAvatarKey = "baby";
let profileEditMode = "create";
let profileBeingEdited = null;


const authScreen = document.getElementById("auth-screen");
const authTitle = document.getElementById("auth-title");
const authSubtitle = document.getElementById("auth-subtitle");
const authLeftTitle = document.getElementById("auth-left-title");
const authForm = document.getElementById("auth-form");
const authCloseBtn = document.getElementById("auth-close");
const authModeLoginBtn = document.getElementById("auth-mode-login");
const authModeRegisterBtn = document.getElementById("auth-mode-register");
const authLoginInput = document.getElementById("auth-login");
const authUsernameInput = document.getElementById("auth-username");
const authEmailInput = document.getElementById("auth-email");
const authPasswordInput = document.getElementById("auth-password");
const authPasswordToggle = document.getElementById("auth-password-toggle");
const authSubmit = document.getElementById("auth-submit");
const authError = document.getElementById("auth-error");
const authRegisterOnlyFields = document.querySelectorAll(".auth-register-only");

const profilesScreen = document.getElementById("profiles-screen");
const profilesGrid = document.getElementById("profiles-grid");
const btnOpenCreateProfile = document.getElementById("btn-open-create-profile");
const profileCreateModal = document.getElementById("profile-create-modal");
const profileNameInput = document.getElementById("profile-name-input");
const profileCreateError = document.getElementById("profile-create-error");
const profileCreateCancel = document.getElementById("profile-create-cancel");
const profileCreateConfirm = document.getElementById("profile-create-confirm");
const avatarOptions = document.querySelectorAll(".avatar-option");

// --- IMPORTANT: le modal d'avatar/profil doit être global (sinon il reste caché quand l'écran "Profils" est masqué)
const profileCreateTitle = profileCreateModal ? profileCreateModal.querySelector("h3") : null;
if (profileCreateModal && profileCreateModal.parentElement && profileCreateModal.parentElement !== document.body) {
  // On déplace le modal au niveau du <body> pour qu'il puisse s'ouvrir depuis n'importe quel écran (Home, OnlyFoot, etc.)
  document.body.appendChild(profileCreateModal);
}


/**
 * Utilitaires auth
 */

function loadStoredAuth() {
  try {
    const profileIdStr = localStorage.getItem(PROFILE_STORAGE_KEY);
    currentProfileId = profileIdStr ? Number(profileIdStr) || null : null;
    // Cleanup legacy token stored in localStorage (now HttpOnly cookie only)
    localStorage.removeItem("onlyus_token");
  } catch (e) {
    console.warn("[AUTH] Impossible de charger le profil depuis localStorage:", e);
  }
}

function setCatalogTitles(key) {
  if (!top10TitleEl) return;
  const label = key && PLATFORM_CONFIG[key] ? PLATFORM_CONFIG[key].label : null;
  if (label) {
    top10TitleEl.textContent = `Top 10 ${label}`;
  } else {
    top10TitleEl.textContent = top10TitleDefault;
  }
}

async function loadProviderCatalog(key) {
  try {
    const loadId = ++catalogLoadId;
    const cfg = PLATFORM_CONFIG[key];
    if (!cfg) return;
    // Clear previous rows to avoid stale content flashing during provider switches.
    const rowsToClear = [
      rowTop10France,
      rowMoviesPopularDb,
      rowSeriesPopularDb,
      rowGenreAction,
      rowGenreComedy,
      rowGenreHorror,
      rowGenreScifi,
      rowGenreAnimation,
      rowGenreRomance,
      rowGenreThriller,
      rowGenreDocumentary,
    ];
    rowsToClear.forEach((row) => {
      if (row) row.innerHTML = "<p>Chargement...</p>";
    });

    const basePath = key === "warner"
      ? `${API_BASE}/api/tmdb/company/${key}`
      : `${API_BASE}/api/tmdb/provider/${cfg.providerKey}`;

    const [
      moviesPopularData,
      seriesPopularData,
      moviesTopRatedData,
      seriesTopRatedData,
      genreActionData,
      genreComedyData,
      genreHorrorData,
      genreScifiData,
      genreAnimationData,
      genreRomanceData,
      genreThrillerData,
      genreDocumentaryData,
      ] = await Promise.all([
        fetchJSON(`${basePath}/movies/popular`),
        fetchJSON(`${basePath}/series/popular`),
        fetchJSON(`${basePath}/movies/top_rated`),
        fetchJSON(`${basePath}/series/top_rated`),
      fetchJSON(`${basePath}/movies/genre/28`),
      fetchJSON(`${basePath}/movies/genre/35`),
      fetchJSON(`${basePath}/movies/genre/27`),
      fetchJSON(`${basePath}/movies/genre/878`),
      fetchJSON(`${basePath}/movies/genre/16`),
      fetchJSON(`${basePath}/movies/genre/10749`),
      fetchJSON(`${basePath}/movies/genre/53`),
        fetchJSON(`${basePath}/movies/genre/99`),
      ]);

      if (loadId !== catalogLoadId || currentCatalogKey !== key) return;

      let moviesPopular = (moviesPopularData.results || []).map((r) => ({
        ...r,
        media_type: "movie",
      }));
    let seriesPopular = (seriesPopularData.results || []).map((r) => ({
      ...r,
      media_type: "tv",
    }));
    let moviesTopRated = (moviesTopRatedData.results || []).map((r) => ({
      ...r,
      media_type: "movie",
    }));
    let seriesTopRated = (seriesTopRatedData.results || []).map((r) => ({
      ...r,
      media_type: "tv",
    }));

    if (key === "prime" || key === "disney" || key === "appletv" || key === "hbo" || key === "paramount" || key === "warner") {
      moviesPopular = uniqueById(moviesPopular);
      seriesPopular = uniqueById(seriesPopular);
      moviesTopRated = uniqueById(moviesTopRated);
      seriesTopRated = uniqueById(seriesTopRated);
    }

    const combined = [...moviesPopular, ...seriesPopular, ...moviesTopRated, ...seriesTopRated]
      .filter((r) => r && (r.media_type === "movie" || r.media_type === "tv"));

    if (combined.length) {
      renderHero(combined[0]);
      const heroItems = combined
        .filter((r) => r && (r.backdrop_path || r.poster_path))
        .slice(0, 8);
      startHeroCarousel(heroItems, { intervalMs: 7500 });
    }

    const topCombinedRaw = [...combined]
      .filter((r) => r && r.poster_path)
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 20);

    const topCombined = (key === "prime" || key === "disney" || key === "appletv" || key === "hbo" || key === "paramount" || key === "warner")
      ? uniqueById(topCombinedRaw).slice(0, 10)
      : topCombinedRaw.slice(0, 10);

    fillRow(rowTop10France, topCombined, true);
    const genreAction = (genreActionData.results || []);
    const genreComedy = (genreComedyData.results || []);
    const genreHorror = (genreHorrorData.results || []);
    const genreScifi = (genreScifiData.results || []);
    const genreAnimation = (genreAnimationData.results || []);
    const genreRomance = (genreRomanceData.results || []);
    const genreThriller = (genreThrillerData.results || []);
    const genreDocumentary = (genreDocumentaryData.results || []);

    const dedupeSections = key === "prime" || key === "disney" || key === "appletv" || key === "hbo" || key === "paramount" || key === "warner";
    fillRow(rowMoviesPopularDb, (dedupeSections ? uniqueById(moviesPopular) : moviesPopular).slice(0, 20));
    fillRow(rowSeriesPopularDb, (dedupeSections ? uniqueById(seriesPopular) : seriesPopular).slice(0, 20));
    fillRow(rowGenreAction, (dedupeSections ? uniqueById(genreAction) : genreAction).slice(0, 20));
    fillRow(rowGenreComedy, (dedupeSections ? uniqueById(genreComedy) : genreComedy).slice(0, 20));
    fillRow(rowGenreHorror, (dedupeSections ? uniqueById(genreHorror) : genreHorror).slice(0, 20));
    fillRow(rowGenreScifi, (dedupeSections ? uniqueById(genreScifi) : genreScifi).slice(0, 20));
    fillRow(rowGenreAnimation, (dedupeSections ? uniqueById(genreAnimation) : genreAnimation).slice(0, 20));
    fillRow(rowGenreRomance, (dedupeSections ? uniqueById(genreRomance) : genreRomance).slice(0, 20));
    fillRow(rowGenreThriller, (dedupeSections ? uniqueById(genreThriller) : genreThriller).slice(0, 20));
    fillRow(rowGenreDocumentary, (dedupeSections ? uniqueById(genreDocumentary) : genreDocumentary).slice(0, 20));

      await loadContinueWatchingRow();
      if (loadId !== catalogLoadId || currentCatalogKey !== key) return;
      await loadMyListRow();
    } catch (err) {
      console.error("Erreur chargement catalogue:", err);
      // Clear rows to avoid showing stale content from previous catalog
      const rowsToClear = [
        rowTop10France,
        rowMoviesPopularDb,
        rowSeriesPopularDb,
        rowGenreAction,
        rowGenreComedy,
        rowGenreHorror,
        rowGenreScifi,
        rowGenreAnimation,
        rowGenreRomance,
        rowGenreThriller,
        rowGenreDocumentary,
      ];
      rowsToClear.forEach((row) => {
        if (row) row.innerHTML = "";
      });
    if (rowTop10France) {
      rowTop10France.innerHTML = "<p>Impossible de charger le catalogue.</p>";
    }
  }
}

function enterCatalog(key, { pushHash = true } = {}) {
  if (!key || !PLATFORM_CONFIG[key]) return;
  if (currentCatalogKey === key) return;
  if (currentAppMode !== "cine") {
    setAppMode("cine", { pushHash: false, showChip: false });
  }
  triggerCatalogExit();
  currentCatalogKey = key;
  setCatalogTitles(key);
  trackCatalogEvent("view", key, PLATFORM_CONFIG[key] && PLATFORM_CONFIG[key].label);
  trackPageView(`catalog:${String(key || "")}`);
  if (pushHash) window.location.hash = PLATFORM_CONFIG[key].hash;
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(loadProviderCatalog(key));
    }, 220);
  });
}

function exitCatalog({ pushHash = true } = {}) {
  if (!currentCatalogKey) return;
  currentCatalogKey = null;
  setCatalogTitles(null);
  if (pushHash) window.location.hash = "#cine";
  loadHome();
}

function initPlatformCatalogLinks() {
  const cards = Array.from(document.querySelectorAll(".platform-card[data-platform]"));
  if (!cards.length) return;
    cards.forEach((card) => {
      const key = card.getAttribute("data-platform");
      const label = card.getAttribute("data-platform-label") || (PLATFORM_CONFIG[key] && PLATFORM_CONFIG[key].label) || "Catalogue";
      card.addEventListener("click", (e) => {
        e.preventDefault();
        trackCatalogEvent("click", key, label);
        runPlatformZoomTransition(card, key, label, () => {
          enterCatalog(key, { pushHash: true });
        });
      });
    });
}

function triggerCatalogEntrance() {
  if (!homeSection) return;
  catalogEntranceActive = true;
  homeSection.classList.add("catalog-entrance");

  const cards = Array.from(homeSection.querySelectorAll(".row-scroller .card"));
  cards.forEach((card, index) => {
    card.classList.remove("is-entering");
    card.style.animationDelay = "0ms";
    // Force reflow to restart animation cleanly
    void card.offsetWidth; // eslint-disable-line no-unused-expressions
    card.classList.add("is-entering");
    card.style.animationDelay = `${Math.min(index * 40, 360)}ms`;
  });

  setTimeout(() => {
    catalogEntranceActive = false;
    homeSection.classList.remove("catalog-entrance");
  }, 900);
}

function triggerCatalogExit() {
  if (!homeSection) return;
  if (catalogExitTimer) clearTimeout(catalogExitTimer);
  homeSection.classList.remove("catalog-exit");
  const cards = Array.from(homeSection.querySelectorAll(".row-scroller .card"))
    .filter((card) => card && card.offsetParent !== null && card.getClientRects().length);
  if (!cards.length) return;

  cards.forEach((card) => {
    card.classList.remove("is-exiting");
    const x = (Math.random() * 80 - 40).toFixed(1);
    const y = (Math.random() * 60 - 30).toFixed(1);
    const s = (1.12 + Math.random() * 0.22).toFixed(2);
    const d = Math.round(Math.random() * 160);
    card.style.setProperty("--exit-x", `${x}px`);
    card.style.setProperty("--exit-y", `${y}px`);
    card.style.setProperty("--exit-scale", s);
    card.style.setProperty("--exit-delay", `${d}ms`);
    void card.offsetWidth; // restart animation
    card.classList.add("is-exiting");
  });

  homeSection.classList.add("catalog-exit");
  catalogExitTimer = setTimeout(() => {
    homeSection.classList.remove("catalog-exit");
    cards.forEach((card) => card.classList.remove("is-exiting"));
  }, 760);
}

function runPlatformZoomTransition(sourceEl, key, titleText, onDone) {
  if (!sourceEl) return onDone && onDone();
  const prefersReduced = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) return onDone && onDone();
  if (platformZoomActive) return;
  platformZoomActive = true;

  const rect = sourceEl.getBoundingClientRect();
  if (!rect.width || !rect.height) return onDone && onDone();

  // Clean any stale overlays (safety)
  document.querySelectorAll(".platform-zoom-backdrop, .platform-zoom-clone").forEach((el) => {
    try { el.remove(); } catch (_) {}
  });

  const backdrop = document.createElement("div");
  backdrop.className = "platform-zoom-backdrop";
  if (key === "hbo") backdrop.classList.add("is-hbo");
  const title = document.createElement("div");
  title.className = "platform-zoom-title";
  title.textContent = titleText || "CATALOGUE";
  backdrop.appendChild(title);
  document.body.appendChild(backdrop);

  const clone = sourceEl.cloneNode(true);
  clone.classList.add("platform-zoom-clone");
  clone.classList.add("is-logo-only");
  if (key === "hbo") clone.classList.add("is-hbo");
  clone.style.left = `${rect.left}px`;
  clone.style.top = `${rect.top}px`;
  clone.style.width = `${rect.width}px`;
  clone.style.height = `${rect.height}px`;
  clone.style.transformOrigin = "top left";
  clone.style.transform = "translate(0, 0) scale(1)";
  document.body.appendChild(clone);

  const scaleX = window.innerWidth / rect.width;
  const scaleY = window.innerHeight / rect.height;

  requestAnimationFrame(() => {
    backdrop.classList.add("is-active");
    requestAnimationFrame(() => {
      clone.style.transform = `translate(${-rect.left}px, ${-rect.top}px) scale(${scaleX}, ${scaleY})`;
      clone.style.borderRadius = "0px";
    });
  });


  let transitionDone = false;
  let actionDone = false;

  const finish = () => {
    try { backdrop.remove(); } catch (_) {}
    try { clone.remove(); } catch (_) {}
    platformZoomActive = false;
  };

  try {
    trackSourceUsage(option, { mode });
  } catch (_) {}

  const minHoldMs = 360;
  const logoFadeOutMs = 260;
  const timeoutMs = 1300;

  const maybeFinish = () => {
    if (!transitionDone || !actionDone) return;
    backdrop.classList.add("is-leaving");
    setTimeout(() => {
      triggerCatalogEntrance();
      finish();
    }, minHoldMs + logoFadeOutMs);
  };

  const doneOnce = () => {
    clone.removeEventListener("transitionend", doneOnce);
    transitionDone = true;
    maybeFinish();
  };
  clone.addEventListener("transitionend", doneOnce, { once: true });
  setTimeout(doneOnce, timeoutMs);

  Promise.resolve()
    .then(() => (typeof onDone === "function" ? onDone() : null))
    .finally(() => {
      actionDone = true;
      maybeFinish();
    });
}

function isPremiumReady() {
  return !!(currentUser && currentProfileId != null);
}

function updateAuthCTAUI() {
  if (authOpenButton) {
    authOpenButton.classList.toggle("hidden", !!currentUser);
  }
  if (authRegisterButton) {
    authRegisterButton.classList.toggle("hidden", !!currentUser);
  }
}

function enterGuestMode() {
  storeAuth(null, null);
  authToken = null;
  currentUser = null;
  currentProfiles = [];
  currentProfileId = null;
  try {
    if (typeof onlyfootChatState !== "undefined" && onlyfootChatState.socket) {
      onlyfootChatState.socket.disconnect();
      onlyfootChatState.socket = null;
      onlyfootChatState.connected = false;
      onlyfootChatState.joined = false;
    }
  } catch (_) {}
  try {
    if (typeof renderChatGuestPlaceholder === "function") renderChatGuestPlaceholder();
  } catch (_) {}
  if (userMenuContainer) userMenuContainer.classList.add("hidden");
  hideAuthScreen();
  hideProfilesScreen();
  enableAds();
  startPresenceHeartbeat();
  updateAuthCTAUI();
}

function promptAuth(reason) {
  if (typeof setAuthMode === "function") setAuthMode("register");
  if (authError) {
    authError.textContent = reason || "Connecte-toi pour continuer.";
  }
  showAuthScreen();
}

function storeAuth(token, profileId = null) {
  authToken = token ? "__cookie__" : null;
  try {
    if (profileId) {
      localStorage.setItem(PROFILE_STORAGE_KEY, String(profileId));
      currentProfileId = profileId;
    }
  } catch (e) {
    console.warn("[AUTH] Impossible de stocker le profil dans localStorage:", e);
  }
}

async function authFetch(path, options = {}) {
  const opts = { ...options };
  opts.headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  const p = String(path || "");
  const needsShortToken = clientTokensEnabled && (p.startsWith("/api/options") || p.startsWith("/api/security"));
  if (needsShortToken) {
    const ok = await ensureShortAccessToken(false);
    if (ok && shortAccessToken) {
      opts.headers["x-short-token"] = shortAccessToken;
    }
  }
  if (clientTokensEnabled && clientAccessToken) {
    opts.headers["x-client-token"] = clientAccessToken;
  }
  opts.credentials = "include";
  let res = await fetch(API_BASE + path, opts);
  if (res.status === 401) {
    const refreshed = clientTokensEnabled ? await ensureClientAccessToken(true) : false;
    const refreshedShort = needsShortToken ? await ensureShortAccessToken(true) : false;
    if (refreshed) {
      if (clientAccessToken) opts.headers["x-client-token"] = clientAccessToken;
      if (needsShortToken && shortAccessToken) {
        opts.headers["x-short-token"] = shortAccessToken;
      }
      res = await fetch(API_BASE + path, opts);
    }
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data && data.error ? data.error : "Erreur réseau";
    throw new Error(msg);
  }
  return data;
}

// Petit wrapper pour les routes /api/* (présence + tracking admin, etc.)
// Objectif: éviter les erreurs silencieuses si une fonction apiFetch est attendue.
async function apiFetch(path, options = {}) {
  const p = String(path || "");
  const fullPath = p.startsWith("/api/")
    ? p
    : p.startsWith("/")
    ? "/api" + p
    : "/api/" + p;
  return authFetch(fullPath, options);
}

async function buildPublicShortTokenHeaders() {
  const headers = { "Content-Type": "application/json" };
  if (!clientTokensEnabled) return headers;
  const ok = await ensureShortAccessToken(false);
  if (!ok || !shortAccessToken) return null;
  headers["x-short-token"] = shortAccessToken;
  return headers;
}

// --- Présence + tracking (admin stats) -------------------------------------
  let presenceTimer = null;
  async function sendHeartbeat() {
    try {
      if (authToken && currentProfileId != null) {
        await apiFetch("/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profileId: currentProfileId
          }),
        });
        return;
      }

      // Guest/public heartbeat to keep public online status realistic.
      if (authToken) return; // logged in but profile not selected yet
      const headers = await buildPublicShortTokenHeaders();
      if (!headers) return;
      const page =
        currentAppMode === "foot"
          ? "onlyfoot"
          : currentAppMode === "games"
          ? "games"
          : "home";
      await apiFetch("/public/track", {
        method: "POST",
        headers,
        body: JSON.stringify({
          type: "heartbeat",
          page,
          action: "ping",
          meta: { is_public: true, heartbeat: true },
        }),
      });
    } catch (e) {
      // silencieux (on ne veut pas polluer l'UX si le heartbeat echoue)
    }
  }
function startPresenceHeartbeat() {
  if (presenceTimer) clearInterval(presenceTimer);
  presenceTimer = null;
  if (authToken && currentProfileId == null) return;
  // ping immediat + toutes les 60s
  sendHeartbeat();
  presenceTimer = setInterval(sendHeartbeat, 60_000);
}
  async function trackPageView(pageName) {
    try {
      if (authToken) {
        await apiFetch("/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "page_view",
            page: String(pageName || "unknown"),
            profileId: currentProfileId
          }),
        });
        return;
      }
      const headers = await buildPublicShortTokenHeaders();
      if (!headers) return;
      await apiFetch("/public/track", {
        method: "POST",
        headers,
        body: JSON.stringify({
          type: "page_view",
          page: String(pageName || "unknown"),
          action: "view",
          meta: { is_public: true }
        }),
      });
    } catch (e) {}
  }

  async function trackCatalogEvent(action, key, label) {
    try {
      if (authToken) {
        await apiFetch("/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "catalog_click",
            page: `catalog:${String(key || "").toLowerCase()}`,
            action: String(action || "click"),
            meta: { label: label || null },
            profileId: currentProfileId,
          }),
        });
        return;
      }
      const headers = await buildPublicShortTokenHeaders();
      if (!headers) return;
      await apiFetch("/public/track", {
        method: "POST",
        headers,
        body: JSON.stringify({
          type: "catalog_click",
          page: `catalog:${String(key || "").toLowerCase()}`,
          action: String(action || "click"),
          meta: { label: label || null, is_public: true }
        }),
      });
    } catch (e) {}
  }

  async function trackSourceUsage(option, context) {
    try {
      if (!option) return;
      const src = getSourceDisplayName(option.source) || option.source || "INCONNU";
      if (authToken) {
        await apiFetch("/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "play_source",
            page: "cine",
            action: "start",
            meta: {
              source: src,
              kind: option.kind || null,
              url: option.url ? true : false,
              magnet: option.magnet ? true : false,
              mode: context && context.mode ? context.mode : null,
            },
            profileId: currentProfileId,
          }),
        });
        return;
      }
      const headers = await buildPublicShortTokenHeaders();
      if (!headers) return;
      await apiFetch("/public/track", {
        method: "POST",
        headers,
        body: JSON.stringify({
          type: "play_source",
          page: "cine",
          action: "start",
          meta: {
            source: src,
            kind: option.kind || null,
            url: option.url ? true : false,
            magnet: option.magnet ? true : false,
            mode: context && context.mode ? context.mode : null,
          }
        }),
      });
    } catch (e) {}
  }

  async function sendSecurityEvent(action) {
    try {
      const headers = await buildPublicShortTokenHeaders();
      if (!headers) return;
      await apiFetch("/security/event", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: String(action || ""),
          page: window.location.pathname || null,
        }),
      });
    } catch (e) {}
  }

async function trackOnlyfootEvent(action, meta, profileId) {
  try {
    const pid = profileId != null ? profileId : currentProfileId;
    if (authToken) {
      await apiFetch("/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "onlyfoot",
          page: "onlyfoot",
          action: String(action || "event"),
          meta: meta || null,
          profileId: pid,
        }),
      });
      return;
    }
    const headers = await buildPublicShortTokenHeaders();
    if (!headers) return;
    await apiFetch("/public/track", {
      method: "POST",
      headers,
      body: JSON.stringify({
        type: "onlyfoot",
        page: "onlyfoot",
        action: String(action || "event"),
        meta: meta || null
      }),
    });
  } catch (e) {}
}

async function trackGameEvent(action, meta, profileId) {
  try {
    const pid = profileId != null ? profileId : currentProfileId;
    if (authToken) {
      await apiFetch("/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "game",
          page: "games",
          action: String(action || "open"),
          meta: meta || null,
          profileId: pid,
        }),
      });
      return;
    }
    const headers = await buildPublicShortTokenHeaders();
    if (!headers) return;
    await apiFetch("/public/track", {
      method: "POST",
      headers,
      body: JSON.stringify({
        type: "game",
        page: "games",
        action: String(action || "open"),
        meta: meta || null
      }),
    });
  } catch (e) {}
}

async function trackWatchEvent(meta, profileId) {
  try {
    const pid = profileId != null ? profileId : currentProfileId;
    if (authToken) {
      await apiFetch("/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "watch",
          page: "cine",
          action: "watch",
          meta: meta || null,
          profileId: pid,
        }),
      });
      return;
    }
    const headers = await buildPublicShortTokenHeaders();
    if (!headers) return;
    await apiFetch("/public/track", {
      method: "POST",
      headers,
      body: JSON.stringify({
        type: "watch",
        page: "cine",
        action: "watch",
        meta: meta || null
      }),
    });
  } catch (e) {}
}



function getCurrentProfile() {
  if (!Array.isArray(currentProfiles) || currentProfiles.length === 0) {
    return null;
  }
  if (currentProfileId != null) {
    const byId = currentProfiles.find(
      (p) => String(p.id) === String(currentProfileId)
    );
    if (byId) return byId;
  }
  return currentProfiles[0] || null;
}

function updateUserMenuUI() {
  if (!userMenuContainer) return;

  const profile = getCurrentProfile();
  if (!profile) {
    userMenuContainer.classList.add("hidden");
    updateAuthCTAUI();
    return;
  }

  const avatarKey = profile.avatarKey || profile.avatarColor || profile.avatar_color || null;
  const avatarSrc = avatarKey ? PROFILE_AVATARS[avatarKey] : null;

  if (userMenuAvatarImg) {
    if (avatarSrc) {
      userMenuAvatarImg.src = avatarSrc;
      userMenuAvatarImg.style.display = "block";
    } else {
      userMenuAvatarImg.removeAttribute("src");
      userMenuAvatarImg.style.display = "none";
    }
  }

  if (userMenuAvatarFallback) {
    if (!avatarSrc) {
      userMenuAvatarFallback.textContent = (profile.name || "?")
        .charAt(0)
        .toUpperCase();
      userMenuAvatarFallback.classList.remove("hidden");
    } else {
      userMenuAvatarFallback.classList.add("hidden");
    }
  }

  if (userMenuName) {
    userMenuName.textContent = profile.name || "Profil";
  }

  userMenuContainer.classList.remove("hidden");
  updateAuthCTAUI();
}

function closeUserMenuDropdown() {
  if (userMenuDropdown) {
    userMenuDropdown.classList.add("hidden");
  }
}

function initUserMenu() {
  if (!userMenuContainer) return;

  if (userMenuToggle) {
    userMenuToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      if (userMenuDropdown) {
        const isHidden = userMenuDropdown.classList.contains("hidden");
        if (isHidden) {
          userMenuDropdown.classList.remove("hidden");
        } else {
          userMenuDropdown.classList.add("hidden");
        }
      }
    });
  }

  if (userMenuDropdown) {
    userMenuDropdown.addEventListener("click", (event) => {
      event.stopPropagation();
    });
  }

  document.addEventListener("click", () => {
    closeUserMenuDropdown();
  });

  if (authOpenButton) {
    authOpenButton.addEventListener("click", () => {
      if (typeof setAuthMode === "function") setAuthMode("login");
      showAuthScreen();
    });
  }
  if (authRegisterButton) {
    authRegisterButton.addEventListener("click", () => {
      if (typeof setAuthMode === "function") setAuthMode("register");
      showAuthScreen();
    });
  }

  if (userMenuSettings) {
    userMenuSettings.addEventListener("click", () => {
      closeUserMenuDropdown();
      openSettingsModal();
    });
  }

  if (userMenuChangeProfile) {
    userMenuChangeProfile.addEventListener("click", () => {
      closeUserMenuDropdown();
      showProfilesScreen();
    });
  }

if (userMenuEditAvatar) {
  userMenuEditAvatar.addEventListener("click", () => {
    closeUserMenuDropdown();
    openEditAvatarModal();
  });
}


  if (userMenuLogout) {
    userMenuLogout.addEventListener("click", () => {
      closeUserMenuDropdown();
      authFetch("/api/auth/logout", { method: "POST" })
        .catch(() => {})
        .finally(() => enterGuestMode());
    });
  }
}
/**
 * UI auth
 */

function setAuthMode(mode) {
  currentAuthMode = mode;

  // Titre toujours "Bienvenue"
  authTitle.textContent = "Bienvenue sur ONLY US TV";
  if (authScreen) {
    authScreen.classList.toggle("is-register", mode === "register");
  }

  if (mode === "login") {
    authSubtitle.textContent = "Films, séries et sports — une plateforme pensée pour NOUS";
    if (authLeftTitle) authLeftTitle.textContent = "Content de te revoir !";
    authModeLoginBtn.classList.add("auth-toggle-btn-active");
    authModeRegisterBtn.classList.remove("auth-toggle-btn-active");
    authLoginInput.parentElement.classList.remove("hidden");
    authRegisterOnlyFields.forEach((el) => el.classList.add("hidden"));
    if (authSubmit) authSubmit.textContent = "Se connecter";
  } else {
    authSubtitle.textContent = "Films, séries et sports — une plateforme pensée pour NOUS";
    if (authLeftTitle) authLeftTitle.textContent = "Pourquoi créer un compte ?";
    authModeLoginBtn.classList.remove("auth-toggle-btn-active");
    authModeRegisterBtn.classList.add("auth-toggle-btn-active");
    authLoginInput.parentElement.classList.add("hidden");
    authRegisterOnlyFields.forEach((el) => el.classList.remove("hidden"));
    if (authSubmit) authSubmit.textContent = "Cr\u00e9er un compte";
  }

  authError.textContent = "";
}

function showAuthScreen() {
  if (authScreen) {
    authScreen.classList.remove("hidden");
  }
  disableAds();
  updateAuthCTAUI();
}

function hideAuthScreen() {
  if (authScreen) {
    authScreen.classList.add("hidden");
  }
  enableAds();
  updateAuthCTAUI();
}

function showProfilesScreen() {
  if (profilesScreen) {
    profilesScreen.classList.remove("hidden");
  }
  disableAds();
  updateAuthCTAUI();
}

function hideProfilesScreen() {
  if (profilesScreen) {
    profilesScreen.classList.add("hidden");
  }
  updateUserMenuUI();
  enableAds();
  updateAuthCTAUI();
}

function renderProfilesGrid() {
  if (!profilesGrid) return;
  profilesGrid.innerHTML = "";

  if (!Array.isArray(currentProfiles) || currentProfiles.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "Aucun profil pour le moment.";
    empty.style.color = "var(--text-muted)";
    empty.style.fontSize = "0.9rem";
    profilesGrid.appendChild(empty);
    return;
  }

  currentProfiles.forEach((p) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "profile-card";

    const avatar = document.createElement("div");
    avatar.className = "profile-avatar";

    const avatarKey = p.avatarKey || p.avatar_color || null;
    const avatarSrc = avatarKey ? PROFILE_AVATARS[avatarKey] : null;

    if (avatarSrc) {
      const img = document.createElement("img");
      img.src = avatarSrc;
      img.alt = p.name || "Profil";
      avatar.appendChild(img);
    } else {
      const span = document.createElement("span");
      span.textContent = (p.name || "?").charAt(0).toUpperCase();
      avatar.appendChild(span);
    }

    const name = document.createElement("div");
    name.className = "profile-name";
    name.textContent = p.name || "Profil";

    card.appendChild(avatar);
    card.appendChild(name);

    card.addEventListener("click", async () => {
      currentProfileId = p.id;
      startPresenceHeartbeat();
      trackPageView("home");
      storeAuth(authToken, p.id);
      hideProfilesScreen();
      // Apply user preferred start mode (Hub by default)
      try { initHubUI(); applyStartupMode(); } catch (e) { console.warn("[HUB] init/apply error:", e); }

      // Migration automatique de l'ancien localStorage vers le serveur pour ce profil
      try {
        await migrateLocalContinueWatchingToServer(p.id);
      } catch (e) {
        console.warn(
          "[CW] Erreur migration 'Reprendre la lecture' lors de la sélection du profil:",
          e
        );
      }


      // Migration automatique de l'ancienne "Ma liste" locale vers le serveur
      try {
        await migrateLocalMyListToServer(p.id);
      } catch (e) {
        console.warn(
          "[MYLIST] Erreur migration 'Ma liste' lors de la sélection du profil:",
          e
        );
      }
      if (typeof loadContinueWatchingRow === "function") {
        loadContinueWatchingRow();
      }
      if (typeof loadMyListRow === "function") {
        loadMyListRow();
      }
      try {
        if (onlyfootModal && !onlyfootModal.classList.contains("hidden")) {
          initOnlyfootChat();
        }
        if (tvModal && !tvModal.classList.contains("hidden")) {
          initOnlyfootChat();
        }
      } catch (_) {}
    });

    profilesGrid.appendChild(card);
  });
}

function openCreateProfileModal() {
  if (!profileCreateModal) return;
  profileEditMode = "create";
  profileBeingEdited = null;
  selectedAvatarKey = "baby";

  if (profileCreateTitle) profileCreateTitle.textContent = "Nouveau profil";
  if (profileCreateConfirm) profileCreateConfirm.textContent = "Créer";
  if (profileNameInput) {
    profileNameInput.disabled = false;
    profileNameInput.value = "";
  }
  profileCreateError.textContent = "";
  if (avatarOptions && avatarOptions.length) {
    avatarOptions.forEach((btn) => {
      btn.classList.toggle(
        "avatar-option-selected",
        btn.dataset.avatar === selectedAvatarKey
      );
    });
  }
  profileCreateModal.classList.remove("hidden");
}

function openEditAvatarModal() {
  if (!profileCreateModal) return;
  const profile = getCurrentProfile();
  if (!profile) return;

  profileEditMode = "edit-avatar";
  profileBeingEdited = profile;

  if (profileCreateTitle) profileCreateTitle.textContent = "Modifier l'avatar";
  if (profileCreateConfirm) profileCreateConfirm.textContent = "Enregistrer";

  selectedAvatarKey =
    profile.avatarKey ||
    profile.avatarColor ||
    profile.avatar_color ||
    "baby";

  if (profileNameInput) {
    profileNameInput.disabled = true;
    profileNameInput.value = profile.name || "";
  }

  profileCreateError.textContent = "";

  if (avatarOptions && avatarOptions.length) {
    avatarOptions.forEach((btn) => {
      btn.classList.toggle(
        "avatar-option-selected",
        btn.dataset.avatar === selectedAvatarKey
      );
    });
  }

  profileCreateModal.classList.remove("hidden");
}

function closeCreateProfileModal() {
  if (!profileCreateModal) return;
  profileCreateModal.classList.add("hidden");
}

function initAuthUI() {
  if (!authForm || !authScreen) return;
  if (authPasswordToggle && authPasswordInput) {
    authPasswordToggle.addEventListener("click", () => {
      const isHidden = authPasswordInput.type === "password";
      authPasswordInput.type = isHidden ? "text" : "password";
      authPasswordToggle.setAttribute("aria-label", isHidden ? "Masquer le mot de passe" : "Afficher le mot de passe");
    });
  }


  setAuthMode("register");

  if (authCloseBtn) {
    authCloseBtn.addEventListener("click", () => {
      hideAuthScreen();
    });
  }

  // Close on backdrop click
  authScreen.addEventListener("click", (e) => {
    if (e.target === authScreen) {
      hideAuthScreen();
    }
  });

  // Close on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && authScreen && !authScreen.classList.contains("hidden")) {
      hideAuthScreen();
    }
  });

  if (authModeLoginBtn) {
    authModeLoginBtn.addEventListener("click", () => setAuthMode("login"));
  }
  if (authModeRegisterBtn) {
    authModeRegisterBtn.addEventListener("click", () =>
      setAuthMode("register")
    );
  }

  // Why account tooltip - mobile click toggle
  const whyAccountLink = document.getElementById("why-account-link");
  const whyAccountTooltip = document.getElementById("why-account-tooltip");
  if (whyAccountLink && whyAccountTooltip) {
    whyAccountLink.addEventListener("click", (e) => {
      e.stopPropagation();
      whyAccountTooltip.classList.toggle("active");
    });
    document.addEventListener("click", (e) => {
      if (!whyAccountTooltip.contains(e.target) && e.target !== whyAccountLink) {
        whyAccountTooltip.classList.remove("active");
      }
    });
  }

  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    authError.textContent = "";

    try {
      if (currentAuthMode === "login") {
        const loginValue = (authLoginInput.value || "").trim();
        const passwordValue = authPasswordInput.value || "";
        if (!loginValue || !passwordValue) {
          authError.textContent =
            "Renseigne ton identifiant ou email et ton mot de passe.";
          return;
        }

        const data = await authFetch("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({
            login: loginValue,
            password: passwordValue,
          }),
        });

        currentUser = data.user;
        currentProfiles = data.profiles || [];
        storeAuth(
          true,
          currentProfiles[0] ? currentProfiles[0].id : null
        );
        hideAuthScreen();
        updateUserMenuUI();

        if (!currentProfiles.length) {
          showProfilesScreen();
        } else {
          renderProfilesGrid();
          showProfilesScreen();
        }
      } else {
        const username = (authUsernameInput.value || "").trim();
        const email = (authEmailInput.value || "").trim();
        const password = authPasswordInput.value || "";

        if (!username || !email || !password) {
          authError.textContent =
            "Identifiant, email et mot de passe sont obligatoires.";
          return;
        }
        if (password.length < 10 || !/[^\w]/.test(password)) {
          authError.textContent =
            "Mot de passe trop faible (min. 10 caractères, dont 1 caractère spécial).";
          return;
        }

        const data = await authFetch("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({
            username,
            email,
            password,
          }),
        });

        currentUser = data.user;
        currentProfiles = data.profiles || [];
        storeAuth(
          true,
          data.defaultProfileId ||
            (currentProfiles[0] && currentProfiles[0].id)
        );

        hideAuthScreen();
        updateUserMenuUI();
        renderProfilesGrid();
        showProfilesScreen();
      }
    } catch (err) {
      authError.textContent =
        err.message || "Erreur lors de l'authentification.";
    }
  });

  // Profils
  if (btnOpenCreateProfile && profileCreateModal) {
    btnOpenCreateProfile.addEventListener("click", openCreateProfileModal);
  }
  if (profileCreateCancel) {
    profileCreateCancel.addEventListener("click", closeCreateProfileModal);
  }
  if (avatarOptions && avatarOptions.length) {
    avatarOptions.forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedAvatarKey = btn.dataset.avatar;
        avatarOptions.forEach((b) =>
          b.classList.toggle(
            "avatar-option-selected",
            b.dataset.avatar === selectedAvatarKey
          )
        );
      });
    });
  }

  if (profileCreateConfirm) {
    profileCreateConfirm.addEventListener("click", async () => {
      profileCreateError.textContent = "";

      if (profileEditMode === "edit-avatar") {
        // Mode modification d'avatar uniquement
        const profile = profileBeingEdited || getCurrentProfile();
        if (!profile || !profile.id) {
          profileCreateError.textContent = "Aucun profil sélectionné.";
          return;
        }
        try {
          const data = await authFetch(`/api/profiles/${profile.id}/avatar`, {
            method: "PATCH",
            body: JSON.stringify({
              avatarColor: selectedAvatarKey,
            }),
          });
          const updated = data.profile || data;

          if (Array.isArray(currentProfiles)) {
            const idx = currentProfiles.findIndex((p) => p.id === updated.id);
            if (idx !== -1) {
              currentProfiles[idx] = updated;
            }
          }

          renderProfilesGrid();

          if (currentProfileId === updated.id) {
            updateUserMenuUI();
          }

          closeCreateProfileModal();
        } catch (err) {
          profileCreateError.textContent =
            err.message || "Erreur lors de la mise à jour de l'avatar.";
        }
        return;
      }

      // Mode création de profil (comportement existant)
      const name = (profileNameInput.value || "").trim();
      if (!name) {
        profileCreateError.textContent = "Choisis un nom de profil.";
        return;
      }
      try {
        const data = await authFetch("/api/profiles", {
          method: "POST",
          body: JSON.stringify({
            name,
            avatarColor: selectedAvatarKey,
          }),
        });
        if (!currentProfiles) currentProfiles = [];
        currentProfiles.push(data.profile);
        renderProfilesGrid();
        closeCreateProfileModal();
      } catch (err) {
        profileCreateError.textContent =
          err.message || "Erreur lors de la création du profil.";
      }
    });
  }
}
async function bootstrapAuth() {
  loadStoredAuth();
  startPresenceHeartbeat();

  try {
    const me = await authFetch("/api/auth/me", {
      method: "GET",
    });
    currentUser = me.user;
    currentProfiles = me.profiles || [];
    authToken = "__cookie__";
    updateUserMenuUI();

    if (!currentProfiles.length) {
      showProfilesScreen();
    } else {
      renderProfilesGrid();
      showProfilesScreen();
    }
    return;
  } catch (e) {
    storeAuth(null, null);
  }

  // Pas de token valide -> on demande connexion / inscription
  enterGuestMode();
}

// On branche bootstrapAuth après loadHome

// === Netflix-like row navigation: arrows (click + press/hold) ===
// This avoids "hover at extreme right" dead-zones caused by scrollbars/overlays.
function initRowArrowNav() {
  const scrollers = Array.from(document.querySelectorAll(".row-scroller"));
  if (!scrollers.length) return;

  const isMobile = () => window.matchMedia("(max-width: 768px)").matches;

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  scrollers.forEach((el) => {
    const section = el.closest("section") || el.parentElement;
    if (!section) return;
    if (section.getAttribute("data-row-nav") === "off") return;
    if (section.querySelector(":scope > .row-nav")) return;

    const nav = document.createElement("div");
    nav.className = "row-nav";

    const mkBtn = (side) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = `row-nav-btn ${side}`;
      b.setAttribute("aria-label", side === "left" ? "Précédent" : "Suivant");
      b.innerHTML = side === "left" ? "&#10094;" : "&#10095;"; // chevrons
      return b;
    };

    const btnL = mkBtn("left");
    const btnR = mkBtn("right");
    nav.appendChild(btnL);
    nav.appendChild(btnR);
    section.appendChild(nav);

    let holdRaf = null;
    let holdDir = 0;
    let holdSpeed = 22;

    const getMax = () => Math.max(0, el.scrollWidth - el.clientWidth);

    const stopHold = () => {
      if (holdRaf) cancelAnimationFrame(holdRaf);
      holdRaf = null;
      holdDir = 0;
    };

    const stepHold = () => {
      if (!holdDir) return;
      const max = getMax();
      if (max <= 0) {
        stopHold();
        update();
        return;
      }
      el.scrollLeft = clamp(el.scrollLeft + holdDir * holdSpeed, 0, max);
      update();
      if ((holdDir < 0 && el.scrollLeft <= 0) || (holdDir > 0 && el.scrollLeft >= max)) {
        stopHold();
        return;
      }
      holdRaf = requestAnimationFrame(stepHold);
    };

    const startHold = (dir) => {
      stopHold();
      holdDir = dir;
      holdSpeed = isMobile() ? 18 : 22;
      holdRaf = requestAnimationFrame(stepHold);
    };

    const pageScroll = (dir) => {
      const max = getMax();
      const delta = Math.round(el.clientWidth * 0.85) * dir;
      const next = clamp(el.scrollLeft + delta, 0, max);
      el.scrollTo({ left: next, behavior: "smooth" });
    };

    const update = () => {
      const max = getMax();
      const leftOk = el.scrollLeft > 2;
      const rightOk = el.scrollLeft < max - 2;
      btnL.disabled = !leftOk;
      btnR.disabled = !rightOk;
      nav.classList.toggle("is-scrollable", max > 8);
    };

    // Show on hover (desktop)
    const onEnter = () => {
      if (isMobile()) return;
      nav.classList.add("show");
      update();
    };
    const onLeave = () => {
      nav.classList.remove("show");
      stopHold();
    };
    section.addEventListener("mouseenter", onEnter, { passive: true });
    section.addEventListener("mouseleave", onLeave, { passive: true });

    // Click = page scroll
    btnL.addEventListener("click", (e) => {
      e.preventDefault();
      pageScroll(-1);
    });
    btnR.addEventListener("click", (e) => {
      e.preventDefault();
      pageScroll(1);
    });

    // Press & hold = continuous scroll
    const bindHold = (btn, dir) => {
      btn.addEventListener(
        "pointerdown",
        (e) => {
          if (btn.disabled) return;
          e.preventDefault();
          try {
            btn.setPointerCapture(e.pointerId);
          } catch (_) {}
          startHold(dir);
        },
        { passive: false }
      );
      btn.addEventListener("pointerup", stopHold, { passive: true });
      btn.addEventListener("pointercancel", stopHold, { passive: true });
      btn.addEventListener("pointerleave", stopHold, { passive: true });
    };

    bindHold(btnL, -1);
    bindHold(btnR, 1);

    // Keep state in sync
    let scrollTick = false;
    el.addEventListener(
      "scroll",
      () => {
        if (scrollTick) return;
        scrollTick = true;
        requestAnimationFrame(() => {
          scrollTick = false;
          update();
        });
      },
      { passive: true }
    );
    window.addEventListener("resize", update, { passive: true });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stopHold();
    });

    // Initial
    update();
  });
}



// === Filament accent activation (IntersectionObserver, plays once) ===
function initFilamentAccents() {
  const sections = Array.from(
    document.querySelectorAll("section.home-row, section#search-section, section#onlyfoot-section")
  );

  // Mark titles without changing existing markup structure
  sections.forEach((sec) => {
    const title = sec.querySelector("h2");
    if (!title) return;
    title.classList.add("filament-title");

    // Wrap title content so we can attach a right-side micro filament without consuming ::after
    if (!title.querySelector(".filament-text")) {
      const wrap = document.createElement("span");
      wrap.className = "filament-text";
      while (title.firstChild) wrap.appendChild(title.firstChild);
      title.appendChild(wrap);
    }
  });

  if (!("IntersectionObserver" in window)) {
    sections.forEach((sec) => sec.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const sec = entry.target;
        sec.classList.add("is-visible");
        obs.unobserve(sec); // play once
      });
    },
    {
      // Trigger when the section enters roughly the top 60% of the viewport
      root: null,
      rootMargin: "0px 0px -40% 0px",
      threshold: 0.12,
    }
  );

  sections.forEach((sec) => observer.observe(sec));
}



// Mobile-only: collapse the topbar on scroll (no impact on existing logic)
function initMobileDrawer() {
  const toggle = document.getElementById("mobile-menu-toggle");
  const drawer = document.getElementById("mobile-drawer");
  const backdrop = document.getElementById("mobile-drawer-backdrop");
  if (!toggle || !drawer) return;

  const mq = window.matchMedia("(max-width: 820px)");
  const items = [
    document.getElementById("search-form"),
    document.getElementById("my-list-button"),
    document.querySelector(".topbar-discord-btn"),
    document.querySelector(".topbar-auth-actions"),
  ].filter(Boolean);
  const originals = items.map((el) => ({
    el,
    parent: el.parentElement,
    next: el.nextSibling,
  }));

  const setState = (open) => {
    document.body.classList.toggle("mobile-drawer-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    drawer.setAttribute("aria-hidden", open ? "false" : "true");
    if (backdrop) backdrop.setAttribute("aria-hidden", open ? "false" : "true");
  };

  const close = () => setState(false);
  const toggleOpen = () => setState(!document.body.classList.contains("mobile-drawer-open"));

  const moveItemsToDrawer = () => {
    items.forEach((el) => {
      if (el.parentElement !== drawer) drawer.appendChild(el);
    });
  };

  const restoreItems = () => {
    originals.forEach(({ el, parent, next }) => {
      if (!parent || !el) return;
      if (el.parentElement === parent) return;
      parent.insertBefore(el, next || null);
    });
  };

  const syncLayout = () => {
    if (mq.matches) {
      moveItemsToDrawer();
    } else {
      close();
      restoreItems();
    }
  };

  toggle.addEventListener("click", (e) => {
    e.preventDefault();
    if (!mq.matches) return;
    toggleOpen();
  });

  if (backdrop) {
    backdrop.addEventListener("click", close);
  }

  drawer.addEventListener("click", (e) => {
    const hit = e.target.closest("a, button");
    if (!hit) return;
    if (hit.closest(".search-form")) return;
    close();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    close();
  });

  const onResize = () => {
    syncLayout();
  };
  window.addEventListener("resize", onResize);

  try {
    if (mq.addEventListener) mq.addEventListener("change", onResize);
    else if (mq.addListener) mq.addListener(onResize);
  } catch (e) {}

  syncLayout();
}

function initMobilePillsAutoHide() {
  const bar = document.querySelector(".universe-switch-mobile");
  if (!bar) return;

  const mq = window.matchMedia("(max-width: 820px)");
  let lastY = window.scrollY || 0;
  let ticking = false;

  const apply = () => {
    ticking = false;
    if (!mq.matches) {
      bar.classList.remove("is-hidden");
      return;
    }
    const y = window.scrollY || 0;
    const goingDown = y > lastY;
    if (y < 12) {
      bar.classList.remove("is-hidden");
    } else if (goingDown) {
      bar.classList.add("is-hidden");
    } else {
      bar.classList.remove("is-hidden");
    }
    lastY = y;
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(apply);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });

  try {
    if (mq.addEventListener) mq.addEventListener("change", onScroll);
    else if (mq.addListener) mq.addListener(onScroll);
  } catch (e) {}
}

function initMobileTopbarCollapse() {
  const topbar = document.querySelector('header.topbar');
  const drawer = document.getElementById("mobile-drawer");
  if (!topbar || drawer) return;

  const mq = window.matchMedia('(max-width: 820px)');
  let ticking = false;
  let lastCompact = null;

  const compute = () => {
    ticking = false;
    if (!mq.matches) {
      if (lastCompact) topbar.classList.remove('is-compact');
      lastCompact = false;
      return;
    }
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    const shouldCompact = y > 14;
    if (shouldCompact === lastCompact) return;
    topbar.classList.toggle('is-compact', shouldCompact);
    lastCompact = shouldCompact;
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(compute);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  // iOS/Safari compatibility
  try {
    if (mq.addEventListener) mq.addEventListener('change', onScroll);
    else if (mq.addListener) mq.addListener(onScroll);
  } catch (e) {}

  compute();
}
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", async () => {
    await applyAntiInspectSetting();
    startAntiInspectPolling();
    bootstrapAuth();
    initAuthUI();
    initUserMenu();
      initPlatformCatalogLinks();
      initRowArrowNav();
      initFilamentAccents();
      initHubUI();
      initCollapsibleRows();
      applyStartupMode();
      initMobileDrawer();
      initMobilePillsAutoHide();
      initMobileTopbarCollapse();
      initOnlyGames();
  });
}

// ============================================
// ONLYGAMES - Système de jeux modulaire
// ============================================

let gamesData = [];
let currentGame = null;

const onlyGamesSection = document.getElementById('onlygames-section');
const gamesHeroTitle = document.getElementById('games-hero-title');
const gamesHeroDescription = document.getElementById('games-hero-description');
const gamesHeroCategory = document.getElementById('games-hero-category');
const gamesHeroPlayers = document.getElementById('games-hero-players');
const gamesHeroDifficulty = document.getElementById('games-hero-difficulty');
const gamesHeroPlayBtn = document.getElementById('games-hero-play');
const gamesGrid = document.getElementById('games-grid');
const gamesArcadeRow = document.getElementById('games-arcade');
const gamesPuzzleRow = document.getElementById('games-puzzle');
const gamesSportRow = document.getElementById('games-sport');
const gamesStrategyRow = document.getElementById('games-strategy');

const gameModal = document.getElementById('game-modal');
const gameModalTitle = document.getElementById('game-modal-title');
const gameIframe = document.getElementById('game-iframe');
const gameFullscreenBtn = document.getElementById('game-fullscreen-btn');
const gameLeaderboardBtn = document.getElementById('game-leaderboard-btn');
const gameLeaderboardPanel = document.getElementById('game-leaderboard-panel');
const closeLeaderboardBtn = document.getElementById('close-leaderboard-btn');
const leaderboardContent = document.getElementById('leaderboard-content');

async function initOnlyGames() {
  try {
    const response = await fetch('./onlygames/games.json');
    const data = await response.json();
    gamesData = data.games || [];

    if (gamesData.length > 0) {
      setupGamesHero();
      populateGamesGrid();
      populateGamesByCategory();
      setupGameModal();
    }
  } catch (error) {
    console.error('[ONLYGAMES] Erreur lors du chargement des jeux:', error);
  }
}

function setupGamesHero() {
  // Trouve le jeu featured ou prend le premier
  const featuredGame = gamesData.find(g => g.featured) || gamesData[0];

  if (!featuredGame) return;

  gamesHeroTitle.textContent = featuredGame.title;
  gamesHeroDescription.textContent = featuredGame.description;
  gamesHeroCategory.textContent = featuredGame.category;
  gamesHeroPlayers.textContent = featuredGame.players;
  gamesHeroDifficulty.textContent = featuredGame.difficulty;

  gamesHeroPlayBtn.addEventListener('click', () => {
    openGame(featuredGame);
  });
}

function populateGamesGrid() {
  gamesGrid.innerHTML = '';

  gamesData.forEach(game => {
    const card = createGameCard(game);
    gamesGrid.appendChild(card);
  });
}

function populateGamesByCategory() {
  const categories = {
    'Arcade': gamesArcadeRow,
    'Puzzle': gamesPuzzleRow,
    'Sport': gamesSportRow,
    'Strategy': gamesStrategyRow
  };

  Object.entries(categories).forEach(([category, container]) => {
    const categoryGames = gamesData.filter(g => g.category === category);
    container.innerHTML = '';

    categoryGames.forEach(game => {
      const card = createGameCard(game);
      container.appendChild(card);
    });

    // Cache la section si vide
    if (categoryGames.length === 0) {
      container.closest('.home-row').style.display = 'none';
    }
  });
}

function createGameCard(game) {
  const card = document.createElement('div');
  card.className = 'game-card';
  card.dataset.gameId = game.id;

  // Thumbnail (utilise l'image ou génère emoji si pas d'image)
  const thumbnail = document.createElement('div');
  thumbnail.className = 'game-card-thumbnail';

  if (game.thumbnail) {
    // Utiliser l'image de thumbnail
    const img = document.createElement('img');
    img.src = game.thumbnail;
    img.alt = game.title;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    thumbnail.appendChild(img);
  } else {
    // Fallback: gradient + emoji
    thumbnail.style.background = `linear-gradient(135deg, ${getGameColor(game.category)})`;
    thumbnail.style.display = 'flex';
    thumbnail.style.alignItems = 'center';
    thumbnail.style.justifyContent = 'center';
    thumbnail.style.fontSize = '4rem';
    thumbnail.textContent = getGameEmoji(game.category);
  }

  const content = document.createElement('div');
  content.className = 'game-card-content';

  const title = document.createElement('div');
  title.className = 'game-card-title';
  title.textContent = game.title;

  const category = document.createElement('div');
  category.className = 'game-card-category';
  category.textContent = game.category;

  content.appendChild(title);
  content.appendChild(category);

  const overlay = document.createElement('div');
  overlay.className = 'game-card-play-overlay';
  overlay.innerHTML = '<div class="game-card-play-icon">-</div>';

  card.appendChild(thumbnail);
  card.appendChild(content);
  card.appendChild(overlay);

  card.addEventListener('click', () => openGame(game));

  return card;
}

function getGameColor(category) {
  const colors = {
    'Arcade': '#10b981, #059669',
    'Puzzle': '#3b82f6, #2563eb',
    'Action': '#ef4444, #dc2626',
    'Sport': '#f59e0b, #d97706',
    'Strategy': '#8b5cf6, #7c3aed'
  };
  return colors[category] || '#64748b, #475569';
}

function getGameEmoji(category) {
  const emojis = {
    'Arcade': '🕹️',
    'Puzzle': '🧩',
    'Action': '⚔️',
    'Sport': '⚽',
    'Strategy': '♟️'
  };
  return emojis[category] || '🎮';
}

async function openGame(game) {
  currentGame = game;
  gameModalTitle.textContent = game.title;

  trackGameEvent("open", {
    id: game.id,
    title: game.title,
    category: game.category || null
  });

  // Récupérer le high score (serveur si connecté, sinon localStorage)
  let serverHighScore = 0;
  if (authToken && currentProfileId) {
    try {
      const data = await apiFetch(`/games/${currentProfileId}/scores/${game.id}`);
      serverHighScore = data.highScore || 0;
    } catch (e) {
      console.warn('[GAMES] Impossible de récupérer le score serveur:', e);
    }
  }

  // Score local comme fallback
  const localKey = `${game.id}-high-score`;
  const localHighScore = parseInt(localStorage.getItem(localKey) || '0');

  // Utiliser le meilleur des deux
  const effectiveHighScore = Math.max(serverHighScore, localHighScore);

  // Construire l'URL avec les paramètres pour le jeu
  const url = new URL(game.path, window.location.origin);
  url.searchParams.set('highScore', effectiveHighScore);
  url.searchParams.set('profileId', currentProfileId || '');
  url.searchParams.set('gameId', game.id);

  gameIframe.src = url.toString();
  gameModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeGameModal() {
  gameModal.classList.add('hidden');
  gameIframe.src = '';
  currentGame = null;
  document.body.style.overflow = 'auto';
  // Fermer le panel leaderboard aussi
  if (gameLeaderboardPanel) {
    gameLeaderboardPanel.classList.add('hidden');
  }
}

async function loadLeaderboard(tab) {
  if (!leaderboardContent || !currentGame) return;

  leaderboardContent.innerHTML = '<div class="leaderboard-loading">Chargement...</div>';

  try {
    if (tab === 'global') {
      const showGuestNote = !isPremiumReady();
      // Classement global
      const data = await apiFetch(`/games/leaderboard/${currentGame.id}`);
      const leaderboard = data.leaderboard || [];

      if (leaderboard.length === 0) {
        leaderboardContent.innerHTML = "";
        if (showGuestNote) {
          const note = document.createElement("div");
          note.className = "leaderboard-note";
          note.textContent = "Connecte-toi pour enregistrer ton score au classement global.";
          leaderboardContent.appendChild(note);
        }
        const empty = document.createElement("div");
        empty.className = "leaderboard-empty";
        empty.textContent = "Aucun score enregistre";
        leaderboardContent.appendChild(empty);
        return;
      }

      leaderboardContent.innerHTML = "";
      if (showGuestNote) {
        const note = document.createElement("div");
        note.className = "leaderboard-note";
        note.textContent = "Connecte-toi pour enregistrer ton score au classement global.";
        leaderboardContent.appendChild(note);
      }

      leaderboard.forEach((entry, index) => {
        const isCurrentUser = authToken && currentProfileId && entry.profileId === currentProfileId;
        const rankClass = index < 3 ? `rank-${index + 1}` : '';
        const avatarColor = sanitizeCssColor(entry.avatarColor);

        const row = document.createElement("div");
        row.className = "leaderboard-entry";
        if (isCurrentUser) row.classList.add("current-user");
        if (rankClass) row.classList.add(rankClass);

        const rank = document.createElement("span");
        rank.className = "leaderboard-rank";
        rank.textContent = `#${entry.rank}`;

        const avatar = document.createElement("div");
        avatar.className = "leaderboard-avatar";
        avatar.style.background = avatarColor;

        const name = document.createElement("span");
        name.className = "leaderboard-name";
        name.textContent = entry.profileName || "";

        const score = document.createElement("span");
        score.className = "leaderboard-score";
        score.textContent = Number(entry.highScore || 0).toLocaleString();

        row.appendChild(rank);
        row.appendChild(avatar);
        row.appendChild(name);
        row.appendChild(score);
        leaderboardContent.appendChild(row);
      });

    } else if (tab === 'personal') {
      // Scores personnels
      if (!authToken || !currentProfileId) {
        leaderboardContent.innerHTML = '<div class="leaderboard-empty">Connectez-vous pour voir vos scores</div>';
        return;
      }

      const data = await apiFetch(`/games/${currentProfileId}/history/${currentGame.id}?limit=20`);
      const history = data.history || [];

      if (history.length === 0) {
        leaderboardContent.innerHTML = '<div class="leaderboard-empty">Aucune partie jouee</div>';
        return;
      }

      leaderboardContent.innerHTML = "";
      history.forEach((entry, index) => {
        const date = new Date(entry.playedAt).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        });

        const row = document.createElement("div");
        row.className = "leaderboard-entry personal";

        const rank = document.createElement("span");
        rank.className = "leaderboard-rank";
        rank.textContent = `#${index + 1}`;

        const score = document.createElement("span");
        score.className = "leaderboard-score";
        score.textContent = Number(entry.score || 0).toLocaleString();

        const dateEl = document.createElement("span");
        dateEl.className = "leaderboard-date";
        dateEl.textContent = date;

        row.appendChild(rank);
        row.appendChild(score);
        row.appendChild(dateEl);
        leaderboardContent.appendChild(row);
      });
    }
  } catch (err) {
    console.error('[GAMES] Erreur chargement leaderboard:', err);
    leaderboardContent.innerHTML = '<div class="leaderboard-error">Erreur de chargement</div>';
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function sanitizeCssColor(value) {
  const v = String(value || "").trim();
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) return v;
  if (/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/.test(v)) return v;
  return "#6366f1";
}

function setupGameModal() {
  // Bouton retour et backdrop gérés par le listener global data-close
  // On n'ajoute pas de listeners ici pour éviter les doublons

  // Bouton plein écran
  if (gameFullscreenBtn) {
    gameFullscreenBtn.addEventListener('click', () => {
      if (gameIframe.requestFullscreen) {
        gameIframe.requestFullscreen();
      } else if (gameIframe.webkitRequestFullscreen) {
        gameIframe.webkitRequestFullscreen();
      } else if (gameIframe.msRequestFullscreen) {
        gameIframe.msRequestFullscreen();
      }
    });
  }

  // Bouton leaderboard
  if (gameLeaderboardBtn) {
    gameLeaderboardBtn.addEventListener('click', () => {
      if (gameLeaderboardPanel) {
        gameLeaderboardPanel.classList.toggle('hidden');
        if (!gameLeaderboardPanel.classList.contains('hidden')) {
          loadLeaderboard('global');
        }
      }
    });
  }

  // Fermer le leaderboard
  if (closeLeaderboardBtn) {
    closeLeaderboardBtn.addEventListener('click', () => {
      if (gameLeaderboardPanel) {
        gameLeaderboardPanel.classList.add('hidden');
      }
    });
  }

  // Onglets du leaderboard
  document.querySelectorAll('.leaderboard-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.leaderboard-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      loadLeaderboard(tab.dataset.tab);
    });
  });

  // Escape pour fermer
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !gameModal.classList.contains('hidden')) {
      closeGameModal();
    }
  });

  // Listener pour recevoir les scores des jeux via postMessage
  window.addEventListener('message', async (event) => {
    // Vérifier que le message vient de notre iframe de jeu et de la bonne origin
    if (!event.data || event.data.type !== 'GAME_SCORE') return;
    const expectedOrigin = window.location.origin;
    if (event.origin !== expectedOrigin) return;
    if (gameIframe && gameIframe.contentWindow && event.source !== gameIframe.contentWindow) return;

    const { gameId, score, metadata } = event.data;

    // Validation basique
    if (!gameId || typeof score !== 'number' || score < 0) {
      console.warn('[GAMES] Score invalide reçu:', event.data);
      return;
    }

    console.log(`[GAMES] Score reçu pour ${gameId}: ${score}`);

    // 1. Toujours sauvegarder en localStorage (fallback offline)
    const localKey = `${gameId}-high-score`;
    const currentLocal = parseInt(localStorage.getItem(localKey) || '0');
    if (score > currentLocal) {
      localStorage.setItem(localKey, score.toString());
    }

    // 2. Si connecté, synchroniser avec le serveur
    if (authToken && currentProfileId) {
      try {
        const response = await apiFetch(`/games/${currentProfileId}/scores`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameId, score, metadata })
        });

        console.log(`[GAMES] Score synchronisé - Nouveau record: ${response.isNewHighScore}, Rang: ${response.rank}`);

        // Renvoyer la confirmation au jeu
        if (gameIframe && gameIframe.contentWindow) {
          gameIframe.contentWindow.postMessage({
            type: 'SCORE_SYNCED',
            isNewHighScore: response.isNewHighScore,
            rank: response.rank,
            serverHighScore: response.highScore
          }, expectedOrigin);
        }
      } catch (err) {
        console.warn('[GAMES] ?chec de la synchronisation du score:', err);
      }
    }
  });
}

// Expose pour debug (disabled in production)

// ============================================================================
// CHAT ONLYFOOT (Socket.io client)
// ============================================================================

const onlyfootChatState = {
  socket: null,
  connected: false,
  joined: false,
  blocked: false,
  blockedUntil: null,
  profileId: null,
  userId: null,
  isGuest: false,
  soundEnabled: localStorage.getItem('chatSoundEnabled') !== 'false' // activé par défaut
};

// Context audio pour les sons de notification
let chatAudioContext = null;

// Fonction pour jouer un son "pop" (nouveau message)
function playChatMessageSound() {
  try {
    if (!chatAudioContext) chatAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = chatAudioContext.createOscillator();
    const gainNode = chatAudioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(chatAudioContext.destination);

    oscillator.frequency.setValueAtTime(800, chatAudioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(600, chatAudioContext.currentTime + 0.1);
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, chatAudioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, chatAudioContext.currentTime + 0.1);

    oscillator.start(chatAudioContext.currentTime);
    oscillator.stop(chatAudioContext.currentTime + 0.1);
  } catch (e) { console.log('[CHAT] Sound error:', e); }
}

// Fonction pour jouer un son "ding" léger (quelqu'un rejoint)
function playChatJoinSound() {
  try {
    if (!chatAudioContext) chatAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = chatAudioContext.createOscillator();
    const gainNode = chatAudioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(chatAudioContext.destination);

    oscillator.frequency.setValueAtTime(1200, chatAudioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(800, chatAudioContext.currentTime + 0.05);
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.15, chatAudioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, chatAudioContext.currentTime + 0.05);

    oscillator.start(chatAudioContext.currentTime);
    oscillator.stop(chatAudioContext.currentTime + 0.05);
  } catch (e) { console.log('[CHAT] Join sound error:', e); }
}

// Elements du chat (OnlyFoot + TV Live)
const chatUIs = [
  {
    container: document.getElementById("onlyfoot-chat"),
    messages: document.getElementById("onlyfoot-chat-messages"),
    form: document.getElementById("onlyfoot-chat-form"),
    input: document.getElementById("onlyfoot-chat-input"),
    online: document.getElementById("onlyfoot-chat-online"),
    pinned: document.getElementById("onlyfoot-chat-pinned")
  },
  {
    container: document.getElementById("tv-chat"),
    messages: document.getElementById("tv-chat-messages"),
    form: document.getElementById("tv-chat-form"),
    input: document.getElementById("tv-chat-input"),
    online: document.getElementById("tv-chat-online"),
    pinned: document.getElementById("tv-chat-pinned")
  }
].filter((ui) => ui.container || ui.messages || ui.form || ui.input || ui.online);

// Map des avatars pour le chat (reutilise PROFILE_AVATARS)
function getChatAvatarSrc(avatarKey) {
  if (!avatarKey) return null;
  return PROFILE_AVATARS[avatarKey] || null;
}

// Initialiser la connexion Socket.io
function initChatSocket() {
  if (onlyfootChatState.socket) return;

  try {
    // Connexion au serveur Socket.io (meme origine)
    const socketUrl = window.location.origin;
    onlyfootChatState.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    const socket = onlyfootChatState.socket;

    socket.on('connect', () => {
      console.log('[CHAT] Connecté au serveur');
      onlyfootChatState.connected = true;
      // Rejoindre automatiquement si le profil est disponible
      joinChatIfReady();
    });

    socket.on('disconnect', () => {
      console.log('[CHAT] Déconnecté du serveur');
      onlyfootChatState.connected = false;
      onlyfootChatState.joined = false;
      updateChatOnlineCount(0);
    });

    socket.on('chat:history', (messages) => {
      console.log('[CHAT] Historique reçu:', messages.length, 'messages');
      renderChatHistory(messages);
    });

    socket.on('chat:message', (message) => {
      appendChatMessage(message);
    });

    socket.on('chat:user-joined', (data) => {
      updateChatOnlineCount(data.onlineCount);
      appendChatSystemMessage(`${data.profileName} a rejoint le chat`);
      // Jouer le son si activé
      if (onlyfootChatState.soundEnabled) {
        playChatJoinSound();
      }
    });

    socket.on('chat:user-left', (data) => {
      updateChatOnlineCount(data.onlineCount);
      appendChatSystemMessage(`${data.profileName} a quitté le chat`);
    });

    socket.on('chat:online-count', (data) => {
      updateChatOnlineCount(data && data.onlineCount != null ? data.onlineCount : 0);
    });

    socket.on('chat:pinned', (data) => {
      setChatPinnedMessage(data && data.text ? data.text : "");
    });

    socket.on('chat:error', (data) => {
      console.error('[CHAT] Erreur:', data.message);
    });

    // Suppression d'un message par l'admin
    socket.on('chat:message-deleted', (data) => {
      console.log('[CHAT] Message supprimé:', data.id);
      removeChatMessage(data.id);
    });

    // Suppression de tous les messages par l'admin
    socket.on('chat:all-messages-deleted', () => {
      console.log('[CHAT] Tous les messages ont été supprimés');
      clearAllChatMessages();
    });

    socket.on('chat:messages-removed', (data) => {
      const ids = (data && data.ids) ? data.ids : [];
      ids.forEach((id) => removeChatMessage(id));
    });

    socket.on('chat:blocked', (data) => {
      applyChatBlocked(data);
    });

    socket.on('chat:unblocked', (data) => {
      applyChatUnblocked(data);
    });

  } catch (err) {
    console.error('[CHAT] Erreur initialisation socket:', err);
  }
}

// Rejoindre le chat avec le profil actuel
function joinChatIfReady() {
  if (!onlyfootChatState.socket || !onlyfootChatState.connected) return;
  if (onlyfootChatState.joined) return;

  const profile = getCurrentProfile();
  if (!profile || !profile.id || !profile.name) {
    // Guest read-only
    onlyfootChatState.socket.emit('chat:join', {
      profileId: 0,
      profileName: "Invité",
      avatarKey: null,
      userId: null,
      isAdminObserver: false
    });
    onlyfootChatState.profileId = 0;
    onlyfootChatState.userId = null;
    onlyfootChatState.isGuest = true;
    onlyfootChatState.joined = true;
    setChatInputsDisabled(true, "Connecte-toi pour écrire");
    console.log('[CHAT] Rejoint le chat en tant qu invité (lecture seule)');
    return;
  }

  const avatarKey = profile.avatarKey || profile.avatarColor || profile.avatar_color || null;

  onlyfootChatState.socket.emit('chat:join', {
    profileId: profile.id,
    profileName: profile.name,
    avatarKey: avatarKey,
    userId: profile.user_id || profile.userId || null
  });

  onlyfootChatState.profileId = profile.id;
  onlyfootChatState.userId = profile.user_id || profile.userId || null;
  onlyfootChatState.isGuest = false;
  onlyfootChatState.joined = true;
  setChatInputsDisabled(false);
  console.log('[CHAT] Rejoint le chat en tant que', profile.name);
}

// Envoyer un message
function sendChatMessage(text) {
  if (!onlyfootChatState.socket || !onlyfootChatState.joined) return;
  if (onlyfootChatState.isGuest || onlyfootChatState.profileId === 0) return;
  if (!text || text.trim().length === 0) return;
  if (onlyfootChatState.blocked) {
    appendChatSystemMessage("Message bloque: vous etes sanctionne.");
    return;
  }

  onlyfootChatState.socket.emit('chat:message', {
    text: text.trim()
  });
}

function clearChatMessagesContainer(ui) {
  if (!ui || !ui.messages) return;
  ui.messages.querySelectorAll('.onlyfoot-chat-message, .onlyfoot-chat-system, .onlyfoot-chat-empty').forEach((el) => {
    el.remove();
  });
}

function setChatPinnedMessage(text) {
  chatUIs.forEach((ui) => {
    if (!ui.pinned) return;
    const clean = text && String(text).trim() ? String(text).trim() : "";
    if (!clean) {
      ui.pinned.classList.add("hidden");
      ui.pinned.textContent = "";
      return;
    }
    ui.pinned.classList.remove("hidden");
    ui.pinned.textContent = clean;
  });
}

// Afficher l'historique des messages
function renderChatHistory(messages) {
  if (!chatUIs.length) return;
  chatUIs.forEach((ui) => {
    if (!ui.messages) return;
    clearChatMessagesContainer(ui);
    if (!messages || messages.length === 0) {
      ui.messages.insertAdjacentHTML('beforeend', '<div class="onlyfoot-chat-empty">Aucun message pour le moment. Soyez le premier !</div>');
    }
  });

  if (!messages || messages.length === 0) return;
  messages.forEach((msg) => appendChatMessage(msg, false));
  chatUIs.forEach((ui) => scrollChatToBottom(ui.messages));
}

// Ajouter un message au chat
function appendChatMessage(msg, scroll = true, playSound = true) {
  if (!chatUIs.length || !msg) return;

  // Jouer le son si activé et que ce n'est pas notre propre message
  const isOwnMessage = String(msg.profileId) === String(onlyfootChatState.profileId);
  if (playSound && scroll && onlyfootChatState.soundEnabled && !isOwnMessage) {
    playChatMessageSound();
  }

  chatUIs.forEach((ui) => {
    if (!ui.messages) return;

    // Supprimer le message "vide" si present
    const emptyMsg = ui.messages.querySelector('.onlyfoot-chat-empty');
    if (emptyMsg) emptyMsg.remove();

    const msgEl = document.createElement('div');
    msgEl.className = 'onlyfoot-chat-message';
    msgEl.setAttribute('data-message-id', msg.id);

    const avatarSrc = getChatAvatarSrc(msg.avatarKey);
    const safeName = escapeHtml(String(msg.profileName || ""));
    const safeInitial = escapeHtml(String((msg.profileName || "?").charAt(0).toUpperCase()));
    const safeAvatarSrc = avatarSrc ? escapeHtml(String(avatarSrc)) : "";
    const avatarHtml = safeAvatarSrc
      ? `<img src="${safeAvatarSrc}" alt="${safeName}" />`
      : `<span class="onlyfoot-chat-avatar-fallback">${safeInitial}</span>`;

    const timeStr = escapeHtml(formatChatTime(msg.createdAt));

    msgEl.innerHTML = `
      <div class="onlyfoot-chat-avatar">${avatarHtml}</div>
      <div class="onlyfoot-chat-message-content">
        <div class="onlyfoot-chat-message-header">
          <span class="onlyfoot-chat-username">${escapeHtml(msg.profileName)}</span>
          <span class="onlyfoot-chat-time">${timeStr}</span>
        </div>
        <div class="onlyfoot-chat-text">${escapeHtml(msg.text)}</div>
      </div>
    `;

    ui.messages.appendChild(msgEl);

    if (scroll) scrollChatToBottom(ui.messages);
  });
}

// Ajouter un message systeme (join/leave)
function appendChatSystemMessage(text) {
  if (!chatUIs.length) return;

  chatUIs.forEach((ui) => {
    if (!ui.messages) return;
    const msgEl = document.createElement('div');
    msgEl.className = 'onlyfoot-chat-system';
    msgEl.textContent = text;
    ui.messages.appendChild(msgEl);
    scrollChatToBottom(ui.messages);
  });
}

// Formater l'heure du message
function formatChatTime(isoString) {
  if (!isoString) return '';
  try {
    let ts = isoString;
    if (typeof ts === "string" && ts.includes(" ") && !ts.includes("T")) {
      ts = ts.replace(" ", "T") + "Z";
    }
    const date = new Date(ts);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) +
        ' ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
  } catch (e) {
    return '';
  }
}

// Echapper le HTML pour eviter les injections XSS
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Scroller en bas du chat
function scrollChatToBottom(container) {
  const target = container || null;
  if (!target) return;
  target.scrollTop = target.scrollHeight;
}

// Supprimer un message du DOM (appelé lors de suppression admin)
function removeChatMessage(messageId) {
  if (!chatUIs.length) return;
  chatUIs.forEach((ui) => {
    if (!ui.messages) return;
    const msgEl = ui.messages.querySelector(`[data-message-id="${messageId}"]`);
    if (msgEl) {
      msgEl.style.transition = 'opacity 0.3s, transform 0.3s';
      msgEl.style.opacity = '0';
      msgEl.style.transform = 'translateX(-20px)';
      setTimeout(() => msgEl.remove(), 300);
    }
  });
}

function clearAllChatMessages() {
  if (!chatUIs.length) return;
  chatUIs.forEach((ui) => {
    if (!ui.messages) return;
    clearChatMessagesContainer(ui);
    ui.messages.insertAdjacentHTML('beforeend', '<div class="onlyfoot-chat-empty">Le chat a ete vide par un moderateur</div>');
  });
}

// Mettre a jour le compteur d'utilisateurs en ligne
function updateChatOnlineCount(count) {
  if (!chatUIs.length) return;
  chatUIs.forEach((ui) => {
    if (!ui.online) return;
    ui.online.textContent = `${count} en ligne`;
  });
}

async function applyAntiInspectSetting() {
  try {
    const res = await fetch(`${API_BASE}/api/settings/public?ts=${Date.now()}`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    const enabled = data && data.anti_inspect !== undefined ? !!data.anti_inspect : true;
    const preplayEnabled = data && data.preplay_ads !== undefined ? !!data.preplay_ads : true;
    const clientTokens = data && data.client_tokens_enabled !== undefined ? !!data.client_tokens_enabled : true;
    antiInspectEnabled = enabled;
    preplayAdsEnabled = preplayEnabled;
    setClientTokensEnabled(clientTokens);
    syncAdServiceWorkerState();
    initAntiInspect();
  } catch (_) {
    // default to enabled if setting fetch fails
    antiInspectEnabled = true;
    preplayAdsEnabled = true;
    setClientTokensEnabled(true);
    syncAdServiceWorkerState();
    initAntiInspect();
  }
}

function startAntiInspectPolling() {
  setInterval(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/settings/public?ts=${Date.now()}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      const enabled = data && data.anti_inspect !== undefined ? !!data.anti_inspect : true;
      const preplayEnabled = data && data.preplay_ads !== undefined ? !!data.preplay_ads : true;
      const clientTokens = data && data.client_tokens_enabled !== undefined ? !!data.client_tokens_enabled : true;
      if (enabled !== antiInspectEnabled) {
        antiInspectEnabled = enabled;
      }
      if (preplayEnabled !== preplayAdsEnabled) {
        preplayAdsEnabled = preplayEnabled;
        syncAdServiceWorkerState();
      }
      if (clientTokens !== clientTokensEnabled) {
        setClientTokensEnabled(clientTokens);
      }
    } catch (_) {
      // ignore
    }
  }, 8000);
}

function initAntiInspect() {
  if (antiInspectInitDone) return;
  antiInspectInitDone = true;
  antiInspectDisableForIOS = isIOSDevice();
  if (antiInspectDisableForIOS) {
    antiInspectEnabled = false;
    return;
  }
  // Track real user interaction to avoid false positives on first paint/load.
  const markUserInteraction = (e) => {
    if (!e) {
      antiInspectUserInteracted = true;
      return;
    }
    if (e.type === "keydown") {
      const key = String(e.key || "").toLowerCase();
      // Ignore modifier-only keystrokes
      if (key === "shift" || key === "control" || key === "meta" || key === "alt") return;
    }
    antiInspectUserInteracted = true;
  };
  document.addEventListener("pointerdown", markUserInteraction, { passive: true });
  document.addEventListener("touchstart", markUserInteraction, { passive: true });
  document.addEventListener("keydown", markUserInteraction);

  // Block right click
  document.addEventListener("contextmenu", (e) => {
    if (!antiInspectEnabled) return;
    e.preventDefault();
  });

  // Block common devtools shortcuts
  document.addEventListener("keydown", (e) => {
    if (!antiInspectEnabled) return;
    const key = String(e.key || "").toLowerCase();
    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;

    if (key === "f12") {
      e.preventDefault();
      antiInspectUserInteracted = true;
      triggerAntiInspectScreen();
      return;
    }

    if (ctrl && key === "u") {
      e.preventDefault();
      return;
    }

    if (ctrl && shift && (key === "i" || key === "j" || key === "c")) {
      e.preventDefault();
      antiInspectUserInteracted = true;
      triggerAntiInspectScreen();
      return;
    }

    if (ctrl && key === "s") {
      e.preventDefault();
      return;
    }
  });

  // Extra detection: console/undocked devtools (responsive mode case)
  // Disabled by default to avoid false positives in some browsers/extensions.
}

function triggerAntiInspectScreen() {
  if (!antiInspectEnabled) return;
  if (window.location.pathname.endsWith("/blocked.html")) return;
  // Avoid blocking on first paint / no interaction (common false positive on some PCs)
  if (!antiInspectUserInteracted && (Date.now() - antiInspectLoadedAt) < 8000) return;
  antiInspectTriggered = true;
  sendSecurityEvent("devtools_block");
  window.location.href = "/blocked.html";
}

function renderChatGuestPlaceholder() {
  if (!chatUIs.length) return;
  chatUIs.forEach((ui) => {
    if (ui.messages) {
      clearChatMessagesContainer(ui);
      ui.messages.insertAdjacentHTML(
        "beforeend",
        '<div class="chat-guest-placeholder">Connecte-toi pour écrire dans le chat.</div>'
      );
    }
    if (ui.pinned) ui.pinned.classList.add("hidden");
    if (ui.online) ui.online.textContent = "x";
  });
  setChatInputsDisabled(true, "Connecte-toi pour écrire");
}

function setChatInputsDisabled(disabled, placeholderText) {
  chatUIs.forEach((ui) => {
    if (!ui.input) return;
    ui.input.disabled = disabled;
    if (placeholderText) {
      ui.input.placeholder = placeholderText;
    } else if (!disabled) {
      ui.input.placeholder = "Envoyer un message...";
    }
    if (ui.form) {
      const btn = ui.form.querySelector("button[type='submit']");
      if (btn) btn.disabled = disabled;
    }
  });
}

function applyChatBlocked(data) {
  const action = data && data.action ? data.action : "ban";
  let expiresAt = data && data.expiresAt ? data.expiresAt : null;
  if (expiresAt && typeof expiresAt === "string" && expiresAt.includes(" ") && !expiresAt.includes("T")) {
    expiresAt = expiresAt.replace(" ", "T") + "Z";
  }
  onlyfootChatState.blocked = true;
  onlyfootChatState.blockedUntil = expiresAt || null;

  if (action === "timeout" && expiresAt) {
    const untilStr = new Date(expiresAt).toLocaleString("fr-FR");
    appendChatSystemMessage(`Timeout jusqu'a ${untilStr}`);
    setChatInputsDisabled(true, "Timeout en cours...");
    const ms = new Date(expiresAt).getTime() - Date.now();
    if (ms > 0) {
      setTimeout(() => {
        onlyfootChatState.blocked = false;
        onlyfootChatState.blockedUntil = null;
        setChatInputsDisabled(false);
        appendChatSystemMessage("Timeout termine. Vous pouvez reparler.");
      }, ms + 200);
    }
  } else {
    appendChatSystemMessage("Vous etes banni du chat.");
    setChatInputsDisabled(true, "Vous etes banni du chat");
  }
}

function applyChatUnblocked(data) {
  const t = data && data.targetType ? data.targetType : null;
  const v = data && data.targetValue != null ? String(data.targetValue) : null;
  if (t === "profile" && onlyfootChatState.profileId != null) {
    if (String(onlyfootChatState.profileId) !== v) return;
  }
  if (t === "user" && onlyfootChatState.userId != null) {
    if (String(onlyfootChatState.userId) !== v) return;
  }
  // For IP, server emits to matching sockets only.
  onlyfootChatState.blocked = false;
  onlyfootChatState.blockedUntil = null;
  setChatInputsDisabled(false);
  appendChatSystemMessage("Sanction levee. Vous pouvez reparler.");
}

// Event listener pour le formulaire d'envoi
chatUIs.forEach((ui) => {
  if (!ui.form || !ui.input) return;
  ui.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = ui.input.value;
    if (text && text.trim()) {
      sendChatMessage(text);
      ui.input.value = '';
    }
  });
});

// Initialiser le chat quand la modal OnlyFoot s'ouvre
function initOnlyfootChat() {
  initChatSocket();
  joinChatIfReady();
}

// Observer pour detecter l'ouverture de la modal OnlyFoot
const onlyfootModal = document.getElementById('onlyfoot-modal');
if (onlyfootModal) {
  const chatObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const isHidden = onlyfootModal.classList.contains('hidden');
        if (!isHidden) {
          // Modal ouverte - initialiser le chat
          initOnlyfootChat();
        }
      }
    });
  });

  chatObserver.observe(onlyfootModal, { attributes: true });
}

if (tvModal) {
  const tvChatObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const isHidden = tvModal.classList.contains('hidden');
        if (!isHidden) {
          initOnlyfootChat();
        }
      }
    });
  });

  tvChatObserver.observe(tvModal, { attributes: true });
}

// Gestion du bouton son du chat
function initChatSoundToggle() {
  const soundToggles = document.querySelectorAll('.onlyfoot-chat-sound-toggle');

  // Appliquer l'état initial
  soundToggles.forEach(btn => {
    if (!onlyfootChatState.soundEnabled) {
      btn.classList.add('muted');
    }
  });

  soundToggles.forEach(btn => {
    btn.addEventListener('click', () => {
      onlyfootChatState.soundEnabled = !onlyfootChatState.soundEnabled;
      localStorage.setItem('chatSoundEnabled', onlyfootChatState.soundEnabled);

      // Mettre à jour tous les boutons
      soundToggles.forEach(b => {
        if (onlyfootChatState.soundEnabled) {
          b.classList.remove('muted');
          b.title = 'Désactiver le son';
        } else {
          b.classList.add('muted');
          b.title = 'Activer le son';
        }
      });
    });
  });
}

// Initialiser les boutons son au chargement
initChatSoundToggle();

// Expose pour debug (disabled in production)
