import { describe, expect, it } from "vitest";
import { dueBlogSlot, dueSocialSlot } from "./blog-schedule";

// Dates en UTC ; Bruxelles = UTC+1 en hiver, UTC+2 en été.
describe("planning de publication (heure de Bruxelles)", () => {
  it("hiver : lundi 18h Bruxelles = 17h UTC", () => {
    expect(dueBlogSlot(new Date("2026-11-23T17:00:30Z"))).not.toBeNull(); // lundi
    expect(dueBlogSlot(new Date("2026-11-23T16:00:30Z"))).toBeNull(); // 17h local : trop tôt
  });

  it("été : lundi 18h Bruxelles = 16h UTC", () => {
    expect(dueBlogSlot(new Date("2026-07-06T16:00:30Z"))).not.toBeNull(); // lundi
    // 17h UTC = 19h local : encore dans la fenêtre de tolérance (le contrôle
    // "déjà publié" de l'appelant évite le doublon)
    expect(dueBlogSlot(new Date("2026-07-06T17:00:30Z"))).not.toBeNull();
    expect(dueBlogSlot(new Date("2026-07-06T15:00:30Z"))).toBeNull();
  });

  it("jours sans article : mardi, jeudi, samedi", () => {
    expect(dueBlogSlot(new Date("2026-11-24T17:00:30Z"))).toBeNull(); // mardi
    expect(dueBlogSlot(new Date("2026-11-26T17:00:30Z"))).toBeNull(); // jeudi
    expect(dueBlogSlot(new Date("2026-11-28T17:00:30Z"))).toBeNull(); // samedi
  });

  it("dimanche : 8h30 Bruxelles", () => {
    expect(dueBlogSlot(new Date("2026-11-29T07:30:30Z"))).not.toBeNull(); // hiver
    expect(dueBlogSlot(new Date("2026-11-29T06:30:30Z"))).toBeNull(); // 7h30 local
    expect(dueBlogSlot(new Date("2026-07-05T06:30:30Z"))).not.toBeNull(); // été
  });

  it("post réseaux : 2 h après l'article", () => {
    expect(dueSocialSlot(new Date("2026-11-23T19:00:30Z"))).not.toBeNull(); // lundi 20h
    expect(dueSocialSlot(new Date("2026-11-23T18:00:30Z"))).toBeNull(); // 19h local
    expect(dueSocialSlot(new Date("2026-11-29T09:30:30Z"))).not.toBeNull(); // dimanche 10h30
    expect(dueSocialSlot(new Date("2026-11-24T19:00:30Z"))).toBeNull(); // mardi
  });

  it("changement d'heure : dimanche 25 octobre 2026 (retour à l'heure d'hiver)", () => {
    expect(dueBlogSlot(new Date("2026-10-25T07:30:30Z"))).not.toBeNull(); // 8h30 CET
  });
});
