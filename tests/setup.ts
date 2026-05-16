import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.clearAllMocks();
});

// Stub Supabase client used by use-persisted-filter so unit tests stay offline.
vi.mock("@/integrations/supabase/client", () => {
  const maybeSingle = vi.fn().mockResolvedValue({ data: null });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const update = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: null }) }));
  const from = vi.fn(() => ({ select, update }));
  return {
    supabase: {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from,
    },
  };
});

// sonner toast mock
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    error: vi.fn(),
    success: vi.fn(),
  }),
}));
