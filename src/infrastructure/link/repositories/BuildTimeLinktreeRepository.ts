import linktree from "virtual:linktree";
import type { Linktree } from "../../../domain/link/entities/Linktree";
import type { LinktreeRepository } from "../../../domain/link/repositories/LinktreeRepository";

/**
 * `virtual:linktree` est produit par `vite/linktreePlugin.ts` : `links.json`
 * lu, validé et débarrassé des liens déjà expirés au moment du build.
 */
export class BuildTimeLinktreeRepository implements LinktreeRepository {
  get(): Linktree {
    return linktree;
  }
}
