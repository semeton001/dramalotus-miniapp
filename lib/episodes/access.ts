import type { CurrentUser } from "@/lib/auth/getCurrentUser";
import type { Episode } from "@/types/episode";

export const FREE_EPISODE_LIMIT = 10;

export function isEpisodePremium(episode: Pick<Episode, "episodeNumber" | "isLocked" | "isVipOnly">) {
  return (
    Number(episode.episodeNumber) > FREE_EPISODE_LIMIT ||
    Boolean(episode.isLocked) ||
    Boolean(episode.isVipOnly)
  );
}

export function canUserAccessEpisode(
  user: Pick<CurrentUser, "membership_status">,
  episode: Pick<Episode, "episodeNumber" | "isLocked" | "isVipOnly">
) {
  if (user.membership_status === "vip") {
    return true;
  }

  return !isEpisodePremium(episode);
}

export function getEpisodeAccessLabel(
  user: Pick<CurrentUser, "membership_status">,
  episode: Pick<Episode, "episodeNumber" | "isLocked" | "isVipOnly">
) {
  return canUserAccessEpisode(user, episode) ? "watch" : "vip_only";
}
