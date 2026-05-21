import { atom } from "nanostores";
import { useStore } from "@nanostores/react";
import { addToast } from "../components/custom/Toast";
import { getApolloClient } from "../libs/apollo";
import { gql } from "@apollo/client";

// Tipos
export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "superadmin" | "staff" | "client";
  avatar?: string;
  restaurantId?: string;
}

// --- 1. Estado Global ---
export const $user = atom<User | null>(null);

// --- 2. Inicialización (Persistencia) ---
if (typeof window !== "undefined") {
  const storedUser = localStorage.getItem("Frugis_user");
  if (storedUser) {
    try {
      $user.set(JSON.parse(storedUser));
    } catch (e) {
      console.error("Error parsing user data", e);
      localStorage.removeItem("Frugis_user");
    }
  }
}

// --- GraphQL Mutations ---
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

// --- 3. Acciones de Autenticación ---

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
      restaurantId: restaurant ? String(restaurant) : undefined,
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

// --- 4. Hook de Compatibilidad para React ---
export function useAuth() {
  const user = useStore($user);
  return { user, login, register, logout };
}
