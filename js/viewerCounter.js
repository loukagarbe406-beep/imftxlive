import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  runTransaction,
  onDisconnect,
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

/**
 * @param {string} pageName - Nom de la page dans la DB
 * @param {string} elementId - ID de l'élément HTML
 * @param {boolean} readonly - Si vrai, n'incrémente pas (juste lecture)
 */
export function initViewerCounter(pageName, elementId, readonly = false) {
  const countRef = ref(db, `pages/${pageName}/count`);
  const el = document.getElementById(elementId);
  if (!el) return;

  if (!readonly) {
    runTransaction(countRef, (current) => (current || 0) + 1);
    onDisconnect(countRef).set(increment(-1));
  }

  onValue(countRef, (snapshot) => {
    const val = snapshot.val();
    el.textContent = (val && val > 0) ? val : 0;
  });
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
