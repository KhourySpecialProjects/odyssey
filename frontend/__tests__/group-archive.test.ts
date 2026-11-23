import { getGroupArchiveState, getHighestGroupRole } from "@/lib/group-archive";
import { Group, GroupSemester } from "@/types";

function makeGroup(overrides: Partial<Group> = {}): Group {
  return {
    id: 1,
    groupName: "Test Group",
    slug: "test-group",
    semester: "SPRING" as GroupSemester,
    isArchived: false,
    creator: { id: 100 } as Group["creator"],
    admins: [],
    managers: [],
    members: [],
    users_archived: [],
    ...overrides,
  };
}

describe("getGroupArchiveState", () => {
  it("is not archived when neither flag is set", () => {
    const group = makeGroup();
    const state = getGroupArchiveState(group, 5);

    expect(state).toEqual({
      archivedForMe: false,
      archivedForEveryone: false,
      isEffectivelyArchived: false,
      canManage: false,
    });
  });

  it("is archivedForMe when the viewer is in users_archived", () => {
    const group = makeGroup({
      users_archived: [{ id: 5 }] as Group["users_archived"],
    });
    const state = getGroupArchiveState(group, 5);

    expect(state.archivedForMe).toBe(true);
    expect(state.archivedForEveryone).toBe(false);
    expect(state.isEffectivelyArchived).toBe(true);
  });

  it("is archivedForEveryone when isArchived is true", () => {
    const group = makeGroup({ isArchived: true });
    const state = getGroupArchiveState(group, 5);

    expect(state.archivedForMe).toBe(false);
    expect(state.archivedForEveryone).toBe(true);
    expect(state.isEffectivelyArchived).toBe(true);
  });

  it("is effectively archived when both flags are set", () => {
    const group = makeGroup({
      isArchived: true,
      users_archived: [{ id: 5 }] as Group["users_archived"],
    });
    const state = getGroupArchiveState(group, 5);

    expect(state.archivedForMe).toBe(true);
    expect(state.archivedForEveryone).toBe(true);
    expect(state.isEffectivelyArchived).toBe(true);
  });

  it("archivedForMe is false when a different user is in users_archived", () => {
    const group = makeGroup({
      users_archived: [{ id: 99 }] as Group["users_archived"],
    });
    const state = getGroupArchiveState(group, 5);

    expect(state.archivedForMe).toBe(false);
    expect(state.isEffectivelyArchived).toBe(false);
  });

  it("treats missing users_archived as empty", () => {
    const group = makeGroup({ users_archived: undefined });
    const state = getGroupArchiveState(group, 5);

    expect(state.archivedForMe).toBe(false);
  });

  it("treats null users_archived as empty", () => {
    const group = makeGroup({
      users_archived: null as unknown as Group["users_archived"],
    });
    const state = getGroupArchiveState(group, 5);

    expect(state.archivedForMe).toBe(false);
  });

  it("treats missing isArchived as false", () => {
    const group = makeGroup({ isArchived: undefined as unknown as boolean });
    const state = getGroupArchiveState(group, 5);

    expect(state.archivedForEveryone).toBe(false);
  });

  describe("canManage", () => {
    it("is true for the creator", () => {
      const group = makeGroup({ creator: { id: 5 } as Group["creator"] });
      expect(getGroupArchiveState(group, 5).canManage).toBe(true);
    });

    it("is true for an admin", () => {
      const group = makeGroup({ admins: [{ id: 5 }] as Group["admins"] });
      expect(getGroupArchiveState(group, 5).canManage).toBe(true);
    });

    it("is true for a manager", () => {
      const group = makeGroup({ managers: [{ id: 5 }] as Group["managers"] });
      expect(getGroupArchiveState(group, 5).canManage).toBe(true);
    });

    it("is false for a plain member", () => {
      const group = makeGroup({ members: [{ id: 5 }] as Group["members"] });
      expect(getGroupArchiveState(group, 5).canManage).toBe(false);
    });

    it("is false when admins/managers/creator are null or undefined", () => {
      const group = makeGroup({
        creator: undefined,
        admins: undefined,
        managers: undefined as unknown as Group["managers"],
      });
      expect(getGroupArchiveState(group, 5).canManage).toBe(false);
    });
  });
});

describe("getHighestGroupRole", () => {
  it("returns creator when the viewer is the creator", () => {
    const group = makeGroup({
      creator: { id: 5 } as Group["creator"],
      admins: [{ id: 5 }] as Group["admins"],
      members: [{ id: 5 }] as Group["members"],
    });
    expect(getHighestGroupRole(group, 5)).toBe("creator");
  });

  it("returns admin when the viewer is admin and member but not creator", () => {
    const group = makeGroup({
      creator: { id: 100 } as Group["creator"],
      admins: [{ id: 5 }] as Group["admins"],
      members: [{ id: 5 }] as Group["members"],
    });
    expect(getHighestGroupRole(group, 5)).toBe("admin");
  });

  it("returns manager when the viewer is a manager and member only", () => {
    const group = makeGroup({
      managers: [{ id: 5 }] as Group["managers"],
      members: [{ id: 5 }] as Group["members"],
    });
    expect(getHighestGroupRole(group, 5)).toBe("manager");
  });

  it("returns member when the viewer only has membership", () => {
    const group = makeGroup({ members: [{ id: 5 }] as Group["members"] });
    expect(getHighestGroupRole(group, 5)).toBe("member");
  });

  it("returns null when the viewer has no role in the group", () => {
    const group = makeGroup();
    expect(getHighestGroupRole(group, 5)).toBeNull();
  });

  it("treats missing relations as empty when computing highest role", () => {
    const group = makeGroup({
      creator: undefined,
      admins: undefined,
      managers: undefined as unknown as Group["managers"],
      members: undefined,
    });
    expect(getHighestGroupRole(group, 5)).toBeNull();
  });
});
