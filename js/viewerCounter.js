import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  onValue,
  onDisconnect,
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

export function initViewerCounter(pageName, elementId, readonly = false) {
  const viewersRef = ref(db, `pages/${pageName}/viewers`);
  const el = document.getElementById(elementId);
  if (!el) return;

  let displayedCount = 0;
  let realCount = 0;
  let firstUpdate = true;
  let updateTimer = null;

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
    realCount = snapshot.exists() ? snapshot.numChildren() : 0;

    if (firstUpdate) {
      firstUpdate = false;
      displayedCount = realCount;
      el.textContent = realCount;
      return;
    }

    if (updateTimer) return;

    const delay = 5000 + Math.random() * 5000;
    updateTimer = setTimeout(() => {
      updateTimer = null;
      animateCount(el, displayedCount, realCount, (v) => { displayedCount = v; });
    }, delay);
  });
}

function animateCount(el, from, to, setDisplayed) {
  if (from === to) {
    el.textContent = to;
    setDisplayed(to);
    return;
  }

  const diff = to - from;
  const steps = Math.min(Math.abs(diff), 15);
  const stepDelay = 80;

  for (let i = 1; i <= steps; i++) {
    setTimeout(() => {
      const current = Math.max(0, Math.round(from + (diff * i) / steps));
      el.textContent = current;
      if (i === steps) setDisplayed(current);
    }, stepDelay * i);
  }
}

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
