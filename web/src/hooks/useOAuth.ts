import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { addToast } from "../components/custom/Toast";

export interface OAuthResponse {
  accessToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    isVerified: boolean;
  };
  restaurant?: number;
}

export function useGoogleAuth() {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Procesar callback de OAuth desde la URL
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const error = params.get("error");
      const code = params.get("code");

      if (error) {
        addToast(`Error en OAuth: ${error}`, "error");
        // Limpiar URL
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      // Si no hay código, no es un callback
      if (!code) {
        return;
      }

      // Aquí podrías procesar el callback si es necesario
      // Pero generalmente la API ya lo manejó
    };

    handleOAuthCallback();
  }, []);

  const handleGoogleLogin = () => {
    setIsLoading(true);
    // Redirigir a la API para iniciar OAuth de Google
    // La API manejará todo y retornará JSON con token/user
    window.location.href = "http://localhost:8080/auth/google";
  };

  const handleFacebookLogin = () => {
    setIsLoading(true);
    window.location.href = "http://localhost:8080/auth/facebook";
  };

  const handleTwitterLogin = () => {
    setIsLoading(true);
    window.location.href = "http://localhost:8080/auth/twitter";
  };

  return {
    handleGoogleLogin,
    handleFacebookLogin,
    handleTwitterLogin,
    isLoading,
  };
}
