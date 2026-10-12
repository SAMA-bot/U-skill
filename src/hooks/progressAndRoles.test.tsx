import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

const rpc = vi.fn();
const rolesResult = { data: null as unknown, error: null as unknown };
let currentUser: { id: string } | null = { id: "user-a" };

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...a: unknown[]) => rpc(...a),
    from: (table: string) => ({
      select: () => ({
        eq: () =>
          table === "user_roles"
            ? Promise.resolve(rolesResult)
            : Promise.resolve({ data: [], error: null }),
      }),
    }),
  },
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: currentUser, loading: false }) }));
const toast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));

import { useUserRole } from "./useUserRole";
import { useLessonProgress } from "./useLessonProgress";

beforeEach(() => { rpc.mockReset(); toast.mockReset(); localStorage.clear(); currentUser = { id: "user-a" }; });

describe("role lookup", () => {
  it("does not fall back to faculty when the lookup fails", async () => {
    rolesResult.data = null; rolesResult.error = { message: "boom" };
    const { result } = renderHook(() => useUserRole());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.roles).toEqual([]);
    expect(result.current.error).not.toBeNull();
  });

  it("reports no roles (not faculty) for an unprovisioned account", async () => {
    rolesResult.data = []; rolesResult.error = null;
    const { result } = renderHook(() => useUserRole());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.roles).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("ignores a saved role the server did not grant", async () => {
    localStorage.setItem("active_role:user-a", "admin");
    rolesResult.data = [{ role: "faculty" }]; rolesResult.error = null;
    const { result } = renderHook(() => useUserRole());
    await waitFor(() => expect(result.current.activeRole).toBe("faculty"));
    expect(result.current.isAdmin).toBe(false);
  });
});

describe("lesson completion", () => {
  it("completes through the server function without sending XP", async () => {
    rpc.mockResolvedValue({ data: { id: "p", user_id: "user-a", lesson_id: "l1", status: "completed", completed_at: "x", xp_earned: 20 }, error: null });
    const { result } = renderHook(() => useLessonProgress());
    await waitFor(() => expect(result.current.loading).toBe(false));
    let awarded: number | null = null;
    await act(async () => { awarded = await result.current.completeLesson("l1", 9999); });
    expect(rpc).toHaveBeenCalledWith("complete_lesson", { p_lesson_id: "l1" });
    expect(awarded).toBe(20);
    expect(result.current.isLessonCompleted("l1")).toBe(true);
  });

  it("does not report success when the save fails", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "denied" } });
    const { result } = renderHook(() => useLessonProgress());
    await waitFor(() => expect(result.current.loading).toBe(false));
    let awarded: number | null = 1;
    await act(async () => { awarded = await result.current.completeLesson("l1"); });
    expect(awarded).toBeNull();
    expect(result.current.isLessonCompleted("l1")).toBe(false);
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive" }));
  });

  it("a second completion of the same lesson makes no new request", async () => {
    rpc.mockResolvedValue({ data: { id: "p", user_id: "user-a", lesson_id: "l1", status: "completed", completed_at: "x", xp_earned: 20 }, error: null });
    const { result } = renderHook(() => useLessonProgress());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.completeLesson("l1"); });
    await act(async () => { await result.current.completeLesson("l1"); });
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});
