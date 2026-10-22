/**
 * Catalogue des événements Aynalytics du linktree. Chaque lien suivi appelle
 * l'une de ces fonctions dans son `onClick` : mêmes noms et propriétés que sur
 * aylabs.fr, pour comparer les sites dans le dashboard.
 *
 * | Événement       | Propriétés                                                  |
 * |-----------------|-------------------------------------------------------------|
 * | `link_click`    | title, url, host, position (1 = premier), featured          |
 * | `social_click`  | network, url, placement (`socials`)                         |
 * | `youtube_click` | target (`video`), url, video_id, video_title, placement     |
 */
import type { Link, Social } from "../../domain/link/entities/Linktree";
import type { Video } from "../../domain/video/entities/Video";
import { track } from "./aynalytics";

const hostOf = (url: string): string => {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname.replace(/^www\./, "") || parsed.protocol.slice(0, -1)
    );
  } catch {
    return url;
  }
};

/** Carte de la liste de liens. `index` = rang affiché (0 = premier). */
export function trackLinkClick(link: Link, index: number): void {
  track("link_click", {
    title: link.title.slice(0, 100),
    url: link.url,
    host: hostOf(link.url),
    position: index + 1,
    featured: link.featured,
  });
}

/** Icône de réseau social (e-mail et site compris). */
export function trackSocialClick(social: Social): void {
  track("social_click", {
    network: social.platform,
    // mailto : l'adresse suffit, jamais d'éventuels sujet/corps.
    url: social.url.split("?")[0],
    placement: "socials",
  });
}

/** Encart « Dernière vidéo ». */
export function trackLatestVideoClick(video: Video): void {
  track("youtube_click", {
    target: "video",
    url: video.url,
    video_id: video.id,
    video_title: video.title.slice(0, 100),
    placement: "latest-video",
  });
}
