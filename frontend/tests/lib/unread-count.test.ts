import { formatUnreadCount } from "@/lib/unread-count";

describe("formatUnreadCount", () => {
  it.each([0, -1, NaN])("renders nothing for %p", (n) => {
    expect(formatUnreadCount(n)).toBeNull();
  });

  it.each([
    [1, "1"],
    [99, "99"],
    [100, "99+"],
    [1234, "99+"],
  ])("formats %p as %p", (n, text) => {
    expect(formatUnreadCount(n)).toBe(text);
  });
});
