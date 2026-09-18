import { describe, expect, it } from "vitest";
import type { Link } from "../entities/Linktree";
import { isExpired, nextExpiry, parseExpiry } from "./expiry";

const utc = (iso: string) => Date.parse(iso);

describe("parseExpiry", () => {
  it("garde le lien visible toute la journée indiquée (heure d'hiver)", () => {
    // 1er novembre 00:00 à Paris (UTC+1)
    expect(parseExpiry("2026-10-31")).toBe(utc("2026-10-31T23:00:00Z"));
  });

  it("garde le lien visible toute la journée indiquée (heure d'été)", () => {
    // 15 juillet 00:00 à Paris (UTC+2)
    expect(parseExpiry("2026-07-14")).toBe(utc("2026-07-14T22:00:00Z"));
  });

  it("gère les veilles de changement d'heure", () => {
    // Passage à l'heure d'été le 29 mars 2026 à 02:00
    expect(parseExpiry("2026-03-28")).toBe(utc("2026-03-28T23:00:00Z"));
    expect(parseExpiry("2026-03-29")).toBe(utc("2026-03-29T22:00:00Z"));
    // Retour à l'heure d'hiver le 25 octobre 2026 à 03:00
    expect(parseExpiry("2026-10-24")).toBe(utc("2026-10-24T22:00:00Z"));
    expect(parseExpiry("2026-10-25")).toBe(utc("2026-10-25T23:00:00Z"));
  });

  it("lit une heure précise, à Paris", () => {
    expect(parseExpiry("2026-07-14T18:00")).toBe(utc("2026-07-14T16:00:00Z"));
    expect(parseExpiry("2026-12-24 20:30")).toBe(utc("2026-12-24T19:30:00Z"));
  });

  it("respecte un fuseau explicite", () => {
    expect(parseExpiry("2026-10-31T18:00:00Z")).toBe(
      utc("2026-10-31T18:00:00Z"),
    );
    expect(parseExpiry("2026-10-31T18:00+05:00")).toBe(
      utc("2026-10-31T13:00:00Z"),
    );
  });

  it.each([
    "2026-02-30",
    "2026-13-01",
    "2026-10-31T25:00",
    "31/10/2026",
    "demain",
    "",
  ])("refuse %j", (value) => {
    expect(parseExpiry(value)).toBeNull();
  });
});

const link = (expiresAt: number | null): Link => ({
  id: "link-0",
  title: "Lien",
  url: "https://aylabs.fr",
  featured: false,
  expiresAt,
});

describe("isExpired", () => {
  const deadline = utc("2026-10-31T23:00:00Z");

  it("ne fait jamais expirer un lien sans date", () => {
    expect(isExpired(link(null), new Date("2100-01-01"))).toBe(false);
  });

  it("masque le lien pile à l'échéance, pas avant", () => {
    expect(isExpired(link(deadline), new Date(deadline - 1))).toBe(false);
    expect(isExpired(link(deadline), new Date(deadline))).toBe(true);
  });
});

describe("nextExpiry", () => {
  it("renvoie la plus proche échéance à venir", () => {
    const now = new Date("2026-09-18T12:00:00Z");
    const links = [
      link(null),
      link(utc("2026-12-01")),
      link(utc("2026-10-01")),
    ];
    expect(nextExpiry(links, now)).toBe(utc("2026-10-01"));
  });

  it("renvoie null si aucun lien n'expire", () => {
    expect(nextExpiry([link(null)], new Date())).toBeNull();
  });
});
