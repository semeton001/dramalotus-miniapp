import {
  clearInvalidSessionCookieIfNeeded,
  getSessionTokenFromCookie,
  findValidSessionByToken,
} from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type CurrentUser = {
  id: string;
  telegram_user_id: number;
  membership_status: "free" | "vip";
  telegram_username: string | null;
  first_name: string | null;
  last_name: string | null;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const sessionToken = await getSessionTokenFromCookie();

  if (!sessionToken) {
    return null;
  }

  const session = await findValidSessionByToken(sessionToken);

  if (!session) {
    await clearInvalidSessionCookieIfNeeded();
    return null;
  }

  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select(
      "id, telegram_user_id, membership_status, telegram_username, first_name, last_name"
    )
    .eq("id", session.user_id)
    .single();

  if (error || !user) {
    await clearInvalidSessionCookieIfNeeded();
    return null;
  }

  return user as CurrentUser;
}
