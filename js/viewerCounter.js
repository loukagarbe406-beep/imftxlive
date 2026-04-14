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

  if (!el) {
    console.warn("[Viewer] Element introuvable :", elementId);
    return;
  }

  console.log("[Viewer] Init:", pageName, "| element:", elementId, "| readonly:", readonly);

  if (!readonly && !registeredPages.has(pageName)) {
    registeredPages.add(pageName);

    const connectedRef = ref(db, ".info/connected");
    onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        console.log("[Viewer] Connecté à Firebase, enregistrement présence...");
        onDisconnect(countRef)
          .set(increment(-1))
          .then(() => {
            console.log("[Viewer] onDisconnect enregistré");
            return set(countRef, increment(1));
          })
          .then(() => console.log("[Viewer] Compteur incrémenté"))
          .catch((err) => console.error("[Viewer] Erreur écriture:", err));
      }
    });
  }

  let firstUpdate = true;
  let displayedCount = 0;
  let pendingCount = 0;
  let updateTimer = null;

  onValue(countRef, (snapshot) => {
    const raw = snapshot.val();
    pendingCount = (typeof raw === "number" && raw > 0) ? raw : 0;

    console.log("[Viewer] Valeur reçue:", raw, "→ affichage:", pendingCount);

    if (firstUpdate) {
      firstUpdate = false;
      displayedCount = pendingCount;
      el.textContent = pendingCount;
      return;
    }

    if (updateTimer) return;

    const delay = 5000 + Math.random() * 5000;
    updateTimer = setTimeout(() => {
      updateTimer = null;
      displayedCount = pendingCount;
      el.textContent = pendingCount;
    }, delay);
  });
}

export function autoInitCounters() {
  const elements = document.querySelectorAll("[data-viewer-counter]");
  console.log("[Viewer] Éléments trouvés:", elements.length);

  elements.forEach((el) => {
    const pageName = el.getAttribute("data-viewer-counter");
    const isReadonly = el.hasAttribute("data-viewer-readonly");

    if (!el.id) el.id = "cnt_" + Math.random().toString(36).substr(2, 5);

    initViewerCounter(pageName, el.id, isReadonly);
  });
}

autoInitCounters();
