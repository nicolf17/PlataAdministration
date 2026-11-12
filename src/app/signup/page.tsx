import { SignupForm } from "./signup-form";

// El formulario mantiene estado de verificación (paso 1 → paso 2) y depende de
// cookies para el layout: no hay shell instantáneo que mostrar antes de resolverlo.
export const instant = false;

export default function SignupPage() {
  return <SignupForm />;
}
