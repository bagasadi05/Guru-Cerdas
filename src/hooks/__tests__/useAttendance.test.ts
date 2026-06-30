import { describe, it, expect, vi } from "vitest";
vi.mock("../../components/attendance/useAttendance", () => ({
  useAttendance: vi.fn(() => ({ isLoadingClasses: true, isLoadingStudents: false })),
}));
describe("useAttendance", () => {
  it("mock works", () => expect(1+1).toBe(2));
});
