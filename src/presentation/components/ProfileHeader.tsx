import type { Profile } from "../../domain/link/entities/Linktree";

const BADGE_SRC = "/logo-blue.png";

export function ProfileHeader({ profile }: { profile: Profile }) {
  return (
    <header className="flex animate-rise flex-col items-center text-center">
      <div className="relative">
        {/* Halo derrière l'avatar, comme le hero d'aylabs.fr */}
        <div
          className="absolute inset-0 -z-10 scale-150 rounded-full bg-brand/30 blur-2xl"
          aria-hidden="true"
        />
        <img
          src={profile.avatar}
          alt=""
          className="h-28 w-28 rounded-full border-2 border-ink-line bg-ink-soft object-cover shadow-xl shadow-black/30 sm:h-32 sm:w-32"
        />
        {/* Badge AyLabs : le logo a des parties transparentes (le « AY »),
            d'où le fond blanc ; l'anneau couleur de page le détache de la photo. */}
        <img
          src={BADGE_SRC}
          alt=""
          className="absolute right-0 bottom-0 h-9 w-9 rounded-full bg-white shadow-lg ring-4 ring-ink sm:h-10 sm:w-10"
        />
      </div>

      <h1 className="mt-6 text-3xl font-bold sm:text-4xl">{profile.name}</h1>

      {profile.tagline && (
        <p className="mt-2 font-display text-lg font-semibold text-brand-bright sm:text-xl">
          {profile.tagline}
        </p>
      )}

      {profile.description && (
        <p className="mt-3 max-w-md text-base leading-relaxed text-gray-400">
          {profile.description}
        </p>
      )}
    </header>
  );
}
