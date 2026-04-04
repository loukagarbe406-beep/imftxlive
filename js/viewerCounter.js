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
  apiKey: "AIzaSyDPP6MQDLbDaVu2f6cFy44iUvAZ1RCJPtQ",
  authDomain: "imftxlive.firebaseapp.com",
  databaseURL: "https://imftxlive-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "imftxlive",
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
    // 🔼 +1 uniquement si on n'est pas en mode lecture seule
    runTransaction(countRef, (current) => (current || 0) + 1);
    // 🔽 -1 automatique au départ
    onDisconnect(countRef).set(increment(-1));
  }

  // 👀 Écoute en temps réel (pour tout le monde)
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
    const isReadonly = el.hasAttribute("data-viewer-readonly"); // On vérifie si readonly
    
    if (!el.id) el.id = "cnt_" + Math.random().toString(36).substr(2, 5);
    
    initViewerCounter(pageName, el.id, isReadonly);
  });
}

autoInitCounters();
