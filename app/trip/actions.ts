"use server";

import { redirect } from "next/navigation";
import { clearPunterSession } from "@/lib/auth/punter";

export async function punterLogoutAction() {
  await clearPunterSession();
  redirect("/login/returning");
}
