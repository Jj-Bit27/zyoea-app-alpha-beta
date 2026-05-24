import { useMutation, useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { addToast } from "../components/custom/Toast";

// ─── GraphQL ───────────────────────────────────────────
const GET_TABLES = gql`
  query tables($restaurantId: ID!) {
    tables(restaurantId: $restaurantId) {
      id
      number
      capacity
      status
    }
  }
`;

const GET_PRODUCTS = gql`
  query products($restaurantId: ID!) {
    products(restaurantId: $restaurantId) {
      id
      name
      price
      image
      status
      category {
        id
        name
      }
    }
  }
`;

const CREATE_ORDER = gql`
  mutation createOrder($input: CreateOrderInput!) {
    createOrder(input: $input) {
      id
      status
      total
      paid
      date
    }
  }
`;

// ─── Tipos ─────────────────────────────────────────────
export interface StaffCartItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface CreateOrderVars {
  user: number | null;
  user_name: string;
  restaurant: number;
  status: string;
  type: string;
  total: number;
  notes: string | null;
  table: number | null;
  paid: boolean;
  items: { productId: number; quantity: number; subtotal: number }[];
}

// ─── Hook ──────────────────────────────────────────────
export function useStaffOrder(restaurantId: string) {
  const { data: tableData, loading: tableLoading } = useQuery(GET_TABLES, {
    variables: { restaurantId },
    skip: !restaurantId,
  });

  const { data: productData, loading: productLoading } = useQuery(GET_PRODUCTS, {
    variables: { restaurantId },
    skip: !restaurantId,
  });

  const [createOrderMutation, { loading: creating }] = useMutation(CREATE_ORDER, {
    onError: (err) => addToast(`Error al crear orden: ${err.message}`, "error"),
  });

  const tables = tableData?.tables || [];
  const products = productData?.products || [];

  const availableTables = tables.filter(
    (t: any) => t.status === "available" || t.status === "disponible",
  );

  const createOrder = async (input: CreateOrderVars) => {
    const { data } = await createOrderMutation({ variables: { input } });
    if (data?.createOrder) {
      addToast("Orden creada exitosamente", "success");
    }
    return data?.createOrder;
  };

  return {
    tables: availableTables,
    products,
    loading: tableLoading || productLoading,
    creating,
    createOrder,
  };
}

// ─── Helpers ──────────────────────────────────────────
export function calcCartTotal(cart: StaffCartItem[]): number {
  return cart.reduce((sum, item) => sum + item.subtotal, 0);
}

export function addToCart(cart: StaffCartItem[], product: any): StaffCartItem[] {
  const existing = cart.find((item) => item.productId === parseInt(product.id));
  if (existing) {
    return cart.map((item) =>
      item.productId === parseInt(product.id)
        ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.price }
        : item,
    );
  }
  return [
    ...cart,
    { productId: parseInt(product.id), name: product.name, price: product.price, quantity: 1, subtotal: product.price },
  ];
}

export function removeFromCart(cart: StaffCartItem[], productId: number): StaffCartItem[] {
  const existing = cart.find((item) => item.productId === productId);
  if (existing && existing.quantity > 1) {
    return cart.map((item) =>
      item.productId === productId
        ? { ...item, quantity: item.quantity - 1, subtotal: (item.quantity - 1) * item.price }
        : item,
    );
  }
  return cart.filter((item) => item.productId !== productId);
}

export function deleteFromCart(cart: StaffCartItem[], productId: number): StaffCartItem[] {
  return cart.filter((item) => item.productId !== productId);
}
