import { useEffect, useState } from "react";
import type { Video } from "../../domain/video/entities/Video";
import { getLatestVideo } from "../dependencies";

export type LatestVideoState =
  | { status: "loading" }
  /** `now` : instant du chargement, référence pour « il y a 3 jours ». */
  | { status: "ready"; video: Video; now: number }
  | { status: "none" };

/**
 * Dernière vidéo, chargée à l'ouverture de la page. Échec réseau ou flux vide
 * → `none` : l'encart disparaît sans rien casser.
 */
export function useLatestVideo(): LatestVideoState {
  const [state, setState] = useState<LatestVideoState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const now = new Date();
    getLatestVideo
      .execute(now)
      .catch((error: unknown) => {
        console.warn("Dernière vidéo indisponible :", error);
        return null;
      })
      .then((video) => {
        if (cancelled) return;
        setState(
          video
            ? { status: "ready", video, now: now.getTime() }
            : { status: "none" },
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
