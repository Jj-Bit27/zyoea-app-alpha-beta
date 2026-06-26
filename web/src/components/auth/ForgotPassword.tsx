import { useState } from "react";
import { IoMail, IoArrowBack } from "react-icons/io5";
import { Button } from "../custom/Button";
import { Input } from "../custom/Input";
import { Card, CardContent, CardHeader } from "../custom/Card";
import { Spinner } from "../custom/Spinner";
import { getApolloClient } from "../../libs/apollo";
import { gql } from "@apollo/client";
import { validarEmail } from "../../libs/ValidateEmail";
import { addToast } from "../custom/Toast";

const FORGOT_PASSWORD = gql`
  mutation forgotPassword($email: String!) {
    forgotPassword(email: $email)
  }
`;

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validarEmail(email)) {
      addToast("Ingresa un email válido", "error");
      return;
    }
    setIsLoading(true);
    try {
      const client = getApolloClient();
      await client.mutate({ mutation: FORGOT_PASSWORD, variables: { email } });
      setSent(true);
      addToast("Revisa tu correo para las instrucciones", "success");
    } catch (err: unknown) {
      const apolloErr = err as { graphQLErrors?: Array<{ message?: string }>; message?: string };
      addToast(apolloErr?.graphQLErrors?.[0]?.message || apolloErr?.message || "Error al enviar", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-2xl font-bold text-center">Recuperar Contraseña</h1>
          <p className="text-sm text-muted-foreground text-center mt-1">
            {sent
              ? "Te hemos enviado un correo con las instrucciones"
              : "Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña"}
          </p>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center text-green-500">
                <IoMail size={48} />
              </div>
              <p className="text-sm text-muted-foreground">
                Si existe una cuenta con ese correo, recibirás las instrucciones en unos minutos.
              </p>
              <Button onClick={() => (window.location.href = "/login")}>
                Volver a Iniciar Sesión
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Correo electrónico"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                required
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Spinner size="sm" /> : "Enviar instrucciones"}
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => (window.location.href = "/login")}
              >
                <IoArrowBack className="mr-1" /> Volver al inicio de sesión
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
