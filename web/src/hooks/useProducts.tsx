import { useMutation, useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { addToast } from "../components/custom/Toast";
import type { ProductData } from "../types";

interface ProductByIdData {
  product: any;
}

// 1. Definimos todas las consultas aquí (centralizado)
const GET_PRODUCTS = gql`
  query products($restaurantId: ID!) {
    products(restaurantId: $restaurantId) {
      id
      restaurantId
      restaurant {
        id
        name
      }
      categoryId
      category {
        id
        name
      }
      name
      description
      ingredients
      allergens
      price
      status
      image
    }
  }
`;

const GET_PRODUCT = gql`
  query product($id: ID!) {
    product(id: $id) {
      id
      restaurantId
      restaurant {
        id
        name
      }
      categoryId
      category {
        id
        name
      }
      name
      description
      ingredients
      allergens
      price
      status
      image
    }
  }
`;

const CREATE_PRODUCT = gql`
  mutation CreateProduct($input: CreateProductInput!) {
    createProduct(input: $input) {
      id
      name
      price
      status
      image
    }
  }
`;

const UPDATE_PRODUCT = gql`
  mutation UpdateProduct($id: ID!, $input: UpdateProductInput!) {
    updateProduct(id: $id, input: $input) {
      id
      name
      price
      status
      image
    }
  }
`;

const DELETE_PRODUCT = gql`
  mutation DeleteProduct($id: ID!) {
    deleteProduct(id: $id)
  }
`;

export function useProducts(restaurantId: string) {
  // --- LEER (Get All) ---
  const { data, loading, error } = useQuery<ProductData>(GET_PRODUCTS, {
    variables: { restaurantId },
    skip: !restaurantId,
  });

  // --- CREAR ---
  const [createMutation] = useMutation(CREATE_PRODUCT, {
    refetchQueries: [{ query: GET_PRODUCTS, variables: { restaurantId } }],
    onCompleted: () => addToast("Producto creado exitosamente", "success"),
    onError: (err) => addToast(err.message, "error"),
  });

  // --- ACTUALIZAR ---
  const [updateMutation] = useMutation(UPDATE_PRODUCT, {
    refetchQueries: [{ query: GET_PRODUCTS, variables: { restaurantId } }],
    onCompleted: () => addToast("Producto actualizado", "success"),
    onError: (err) => addToast(err.message, "error"),
  });

  // --- ELIMINAR ---
  const [deleteMutation] = useMutation(DELETE_PRODUCT, {
    refetchQueries: [{ query: GET_PRODUCTS, variables: { restaurantId } }],
    onCompleted: () => addToast("Producto eliminado", "info"),
    onError: (err) => addToast(err.message, "error"),
  });

  const createProduct = (productData: any) => {
    createMutation({ variables: { input: productData } });
  };

  const updateProduct = (id: string, productData: any) => {
    updateMutation({ variables: { id, input: productData } });
  };

  const deleteProduct = (id: string) => {
    if (confirm("¿Eliminar producto?")) {
      deleteMutation({ variables: { id } });
    }
  };

  // Retornamos solo lo que la UI necesita
  return {
    products: data?.products || [],
    loading,
    error,
    createProduct,
    updateProduct,
    deleteProduct,
  };
}

export function useProductById(id: string) {
  // --- LEER (Get One) ---
  const { data, loading, error } = useQuery<ProductByIdData>(GET_PRODUCT, {
    variables: { id },
    skip: !id,
  });

  return {
    product: data?.product || null,
    loading,
    error,
  };
}
