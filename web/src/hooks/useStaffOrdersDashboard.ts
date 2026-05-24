import { gql } from "@apollo/client";
import { useQuery, useMutation } from "@apollo/client/react";

const GET_OPEN_ORDERS = gql`
  query OrdersOpen($restaurantId: ID!) {
    ordersOpen(restaurantId: $restaurantId) {
      id
      userId
      user {
        id
        name
      }
      user_name
      restaurantId
      status
      type
      total
      notes
      tableId
      date
      paid
      orderDetail {
        id
        order
        productId
        product {
          id
          name
          price
        }
        quantity
        subtotal
      }
    }
  }
`;

const UPDATE_ORDER_STATUS = gql`
  mutation UpdateOrderStatus($id: ID!, $status: String!) {
    updateOrderStatus(id: $id, status: $status) {
      id
      status
    }
  }
`;

export function useStaffOrdersDashboard(restaurantId: string) {
  const { data, loading, error } = useQuery(GET_OPEN_ORDERS, {
    variables: { restaurantId },
    skip: !restaurantId,
    pollInterval: 15000,
  });

  const [updateStatusMutation] = useMutation(UPDATE_ORDER_STATUS, {
    refetchQueries: [{ query: GET_OPEN_ORDERS, variables: { restaurantId } }],
  });

  const updateOrderStatus = (id: string, status: string) => {
    updateStatusMutation({ variables: { id, status } });
  };

  return {
    orders: data?.ordersOpen || [],
    loading,
    error,
    updateOrderStatus,
  };
}
