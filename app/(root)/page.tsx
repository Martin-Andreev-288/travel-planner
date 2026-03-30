import { auth } from "@/auth";
import Home from "./home";

export default async function Page() {
  const session = await auth();
  return <Home session={session} />;
}
