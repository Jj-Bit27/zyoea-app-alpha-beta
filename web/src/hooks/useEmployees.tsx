import { useMutation, useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { addToast } from "../components/custom/Toast";
import type { CreateEmployeeInput, EmployeeData, UpdateEmployeeInput } from "../types";

const GET_EMPLOYEES = gql`
  query employeesByRestaurant($restaurantId: ID!) {
    employeesByRestaurant(restaurantId: $restaurantId) {
      id
      restaurantId
      position
      hireDate
      userId
      user {
        id
        name
        email
        role
      }
    }
  }
`;

const CREATE_EMPLOYEE = gql`
  mutation createEmployee($input: CreateEmployeeInput!) {
    createEmployee(input: $input) {
      id
      position
      user {
        id
        name
        email
      }
    }
  }
`;

const UPDATE_EMPLOYEE = gql`
  mutation updateEmployee($input: UpdateEmployeeInput!) {
    updateEmployee(input: $input) {
      id
      position
      user {
        id
        name
        email
      }
    }
  }
`;

const REMOVE_EMPLOYEE = gql`
  mutation removeEmployee($id: ID!) {
    removeEmployee(id: $id)
  }
`;

export function useEmployees(restaurantId: string) {
  const { data, loading, error } = useQuery<EmployeeData>(GET_EMPLOYEES, {
    variables: { restaurantId },
    skip: !restaurantId,
  });

  const [createMutation] = useMutation(CREATE_EMPLOYEE, {
    refetchQueries: [{ query: GET_EMPLOYEES, variables: { restaurantId } }],
    onCompleted: () => addToast("Empleado registrado", "success"),
    onError: (err) => addToast(err.message, "error"),
  });

  const [updateMutation] = useMutation(UPDATE_EMPLOYEE, {
    refetchQueries: [{ query: GET_EMPLOYEES, variables: { restaurantId } }],
    onCompleted: () => addToast("Empleado actualizado", "success"),
    onError: (err) => addToast(err.message, "error"),
  });

  const [removeMutation] = useMutation(REMOVE_EMPLOYEE, {
    refetchQueries: [{ query: GET_EMPLOYEES, variables: { restaurantId } }],
    onCompleted: () => addToast("Empleado eliminado", "info"),
    onError: (err) => addToast(err.message, "error"),
  });

  const createEmployee = (input: CreateEmployeeInput) => {
    createMutation({ variables: { input } });
  };

  const updateEmployee = (input: UpdateEmployeeInput) => {
    updateMutation({ variables: { input } });
  };

  const removeEmployee = (id: string) => {
    if (confirm("¿Eliminar empleado?")) {
      removeMutation({ variables: { id } });
    }
  };

  return {
    employees: data?.employeesByRestaurant || [],
    loading,
    error,
    createEmployee,
    updateEmployee,
    removeEmployee,
  };
}
