import { describe, expect, it } from "vitest";
import { calculateIAP, calculateIRTO, metricColor } from "./iap";

type Rated = {
  relevanceRating: number | null;
  coherenceRating: number | null;
  adequacyRating: number | null;
};

function q(
  relevance: number | null,
  coherence: number | null,
  adequacy: number | null,
): Rated {
  return {
    relevanceRating: relevance,
    coherenceRating: coherence,
    adequacyRating: adequacy,
  };
}

describe("calculateIAP", () => {
  it("returns zeros for an empty array", () => {
    expect(calculateIAP([])).toEqual({ iap: 0, ratedCount: 0, totalCount: 0 });
  });

  it("counts zero rated when all ratings are null", () => {
    expect(calculateIAP([q(null, null, null), q(null, null, null)])).toEqual({
      iap: 0,
      ratedCount: 0,
      totalCount: 2,
    });
  });

  it("does NOT count a partially-rated question as rated (plan-002 guard)", () => {
    const result = calculateIAP([
      q(5, null, null),
      q(null, 4, null),
      q(null, null, 4),
    ]);
    expect(result.ratedCount).toBe(0);
    expect(result.iap).toBe(0);
    expect(result.totalCount).toBe(3);
  });

  it("counts a fully-rated triple whose average is exactly 4.0 as adequate", () => {
    const result = calculateIAP([q(4, 4, 4)]);
    expect(result.ratedCount).toBe(1);
    expect(result.iap).toBe(100);
  });

  it("does not count a triple averaging 3.67 as adequate", () => {
    const result = calculateIAP([q(5, 4, 2)]);
    expect(result.ratedCount).toBe(1);
    expect(result.iap).toBe(0);
  });

  it("computes the right percentage and rounding for a mixed set", () => {
    const result = calculateIAP([
      q(5, 5, 5),
      q(4, 4, 4),
      q(5, 4, 2),
      q(null, null, null),
    ]);
    expect(result.totalCount).toBe(4);
    expect(result.ratedCount).toBe(3);
    expect(result.iap).toBe(67);
  });

  it("reports iap 100 when the single fully-rated question is adequate", () => {
    expect(calculateIAP([q(5, 5, 5)]).iap).toBe(100);
  });

  it("reports iap 0 when the single fully-rated question is inadequate", () => {
    expect(calculateIAP([q(1, 1, 1)]).iap).toBe(0);
  });
});

describe("calculateIRTO", () => {
  it("returns irto 0 for zero seconds", () => {
    expect(calculateIRTO(0)).toEqual({
      irto: 0,
      generationMinutes: 0,
      manualBaselineMinutes: 120,
    });
  });

  it("returns irto 0 for negative seconds", () => {
    expect(calculateIRTO(-30)).toEqual({
      irto: 0,
      generationMinutes: 0,
      manualBaselineMinutes: 120,
    });
  });

  it("clamps to a value within 0..100 for a small generation time", () => {
    const result = calculateIRTO(60);
    expect(result.generationMinutes).toBe(1);
    expect(result.irto).toBeGreaterThanOrEqual(0);
    expect(result.irto).toBeLessThanOrEqual(100);
    expect(result.irto).toBe(99);
  });

  it("clamps to 0 when generation time exceeds the manual baseline", () => {
    const result = calculateIRTO(99_999);
    expect(result.irto).toBe(0);
  });

  it("uses an explicit manual baseline when provided", () => {
    const result = calculateIRTO(60, 10);
    expect(result.manualBaselineMinutes).toBe(10);
    expect(result.generationMinutes).toBe(1);
    expect(result.irto).toBe(90);
  });

  it("defaults the manual baseline to 120 minutes", () => {
    expect(calculateIRTO(120).manualBaselineMinutes).toBe(120);
  });
});

describe("metricColor", () => {
  it("returns 'default' for 80", () => {
    expect(metricColor(80)).toBe("default");
  });

  it("returns 'secondary' for 79.9", () => {
    expect(metricColor(79.9)).toBe("secondary");
  });

  it("returns 'secondary' for 60", () => {
    expect(metricColor(60)).toBe("secondary");
  });

  it("returns 'destructive' for 59.9", () => {
    expect(metricColor(59.9)).toBe("destructive");
  });

  it("returns 'default' for 100", () => {
    expect(metricColor(100)).toBe("default");
  });

  it("returns 'destructive' for 0", () => {
    expect(metricColor(0)).toBe("destructive");
  });
});
