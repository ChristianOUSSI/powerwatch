import { describe, it, expect } from "vitest";
import { computeZoneScore } from "./zoneScore.js";

const NOW = new Date("2026-11-18T12:00:00Z");
const ago = (minutes: number) => new Date(NOW.getTime() - minutes * 60 * 1000);

describe("computeZoneScore", () => {
  it("retourne UNKNOWN sans signalement", () => {
    const r = computeZoneScore([], NOW);
    expect(r.status).toBe("UNKNOWN");
    expect(r.outageScore).toBe(0);
  });

  it("des OUTAGE récents donnent un score élevé", () => {
    const reports = Array.from({ length: 8 }, () => ({
      type: "OUTAGE", weight: 1, createdAt: ago(10),
    }));
    const r = computeZoneScore(reports, NOW);
    expect(r.status).toBe("OUTAGE");
    expect(r.outageScore).toBeGreaterThan(60);
    expect(r.activeReports).toBe(8);
  });

  it("un vieux signalement pèse moins (decay)", () => {
    const recent = computeZoneScore(
      [{ type: "OUTAGE", weight: 1, createdAt: ago(10) }], NOW
    );
    const old = computeZoneScore(
      [{ type: "OUTAGE", weight: 1, createdAt: ago(6 * 60) }], NOW
    );
    expect(old.outageScore).toBeLessThan(recent.outageScore);
  });

  it("MICRO_OUTAGE compte moitié moins qu'OUTAGE", () => {
    const outage = computeZoneScore(
      [{ type: "OUTAGE", weight: 1, createdAt: ago(10) }], NOW
    );
    const micro = computeZoneScore(
      [{ type: "MICRO_OUTAGE", weight: 1, createdAt: ago(10) }], NOW
    );
    expect(micro.outageScore).toBeCloseTo(outage.outageScore / 2, 1);
  });

  it("RESTORED annule partiellement les coupures", () => {
    const reports = [
      { type: "OUTAGE", weight: 1, createdAt: ago(10) },
      { type: "RESTORED", weight: 1, createdAt: ago(5) },
    ];
    const r = computeZoneScore(reports, NOW);
    expect(r.restoredReports).toBe(1);
    // score = (1*decay*1 - 1*0.8) * 10 → fortement réduit
    expect(r.outageScore).toBeLessThan(50);
  });

  it("plusieurs OUTAGE s'additionnent et le score est plafonné", () => {
    const reports = Array.from({ length: 15 }, () => ({
      type: "OUTAGE", weight: 1, createdAt: ago(10),
    }));
    const r = computeZoneScore(reports, NOW);
    expect(r.activeReports).toBe(15);
    expect(r.outageScore).toBe(100); // plafonné
    expect(r.status).toBe("OUTAGE");
  });

  it("oldestOutage = signalement le plus ancien", () => {
    const reports = [
      { type: "OUTAGE", weight: 1, createdAt: ago(30) },
      { type: "OUTAGE", weight: 1, createdAt: ago(10) },
    ];
    const r = computeZoneScore(reports, NOW);
    expect(r.oldestOutage?.getTime()).toBe(ago(30).getTime());
  });

  it("score plancher à 0 même avec beaucoup de RESTORED", () => {
    const reports = Array.from({ length: 10 }, () => ({
      type: "RESTORED", weight: 2, createdAt: ago(10),
    }));
    const r = computeZoneScore(reports, NOW);
    expect(r.outageScore).toBe(0);
    expect(r.status).toBe("STABLE");
  });
});
