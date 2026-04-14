import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  onValue,
  onDisconnect,
  remove,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAGMzjuw6LEQT5tRUiXpBqoi0qLBQEcNaI",
  authDomain: "imftx-5be48.firebaseapp.com",
  databaseURL: "https://imftx-5be48-default-rtdb.firebaseio.com",
  projectId: "imftx-5be48",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

function generateSessionId() {
  return Math.random().toString(36).substr(2, 12) + Date.now().toString(36);
}

const sessionId = generateSessionId();
const registeredPages = new Set();

/**
 * @param {string} pageName - Nom de la page dans la DB
 * @param {string} elementId - ID de l'élément HTML
 * @param {boolean} readonly - Si vrai, n'incrémente pas (juste lecture)
 */
export function initViewerCounter(pageName, elementId, readonly = false) {
  const viewersRef = ref(db, `pages/${pageName}/viewers`);
  const el = document.getElementById(elementId);
  if (!el) return;

  let displayedCount = 0;
  let realCount = 0;
  let initialDelayDone = false;

  const delayMs = 5000 + Math.random() * 5000;

  el.textContent = "...";

  if (!readonly && !registeredPages.has(pageName)) {
    registeredPages.add(pageName);
    const myPresenceRef = ref(db, `pages/${pageName}/viewers/${sessionId}`);

    const connectedRef = ref(db, ".info/connected");
    onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        onDisconnect(myPresenceRef).remove();
        set(myPresenceRef, { t: serverTimestamp() });
      }
    });
  }

  onValue(viewersRef, (snapshot) => {
    realCount = snapshot.exists() ? snapshot.size : 0;
    if (realCount < 0) realCount = 0;

    if (initialDelayDone) {
      updateDisplay(el, displayedCount, realCount, (v) => { displayedCount = v; });
    }
  });

  setTimeout(() => {
    initialDelayDone = true;
    updateDisplay(el, displayedCount, realCount, (v) => { displayedCount = v; });
  }, delayMs);
}

function updateDisplay(el, from, to, setDisplayed) {
  if (from === to) {
    el.textContent = to;
    setDisplayed(to);
    return;
  }

  const diff = to - from;
  const steps = Math.min(Math.abs(diff), 15);
  const stepDelay = 80;
  let current = from;

  for (let i = 1; i <= steps; i++) {
    setTimeout(() => {
      current = Math.round(from + (diff * i) / steps);
      if (current < 0) current = 0;
      el.textContent = current;
      if (i === steps) setDisplayed(current);
    }, stepDelay * i);
  }
}

/**
 * Scanne les éléments.
 * Si l'élément a l'attribut [data-viewer-readonly], il ne comptera pas comme un viewer.
 */
export function autoInitCounters() {
  const elements = document.querySelectorAll("[data-viewer-counter]");

  elements.forEach((el) => {
    const pageName = el.getAttribute("data-viewer-counter");
    const isReadonly = el.hasAttribute("data-viewer-readonly");

    if (!el.id) el.id = "cnt_" + Math.random().toString(36).substr(2, 5);

    initViewerCounter(pageName, el.id, isReadonly);
  });
}

autoInitCounters();
