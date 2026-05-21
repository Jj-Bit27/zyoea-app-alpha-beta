import { useMutation, useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { addToast } from "../components/custom/Toast";
import type { CategoryByIdData, CategoryData } from "../types";

// 1. Definimos todas las consultas aquí (centralizado)
const GET_CATEGORIES = gql`
  query categories($restaurantId: ID!) {
    categories(restaurantId: $restaurantId) {
      id
      restaurantId
      restaurant {
        id
        name
      }
      name
    }
  }
`;

const GET_CATEGORY = gql`
  query category($id: ID!) {
    category(id: $id) {
      id
      restaurantId
      restaurant {
        id
        name
      }
      name
    }
  }
`;

const CREATE_CATEGORY = gql`
  mutation CreateCategory($input: CreateCategoryInput!) {
    createCategory(input: $input) {
      id
      restaurantId
      name
    }
  }
`;

const UPDATE_CATEGORY = gql`
  mutation UpdateCategory($id: ID!, $input: UpdateCategoryInput!) {
    updateCategory(id: $id, input: $input) {
      id
      restaurantId
      name
    }
  }
`;

const DELETE_CATEGORY = gql`
  mutation DeleteCategory($id: ID!) {
    deleteCategory(id: $id)
  }
`;

export function useCategories(restaurantId: string) {
  // --- LEER (Get All) ---
  const { data, loading, error } = useQuery<CategoryData>(GET_CATEGORIES, {
    variables: { restaurantId },
    skip: !restaurantId,
  });

  // --- CREAR ---
  const [createMutation] = useMutation(CREATE_CATEGORY, {
    refetchQueries: [{ query: GET_CATEGORIES, variables: { restaurantId } }],
    onCompleted: () => addToast("Categoría creada exitosamente", "success"),
    onError: (err) => addToast(err.message, "error"),
  });

  // --- ACTUALIZAR ---
  const [updateMutation] = useMutation(UPDATE_CATEGORY, {
    refetchQueries: [{ query: GET_CATEGORIES, variables: { restaurantId } }],
    onCompleted: () => addToast("Categoría actualizada", "success"),
    onError: (err) => addToast(err.message, "error"),
  });

  // --- ELIMINAR ---
  const [deleteMutation] = useMutation(DELETE_CATEGORY, {
    refetchQueries: [{ query: GET_CATEGORIES, variables: { restaurantId } }],
    onCompleted: () => addToast("Categoría eliminada", "info"),
    onError: (err) => addToast(err.message, "error"),
  });

  const createCategory = (categoryData: any) => {
    createMutation({ variables: { input: categoryData } });
  };

  const updateCategory = (id: string, categoryData: any) => {
    updateMutation({ variables: { id, input: categoryData } });
  };

  const deleteCategory = (id: string) => {
    if (confirm("¿Eliminar categoría?")) {
      deleteMutation({ variables: { id } });
    }
  };

  // Retornamos solo lo que la UI necesita
  return {
    categories: data?.categories || [],
    loading,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}

export function useCategoryById(id: string) {
  // --- LEER (Get One) ---
  const { data, loading, error } = useQuery<CategoryByIdData>(GET_CATEGORY, {
    variables: { id },
    skip: !id,
  });

  return {
    category: data?.category || null,
    loading,
    error,
  };
}
