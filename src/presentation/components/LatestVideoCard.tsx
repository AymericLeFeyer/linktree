import { ArrowUpRight, Play } from "lucide-react";
import { useState } from "react";
import type { Video } from "../../domain/video/entities/Video";
import { newTabProps } from "../../shared/newTabProps";
import type { LatestVideoState } from "../hooks/useLatestVideo";
import { SocialIcon } from "./SocialIcon";
import { formatAge, formatDuration } from "./videoFormat";

/**
 * Encart « Dernière vidéo » entre les réseaux et les liens. Le conteneur est
 * monté une seule fois : l'animation d'entrée ne rejoue pas quand le squelette
 * laisse place à la vidéo.
 */
export function LatestVideoSection({ state }: { state: LatestVideoState }) {
  if (state.status === "none") return null;

  return (
    <section
      aria-label="Dernière vidéo"
      aria-busy={state.status === "loading"}
      className="animate-rise [--delay:90ms]"
    >
      <h2 className="mb-2.5 flex items-center gap-2 px-1 font-sans text-xs font-semibold tracking-wider text-brand-bright uppercase">
        <SocialIcon platform="youtube" className="h-4 w-4" />
        Dernière vidéo
      </h2>
      {state.status === "ready" ? (
        <LatestVideoCard video={state.video} now={state.now} />
      ) : (
        <Skeleton />
      )}
    </section>
  );
}

function LatestVideoCard({ video, now }: { video: Video; now: number }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <a
      href={video.url}
      {...newTabProps(video.url)}
      className="group relative block overflow-hidden rounded-2xl border border-ink-line bg-ink-soft/80 backdrop-blur-sm transition duration-200 hover:-translate-y-0.5 hover:border-brand hover:bg-ink-soft hover:shadow-lg hover:shadow-brand/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-bright focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
    >
      <div className="relative aspect-video overflow-hidden border-b border-ink-line bg-ink">
        {video.thumbnail && !imageFailed && (
          // Les miniatures 4:3 de YouTube ont des bandes noires : le recadrage
          // 16:9 de object-cover les fait disparaître.
          <img
            src={video.thumbnail}
            alt=""
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        )}
        <span
          className="absolute inset-0 flex items-center justify-center bg-linear-to-t from-ink/60 via-transparent to-transparent"
          aria-hidden="true"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ink/70 text-white ring-1 ring-white/20 backdrop-blur-sm transition duration-200 group-hover:scale-110 group-hover:bg-brand">
            <Play className="h-6 w-6 translate-x-0.5 fill-current" />
          </span>
        </span>
        {video.durationSeconds !== null && (
          <span className="absolute right-2.5 bottom-2.5 rounded-md bg-ink/85 px-1.5 py-0.5 text-xs font-semibold text-white tabular-nums">
            <span className="sr-only">Durée : </span>
            {formatDuration(video.durationSeconds)}
          </span>
        )}
      </div>
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-lg leading-snug font-semibold text-white sm:text-xl">
            {video.title}
          </h3>
          <p className="mt-1.5 text-sm text-gray-400">
            <time dateTime={new Date(video.publishedAt).toISOString()}>
              Publiée {formatAge(video.publishedAt, now)}
            </time>
          </p>
        </div>
        <ArrowUpRight
          className="h-5 w-5 shrink-0 text-gray-500 transition duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand-bright"
          aria-hidden="true"
        />
      </div>
    </a>
  );
}

/** Même encombrement que la carte : les liens en dessous ne sautent pas. */
function Skeleton() {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-ink-line bg-ink-soft/80"
      aria-hidden="true"
    >
      <div className="aspect-video animate-pulse border-b border-ink-line bg-white/5" />
      <div className="space-y-2.5 p-4 sm:p-5">
        <div className="h-5 w-4/5 animate-pulse rounded bg-white/10" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-white/5" />
      </div>
    </div>
  );
}
