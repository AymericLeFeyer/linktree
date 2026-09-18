import { describe, expect, it } from "vitest";
import { parseIsoDuration, parseVideoFeed } from "./parseVideoFeed";

// Extrait réel de https://aylabs.fr/youtube-stats.json (écrit par n8n).
const n8nEntry = {
  json: {
    id: "5nVj0SXp9_w",
    title: "J’ai testé 4 SPOTS CONNECTÉS : lequel est le meilleur ?",
    publishedAt: "2026-09-17T15:00:06Z",
    viewCount: 4425,
    duration: "PT18M54S",
    thumbnails: {
      high: {
        url: "https://i.ytimg.com/vi/5nVj0SXp9_w/hqdefault.jpg",
        width: 480,
        height: 360,
      },
      maxres: {
        url: "https://i.ytimg.com/vi/5nVj0SXp9_w/maxresdefault.jpg",
        width: 1280,
        height: 720,
      },
    },
  },
  pairedItem: { item: 0 },
};

describe("parseVideoFeed", () => {
  it("déballe les entrées n8n et garde la meilleure miniature", () => {
    expect(parseVideoFeed({ videos: [n8nEntry] })).toEqual([
      {
        id: "5nVj0SXp9_w",
        title: "J’ai testé 4 SPOTS CONNECTÉS : lequel est le meilleur ?",
        url: "https://www.youtube.com/watch?v=5nVj0SXp9_w",
        thumbnail: "https://i.ytimg.com/vi/5nVj0SXp9_w/maxresdefault.jpg",
        publishedAt: Date.parse("2026-09-17T15:00:06Z"),
        durationSeconds: 1134,
      },
    ]);
  });

  it("accepte la forme plate et les miniatures en chaîne", () => {
    const [video] = parseVideoFeed({
      videos: [
        {
          id: "abc",
          title: "Plat",
          publishedAt: "2026-09-01T10:00:00Z",
          thumbnails: { medium: "https://i.ytimg.com/vi/abc/mqdefault.jpg" },
        },
      ],
    });
    expect(video.thumbnail).toBe("https://i.ytimg.com/vi/abc/mqdefault.jpg");
    expect(video.durationSeconds).toBeNull();
  });

  it("ignore les entrées illisibles sans lever d'erreur", () => {
    const videos = parseVideoFeed({
      videos: [
        null,
        { json: { title: "Sans id", publishedAt: "2026-09-01T10:00:00Z" } },
        { id: "x", title: "Date invalide", publishedAt: "hier" },
        { id: "y", title: "  ", publishedAt: "2026-09-01T10:00:00Z" },
        n8nEntry,
      ],
    });
    expect(videos.map((v) => v.id)).toEqual(["5nVj0SXp9_w"]);
  });

  it("renvoie une liste vide pour un fichier inattendu", () => {
    expect(parseVideoFeed(null)).toEqual([]);
    expect(parseVideoFeed({ videos: "nope" })).toEqual([]);
    expect(parseVideoFeed([n8nEntry])).toEqual([]);
  });
});

describe("parseIsoDuration", () => {
  it.each([
    ["PT48S", 48],
    ["PT18M54S", 1134],
    ["PT2H32M57S", 9177],
    ["PT1H", 3600],
    ["P1DT2H", 93600],
  ])("%s → %i s", (value, expected) => {
    expect(parseIsoDuration(value)).toBe(expected);
  });

  it.each(["", "P", "PT", "18:54", "PT1.5M"])("refuse « %s »", (value) => {
    expect(parseIsoDuration(value)).toBeNull();
  });
});
