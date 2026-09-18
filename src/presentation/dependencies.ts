import { GetVisibleLinktree } from "../application/link/usecases/GetVisibleLinktree";
import { BuildTimeLinktreeRepository } from "../infrastructure/link/repositories/BuildTimeLinktreeRepository";

// Racine de composition : seul endroit où la présentation touche l'infrastructure.
export const getVisibleLinktree = new GetVisibleLinktree(
  new BuildTimeLinktreeRepository(),
);
