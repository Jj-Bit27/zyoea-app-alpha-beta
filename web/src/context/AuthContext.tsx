import { atom } from "nanostores";
import { useStore } from "@nanostores/react";
import { addToast } from "../components/custom/Toast";
import { getApolloClient } from "../libs/apollo";
import { gql } from "@apollo/client";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "superadmin" | "staff" | "client";
  avatar?: string;
  restaurantId?: string;
  token?: string;
}

export const $user = atom<User | null>(null);

function decodeJWTPayload(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

if (typeof window !== "undefined") {
  const storedUser = localStorage.getItem("Frugis_user");
  if (storedUser) {
    try {
      const parsed = JSON.parse(storedUser) as User;
      if (!parsed.restaurantId && parsed.token) {
        const claims = decodeJWTPayload(parsed.token);
        if (claims?.restaurant && Number(claims.restaurant) > 0) {
          parsed.restaurantId = String(claims.restaurant);
        }
      }
      $user.set(parsed);
    } catch (e) {
      console.error("Error parsing user data", e);
      localStorage.removeItem("Frugis_user");
    }
  }
}

const LOGIN_MUTATION = gql`
  mutation login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      user {
        id
        name
        email
        role
      }
      restaurant
    }
  }
`;

const REGISTER_MUTATION = gql`
  mutation register($input: RegisterInput!) {
    register(input: $input) {
      accessToken
      user {
        id
        name
        email
        role
      }
    }
  }
`;

export const login = async (email: string, password: string) => {
  const client = getApolloClient();
  try {
    const { data } = await client.mutate({
      mutation: LOGIN_MUTATION,
      variables: { input: { email, password } },
    });
    const { user, restaurant } = data.login;
    const mappedUser: User = {
      id: user.id,
      name: user.name || email,
      email: user.email,
      role: (user.role as User["role"]) || "client",
      restaurantId: restaurant != null ? String(restaurant) : undefined,
    };
    $user.set(mappedUser);
    localStorage.setItem("Frugis_user", JSON.stringify(mappedUser));
    document.cookie = `auth_token=${data.login.accessToken}; path=/; max-age=86400`;
    addToast(`Bienvenido de nuevo, ${mappedUser.name}`, "success");
  } catch (err: any) {
    const message =
      err?.graphQLErrors?.[0]?.message ||
      err?.message ||
      "Error al iniciar sesión";
    addToast(message, "error");
    throw new Error(message);
  }
};

export const register = async (
  name: string,
  email: string,
  password: string,
) => {
  const client = getApolloClient();
  try {
    const { data } = await client.mutate({
      mutation: REGISTER_MUTATION,
      variables: { input: { name, email, password, role: "client" } },
    });
    const { user } = data.register;
    const mappedUser: User = {
      id: user.id,
      name: user.name || name,
      email: user.email,
      role: "client",
    };
    $user.set(mappedUser);
    localStorage.setItem("Frugis_user", JSON.stringify(mappedUser));
    document.cookie = `auth_token=${data.register.accessToken}; path=/; max-age=86400`;
    addToast("Cuenta creada exitosamente", "success");
  } catch (err: any) {
    const message =
      err?.graphQLErrors?.[0]?.message ||
      err?.message ||
      "Error al registrarse";
    addToast(message, "error");
    throw new Error(message);
  }
};

export const logout = () => {
  $user.set(null);
  localStorage.removeItem("Frugis_user");
  document.cookie = "auth_token=; path=/; max-age=0";
  addToast("Sesión cerrada", "info");
  window.location.href = "/login";
};

export const oauthLogin = (userData: {
  id: string;
  name: string;
  email: string;
  role: "admin" | "superadmin" | "staff" | "client";
  restaurantId?: string;
  token: string;
}) => {
  const mappedUser: User = {
    id: userData.id,
    name: userData.name,
    email: userData.email,
    role: userData.role,
    restaurantId: userData.restaurantId || undefined,
    token: userData.token,
  };

  $user.set(mappedUser);
  localStorage.setItem("Frugis_user", JSON.stringify(mappedUser));
  document.cookie = `auth_token=${userData.token}; path=/; max-age=86400`;
  addToast(`Bienvenido, ${mappedUser.name}`, "success");
};

export function useAuth() {
  const user = useStore($user);
  return { user, login, register, logout, oauthLogin };
}
