import type { InfluencerProfileEditInput } from "../schemas/influencer-profile-edit-schema";

export interface InfluencerProfileDto extends Omit<
  InfluencerProfileEditInput,
  "expectedVersion"
> {
  avatarAssetId: string | null;
  coverAssetId: string | null;
  version: number;
}

export type InfluencerProfileUpdateResult =
  | {
      kind: "updated";
      profile: InfluencerProfileDto;
    }
  | {
      currentVersion: number;
      kind: "conflict";
    };

export interface InfluencerProfileActionState {
  fieldErrors?: Record<string, string[]>;
  message?: string;
  profileVersion?: number;
  status: "idle" | "error" | "success";
}

export type InfluencerProfileAction = (
  previousState: InfluencerProfileActionState,
  formData: FormData,
) => Promise<InfluencerProfileActionState>;

export const initialInfluencerProfileActionState: InfluencerProfileActionState =
  {
    status: "idle",
  };
