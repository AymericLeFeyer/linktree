import { LatestVideoSection } from "../components/LatestVideoCard";
import { LinkCard } from "../components/LinkCard";
import { ProfileHeader } from "../components/ProfileHeader";
import { SocialLinks } from "../components/SocialLinks";
import { useLatestVideo } from "../hooks/useLatestVideo";
import { useVisibleLinktree } from "../hooks/useVisibleLinktree";

export function HomePage() {
  const { profile, socials, links } = useVisibleLinktree();
  const latestVideo = useLatestVideo();

  return (
    <div className="relative isolate min-h-dvh overflow-hidden">
      {/* Fond du labo : trame et halos, jamais au premier plan */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-grid [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -top-48 left-1/2 -z-10 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-brand/25 blur-[120px]"
        aria-hidden="true"
      />

      <main className="mx-auto flex w-full max-w-xl flex-col gap-8 px-4 pt-14 pb-10 sm:px-6 sm:pt-20">
        <ProfileHeader profile={profile} />
        <SocialLinks socials={socials} />
        <LatestVideoSection state={latestVideo} />

        <section aria-label="Liens">
          {links.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {links.map((link, index) => (
                <li key={link.id}>
                  <LinkCard link={link} index={index} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl border border-dashed border-ink-line px-4 py-10 text-center text-gray-500">
              Aucun lien pour le moment.
            </p>
          )}
        </section>
      </main>

      <footer className="pb-8 text-center text-sm text-gray-600">
        © {new Date().getFullYear()} {profile.name}
      </footer>
    </div>
  );
}
