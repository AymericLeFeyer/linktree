/// <reference types="vite/client" />

declare module "virtual:linktree" {
  const linktree: import("./domain/link/entities/Linktree").Linktree;
  export default linktree;
}
