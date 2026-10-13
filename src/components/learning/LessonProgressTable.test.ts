import { describe, it, expect } from "vitest";
import { countActiveLearners } from "./LessonProgressTable";

const now = new Date("2026-10-12T12:00:00Z").getTime();
const daysAgo = (d: number) => new Date(now - d * 86_400_000).toISOString();

describe("active learners", () => {
  it("counts each faculty once if they had lesson activity within 7 days", () => {
    expect(countActiveLearners([
      { user_id: "a", last_activity: daysAgo(1) },
      { user_id: "a", last_activity: daysAgo(2) },
      { user_id: "b", last_activity: daysAgo(6.9) },
      { user_id: "c", last_activity: daysAgo(8) },
    ], now)).toBe(2);
  });
});
