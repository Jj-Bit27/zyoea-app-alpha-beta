import { useState } from "react";
import { gql } from "@apollo/client";
import { useAuth, $user } from "../../context/AuthContext";
import { getApolloClient } from "../../libs/apollo";
import { Button } from "../custom/Button";
import { Input } from "../custom/Input";
import { Card, CardContent, CardHeader } from "../custom/Card";
import { API_URL } from "../../config";
import { Spinner } from "../custom/Spinner";
import { addToast } from "../custom/Toast";
import { validarEmail } from "../../libs/ValidateEmail";
import { IoResize, IoRestaurant } from "react-icons/io5";

const ACCEPT_TERMS = gql`
  mutation acceptTerms($userId: ID!, $type: TermsType!) {
    acceptTerms(userId: $userId, type: $type)
  }
`;

export function RegisterForm() {
  const { register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const getRedirect = () => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return params.get("redirect") || (params.get("plan") ? `/subscribe/setup?planId=${params.get("plan")}` : null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !validarEmail(formData.email)) {
      addToast("El correo esta mal escrito o no hay correo", "error")
      return;
    }
    if (!formData.password) {
      addToast("La contraseña es obligatoria", "error")
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      addToast("Las contraseñas no coinciden", "error");
      return;
    }
    if (formData.password.length < 6) {
      addToast("La contraseña debe tener al menos 6 caracteres", "error");
      return;
    }
    if (!acceptTerms) {
      addToast("Debes aceptar los términos y condiciones", "error");
      return;
    }

    setIsLoading(true);
    try {
      await register(formData.name, formData.email, formData.password);
      // Record terms acceptance after successful registration
      const currentUser = $user.get();
      if (currentUser?.id) {
        try {
          const client = getApolloClient();
          await client.mutate({
            mutation: ACCEPT_TERMS,
            variables: { userId: currentUser.id, type: "USER_TERMS" },
          });
          await client.mutate({
            mutation: ACCEPT_TERMS,
            variables: { userId: currentUser.id, type: "PRIVACY_POLICY" },
          });
        } catch {
          // Non-critical
        }
      }
      setTimeout(() => {
        const redirect = getRedirect();
        if (redirect) {
          window.location.href = redirect;
          return;
        }
        window.location.href = "/auth/verify-email";
      }, 500);
    } catch (error) {
      // Error manejado en context
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-4">
              <IoRestaurant className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Crear una cuenta
          </h1>
          <p className="text-sm text-muted-foreground">
            Únete a Suavus y comienza a disfrutar
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nombre completo"
              placeholder="Juan Pérez"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
            <Input
              label="Correo electrónico"
              type="email"
              placeholder="nombre@ejemplo.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
            />
            <Input
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
            />
            <Input
              label="Confirmar contraseña"
              type="password"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
              required
            />

            <div className="flex items-start gap-2">
              <input
                id="accept-terms"
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-primary"
              />
              <label htmlFor="accept-terms" className="text-sm text-muted-foreground">
                Acepto los{" "}
                <a href="/legal/terms-users" target="_blank" className="text-primary hover:underline">Términos y Condiciones</a>
                {" "}y la{" "}
                <a href="/legal/privacy" target="_blank" className="text-primary hover:underline">Política de Privacidad</a>
              </label>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Spinner size="sm" className="mr-2" /> : null}
              {isLoading ? "Creando cuenta..." : "Registrarse"}
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  O regístrate con
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              type="button"
              fullWidth
              onClick={() =>
                (window.location.href = `${API_URL}/auth/google`)
              }
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Google
            </Button>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              ¿Ya tienes una cuenta?{" "}
              <a
                href="/login"
                className="text-primary hover:underline font-medium"
              >
                Inicia Sesión
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
