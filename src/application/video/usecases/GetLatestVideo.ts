import type { Video } from "../../../domain/video/entities/Video";
import type { VideoRepository } from "../../../domain/video/repositories/VideoRepository";
import { latestVideo } from "../../../domain/video/services/latestVideo";

/** Dernière vidéo longue de la chaîne, ou `null` si aucune n'est connue. */
export class GetLatestVideo {
  constructor(private readonly repository: VideoRepository) {}

  async execute(now: Date): Promise<Video | null> {
    return latestVideo(await this.repository.listRecent(), now);
  }
}
