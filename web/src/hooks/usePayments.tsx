import { useMutation, useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import type {
  CreatePaymentData,
  PaymentData,
  UserPaymentsData,
} from "../types";

// ==================== QUERIES ====================

const GET_PAYMENTS = gql`
  query payments($limit: Int, $offset: Int) {
    payments(limit: $limit, offset: $offset) {
      id
      userId
      stripePaymentIntentId
      amount
      currency
      status
      description
      createdAt
    }
  }
`;

const GET_USER_PAYMENTS = gql`
  query userPayments($userId: String!) {
    userPayments(userId: $userId) {
      id
      userId
      stripePaymentIntentId
      amount
      currency
      status
      description
      createdAt
    }
  }
`;

// ==================== MUTATIONS ====================

const CREATE_PAYMENT = gql`
  mutation CreatePayment($input: CreatePaymentInput!) {
    createPayment(input: $input) {
      id
      status
    }
  }
`;

// ==================== HOOKS ====================

/**
 * Hook para obtener todos los pagos (admin)
 */
export function usePayments(limit?: number, offset?: number) {
  const { data, loading, error } = useQuery<PaymentData>(GET_PAYMENTS, {
    variables: { limit, offset },
  });

  return {
    payments: data?.payments || [],
    loading,
    error,
  };
}

/**
 * Hook para obtener pagos de un usuario específico
 */
export function useUserPayments(userId: string) {
  const { data, loading, error } = useQuery<UserPaymentsData>(
    GET_USER_PAYMENTS,
    {
      variables: { userId },
      skip: !userId,
    },
  );

  return {
    payments: data?.userPayments || [],
    loading,
    error,
  };
}

/**
 * Hook para crear un pago (Stripe)
 */
export function useCreatePayment() {
  const [createPaymentMutation, { loading, error }] =
    useMutation<CreatePaymentData>(CREATE_PAYMENT);

  const createPayment = async (input: {
    userId: string;
    amount: number;
    currency: string;
    paymentMethodId: string;
    description?: string;
  }) => {
    const { data } = await createPaymentMutation({
      variables: { input },
    });
    return data?.createPayment;
  };

  return {
    createPayment,
    loading,
    error,
  };
}
