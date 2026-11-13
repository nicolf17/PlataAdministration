import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth";

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

  // Acá se decide con la base, no con la firma del token: si la sesión es real,
  // la persona ya está adentro y no tiene sentido mostrarle el formulario.
  if (params.salida !== "1") {
    const user = await getSessionUser();
    if (user) redirect("/");
  }

  return <LoginForm loggedOut={params.salida === "1"} />;
}
