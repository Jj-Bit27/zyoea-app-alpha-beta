import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Spinner } from "../custom/Spinner";

export default function OAuthCallback() {
  const { oauthLogin } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    const accessToken = params.get("access_token");
    const userId = params.get("user_id");
    const userName = params.get("user_name");
    const userEmail = params.get("user_email");
    const userRole = params.get("user_role");
    const restaurant = params.get("restaurant");

    if (error) {
      setStatus("error");
      setErrorMsg(error);
      return;
    }

    if (!accessToken || !userId) {
      setStatus("error");
      setErrorMsg("No se recibieron datos de autenticación");
      return;
    }

    try {
      oauthLogin({
        id: userId,
        name: userName || userEmail || "Usuario",
        email: userEmail || "",
        role: (userRole as "admin" | "superadmin" | "staff" | "client") || "client",
        restaurantId: restaurant || undefined,
        token: accessToken,
      });

      setStatus("success");

      // Redirigir después de un breve momento
      setTimeout(() => {
        if (userRole === "superadmin") window.location.href = "/admin";
        else if (userRole === "admin" || userRole === "staff")
          window.location.href = "/staff";
        else window.location.href = "/";
      }, 1500);
    } catch (err) {
      setStatus("error");
      setErrorMsg("Error al iniciar sesión con OAuth");
    }
  }, []);

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="text-center space-y-4">
        {status === "loading" && (
          <div className="space-y-4">
            <Spinner size="lg" className="mx-auto" />
            <p className="text-muted-foreground">Completando autenticación...</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-2">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <svg className="h-8 w-8 text-green-600 dark:text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold">¡Autenticación exitosa!</h2>
            <p className="text-muted-foreground">Redirigiendo...</p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-2">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
              <svg className="h-8 w-8 text-red-600 dark:text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold">Error de autenticación</h2>
            <p className="text-muted-foreground">{errorMsg}</p>
            <a
              href="/login"
              className="inline-block mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
            >
              Volver al inicio de sesión
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
