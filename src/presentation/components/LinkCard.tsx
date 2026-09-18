import { ArrowUpRight } from "lucide-react";
import { useState, type CSSProperties } from "react";
import type { Link } from "../../domain/link/entities/Linktree";
import { newTabProps } from "../../shared/newTabProps";

interface LinkCardProps {
  link: Link;
  /** Rang d'apparition, pour décaler l'animation d'entrée. */
  index: number;
}

const cardBase =
  "group animate-rise relative block rounded-2xl border border-ink-line bg-ink-soft/80 backdrop-blur-sm transition duration-200 hover:-translate-y-0.5 hover:border-brand hover:bg-ink-soft hover:shadow-lg hover:shadow-brand/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-bright focus-visible:ring-offset-2 focus-visible:ring-offset-ink";

export function LinkCard({ link, index }: LinkCardProps) {
  const style = { "--delay": `${120 + index * 60}ms` } as CSSProperties;
  // Les premières cartes sont au-dessus de la ligne de flottaison.
  const eager = index < 3;
  return link.featured ? (
    <FeaturedCard link={link} style={style} eager={eager} />
  ) : (
    <CompactCard link={link} style={style} eager={eager} />
  );
}

interface CardProps {
  link: Link;
  style: CSSProperties;
  eager: boolean;
}

/** Lien mis en avant : image pleine largeur au format vidéo. */
function FeaturedCard({ link, style, eager }: CardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = link.image && !imageFailed;

  return (
    <a
      href={link.url}
      {...newTabProps(link.url)}
      className={`${cardBase} overflow-hidden`}
      style={style}
    >
      {showImage && (
        <div className="aspect-video overflow-hidden border-b border-ink-line bg-ink">
          <img
            src={link.image}
            alt=""
            loading={eager ? "eager" : "lazy"}
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        </div>
      )}
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <div className="min-w-0 flex-1">
          <p className="mb-1.5 text-xs font-semibold tracking-wider text-brand-bright uppercase">
            À la une
          </p>
          <h2 className="text-lg leading-snug font-semibold text-white sm:text-xl">
            {link.title}
          </h2>
          {link.description && (
            <p className="mt-1.5 text-sm leading-relaxed text-gray-400">
              {link.description}
            </p>
          )}
        </div>
        <Arrow />
      </div>
    </a>
  );
}

/** Lien standard : vignette carrée à gauche, texte à droite. */
function CompactCard({ link, style, eager }: CardProps) {
  return (
    <a
      href={link.url}
      {...newTabProps(link.url)}
      className={`${cardBase} flex items-center gap-4 p-3 pr-4`}
      style={style}
    >
      <Thumbnail link={link} eager={eager} />
      <div className="min-w-0 flex-1">
        <h2 className="text-base leading-snug font-semibold text-white sm:text-[1.05rem]">
          {link.title}
        </h2>
        {link.description && (
          <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-gray-400">
            {link.description}
          </p>
        )}
      </div>
      <Arrow />
    </a>
  );
}

/** Vignette, ou monogramme si pas d'image (ou image cassée). */
function Thumbnail({ link, eager }: { link: Link; eager: boolean }) {
  const [failed, setFailed] = useState(false);
  const box = "h-16 w-16 shrink-0 rounded-xl sm:h-[4.5rem] sm:w-[4.5rem]";

  if (link.image && !failed) {
    return (
      <img
        src={link.image}
        alt=""
        loading={eager ? "eager" : "lazy"}
        onError={() => setFailed(true)}
        className={`${box} border border-ink-line bg-ink object-cover`}
      />
    );
  }

  return (
    <span
      className={`${box} flex items-center justify-center border border-brand/30 bg-brand/15 font-display text-2xl font-bold text-brand-bright`}
      aria-hidden="true"
    >
      {link.title.charAt(0).toUpperCase()}
    </span>
  );
}

function Arrow() {
  return (
    <ArrowUpRight
      className="h-5 w-5 shrink-0 text-gray-500 transition duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand-bright"
      aria-hidden="true"
    />
  );
}
