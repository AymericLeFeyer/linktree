import { describe, expect, it } from "vitest";
import { parseLinktree } from "./parseLinktree";

const valid = () => ({
  $schema: "./links.schema.json",
  profile: { name: "AyLabs", avatar: "/logo-blue.png" },
  socials: [{ platform: "youtube", url: "https://youtube.com/@ay_labs" }],
  links: [
    {
      title: "Le site",
      url: "https://aylabs.fr",
      image: "/links/site.webp",
      expiresAt: "2026-10-31",
    },
  ],
});

const errorsOf = (raw: unknown, assetExists?: (path: string) => boolean) => {
  const result = parseLinktree(raw, { assetExists });
  return result.ok ? [] : result.errors;
};

describe("parseLinktree", () => {
  it("accepte un fichier valide", () => {
    const result = parseLinktree(valid());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.links[0]).toEqual({
      id: "link-0",
      title: "Le site",
      url: "https://aylabs.fr",
      image: "/links/site.webp",
      featured: false,
      expiresAt: Date.parse("2026-10-31T23:00:00Z"),
    });
  });

  it("refuse une faute de frappe sur un champ (le lien deviendrait permanent)", () => {
    const raw = valid();
    Object.assign(raw.links[0], { expireAt: "2026-10-31" });
    expect(errorsOf(raw)).toEqual([
      expect.stringContaining("links[0].expireAt : champ inconnu"),
    ]);
  });

  it("refuse une date de fin illisible", () => {
    const raw = valid();
    raw.links[0].expiresAt = "31/10/2026";
    expect(errorsOf(raw)).toEqual([
      expect.stringContaining("links[0].expiresAt : date illisible"),
    ]);
  });

  it("signale une image locale absente de public/", () => {
    expect(errorsOf(valid(), (asset) => asset !== "/links/site.webp")).toEqual([
      "links[0].image : fichier introuvable dans public/ (/links/site.webp).",
    ]);
  });

  it("collecte toutes les erreurs d'un coup", () => {
    const errors = errorsOf({
      profile: { name: "" },
      socials: [{ platform: "myspace", url: "pas-une-url" }],
      links: [{ url: "javascript:alert(1)" }],
    });
    expect(errors).toHaveLength(6);
    expect(errors.join("\n")).toMatch(/profile\.name/);
    expect(errors.join("\n")).toMatch(/profile\.avatar/);
    expect(errors.join("\n")).toMatch(/socials\[0\]\.platform/);
    expect(errors.join("\n")).toMatch(/socials\[0\]\.url/);
    expect(errors.join("\n")).toMatch(/links\[0\]\.title/);
    expect(errors.join("\n")).toMatch(/links\[0\]\.url/);
  });

  it("exige le tableau links", () => {
    const raw: Record<string, unknown> = valid();
    delete raw.links;
    expect(errorsOf(raw)).toEqual(["links : tableau obligatoire."]);
  });
});
