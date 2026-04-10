import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  onValue,
  onDisconnect
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAGMzjuw6LEQT5tRUiXpBqoi0qLBQEcNaI",
  authDomain: "imftx-5be48.firebaseapp.com",
  databaseURL: "https://imftx-5be48-default-rtdb.firebaseio.com",
  projectId: "imftx-5be48",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

function getSessionId(pageName) {
  const key = "viewer_session_" + pageName;
  let sessionId = sessionStorage.getItem(key);

  if (!sessionId) {
    sessionId = "sess_" + Math.random().toString(36).slice(2) + Date.now();
    sessionStorage.setItem(key, sessionId);
  }

  return sessionId;
}

export async function initViewerCounter(pageName, elementId, readonly = false) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const viewersRef = ref(db, `presence/${pageName}`);
  const sessionId = getSessionId(pageName);
  const mySessionRef = ref(db, `presence/${pageName}/${sessionId}`);

  if (!readonly) {
    await onDisconnect(mySessionRef).remove();
    await set(mySessionRef, true);
  }

  onValue(viewersRef, (snapshot) => {
    const data = snapshot.val();
    const count = data ? Object.keys(data).length : 0;
    el.textContent = count;
  });
}

export function autoInitCounters() {
  const elements = document.querySelectorAll("[data-viewer-counter]");

  elements.forEach((el) => {
    const pageName = el.getAttribute("data-viewer-counter");
    const isReadonly = el.hasAttribute("data-viewer-readonly");

    if (!el.id) {
      el.id = "cnt_" + Math.random().toString(36).slice(2, 7);
    }

    initViewerCounter(pageName, el.id, isReadonly);
  });
}

autoInitCounters();
