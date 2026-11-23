/** @jest-environment node */
jest.mock("server-only", () => ({}));
import { studentAllowsPersonalization } from "@/lib/mentor/personalization";

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  jest.spyOn(console, "error").mockImplementation(() => {});
});

const reply = (data: unknown, ok = true) =>
  fetchMock.mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: async () => data,
  });

describe("studentAllowsPersonalization", () => {
  it("is true when the student left it on", async () => {
    reply({ data: [{ id: 7, mentorPersonalization: true }] });
    await expect(studentAllowsPersonalization(7)).resolves.toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("filters[id][$eq]=7");
    expect(init.cache).toBe("no-store");
  });

  it("is false when the student turned it off", async () => {
    reply({ data: [{ id: 7, mentorPersonalization: false }] });
    await expect(studentAllowsPersonalization(7)).resolves.toBe(false);
  });

  it.each([[undefined], [null]])("counts %s as on", async (value) => {
    reply({ data: [{ id: 7, mentorPersonalization: value }] });
    await expect(studentAllowsPersonalization(7)).resolves.toBe(true);
  });

  it("fails closed when the fetch throws", async () => {
    fetchMock.mockRejectedValue(new Error("down"));
    await expect(studentAllowsPersonalization(7)).resolves.toBe(false);
  });

  it("fails closed on a non-ok response or a missing user", async () => {
    reply({ data: [] }, false);
    await expect(studentAllowsPersonalization(7)).resolves.toBe(false);
    reply({ data: [] });
    await expect(studentAllowsPersonalization(7)).resolves.toBe(false);
  });
});
