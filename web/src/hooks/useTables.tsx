import { useMutation, useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { addToast } from "../components/custom/Toast";
import type { TableData } from "../types";

const GET_TABLES = gql`
  query tables($restaurantId: ID!) {
    tables(restaurantId: $restaurantId) {
      id
      restaurantId
      bookingId
      number
      capacity
      status
    }
  }
`;

const CREATE_TABLE = gql`
  mutation createTable($input: CreateTableInput!) {
    createTable(input: $input) {
      id
      number
      capacity
      status
    }
  }
`;

const UPDATE_TABLE = gql`
  mutation updateTable($id: ID!, $input: UpdateTableInput!) {
    updateTable(id: $id, input: $input) {
      id
      number
      capacity
      status
    }
  }
`;

const DELETE_TABLE = gql`
  mutation deleteTable($id: ID!) {
    deleteTable(id: $id)
  }
`;

export function useTables(restaurantId: string) {
  const { data, loading, error } = useQuery<TableData>(GET_TABLES, {
    variables: { restaurantId },
    skip: !restaurantId,
  });

  const [createMutation] = useMutation(CREATE_TABLE, {
    refetchQueries: [{ query: GET_TABLES, variables: { restaurantId } }],
    onCompleted: () => addToast("Mesa creada", "success"),
    onError: (err) => addToast(err.message, "error"),
  });

  const [updateMutation] = useMutation(UPDATE_TABLE, {
    refetchQueries: [{ query: GET_TABLES, variables: { restaurantId } }],
    onCompleted: () => addToast("Mesa actualizada", "success"),
    onError: (err) => addToast(err.message, "error"),
  });

  const [deleteMutation] = useMutation(DELETE_TABLE, {
    refetchQueries: [{ query: GET_TABLES, variables: { restaurantId } }],
    onCompleted: () => addToast("Mesa eliminada", "info"),
    onError: (err) => addToast(err.message, "error"),
  });

  const createTable = (input: any) => {
    createMutation({ variables: { input } });
  };

  const updateTable = (id: string, input: any) => {
    updateMutation({ variables: { id, input } });
  };

  const deleteTable = (id: string) => {
    if (confirm("¿Eliminar mesa?")) {
      deleteMutation({ variables: { id } });
    }
  };

  return {
    tables: data?.tables || [],
    loading,
    error,
    createTable,
    updateTable,
    deleteTable,
  };
}
