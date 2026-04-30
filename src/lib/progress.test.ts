import { describe, expect, it } from "vitest";
import { calculateStreak } from "./progress";

describe("calculateStreak", () => {
  it("returns 0 when today is not completed", () => {
    expect(calculateStreak([{ completed_at: "2026-04-28T10:00:00+08:00" }], "2026-04-29")).toBe(0);
  });

  it("counts consecutive days including today", () => {
    expect(
      calculateStreak(
        [
          { completed_at: "2026-04-29T10:00:00+08:00" },
          { completed_at: "2026-04-28T10:00:00+08:00" },
          { completed_at: "2026-04-27T10:00:00+08:00" },
        ],
        "2026-04-29"
      )
    ).toBe(3);
  });

  it("stops at the first missing date", () => {
    expect(
      calculateStreak(
        [
          { completed_at: "2026-04-29T10:00:00+08:00" },
          { completed_at: "2026-04-27T10:00:00+08:00" },
        ],
        "2026-04-29"
      )
    ).toBe(1);
  });
});
