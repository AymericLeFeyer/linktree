import type { Social } from "../../domain/link/entities/Linktree";
import { newTabProps } from "../../shared/newTabProps";
import { PLATFORM_LABELS } from "./platformLabels";
import { SocialIcon } from "./SocialIcon";

export function SocialLinks({ socials }: { socials: Social[] }) {
  if (socials.length === 0) return null;

  return (
    <nav aria-label="Réseaux sociaux" className="animate-rise [--delay:60ms]">
      <ul className="flex flex-wrap justify-center gap-2 sm:gap-2.5">
        {socials.map((social) => {
          const label = social.label ?? PLATFORM_LABELS[social.platform];
          return (
            <li key={`${social.platform}-${social.url}`}>
              <a
                href={social.url}
                {...newTabProps(social.url)}
                aria-label={label}
                title={label}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-ink-line bg-white/5 text-gray-300 transition-colors hover:border-brand hover:bg-white/10 hover:text-brand-bright focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-bright sm:h-11 sm:w-11"
              >
                <SocialIcon platform={social.platform} className="h-5 w-5" />
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
