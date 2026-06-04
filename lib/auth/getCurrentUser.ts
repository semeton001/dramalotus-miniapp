import {
  clearInvalidSessionCookieIfNeeded,
  getSessionTokenFromCookie,
  findValidSessionByToken,
} from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type CurrentUser = {
  id: string;
  telegram_user_id: number | null;
  telegram_username: string | null;
  first_name: string | null;
  last_name: string | null;
  membership_status: "free" | "vip";
  vip_until: string | null;
  email: string | null;
  role: string;
  is_active: boolean;
  is_demo_verification: boolean;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const sessionToken = await getSessionTokenFromCookie();

  if (!sessionToken) return null;

  const session = await findValidSessionByToken(sessionToken);

  if (!session) {
    await clearInvalidSessionCookieIfNeeded();
    return null;
  }

  const { data: user, error } = await supabaseAdmin
    .from("app_users")
    .select("id, membership_status, vip_until, email, role, is_active")
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

  return {
    telegram_user_id: null,
    telegram_username: null,
    first_name: null,
    last_name: null,
    is_demo_verification: false,
    ...user,
  } as CurrentUser;
}
