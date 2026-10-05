import { fetchContentEditors } from "@/lib/requests/authorized-user";
import { mockGlobalFetch, makeFetchResponse } from "@/lib/testing/mock-helpers";

describe("fetchContentEditors", () => {
  it("only selects and sorts by attributes authorized-user has (ODY-635 R3)", async () => {
    const fetchMock = mockGlobalFetch();
    fetchMock.mockResolvedValueOnce(makeFetchResponse({ data: [] }));

    await fetchContentEditors();

    const url = decodeURIComponent(fetchMock.mock.calls[0][0] as string);
    expect(url).toContain("fields[0]=id");
    expect(url).toContain("fields[1]=firstName");
    expect(url).toContain("fields[2]=lastName");
    expect(url).toContain("fields[3]=email");
    expect(url).toContain("sort[0]=lastName");
    expect(url).not.toContain("username");
  });
});
