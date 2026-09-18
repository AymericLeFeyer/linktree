import { describe, expect, it } from "vitest";
import type { Video } from "../entities/Video";
import { latestVideo } from "./latestVideo";

const video = (
  id: string,
  publishedAt: string,
  durationSeconds: number | null,
): Video => ({
  id,
  title: id,
  url: `https://www.youtube.com/watch?v=${id}`,
  thumbnail: null,
  publishedAt: Date.parse(publishedAt),
  durationSeconds,
});

const now = new Date("2026-09-18T12:00:00Z");

describe("latestVideo", () => {
  it("prend la plus récente, quel que soit l'ordre du flux", () => {
    const videos = [
      video("ancienne", "2026-09-05T15:00:16Z", 1654),
      video("recente", "2026-09-17T15:00:06Z", 1134),
      video("live", "2026-08-30T09:33:13Z", 9177),
    ];
    expect(latestVideo(videos, now)?.id).toBe("recente");
  });

  it("écarte les Shorts, jusqu'à 3 minutes", () => {
    const videos = [
      video("short", "2026-09-17T17:01:14Z", 48),
      video("short-long", "2026-09-17T16:00:00Z", 180),
      video("longue", "2026-09-17T15:00:06Z", 1134),
    ];
    expect(latestVideo(videos, now)?.id).toBe("longue");
  });

  it("garde une vidéo de durée inconnue", () => {
    expect(
      latestVideo([video("?", "2026-09-17T15:00:06Z", null)], now)?.id,
    ).toBe("?");
  });

  it("ignore une première programmée dans le futur", () => {
    const videos = [
      video("premiere", "2026-09-20T15:00:00Z", 900),
      video("publiee", "2026-09-17T15:00:06Z", 1134),
    ];
    expect(latestVideo(videos, now)?.id).toBe("publiee");
  });

  it("renvoie null sans vidéo longue", () => {
    expect(latestVideo([], now)).toBeNull();
    expect(
      latestVideo([video("short", "2026-09-17T17:01:14Z", 48)], now),
    ).toBeNull();
  });
});
