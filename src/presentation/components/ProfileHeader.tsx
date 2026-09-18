import type { Profile } from "../../domain/link/entities/Linktree";

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
          className="h-24 w-24 rounded-3xl border border-ink-line bg-ink-soft object-contain p-3 shadow-xl shadow-black/30 sm:h-28 sm:w-28"
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
