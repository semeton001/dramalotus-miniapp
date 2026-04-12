import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/requireUser";

export async function requireVip() {
  const user = await requireUser();

  if (user.membership_status !== "vip") {
    redirect("/me");
  }

  return user;
}
