import { useState } from "react";
import { useSearchParams } from "../../libs/useSearchParams";
import { IoLockClosed } from "react-icons/io5";
import { Button } from "../custom/Button";
import { Input } from "../custom/Input";
import { Card, CardContent, CardHeader } from "../custom/Card";
import { Spinner } from "../custom/Spinner";
import { getApolloClient } from "../../libs/apollo";
import { gql } from "@apollo/client";
import { addToast } from "../custom/Toast";

const RESET_PASSWORD = gql`
  mutation resetPassword($token: String!, $password: String!) {
    resetPassword(token: $token, password: $password)
  }
`;

export function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      addToast("La contraseña debe tener al menos 6 caracteres", "error");
      return;
    }
    if (password !== confirmPassword) {
      addToast("Las contraseñas no coinciden", "error");
      return;
    }
    if (!token) {
      addToast("Token inválido o expirado", "error");
      return;
    }
    setIsLoading(true);
    try {
      const client = getApolloClient();
      await client.mutate({ mutation: RESET_PASSWORD, variables: { token, password } });
      setDone(true);
      addToast("Contraseña actualizada exitosamente", "success");
    } catch (err: unknown) {
      const apolloErr = err as { graphQLErrors?: Array<{ message?: string }>; message?: string };
      addToast(apolloErr?.graphQLErrors?.[0]?.message || apolloErr?.message || "Error al restablecer", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-2xl font-bold text-center">Restablecer Contraseña</h1>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center text-green-500">
                <IoLockClosed size={48} />
              </div>
              <p className="text-sm text-muted-foreground">
                Tu contraseña ha sido actualizada exitosamente.
              </p>
              <Button onClick={() => (window.location.href = "/login")}>
                Iniciar Sesión
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {!token && (
                <p className="text-sm text-destructive text-center">
                  Enlace inválido o expirado. Solicita un nuevo restablecimiento.
                </p>
              )}
              <Input
                label="Nueva contraseña"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
              />
              <Input
                label="Confirmar contraseña"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la contraseña"
                required
              />
              <Button type="submit" className="w-full" disabled={isLoading || !token}>
                {isLoading ? <Spinner size="sm" /> : "Restablecer contraseña"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
