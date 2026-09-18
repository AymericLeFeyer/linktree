import { describe, expect, it } from "vitest";
import type { Link, Linktree } from "../../../domain/link/entities/Linktree";
import { GetVisibleLinktree } from "./GetVisibleLinktree";

const link = (id: string, expiresAt: string | null): Link => ({
  id,
  title: id,
  url: "https://aylabs.fr",
  featured: false,
  expiresAt: expiresAt === null ? null : Date.parse(expiresAt),
});

const linktree: Linktree = {
  profile: { name: "AyLabs", avatar: "/logo-blue.png" },
  socials: [],
  links: [
    link("permanent", null),
    link("expire", "2026-09-01T00:00:00Z"),
    link("bientot", "2026-10-01T00:00:00Z"),
  ],
};

describe("GetVisibleLinktree", () => {
  const useCase = new GetVisibleLinktree({ get: () => linktree });

  it("écarte les liens expirés et garde l'ordre du fichier", () => {
    const { linktree: visible } = useCase.execute(
      new Date("2026-09-18T12:00:00Z"),
    );
    expect(visible.links.map((l) => l.id)).toEqual(["permanent", "bientot"]);
  });

  it("indique quand la liste va changer", () => {
    const { refreshAt } = useCase.execute(new Date("2026-09-18T12:00:00Z"));
    expect(refreshAt).toBe(Date.parse("2026-10-01T00:00:00Z"));
  });

  it("ne programme rien quand plus aucun lien n'expire", () => {
    const { linktree: visible, refreshAt } = useCase.execute(
      new Date("2026-12-01T00:00:00Z"),
    );
    expect(visible.links.map((l) => l.id)).toEqual(["permanent"]);
    expect(refreshAt).toBeNull();
  });
});
