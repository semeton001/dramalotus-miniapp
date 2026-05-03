import {
  clearInvalidSessionCookieIfNeeded,
  getSessionTokenFromCookie,
  findValidSessionByToken,
} from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type CurrentUser = {
  id: string;
  telegram_user_id: number | null;
  membership_status: "free" | "vip";
  vip_until: string | null;
  telegram_username: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: string;
  is_active: boolean;
  is_demo_verification: boolean;
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
      "id, telegram_user_id, membership_status, vip_until, telegram_username, first_name, last_name, email, role, is_active, is_demo_verification"
    )
    .eq("id", session.user_id)
    .single();

  if (error || !user) {
    await clearInvalidSessionCookieIfNeeded();
    return null;
  }

  if (!user.is_active) {
    await clearInvalidSessionCookieIfNeeded();
    return null;
  }

  return user as CurrentUser;
}
