import type { Linktree } from "../entities/Linktree";

/** Source du contenu. Synchrone : les données sont figées au build. */
export interface LinktreeRepository {
  get(): Linktree;
}
