import type { Linktree } from "../../../domain/link/entities/Linktree";
import type { LinktreeRepository } from "../../../domain/link/repositories/LinktreeRepository";
import { isExpired, nextExpiry } from "../../../domain/link/services/expiry";

export interface VisibleLinktree {
  linktree: Linktree;
  /** Prochain instant où la liste changera ; `null` si aucun lien n'expire. */
  refreshAt: number | null;
}

/**
 * Le build écarte déjà les liens expirés, mais le site peut rester en ligne
 * des semaines sans être reconstruit : on refiltre donc à l'affichage.
 */
export class GetVisibleLinktree {
  constructor(private readonly repository: LinktreeRepository) {}

  execute(now: Date): VisibleLinktree {
    const linktree = this.repository.get();
    const links = linktree.links.filter((link) => !isExpired(link, now));
    return {
      linktree: { ...linktree, links },
      refreshAt: nextExpiry(links, now),
    };
  }
}
