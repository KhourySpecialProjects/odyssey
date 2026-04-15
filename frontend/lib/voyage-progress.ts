import { VoyageNode } from "@/types";

type NodeStatus = "completed" | "available" | "locked";

/**
 * Returns true if the node can be completed by the user:
 * - Playlist nodes always have content and are always completable.
 * - Droplet nodes are completable only when the linked droplet is published.
 * - Placeholder droplet nodes (no droplet linked) or nodes with a draft/edit
 *   droplet are NOT completable — they do not block progression and are excluded
 *   from the completion denominator.
 */
export function isCompletableNode(node: VoyageNode): boolean {
  if (node.nodeType === "droplet") {
    return node.droplet?.status === "published";
  }

  // Playlist nodes (and any future node types) are always completable.
  return true;
}

/**
 * Returns true if a main node's gate is satisfied for the purpose of unlocking
 * the next main node. A gate is satisfied when:
 * - The main node itself is completed, OR
 * - The main node is not completable (placeholder/draft droplet) — these nodes
 *   are transparent in the sequential chain and never block progression.
 * Additionally, all required completable branches of the main node must also
 * be completed (non-completable branches are skipped).
 */
function isMainNodeGateSatisfied(
  mainNode: VoyageNode,
  branchNodes: VoyageNode[],
  completedNodeIds: Set<number>,
): boolean {
  // Non-completable main nodes are transparent — they never block.
  if (!isCompletableNode(mainNode)) {
    return true;
  }

  // Completable main node must itself be completed.
  if (!completedNodeIds.has(mainNode.id)) {
    return false;
  }

  // All required completable branches must also be completed.
  const branches = branchNodes.filter((b) => b.parentNode?.id === mainNode.id);
  return branches
    .filter((b) => b.branchType === "required" && isCompletableNode(b))
    .every((b) => completedNodeIds.has(b.id));
}

/**
 * Given the full list of voyage nodes and the set of completed node IDs,
 * compute each node's status using the lock/unlock algorithm:
 *
 * 1. Sort main path nodes by orderIndex.
 * 2. The first main node and its branches are always "available" (never locked).
 * 3. A main node at position N is "available" if all previous main nodes'
 *    gates are satisfied. Non-completable main nodes (placeholder/draft droplet
 *    nodes) are transparent — they do not block the nodes after them.
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

  // Compute status for each main node in sequence.
  // Track which main nodes are "unlocked" (available or completed) for branch resolution.
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

    // A main node is available when ALL preceding main nodes' gates are satisfied.
    // Non-completable nodes are transparent (their gate is always satisfied).
    const allPrevGatesSatisfied = mainNodes
      .slice(0, i)
      .every((prev) =>
        isMainNodeGateSatisfied(prev, branchNodes, completedNodeIds),
      );

    if (allPrevGatesSatisfied) {
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
 * Non-completable nodes (placeholder/draft droplet nodes) are excluded from
 * the denominator — they have no content to complete yet.
 * Returns a number between 0 and 100.
 */
export function computeCompletionPercentage(
  nodes: VoyageNode[],
  completedNodeIds: Set<number>,
): number {
  const requiredAndCompletableNodes = nodes.filter(
    (n) => n.branchType !== "optional" && isCompletableNode(n),
  );

  if (requiredAndCompletableNodes.length === 0) {
    return 0;
  }

  const completedRequired = requiredAndCompletableNodes.filter((n) =>
    completedNodeIds.has(n.id),
  );

  return (completedRequired.length / requiredAndCompletableNodes.length) * 100;
}

/**
 * Find the first incomplete main path node (sorted by orderIndex).
 * Used to determine the target for the "Continue" button.
 * Non-completable nodes (placeholder/draft droplet nodes) are skipped —
 * they cannot be the "continue" target since the user cannot complete them.
 * Returns null if all completable main path nodes are completed or there are none.
 */
export function findFirstIncompleteNode(
  nodes: VoyageNode[],
  completedNodeIds: Set<number>,
): VoyageNode | null {
  const mainNodes = nodes
    .filter((n) => n.isMainPath)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    mainNodes.find(
      (n) => isCompletableNode(n) && !completedNodeIds.has(n.id),
    ) ?? null
  );
}
