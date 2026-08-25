import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";

export default function Home() {
  const session = getSessionFromCookies();
  redirect(session ? "/home" : "/login");
}
