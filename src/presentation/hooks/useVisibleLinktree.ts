import { useEffect, useState } from "react";
import type { Linktree } from "../../domain/link/entities/Linktree";
import { getVisibleLinktree } from "../dependencies";

// setTimeout déborde au-delà de ~24,8 jours : on se réveille au plus tard là,
// quitte à reprogrammer.
const MAX_TIMEOUT = 2 ** 31 - 1;

/**
 * Liens visibles maintenant. Si la page reste ouverte au moment où un lien
 * expire, il disparaît sans rechargement.
 */
export function useVisibleLinktree(): Linktree {
  const [state, setState] = useState(() =>
    getVisibleLinktree.execute(new Date()),
  );

  useEffect(() => {
    if (state.refreshAt === null) return;
    const delay = Math.min(state.refreshAt - Date.now(), MAX_TIMEOUT);
    const timer = window.setTimeout(
      () => setState(getVisibleLinktree.execute(new Date())),
      Math.max(delay, 0),
    );
    return () => window.clearTimeout(timer);
  }, [state]);

  return state.linktree;
}
