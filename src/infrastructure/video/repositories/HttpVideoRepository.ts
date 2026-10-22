import type { Video } from "../../../domain/video/entities/Video";
import type { VideoRepository } from "../../../domain/video/repositories/VideoRepository";
import { parseVideoFeed } from "../../../domain/video/services/parseVideoFeed";
import type { VideosFeedClient } from "../api/videosFeedClient";

/** Vidéos lues à l'exécution : elles changent sans reconstruire le linktree. */
export class HttpVideoRepository implements VideoRepository {
  constructor(private readonly client: VideosFeedClient) {}

  async listRecent(): Promise<Video[]> {
    return parseVideoFeed(await this.client.fetch());
  }
}
