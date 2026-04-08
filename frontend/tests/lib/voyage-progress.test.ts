import { VoyageNode } from "@/types";
import {
  computeNodeStatuses,
  computeCompletionPercentage,
  findFirstIncompleteNode,
} from "@/lib/voyage-progress";

// ---------------------------------------------------------------------------
// Helpers to build test nodes
// ---------------------------------------------------------------------------

function makeMainNode(
  id: number,
  orderIndex: number,
  overrides: Partial<VoyageNode> = {},
): VoyageNode {
  return {
    id,
    isMainPath: true,
    branchType: "required",
    nodeType: "playlist",
    orderIndex,
    label: `Main ${id}`,
    childNodes: [],
    ...overrides,
  };
}

function makeBranchNode(
  id: number,
  parentNode: VoyageNode,
  overrides: Partial<VoyageNode> = {},
): VoyageNode {
  return {
    id,
    isMainPath: false,
    branchType: "required",
    nodeType: "playlist",
    orderIndex: 0,
    label: `Branch ${id}`,
    parentNode,
    childNodes: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// computeNodeStatuses
// ---------------------------------------------------------------------------

describe("computeNodeStatuses", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns empty map for empty nodes array", () => {
    const statuses = computeNodeStatuses([], new Set());
    expect(statuses.size).toBe(0);
  });

  it("marks single main node as available when not completed", () => {
    const node = makeMainNode(1, 0);
    const statuses = computeNodeStatuses([node], new Set());
    expect(statuses.get(1)).toBe("available");
  });

  it("marks single main node as completed when in completedNodeIds", () => {
    const node = makeMainNode(1, 0);
    const statuses = computeNodeStatuses([node], new Set([1]));
    expect(statuses.get(1)).toBe("completed");
  });

  it("first main node and its branches are always available (never locked)", () => {
    const main1 = makeMainNode(1, 0);
    const branch1 = makeBranchNode(10, main1);
    main1.childNodes = [branch1];

    const statuses = computeNodeStatuses([main1, branch1], new Set());

    expect(statuses.get(1)).toBe("available");
    expect(statuses.get(10)).toBe("available");
  });

  it("second main node is locked when first main node is not completed", () => {
    const main1 = makeMainNode(1, 0);
    const main2 = makeMainNode(2, 1);

    const statuses = computeNodeStatuses([main1, main2], new Set());

    expect(statuses.get(1)).toBe("available");
    expect(statuses.get(2)).toBe("locked");
  });

  it("second main node is available when first main node is completed (no branches)", () => {
    const main1 = makeMainNode(1, 0);
    const main2 = makeMainNode(2, 1);

    const statuses = computeNodeStatuses([main1, main2], new Set([1]));

    expect(statuses.get(1)).toBe("completed");
    expect(statuses.get(2)).toBe("available");
  });

  it("second main node is locked when first main is completed but required branch is not", () => {
    const main1 = makeMainNode(1, 0);
    const requiredBranch = makeBranchNode(10, main1, {
      branchType: "required",
    });
    main1.childNodes = [requiredBranch];

    const main2 = makeMainNode(2, 1);

    // main1 completed but branch 10 not completed
    const statuses = computeNodeStatuses(
      [main1, requiredBranch, main2],
      new Set([1]),
    );

    expect(statuses.get(1)).toBe("completed");
    expect(statuses.get(10)).toBe("available");
    expect(statuses.get(2)).toBe("locked");
  });

  it("second main node is available when first main AND all required branches are completed", () => {
    const main1 = makeMainNode(1, 0);
    const requiredBranch = makeBranchNode(10, main1, {
      branchType: "required",
    });
    main1.childNodes = [requiredBranch];

    const main2 = makeMainNode(2, 1);

    const statuses = computeNodeStatuses(
      [main1, requiredBranch, main2],
      new Set([1, 10]),
    );

    expect(statuses.get(1)).toBe("completed");
    expect(statuses.get(10)).toBe("completed");
    expect(statuses.get(2)).toBe("available");
  });

  it("optional branches do NOT block progression to next main node", () => {
    const main1 = makeMainNode(1, 0);
    const optionalBranch = makeBranchNode(10, main1, {
      branchType: "optional",
    });
    main1.childNodes = [optionalBranch];

    const main2 = makeMainNode(2, 1);

    // main1 completed but optional branch not completed
    const statuses = computeNodeStatuses(
      [main1, optionalBranch, main2],
      new Set([1]),
    );

    expect(statuses.get(10)).toBe("available");
    expect(statuses.get(2)).toBe("available"); // not blocked by optional branch
  });

  it("branch nodes are available if their parent main node is available", () => {
    const main1 = makeMainNode(1, 0);
    const branch = makeBranchNode(10, main1);
    main1.childNodes = [branch];

    // main1 not completed but is available (it's the first)
    const statuses = computeNodeStatuses([main1, branch], new Set());

    expect(statuses.get(1)).toBe("available");
    expect(statuses.get(10)).toBe("available");
  });

  it("branch nodes are available if their parent main node is completed", () => {
    const main1 = makeMainNode(1, 0);
    const branch = makeBranchNode(10, main1);
    main1.childNodes = [branch];

    const statuses = computeNodeStatuses([main1, branch], new Set([1]));

    expect(statuses.get(1)).toBe("completed");
    expect(statuses.get(10)).toBe("available");
  });

  it("branch of a locked main node is locked", () => {
    const main1 = makeMainNode(1, 0);
    const main2 = makeMainNode(2, 1);
    const branch = makeBranchNode(10, main2);
    main2.childNodes = [branch];

    // main1 not completed so main2 is locked
    const statuses = computeNodeStatuses([main1, main2, branch], new Set());

    expect(statuses.get(2)).toBe("locked");
    expect(statuses.get(10)).toBe("locked");
  });

  it("handles 3 main nodes in sequence with correct lock propagation", () => {
    const main1 = makeMainNode(1, 0);
    const main2 = makeMainNode(2, 1);
    const main3 = makeMainNode(3, 2);

    // Only main1 completed
    const statuses = computeNodeStatuses([main1, main2, main3], new Set([1]));

    expect(statuses.get(1)).toBe("completed");
    expect(statuses.get(2)).toBe("available");
    expect(statuses.get(3)).toBe("locked");
  });

  it("processes nodes regardless of input order (sorts by orderIndex)", () => {
    // Provide nodes in reverse order
    const main1 = makeMainNode(1, 0);
    const main2 = makeMainNode(2, 1);

    // Pass in reversed order
    const statuses = computeNodeStatuses([main2, main1], new Set([1]));

    expect(statuses.get(1)).toBe("completed");
    expect(statuses.get(2)).toBe("available");
  });
});

