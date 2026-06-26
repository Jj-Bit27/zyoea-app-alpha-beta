import { useState, useEffect } from "react";
import { IoCheckmarkCircle, IoCloseCircle } from "react-icons/io5";
import { Button } from "../custom/Button";
import { Input } from "../custom/Input";
import { Card, CardContent, CardHeader } from "../custom/Card";
import { Spinner } from "../custom/Spinner";
import { getApolloClient } from "../../libs/apollo";
import { gql } from "@apollo/client";
import { addToast } from "../custom/Toast";

const VERIFY_EMAIL = gql`
  mutation verifyEmail($code: String!) {
    verifyEmail(code: $code) {
      id
      isVerified
    }
  }
`;

export function VerifyEmailForm() {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      addToast("Ingresa el código de verificación", "error");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const client = getApolloClient();
      await client.mutate({ mutation: VERIFY_EMAIL, variables: { code: code.trim() } });
      setVerified(true);
      addToast("Correo verificado exitosamente", "success");
    } catch (err: unknown) {
      const apolloErr = err as { graphQLErrors?: Array<{ message?: string }>; message?: string };
      const msg = apolloErr?.graphQLErrors?.[0]?.message || apolloErr?.message || "Código inválido";
      setError(msg);
      addToast(msg, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-2xl font-bold text-center">Verificar Correo Electrónico</h1>
          {!verified && (
            <p className="text-sm text-muted-foreground text-center mt-1">
              Ingresa el código de 6 dígitos que enviamos a tu correo
            </p>
          )}
        </CardHeader>
        <CardContent>
          {verified ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center text-green-500">
                <IoCheckmarkCircle size={48} />
              </div>
              <p className="text-sm text-muted-foreground">
                Tu correo ha sido verificado exitosamente.
              </p>
              <Button onClick={() => (window.location.href = "/")}>
                Ir al inicio
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Código de verificación"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ej: 123456"
                maxLength={6}
                required
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Spinner size="sm" /> : "Verificar correo"}
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => (window.location.href = "/")}
              >
                Ir al inicio
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
