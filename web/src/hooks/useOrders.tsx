import { useMutation, useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { addToast } from "../components/custom/Toast";
import type {
  CreateOrderData,
  OrderByIdData,
  OrdersData,
  UpdateOrderPaymentData,
  UserOrdersData,
} from "../types";

// ==================== QUERIES ====================

const GET_ORDERS = gql`
  query ordersByRestaurant($restaurantId: ID!) {
    ordersByRestaurant(restaurantId: $restaurantId) {
      id
      userId
      user_name
      restaurantId
      status
      type
      total
      notes
      tableId
      date
      paid
      estimatedWaitTime
      actualWaitTime
      completedAt
    }
  }
`;

const GET_USER_ORDERS = gql`
  query ordersByUser($userId: ID!) {
    ordersByUser(userId: $userId) {
      id
      userId
      user_name
      restaurantId
      status
      type
      total
      notes
      tableId
      date
      paid
      estimatedWaitTime
      actualWaitTime
      completedAt
    }
  }
`;

const GET_ORDER = gql`
  query order($id: ID!) {
    order(id: $id) {
      id
      userId
      user_name
      restaurantId
      status
      type
      total
      notes
      tableId
      date
      paid
      estimatedWaitTime
      actualWaitTime
      completedAt
      orderDetail {
        id
        productId
        product {
          id
          name
          price
          image
        }
        quantity
        subtotal
      }
    }
  }
`;

// ==================== MUTATIONS ====================

const CREATE_ORDER = gql`
  mutation CreateOrder($input: CreateOrderInput!) {
    createOrder(input: $input) {
      id
      status
      paid
      estimatedWaitTime
    }
  }
`;

const UPDATE_ORDER_STATUS = gql`
  mutation updateOrderStatus($id: ID!, $status: String!) {
    updateOrderStatus(id: $id, status: $status) {
      id
      status
      estimatedWaitTime
      actualWaitTime
      completedAt
    }
  }
`;

const UPDATE_ORDER_PAYMENT = gql`
  mutation updateOrderPayment($id: ID!, $paid: Boolean!) {
    updateOrderPayment(id: $id, paid: $paid) {
      id
      paid
      status
    }
  }
`;

const REMOVE_ORDER = gql`
  mutation removeOrder($id: ID!) {
    removeOrder(id: $id)
  }
`;

const ADD_ORDER_ITEMS = gql`
  mutation addOrderItems($orderId: ID!, $items: [OrderItemInput!]!) {
    addOrderItems(orderId: $orderId, items: $items) {
      id
      total
      status
      orderDetail {
        id
        productId
        product {
          id
          name
          price
          image
        }
        quantity
        subtotal
      }
    }
  }
`;

const REMOVE_ORDER_ITEM = gql`
  mutation removeOrderItem($orderId: ID!, $itemId: ID!) {
    removeOrderItem(orderId: $orderId, itemId: $itemId) {
      id
      total
      status
      orderDetail {
        id
        productId
        quantity
        subtotal
      }
    }
  }
`;

// ==================== HOOKS ====================

/**
 * Hook para obtener órdenes de un restaurante (staff/admin)
 */
export function useOrders(restaurantId: string) {
  const { data, loading, error, refetch } = useQuery<OrdersData>(GET_ORDERS, {
    variables: { restaurantId },
    skip: !restaurantId,
  });

  const [updateStatusMutation] = useMutation(UPDATE_ORDER_STATUS, {
    refetchQueries: [{ query: GET_ORDERS, variables: { restaurantId } }],
    onCompleted: () => addToast("Estado actualizado", "success"),
    onError: (err) => addToast(err.message, "error"),
  });

  const [updatePaymentMutation] = useMutation(UPDATE_ORDER_PAYMENT, {
    refetchQueries: [{ query: GET_ORDERS, variables: { restaurantId } }],
    onCompleted: () => addToast("Pago actualizado", "success"),
    onError: (err) => addToast(err.message, "error"),
  });

  const [removeMutation] = useMutation(REMOVE_ORDER, {
    refetchQueries: [{ query: GET_ORDERS, variables: { restaurantId } }],
    onCompleted: () => addToast("Orden eliminada", "info"),
    onError: (err) => addToast(err.message, "error"),
  });

  const updateOrderStatus = (id: string, status: string) => {
    updateStatusMutation({ variables: { id, status } });
  };

  const updateOrderPayment = (id: string, paid: boolean) => {
    updatePaymentMutation({ variables: { id, paid } });
  };

  const removeOrder = (id: string) => {
    if (confirm("¿Eliminar orden?")) {
      removeMutation({ variables: { id } });
    }
  };

  return {
    orders: data?.ordersByRestaurant || [],
    loading,
    error,
    refetch,
    updateOrderStatus,
    updateOrderPayment,
    removeOrder,
  };
}

/**
 * Hook para obtener órdenes del usuario (cliente - "Mis Órdenes")
 */
export function useUserOrders(userId: string) {
  const { data, loading, error, refetch } = useQuery<UserOrdersData>(
    GET_USER_ORDERS,
    {
      variables: { userId },
      skip: !userId,
      pollInterval: 5000,
    },
  );

  return {
    orders: data?.ordersByUser || [],
    loading,
    error,
    refetch,
  };
}

/**
 * Hook para obtener una orden individual por ID
 */
export function useOrderById(id: string) {
  const { data, loading, error } = useQuery<OrderByIdData>(GET_ORDER, {
    variables: { id },
    skip: !id,
  });

  return {
    order: data?.order || null,
    loading,
    error,
  };
}

/**
 * Hook para crear una nueva orden (usado en el carrito)
 */
export function useCreateOrder() {
  const [createOrderMutation, { loading, error }] =
    useMutation<CreateOrderData>(CREATE_ORDER);

  const createOrder = async (input: {
    user: number;
    user_name: string;
    restaurant: number;
    status: string;
    type: string;
    total: number;
    notes?: string | null;
    table?: number | null;
    paid?: boolean;
    items: { productId: number; quantity: number; subtotal: number }[];
  }) => {
    const { data } = await createOrderMutation({
      variables: { input },
    });
    return data?.createOrder;
  };

  return {
    createOrder,
    loading,
    error,
  };
}

/**
 * Hook independiente para actualizar el estado de pago de una orden
 * (usado por PaymentFlow, CardPaymentForm, UserOrdersList)
 */
export function useUpdateOrderPayment() {
  const [mutation, { loading, error }] =
    useMutation<UpdateOrderPaymentData>(UPDATE_ORDER_PAYMENT);

  const updatePayment = async (id: string, paid: boolean) => {
    const { data } = await mutation({
      variables: { id, paid },
    });
    return data?.updateOrderPayment;
  };

  return {
    updatePayment,
    loading,
    error,
  };
}

/**
 * Hook para agregar productos a una orden existente
 */
export function useAddOrderItems() {
  const [mutation, { loading, error }] = useMutation(ADD_ORDER_ITEMS);

  const addItems = async (
    orderId: string,
    items: { productId: number; quantity: number; subtotal: number }[],
  ) => {
    const { data } = await mutation({
      variables: { orderId, items },
    });
    return data?.addOrderItems;
  };

  return {
    addItems,
    loading,
    error,
  };
}

/**
 * Hook para eliminar un producto de una orden existente
 */
export function useRemoveOrderItem() {
  const [mutation, { loading, error }] = useMutation(REMOVE_ORDER_ITEM);

  const removeItem = async (orderId: string, itemId: string) => {
    const { data } = await mutation({
      variables: { orderId, itemId },
    });
    return data?.removeOrderItem;
  };

  return {
    removeItem,
    loading,
    error,
  };
}
