import { useQuery, useMutation } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { addToast } from "../components/custom/Toast";

const GET_PLANS = gql`
  query subscriptionPlans {
    subscriptionPlans {
      id
      name
      description
      price
      interval
      features
      maxRestaurants
      maxEmployees
      maxProducts
    }
  }
`;

const GET_RESTAURANT_SUBSCRIPTION = gql`
  query restaurantSubscription($restaurantId: ID!) {
    restaurantSubscription(restaurantId: $restaurantId) {
      id
      status
      plan {
        id
        name
        price
      }
      currentPeriodEnd
      trialEnd
    }
  }
`;

const CREATE_SUBSCRIPTION = gql`
  mutation createSubscription($input: CreateSubscriptionInput!) {
    createSubscription(input: $input) {
      id
      status
    }
  }
`;

const CANCEL_SUBSCRIPTION = gql`
  mutation cancelSubscription($restaurantId: ID!) {
    cancelSubscription(restaurantId: $restaurantId) {
      id
      status
      cancelledAt
    }
  }
`;

export function useSubscriptionPlans() {
  const { data, loading } = useQuery(GET_PLANS);
  return { plans: data?.subscriptionPlans || [], loading };
}

export function useRestaurantSubscription(restaurantId: string) {
  const { data, loading, refetch } = useQuery(GET_RESTAURANT_SUBSCRIPTION, {
    variables: { restaurantId },
    skip: !restaurantId,
  });
  return { subscription: data?.restaurantSubscription, loading, refetch };
}

export function useCreateSubscription() {
  const [mutate] = useMutation(CREATE_SUBSCRIPTION, {
    onCompleted: () => addToast("Suscripción creada", "success"),
    onError: (err) => addToast(err.message, "error"),
  });
  return { createSubscription: mutate };
}

export function useCancelSubscription() {
  const [mutate] = useMutation(CANCEL_SUBSCRIPTION, {
    onCompleted: () => addToast("Suscripción cancelada", "info"),
    onError: (err) => addToast(err.message, "error"),
  });
  return { cancelSubscription: mutate };
}
