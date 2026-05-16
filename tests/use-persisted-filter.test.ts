import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const navigateMock = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigateMock,
}));

import { usePersistedFilter } from "@/hooks/use-persisted-filter";

type Filtro = "todos" | "em_andamento" | "concluida";

function setUrl(search: string) {
  window.history.replaceState({}, "", `/dashboard${search}`);
}

describe("usePersistedFilter — reload, back/forward, deep-link", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    sessionStorage.clear();
    setUrl("");
  });

  it("restores from sessionStorage when URL has no filtro (reload / open in new tab without param)", async () => {
    sessionStorage.setItem("status-processo:filtro", "concluida");
    setUrl("");

    renderHook(() =>
      usePersistedFilter<Filtro>("status-processo:filtro", "todos", "todos", "/dashboard"),
    );

    await waitFor(() => expect(navigateMock).toHaveBeenCalledTimes(1));
    const call = navigateMock.mock.calls[0][0];
    expect(call.replace).toBe(true);
    const next = call.search({});
    expect(next.filtro).toBe("concluida");
  });

  it("does NOT override when the URL explicitly carries filtro (deep-link in a new tab)", async () => {
    sessionStorage.setItem("status-processo:filtro", "concluida");
    setUrl("?filtro=em_andamento");

    renderHook(() =>
      usePersistedFilter<Filtro>(
        "status-processo:filtro",
        "em_andamento",
        "todos",
        "/dashboard",
      ),
    );

    // give the async branch a chance to run; it must NOT navigate
    await new Promise((r) => setTimeout(r, 20));
    expect(navigateMock).not.toHaveBeenCalled();
    expect(sessionStorage.getItem("status-processo:filtro")).toBe("em_andamento");
  });

  it("persists current value to sessionStorage when it changes (later reload picks it up)", async () => {
    setUrl("?filtro=todos");

    const { rerender } = renderHook(
      ({ current }: { current: Filtro }) =>
        usePersistedFilter<Filtro>(
          "status-processo:filtro",
          current,
          "todos",
          "/dashboard",
        ),
      { initialProps: { current: "todos" as Filtro } },
    );

    // simulate user switching to "concluida"
    setUrl("?filtro=concluida");
    rerender({ current: "concluida" });

    await waitFor(() =>
      expect(sessionStorage.getItem("status-processo:filtro")).toBe("concluida"),
    );
  });

  it("popstate (browser back/forward) syncs sessionStorage with the URL", async () => {
    setUrl("?filtro=concluida");

    renderHook(() =>
      usePersistedFilter<Filtro>(
        "status-processo:filtro",
        "concluida",
        "todos",
        "/dashboard",
      ),
    );

    // simulate browser Back into a page that had filtro=em_andamento
    setUrl("?filtro=em_andamento");
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(sessionStorage.getItem("status-processo:filtro")).toBe("em_andamento");

    // and Back again to a URL without filtro → falls back to default
    setUrl("");
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(sessionStorage.getItem("status-processo:filtro")).toBe("todos");
  });
});
