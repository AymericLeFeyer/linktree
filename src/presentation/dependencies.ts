import { GetVisibleLinktree } from "../application/link/usecases/GetVisibleLinktree";
import { GetLatestVideo } from "../application/video/usecases/GetLatestVideo";
import { BuildTimeLinktreeRepository } from "../infrastructure/link/repositories/BuildTimeLinktreeRepository";
import { VideosFeedClient } from "../infrastructure/video/api/videosFeedClient";
import { HttpVideoRepository } from "../infrastructure/video/repositories/HttpVideoRepository";

// Racine de composition : seul endroit où la présentation touche l'infrastructure.
export const getVisibleLinktree = new GetVisibleLinktree(
  new BuildTimeLinktreeRepository(),
);

export const getLatestVideo = new GetLatestVideo(
  new HttpVideoRepository(
    new VideosFeedClient(
      import.meta.env.VITE_VIDEOS_FEED_URL || "/videos-feed.json",
    ),
  ),
);
