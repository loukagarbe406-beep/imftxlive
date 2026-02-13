// js/viewerCounter.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, push, set, onValue, onDisconnect, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAGMzjuw6LEQT5tRUiXpBqoi0qLBQEcNaI",
  authDomain: "imftx-5be48.firebaseapp.com",
  databaseURL: "https://imftx-5be48-default-rtdb.firebaseio.com/",
  projectId: "imftx-5be48",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export function initViewerCounter(pageName, elementId) {
    const viewersRef = ref(db, `pages/${pageName}/viewers`);
    const userRef = push(viewersRef);
    onDisconnect(userRef).remove();
    set(userRef, { joinedAt: serverTimestamp() });

    displayCounterOnly(pageName, elementId);
}

export function displayCounterOnly(pageName, elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const viewersRef = ref(db, `pages/${pageName}/viewers`);
    onValue(viewersRef, (snapshot) => {
        el.textContent = snapshot.size || 0;
    });
}

export function autoInitCounters() {
    const elements = document.querySelectorAll("[data-viewer-counter]");

    elements.forEach((el) => {
        const pageName = el.getAttribute("data-viewer-counter");
        const viewersRef = ref(db, `pages/${pageName}/viewers`);

        onValue(viewersRef, (snapshot) => {
            el.textContent = snapshot.size || 0;
        });
    });
}
