import { describe, expect, it } from "vitest";
import type { Video } from "../../../domain/video/entities/Video";
import { GetLatestVideo } from "./GetLatestVideo";

const video = (id: string, publishedAt: string, durationSeconds: number) =>
  ({
    id,
    title: id,
    url: `https://www.youtube.com/watch?v=${id}`,
    thumbnail: null,
    publishedAt: Date.parse(publishedAt),
    durationSeconds,
  }) satisfies Video;

describe("GetLatestVideo", () => {
  const now = new Date("2026-09-18T12:00:00Z");

  it("renvoie la dernière vidéo longue du dépôt", async () => {
    const useCase = new GetLatestVideo({
      listRecent: async () => [
        video("short", "2026-09-17T17:01:14Z", 48),
        video("longue", "2026-09-17T15:00:06Z", 1134),
      ],
    });
    expect((await useCase.execute(now))?.id).toBe("longue");
  });

  it("laisse remonter l'erreur du dépôt", async () => {
    const useCase = new GetLatestVideo({
      listRecent: () => Promise.reject(new Error("HTTP 502")),
    });
    await expect(useCase.execute(now)).rejects.toThrow("HTTP 502");
  });
});
