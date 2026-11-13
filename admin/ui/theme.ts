export type ThemePref = "system" | "light" | "dark";

const KEY = "linktree-admin-theme";
const PREFS: ThemePref[] = ["system", "light", "dark"];

export function readPref(): ThemePref {
  try {
    const value = localStorage.getItem(KEY);
    if (PREFS.includes(value as ThemePref)) return value as ThemePref;
  } catch {
    // stockage indisponible (navigation privée…) : thème système
  }
  return "system";
}

export function nextPref(pref: ThemePref): ThemePref {
  return PREFS[(PREFS.indexOf(pref) + 1) % PREFS.length];
}

/** Pose `data-theme` (clair ou sombre) sur <html> et mémorise le choix. */
export function applyPref(pref: ThemePref, persist = true): void {
  const dark =
    pref === "dark" ||
    (pref === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  if (!persist) return;
  try {
    localStorage.setItem(KEY, pref);
  } catch {
    // sans conséquence : le choix ne sera pas retenu
  }
}

/** Au démarrage, et à chaque changement du thème du système tant que le choix est « système ». */
export function initTheme(): void {
  applyPref(readPref(), false);
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (readPref() === "system") applyPref("system", false);
  });
}
