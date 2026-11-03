import { renderHook } from "@testing-library/react";
import { usePathname, useSearchParams } from "next/navigation";
import { useUrlPage } from "@/hooks/use-url-page";

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
  useSearchParams: jest.fn(),
}));

describe("useUrlPage", () => {
  let pushStateSpy: jest.SpyInstance;

  const withUrl = (query: string | null) => {
    (useSearchParams as jest.Mock).mockReturnValue(
      query === null ? null : new URLSearchParams(query),
    );
    return renderHook(() => useUrlPage()).result;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (usePathname as jest.Mock).mockReturnValue("/explore");
    pushStateSpy = jest
      .spyOn(window.history, "pushState")
      .mockImplementation(() => {});
  });

  afterEach(() => {
    pushStateSpy.mockRestore();
  });

  it.each<[string, string | null, number]>([
    ["no param", "", 1],
    ["page 3", "page=3", 3],
    ["letters", "page=abc", 1],
    ["zero", "page=0", 1],
    ["a negative page", "page=-2", 1],
    ["a fraction", "page=2.5", 1],
    ["a missing router context", null, 1],
  ])("reads %s as page %i", (_label, query, page) => {
    expect(withUrl(query).current[0]).toBe(page);
  });

  it("writes a new page into the URL, keeping the other params", () => {
    withUrl("sort=name-asc&q=py").current[1](4);
    expect(pushStateSpy).toHaveBeenCalledWith(
      null,
      "",
      "/explore?sort=name-asc&q=py&page=4",
    );
  });

  it.each([
    ["page=3&q=py", "/explore?q=py"],
    ["page=3", "/explore"],
  ])("leaves page 1 out of the URL (from ?%s)", (query, url) => {
    withUrl(query).current[1](1);
    expect(pushStateSpy).toHaveBeenCalledWith(null, "", url);
  });
});
