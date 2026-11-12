import { LoginForm } from "./login-form";

// La página depende de `searchParams` (?salida=1) y de la cookie de sesión:
// no hay shell "instantáneo" que mostrar antes de resolver las dos cosas.
export const instant = false;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ salida?: string }>;
}) {
  const params = await searchParams;
  return <LoginForm loggedOut={params.salida === "1"} />;
}
