import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { ROLE_HOME_PATH } from "@/lib/constants";

export default async function HomePage() {
  const session = await verifySession();
  redirect(ROLE_HOME_PATH[session.role]);
}
