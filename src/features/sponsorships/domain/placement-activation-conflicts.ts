import { allowsMultipleActive } from "./placement-slot-catalog";

export interface ActivePlacementRef {
  id: string;
  slotKey: string;
}

/**
 * Ids that must be deactivated before `targetId` is activated in `slotKey`.
 *
 * Only single-item slots conflict; carousel and list slots accept several
 * active placements. `activePlacements` is whatever the screen currently knows
 * to be live (callers exclude archived ones); existing data may already hold
 * several active placements in one slot, so every other one is returned.
 * A target that is already active has nothing to deactivate.
 */
export function placementsToDeactivateOnActivate({
  activePlacements,
  slotKey,
  targetId,
}: {
  activePlacements: readonly ActivePlacementRef[];
  slotKey: string;
  targetId: string;
}): string[] {
  if (allowsMultipleActive(slotKey)) return [];
  if (activePlacements.some((placement) => placement.id === targetId)) {
    return [];
  }
  return activePlacements
    .filter((placement) => placement.slotKey === slotKey)
    .map((placement) => placement.id);
}
