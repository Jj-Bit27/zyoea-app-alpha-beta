import { useMutation, useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { addToast } from "../components/custom/Toast";
import type { BookingData, BookingsUserData, CreateBookingInput, UpdateBookingInput } from "../types";

const GET_BOOKINGS = gql`
  query bookings($restaurantId: ID!) {
    bookings(restaurantId: $restaurantId) {
      id
      restaurantId
      userId
      user {
        id
        name
        email
      }
      tableId
      people
      time
      status
    }
  }
`;

const GET_BOOKINGS_USER = gql`
  query bookingsUser($userId: ID!) {
    bookingsUser(userId: $userId) {
      id
      restaurantId
      userId
      user {
        id
        name
        email
      }
      tableId
      people
      time
      status
    }
  }
`;

const CREATE_BOOKING = gql`
  mutation createBooking($input: CreateBookingInput!) {
    createBooking(input: $input) {
      id
      restaurantId
      userId
      tableId
      people
      time
      status
    }
  }
`;

const UPDATE_BOOKING = gql`
  mutation updateBooking($id: ID!, $input: UpdateBookingInput!) {
    updateBooking(id: $id, input: $input) {
      id
      status
    }
  }
`;

const DELETE_BOOKING = gql`
  mutation deleteBooking($id: ID!) {
    deleteBooking(id: $id)
  }
`;

export function useBookings(restaurantId: string) {
  const { data, loading, error } = useQuery<BookingData>(GET_BOOKINGS, {
    variables: { restaurantId },
    skip: !restaurantId,
  });

  const [createMutation] = useMutation(CREATE_BOOKING, {
    refetchQueries: [{ query: GET_BOOKINGS, variables: { restaurantId } }],
    onCompleted: () => addToast("Reserva creada", "success"),
    onError: (err) => addToast(err.message, "error"),
  });

  const [updateMutation] = useMutation(UPDATE_BOOKING, {
    refetchQueries: [{ query: GET_BOOKINGS, variables: { restaurantId } }],
    onCompleted: () => addToast("Reserva actualizada", "success"),
    onError: (err) => addToast(err.message, "error"),
  });

  const [deleteMutation] = useMutation(DELETE_BOOKING, {
    refetchQueries: [{ query: GET_BOOKINGS, variables: { restaurantId } }],
    onCompleted: () => addToast("Reserva eliminada", "info"),
    onError: (err) => addToast(err.message, "error"),
  });

  const createBooking = (input: CreateBookingInput) => {
    createMutation({ variables: { input } });
  };

  const updateBooking = (id: string, input: UpdateBookingInput) => {
    updateMutation({ variables: { id, input } });
  };

  const deleteBooking = (id: string) => {
    if (confirm("¿Eliminar reserva?")) {
      deleteMutation({ variables: { id } });
    }
  };

  return {
    bookings: data?.bookings || [],
    loading,
    error,
    createBooking,
    updateBooking,
    deleteBooking,
  };
}

export function useBookingsByUser(userId: string) {
  const { data, loading, error, refetch } = useQuery<BookingsUserData>(GET_BOOKINGS_USER, {
    variables: { userId },
    skip: !userId,
  });

  const [updateMutation] = useMutation(UPDATE_BOOKING, {
    onCompleted: () => {
      addToast("Reserva actualizada", "success");
      refetch();
    },
    onError: (err) => addToast(err.message, "error"),
  });

  const [deleteMutation] = useMutation(DELETE_BOOKING, {
    onCompleted: () => {
      addToast("Reserva eliminada", "info");
      refetch();
    },
    onError: (err) => addToast(err.message, "error"),
  });

  const updateBooking = (id: string, input: UpdateBookingInput) => {
    updateMutation({ variables: { id, input } });
  };

  const deleteBooking = (id: string) => {
    if (confirm("¿Eliminar reserva?")) {
      deleteMutation({ variables: { id } });
    }
  };

  return {
    bookings: data?.bookingsUser || [],
    loading,
    error,
    refetch,
    updateBooking,
    deleteBooking,
  };
}
