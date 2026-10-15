# Voyage Skill Tree — Design Spec

**Date:** 2026-04-08
**Status:** Approved
**Ticket:** ODY-396

## Overview

Transform the voyage viewer from a linear S-curve into a skill tree with branching sub-islands. Main islands flow vertically (the main path). Each main island can have smaller branch islands connected by dashed lines to the side. Branches can be "all required" or "pick one."

## Data Model

### Current: `voyage_playlist`

```
{ orderIndex, voyage, playlist }
```

### New: `voyage_node`

```
VoyageNode {
  id: number
  label: string               // Display name
  nodeType: "playlist" | "topic"  // topic = label-only, no content
  playlist?: Playlist         // Linked playlist (when nodeType = "playlist")
  voyage: Voyage              // Parent voyage
  parentNode?: VoyageNode     // null = main path root
  isMainPath: boolean         // true = on the vertical spine, false = branch
  branchType: "required" | "optional" | "pick-one"
  orderIndex: number          // Order among siblings
}
```

- Main path nodes: `isMainPath: true`, `parentNode: null` or previous main node
- Branch nodes: `isMainPath: false`, `parentNode` = the main island they branch from
- `branchType` on the branch node itself says what kind it is

### Backwards compatibility

Keep `voyage_playlists` relation working for now. The new `voyage_nodes` is additive. Old voyages without nodes render the S-curve as before.

## Viewer Layout

### Main path (vertical spine)

- Big islands (80x68px) with palm trees, step badges, labels
- Connected by dashed vertical lines
- Flows top to bottom, centered

### Branch islands

- Smaller islands (52x44px) with smaller palm trees
- Connected to their parent main island by horizontal dashed lines
- Left side: required branches
- Right side: optional branches
- "REQUIRED" / "OPTIONAL" / "PICK ONE" tiny labels above branch groups

### Node states (Phase 2 — for now everything is clickable)

- Completed: green checkmark badge
- Available: blue glow ring animation
- Locked: gray island, SVG lock icon (no emoji), reduced opacity
- Optional: yellow ring

## Components

### `VoyageTreeMap` (new component)

Replaces `VoyageMap` when voyage has `voyage_nodes`. Renders:

1. Main path nodes vertically
2. For each main node, branch nodes to left/right
3. Dashed SVG lines connecting everything
4. Wave marks, sailboat decoration

### `VoyageTreeIsland` (new component)

Renders a single island node. Props: `size: "main" | "branch"`, `status`, `label`, `href`.

### `VoyageTreeConnector` (new component)

SVG dashed lines — vertical for main path, horizontal for branches.

## Implementation Phases

### Phase 1 (this session): Static tree rendering

- Create test data via Strapi API (voyage_nodes)
- Build `VoyageTreeMap` component
- Render on voyage detail page
- No enrollment/tracking — everything clickable

### Phase 2 (future): Enrollment + tracking

### Phase 3 (future): Creation UI with dependency editor

## Test Data

Create a "Data Science Explorer" voyage with:

1. Main: Intro to Python (root)
2. Main: Data Types
   - Branch required: Pandas
   - Branch required: NumPy
   - Branch optional: Matplotlib
3. Main: Data Analysis
4. Main: Final Project
   - Branch pick-one: ML Path
   - Branch pick-one: Viz Path
