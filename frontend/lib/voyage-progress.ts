import { VoyageNode } from "@/types";

type NodeStatus = "completed" | "available" | "locked";

/**
 * Given the full list of voyage nodes and the set of completed node IDs,
 * compute each node's status using the lock/unlock algorithm:
 *
 * 1. Sort main path nodes by orderIndex.
 * 2. The first main node and its branches are always "available" (never locked).
 * 3. A main node at position N is "available" if the previous main node (N-1)
 *    is completed AND all of N-1's required branches are completed.
 * 4. A branch node is "available" if its parent main node is available or completed.
 * 5. A node is "completed" if its ID is in completedNodeIds.
 * 6. Everything else is "locked".
 */
export function computeNodeStatuses(
  nodes: VoyageNode[],
  completedNodeIds: Set<number>,
): Map<number, NodeStatus> {
  const statuses = new Map<number, NodeStatus>();

  if (nodes.length === 0) {
    return statuses;
  }

  // Separate main path nodes from branch nodes
  const mainNodes = nodes
    .filter((n) => n.isMainPath)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const branchNodes = nodes.filter((n) => !n.isMainPath);

  // Compute status for each main node in sequence
  // Track which main nodes are "unlocked" (available or completed) for branch resolution
  const mainNodeUnlocked = new Map<number, boolean>();

  for (let i = 0; i < mainNodes.length; i++) {
    const node = mainNodes[i];
    const isCompleted = completedNodeIds.has(node.id);

    if (isCompleted) {
      statuses.set(node.id, "completed");
      mainNodeUnlocked.set(node.id, true);
      continue;
    }

    if (i === 0) {
      // First main node is always available
      statuses.set(node.id, "available");
      mainNodeUnlocked.set(node.id, true);
      continue;
    }

    // Check if previous main node is completed AND all its required branches are done
    const prevMain = mainNodes[i - 1];
    const prevMainCompleted = completedNodeIds.has(prevMain.id);

    if (!prevMainCompleted) {
      statuses.set(node.id, "locked");
      mainNodeUnlocked.set(node.id, false);
      continue;
    }

    // Check that all required branches of prevMain are completed
    const prevMainBranches = branchNodes.filter(
      (b) => b.parentNode?.id === prevMain.id,
    );
    const allRequiredBranchesDone = prevMainBranches
      .filter((b) => b.branchType === "required")
      .every((b) => completedNodeIds.has(b.id));

    if (allRequiredBranchesDone) {
      statuses.set(node.id, "available");
      mainNodeUnlocked.set(node.id, true);
    } else {
      statuses.set(node.id, "locked");
      mainNodeUnlocked.set(node.id, false);
    }
  }

  // Compute status for branch nodes based on their parent main node's status
  for (const branch of branchNodes) {
    const isCompleted = completedNodeIds.has(branch.id);

    if (isCompleted) {
      statuses.set(branch.id, "completed");
      continue;
    }

    const parentId = branch.parentNode?.id;
    if (parentId !== undefined && mainNodeUnlocked.get(parentId)) {
      statuses.set(branch.id, "available");
    } else {
      statuses.set(branch.id, "locked");
    }
  }

  return statuses;
}

/**
 * Calculate overall completion percentage.
 * Only required nodes count (branchType !== "optional").
 * Returns a number between 0 and 100.
 */
export function computeCompletionPercentage(
  nodes: VoyageNode[],
  completedNodeIds: Set<number>,
): number {
  const requiredNodes = nodes.filter((n) => n.branchType !== "optional");

  if (requiredNodes.length === 0) {
    return 0;
  }

  const completedRequired = requiredNodes.filter((n) =>
    completedNodeIds.has(n.id),
  );

  return (completedRequired.length / requiredNodes.length) * 100;
}

/**
 * Find the first incomplete main path node (sorted by orderIndex).
 * Used to determine the target for the "Continue" button.
 * Returns null if all main path nodes are completed or there are none.
 */
export function findFirstIncompleteNode(
  nodes: VoyageNode[],
  completedNodeIds: Set<number>,
): VoyageNode | null {
  const mainNodes = nodes
    .filter((n) => n.isMainPath)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  return mainNodes.find((n) => !completedNodeIds.has(n.id)) ?? null;
}
