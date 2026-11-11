import { connection } from "next/server";

import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ salida?: string }>;
}) {
  await connection();
  const params = await searchParams;
  return <LoginForm loggedOut={params.salida === "1"} />;
}
