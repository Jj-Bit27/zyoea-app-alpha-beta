import { useMutation, useQuery } from "@apollo/client/react"; // ✅ Importación correcta
import { gql } from "@apollo/client";
import { addToast } from "../components/custom/Toast";
import {
  type Restaurant,
  type RestaurantByIdData,
  type RestaurantData,
} from "../types";
import { useEffect } from "react";

// --- DEFINICIÓN DE GRAPHQL (Igual que antes) ---
const GET_RESTAURANTS = gql`
  query restaurants {
    restaurants {
      id
      name
      address
      email
      description
      image
      phone
      hours
    }
  }
`;

const GET_RESTAURANT = gql`
  query restaurant($id: ID!) {
    restaurant(id: $id) {
      id
      name
      address
      email
      description
      image
      phone
      hours
    }
  }
`;

const CREATE_RESTAURANT = gql`
  mutation CreateRestaurant($input: CreateRestaurantInput!) {
    createRestaurant(input: $input) {
      id
      name
      address
      email
      description
      image
      phone
      hours
    }
  }
`;

const UPDATE_RESTAURANT = gql`
  mutation UpdateRestaurant($id: ID!, $input: UpdateRestaurantInput!) {
    updateRestaurant(id: $id, input: $input) {
      id
      name
      address
      email
      description
      image
      phone
      hours
    }
  }
`;

const DELETE_RESTAURANT = gql`
  mutation DeleteRestaurant($id: ID!) {
    deleteRestaurant(id: $id)
  }
`;

// ==========================================
// HOOK 1: Para LISTAS y CREACIÓN (Plural)
// ==========================================
export function useRestaurants() {
  // --- LEER (Get All) ---
  const { data, loading, error } = useQuery<RestaurantData>(GET_RESTAURANTS);

  // --- CREAR ---
  const [createMutation] = useMutation(CREATE_RESTAURANT, {
    refetchQueries: [{ query: GET_RESTAURANTS }],
    onCompleted: () => addToast("Restaurante creado", "success"),
    onError: (err: any) => addToast(err.message, "error"),
  });

  // --- ELIMINAR ---
  const [deleteMutation] = useMutation(DELETE_RESTAURANT, {
    refetchQueries: [{ query: GET_RESTAURANTS }],
    onCompleted: () => addToast("Restaurante eliminado", "info"),
    onError: (err: any) => addToast(err.message, "error"),
  });

  const createRestaurant = (input: any) => {
    createMutation({ variables: { input } });
  };

  const deleteRestaurant = (id: string) => {
    if (confirm("¿Eliminar restaurante?")) {
      deleteMutation({ variables: { id } });
    }
  };

  return {
    restaurants: data?.restaurants || [], // Devolvemos el array directo
    loading,
    error,
    createRestaurant,
    deleteRestaurant,
  };
}

// ==========================================
// HOOK 2: Para DETALLE y EDICIÓN (Singular)
// ==========================================
export function useRestaurantById(id: string) {
  const { data, loading, error } = useQuery<RestaurantByIdData>(
    GET_RESTAURANT,
    {
      variables: { id: id },
      skip: !id, // Evita ejecutar la consulta si no hay ID
    },
  );

  // --- ACTUALIZAR ---
  const [updateMutation] = useMutation(UPDATE_RESTAURANT, {
    refetchQueries: [{ query: GET_RESTAURANT, variables: { id: id } }],
    onCompleted: () => addToast("Restaurante actualizado", "success"),
    onError: (err: any) => addToast(err.message, "error"),
  });

  const updateRestaurant = (input: any) => {
    updateMutation({ variables: { id, input } });
  };

  return {
    restaurant: data?.restaurant || null,
    loading,
    error,
    updateRestaurant,
  };
}
