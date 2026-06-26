// src/middleware.ts
import { defineMiddleware } from "astro:middleware";

// Función mágica para leer lo que hay dentro de un JWT sin usar librerías pesadas
function decodeJWT(token: string) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join(""),
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
}

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);

  // Verificamos si quiere entrar a cualquier ruta de /staff
  if (url.pathname.startsWith("/staff")) {
    const token = context.cookies.get("auth_token")?.value;

    // 1. Si no hay token, al login.
    if (!token) {
      return context.redirect("/login");
    }

    // 2. Si hay token, lo "abrimos" para ver sus datos
    const payload = decodeJWT(token);

    // OJO: Asegúrate de que 'role' sea exactamente el nombre que tu backend en Go
    // le puso a la propiedad dentro del token (podría llamarse 'Role', 'position', etc.)
    const userRole = payload?.role?.toLowerCase();

    // 3. Verificamos los permisos
    if (userRole !== "admin" && userRole !== "staff") {
      // Si es "cliente" o cualquier otra cosa, lo regresamos al inicio
      // (o puedes mandarlo a una página de "/acceso-denegado")
      return context.redirect("/");
    }
  }

  if (url.pathname.startsWith("/admin")) {
    const token = context.cookies.get("auth_token")?.value;

    if (!token) {
      return context.redirect("/login");
    }

    const payload = decodeJWT(token);

    const userRole = payload?.role?.toLowerCase();

    if (userRole !== "superadmin") {
      return context.redirect("/");
    }
  }

  if (url.pathname.startsWith("/restaurants")) {
    const token = context.cookies.get("auth_token")?.value;

    if (!token) {
      return context.redirect("/login");
    }

    const payload = decodeJWT(token);

    const userRole = payload?.role?.toLowerCase();

    if (userRole !== "client" && userRole !== "superadmin") {
      return context.redirect("/");
    }
  }

  // /auth/callback debe ser público siempre (para procesar OAuth)
  if (url.pathname.startsWith("/auth/callback")) {
    return next();
  }

  // /subscribe requiere autenticación
  if (url.pathname.startsWith("/subscribe")) {
    const token = context.cookies.get("auth_token")?.value;
    if (!token) {
      const redirect = encodeURIComponent(url.pathname + url.search);
      return context.redirect(`/login?redirect=${redirect}`);
    }
    return next();
  }

  // /plans solo para usuarios no autenticados
  if (url.pathname.startsWith("/plans")) {
    const token = context.cookies.get("auth_token")?.value;
    if (token) {
      return context.redirect("/");
    }
    return next();
  }

  // /login y /register se muestran siempre (no redirigir aunque haya sesión)
  // para evitar bloqueos cuando el usuario necesita iniciar sesión de nuevo.

  // Si pasó todas las pruebas, carga la página normalmente
  return next();
});
