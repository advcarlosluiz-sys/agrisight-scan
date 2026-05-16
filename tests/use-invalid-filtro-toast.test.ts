import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { toast } from "sonner";

import { useInvalidFiltroToast } from "@/hooks/use-invalid-filtro-toast";

const VALID = ["todos", "em_andamento", "analisando", "concluida", "cancelada"] as const;

function setUrl(search: string) {
  window.history.replaceState({}, "", `/dashboard${search}`);
}

describe("useInvalidFiltroToast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setUrl("");
  });

  it("does nothing when filtro is missing", async () => {
    setUrl("");
    renderHook(() => useInvalidFiltroToast(VALID));
    await new Promise((r) => setTimeout(r, 5));
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("does nothing when filtro is valid", async () => {
    setUrl("?filtro=concluida");
    renderHook(() => useInvalidFiltroToast(VALID));
    await new Promise((r) => setTimeout(r, 5));
    expect(toast.error).not.toHaveBeenCalled();
    expect(window.location.search).toBe("?filtro=concluida");
  });

  it("warns and strips filtro from the URL when invalid (preserving other params)", async () => {
    setUrl("?filtro=banana&q=foo");
    renderHook(() => useInvalidFiltroToast(VALID));

    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
    const [, opts] = (toast.error as unknown as { mock: { calls: unknown[][] } }).mock.calls[0];
    expect((opts as { description: string }).description).toContain("banana");

    expect(window.location.search).toBe("?q=foo");
  });
});
