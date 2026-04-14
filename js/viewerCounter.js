import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  onDisconnect,
  set,
  increment
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAGMzjuw6LEQT5tRUiXpBqoi0qLBQEcNaI",
  authDomain: "imftx-5be48.firebaseapp.com",
  databaseURL: "https://imftx-5be48-default-rtdb.firebaseio.com",
  projectId: "imftx-5be48",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const registeredPages = new Set();

export function initViewerCounter(pageName, elementId, readonly = false) {
  const countRef = ref(db, `pages/${pageName}/count`);
  const el = document.getElementById(elementId);
  if (!el) return;

  if (!readonly && !registeredPages.has(pageName)) {
    registeredPages.add(pageName);

    const connectedRef = ref(db, ".info/connected");
    onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        onDisconnect(countRef).set(increment(-1));
        set(countRef, increment(1));
      }
    });
  }

  const startTime = Date.now();
  let realCount = 0;

  onValue(countRef, (snapshot) => {
    const raw = snapshot.val();
    realCount = (typeof raw === "number" && raw > 0) ? raw : 0;

    if (Date.now() - startTime < 2000) {
      el.textContent = realCount;
    }
  });

  setInterval(() => {
    el.textContent = realCount;
  }, 7000);
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
