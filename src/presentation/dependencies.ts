import { GetVisibleLinktree } from "../application/link/usecases/GetVisibleLinktree";
import { GetLatestVideo } from "../application/video/usecases/GetLatestVideo";
import { BuildTimeLinktreeRepository } from "../infrastructure/link/repositories/BuildTimeLinktreeRepository";
import { YoutubeStatsClient } from "../infrastructure/video/api/youtubeStatsClient";
import { HttpVideoRepository } from "../infrastructure/video/repositories/HttpVideoRepository";

// Racine de composition : seul endroit où la présentation touche l'infrastructure.
export const getVisibleLinktree = new GetVisibleLinktree(
  new BuildTimeLinktreeRepository(),
);

export const getLatestVideo = new GetLatestVideo(
  new HttpVideoRepository(
    new YoutubeStatsClient(
      import.meta.env.VITE_YOUTUBE_STATS_URL || "/youtube-stats.json",
    ),
  ),
);
