export const SOCIAL_CHANNEL_PLATFORMS = [
  "INSTAGRAM",
  "FACEBOOK",
  "YOUTUBE",
  "X",
  "THREADS",
  "TELEGRAM",
  "LINKEDIN",
] as const;

export type SocialChannelPlatform = (typeof SOCIAL_CHANNEL_PLATFORMS)[number];

export interface SocialChannelFormValue {
  followerCount: string;
  interactions?: string;
  isPrimary: boolean;
  newFollowers?: string;
  platform: SocialChannelPlatform;
  sharedContent?: string;
  url: string;
  views?: string;
}

function isSocialChannelPlatform(
  value: string,
): value is SocialChannelPlatform {
  return (SOCIAL_CHANNEL_PLATFORMS as readonly string[]).includes(value);
}

export function readSocialChannels(
  formData: FormData,
): SocialChannelFormValue[] {
  const entries: SocialChannelFormValue[] = [];

  for (const platform of SOCIAL_CHANNEL_PLATFORMS) {
    const selected = formData.get(`socialChannels.${platform}.selected`);
    const url = formData.get(`socialChannels.${platform}.url`);

    if (selected !== "on" || typeof url !== "string" || !url.trim()) {
      continue;
    }

    const followers = formData.get(`socialChannels.${platform}.followers`);
    const primary = formData.get(`socialChannels.${platform}.primary`);
    const entry: SocialChannelFormValue = {
      followerCount: typeof followers === "string" ? followers : "",
      isPrimary: primary === "on",
      platform,
      url,
    };

    if (platform === "INSTAGRAM") {
      const views = formData.get(`socialChannels.${platform}.views`);
      const interactions = formData.get(
        `socialChannels.${platform}.interactions`,
      );
      const newFollowers = formData.get(
        `socialChannels.${platform}.newFollowers`,
      );
      const sharedContent = formData.get(
        `socialChannels.${platform}.sharedContent`,
      );

      if (typeof views === "string") {
        entry.views = views;
      }
      if (typeof interactions === "string") {
        entry.interactions = interactions;
      }
      if (typeof newFollowers === "string") {
        entry.newFollowers = newFollowers;
      }
      if (typeof sharedContent === "string" && sharedContent.trim()) {
        entry.sharedContent = sharedContent;
      }
    }

    entries.push(entry);
  }

  if (entries.length > 0 && !entries.some((entry) => entry.isPrimary)) {
    entries[0].isPrimary = true;
  }

  return entries;
}

export function readSocialChannelPlatform(value: unknown) {
  return typeof value === "string" && isSocialChannelPlatform(value)
    ? value
    : undefined;
}
