// Public global leaderboard, backed by a real Firebase project (Firestore +
// Hosting) — genuinely public, no Claude/Anthropic account involved and no
// login for players. Firestore security rules (see firestore.rules) enforce
// the write shape server-side; the API key below is a public client
// identifier by Firebase's own design, not a secret.
const FIREBASE_CONFIG = {
  projectId: "ship-it-prod-2026",
  appId: "1:621981044105:web:c787762780ee466a99a558",
  storageBucket: "ship-it-prod-2026.firebasestorage.app",
  apiKey: "AIzaSyDDnxXLmEUWaRZsR2Lflwz2eFZ60AXAk4Q",
  authDomain: "ship-it-prod-2026.firebaseapp.com",
  messagingSenderId: "621981044105",
};

import { resolveStorage } from "./persistence.js";

const SDK_VERSION = "10.14.1";
const APP_URL = `https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-app.js`;
const FIRESTORE_URL = `https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-firestore.js`;

const NAME_KEY = "shipit.playerName";
const ADJECTIVES = [
  "swift",
  "silent",
  "caffeinated",
  "recursive",
  "async",
  "stateless",
  "eager",
  "lazy",
  "greedy",
  "atomic",
  "elastic",
  "quantum",
];
const NOUNS = [
  "fox",
  "otter",
  "compiler",
  "daemon",
  "falcon",
  "yak",
  "gopher",
  "raccoon",
  "kernel",
  "packet",
  "cursor",
  "byte",
];

function randomName() {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 90 + 10);
  return `${a}-${n}-${num}`;
}

export function getPlayerName(storage = resolveStorage()) {
  if (!storage) return randomName();
  try {
    let name = storage.getItem(NAME_KEY);
    if (!name) {
      name = randomName();
      storage.setItem(NAME_KEY, name);
    }
    return name;
  } catch {
    return randomName();
  }
}

export function setPlayerName(name, storage = resolveStorage()) {
  const trimmed = String(name || "").trim().slice(0, 20);
  if (!trimmed) return getPlayerName(storage);
  try {
    storage?.setItem(NAME_KEY, trimmed);
  } catch {
    /* ignore: cosmetic preference only */
  }
  return trimmed;
}

/**
 * Thin wrapper around Firestore, loaded lazily from CDN so a network hiccup
 * or offline use degrades to "no leaderboard" instead of breaking the game.
 */
export class Leaderboard {
  constructor() {
    this.db = null;
    this.fs = null;
    this.readyPromise = this._init();
  }

  async _init() {
    try {
      const [{ initializeApp }, fsMod] = await Promise.all([
        import(APP_URL),
        import(FIRESTORE_URL),
      ]);
      const app = initializeApp(FIREBASE_CONFIG);
      this.db = fsMod.getFirestore(app);
      this.fs = fsMod;
      return true;
    } catch (err) {
      console.warn("[ship-it] leaderboard unavailable:", err);
      return false;
    }
  }

  async submit({ score, releases, bestCombo }) {
    const ok = await this.readyPromise;
    if (!ok) return false;
    try {
      const { collection, addDoc, serverTimestamp } = this.fs;
      await addDoc(collection(this.db, "scores"), {
        name: getPlayerName(),
        score: Math.max(0, Math.round(score)),
        releases: Math.max(0, Math.round(releases)),
        bestCombo: Math.max(0, Math.round(bestCombo)),
        createdAt: serverTimestamp(),
      });
      return true;
    } catch (err) {
      console.warn("[ship-it] score submit failed:", err);
      return false;
    }
  }

  async fetchTop(n = 10) {
    const ok = await this.readyPromise;
    if (!ok) return [];
    try {
      const { collection, query, orderBy, limit, getDocs } = this.fs;
      const q = query(collection(this.db, "scores"), orderBy("score", "desc"), limit(n));
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data());
    } catch (err) {
      console.warn("[ship-it] leaderboard fetch failed:", err);
      return [];
    }
  }
}