// ---------------------------------------------------------------------------
// computeCompletionPercentage
// ---------------------------------------------------------------------------

describe("computeCompletionPercentage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 0 for empty nodes array", () => {
    expect(computeCompletionPercentage([], new Set())).toBe(0);
  });

  it("returns 0 when no nodes are completed", () => {
    const nodes = [makeMainNode(1, 0), makeMainNode(2, 1)];
    expect(computeCompletionPercentage(nodes, new Set())).toBe(0);
  });

  it("returns 100 when all required nodes are completed", () => {
    const nodes = [makeMainNode(1, 0), makeMainNode(2, 1)];
    expect(computeCompletionPercentage(nodes, new Set([1, 2]))).toBe(100);
  });

  it("returns 50 when half of required nodes are completed", () => {
    const nodes = [makeMainNode(1, 0), makeMainNode(2, 1)];
    expect(computeCompletionPercentage(nodes, new Set([1]))).toBe(50);
  });

  it("does not count optional branch nodes in percentage", () => {
    const main1 = makeMainNode(1, 0);
    const optionalBranch = makeBranchNode(10, main1, {
      branchType: "optional",
    });
    main1.childNodes = [optionalBranch];

    // Only main1 is required; optionalBranch is not
    // Completing optionalBranch should not affect percentage
    const total = computeCompletionPercentage(
      [main1, optionalBranch],
      new Set([10]),
    );
    expect(total).toBe(0); // main1 not completed, optional doesn't count

    const withMain = computeCompletionPercentage(
      [main1, optionalBranch],
      new Set([1, 10]),
    );
    expect(withMain).toBe(100); // 1 required completed out of 1 required
  });

  it("counts main path nodes (branchType=required) in percentage", () => {
    // main nodes have isMainPath=true and branchType="required"
    const main1 = makeMainNode(1, 0);
    const main2 = makeMainNode(2, 1);
    const requiredBranch = makeBranchNode(10, main1, {
      branchType: "required",
    });
    main1.childNodes = [requiredBranch];

    // 3 total required nodes: main1, main2, requiredBranch
    // complete main1 and requiredBranch -> 2/3 = 66.67%
    const pct = computeCompletionPercentage(
      [main1, main2, requiredBranch],
      new Set([1, 10]),
    );
    expect(pct).toBeCloseTo(66.67, 1);
  });

  it("returns 0 when only optional nodes exist and none are completed", () => {
    const main1 = makeMainNode(1, 0);
    // no required branches
    expect(computeCompletionPercentage([main1], new Set())).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// findFirstIncompleteNode
// ---------------------------------------------------------------------------

describe("findFirstIncompleteNode", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null for empty nodes", () => {
    expect(findFirstIncompleteNode([], new Set())).toBeNull();
  });

  it("returns the first main node when nothing is completed", () => {
    const main1 = makeMainNode(1, 0);
    const main2 = makeMainNode(2, 1);

    const result = findFirstIncompleteNode([main1, main2], new Set());
    expect(result?.id).toBe(1);
  });

  it("returns the second main node when first is completed", () => {
    const main1 = makeMainNode(1, 0);
    const main2 = makeMainNode(2, 1);

    const result = findFirstIncompleteNode([main1, main2], new Set([1]));
    expect(result?.id).toBe(2);
  });

  it("returns null when all main nodes are completed", () => {
    const main1 = makeMainNode(1, 0);
    const main2 = makeMainNode(2, 1);

    const result = findFirstIncompleteNode([main1, main2], new Set([1, 2]));
    expect(result).toBeNull();
  });

  it("processes nodes in orderIndex order regardless of input order", () => {
    const main1 = makeMainNode(1, 0);
    const main2 = makeMainNode(2, 1);
    const main3 = makeMainNode(3, 2);

    // Pass in jumbled order
    const result = findFirstIncompleteNode(
      [main3, main1, main2],
      new Set([1, 2]),
    );
    expect(result?.id).toBe(3);
  });

  it("only considers main path nodes (not branches)", () => {
    const main1 = makeMainNode(1, 0);
    const branch = makeBranchNode(10, main1);
    main1.childNodes = [branch];

    // branch not completed, but findFirstIncompleteNode only looks at main path
    const result = findFirstIncompleteNode([main1, branch], new Set([1]));
    // main1 completed, no more main nodes -> null
    expect(result).toBeNull();
  });
});
