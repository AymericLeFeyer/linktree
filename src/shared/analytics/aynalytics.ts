/**
 * Aynalytics (analytics auto-hébergé) : charge le SDK et expose `track`.
 *
 * - Pages vues, visites, visiteurs uniques : automatiques (un `screen` au chargement).
 * - Clics : déclenchés explicitement par les composants via `./trackEvents.ts`.
 *
 * Sans `VITE_AYNALYTICS_SITE_KEY` (dev local), tout est inactif. `VITE_AYNALYTICS_URL`
 * est facultative : par défaut, le SDK passe par le proxy `/_ay` du nginx du site.
 */

type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type Properties = Record<string, JsonValue>;

interface AynalyticsApi {
  init(options: {
    siteKey: string;
    endpoint: string;
    persistence?: "session" | "local" | "memory";
    autoClicks?: boolean;
    outboundLinks?: boolean;
  }): unknown;
  track(name: string, properties?: Properties): void;
  flush(): void;
}

type QueuedCall = [string, unknown[]];

declare global {
  interface Window {
    aynalytics?: AynalyticsApi | { q: QueuedCall[] };
  }
}

/** Par défaut, le collector est relayé par le nginx du site sur /_ay (docker/nginx.conf.template). */
const ENDPOINT = (import.meta.env.VITE_AYNALYTICS_URL || "/_ay").replace(
  /\/+$/,
  "",
);
const SITE_KEY = import.meta.env.VITE_AYNALYTICS_SITE_KEY;

let started = false;

export function initAynalytics(): void {
  if (started || !SITE_KEY || typeof window === "undefined") return;
  started = true;

  // File d'attente : les appels faits avant le chargement du script sont rejoués après l'init.
  window.aynalytics = { q: [] };

  const script = document.createElement("script");
  script.src = `${ENDPOINT}/sdk.js`;
  script.async = true;
  script.onload = () => {
    const api = window.aynalytics;
    if (!api || !("init" in api)) return;
    api.init({
      siteKey: SITE_KEY,
      endpoint: ENDPOINT,
      // Identifiant anonyme persistant (13 mois max) : visiteurs uniques sur plusieurs jours.
      persistence: "local",
      // Les clics sont suivis explicitement (trackEvents.ts) : pas de détection automatique.
      autoClicks: false,
      outboundLinks: false,
    });
  };
  document.head.appendChild(script);
}

function call(method: "track" | "flush", args: unknown[]): void {
  const api = typeof window === "undefined" ? undefined : window.aynalytics;
  if (!api) return;
  if ("q" in api) {
    api.q.push([method, args]);
  } else if (method === "track") {
    api.track(...(args as [string, Properties?]));
  } else {
    api.flush();
  }
}

/**
 * Envoie un événement puis vide la file aussitôt (requête keepalive) : un clic
 * sur un lien peut fermer ou masquer la page avant l'envoi groupé suivant.
 * Sans effet si Aynalytics n'est pas configuré.
 */
export function track(name: string, properties?: Properties): void {
  call("track", [name, properties]);
  call("flush", []);
}
