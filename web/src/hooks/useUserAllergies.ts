import { gql } from "@apollo/client";
import { useQuery, useMutation } from "@apollo/client/react";

const GET_USER = gql`
  query User($id: ID!) {
    user(id: $id) {
      id
      name
      email
      role
      allergies
    }
  }
`;

const UPDATE_USER_ALLERGIES = gql`
  mutation UpdateUserAllergies($id: ID!, $allergies: String!) {
    updateUserAllergies(id: $id, allergies: $allergies) {
      id
      allergies
    }
  }
`;

const DELETE_ACCOUNT = gql`
  mutation DeleteAccount($id: ID!) {
    deleteAccount(id: $id)
  }
`;

export function useUserAllergies(userId: string | undefined) {
  const { data, loading, error } = useQuery(GET_USER, {
    variables: { id: userId },
    skip: !userId,
  });

  const [updateMutation, { loading: saving }] = useMutation(UPDATE_USER_ALLERGIES);
  const [deleteMutation, { loading: deleting }] = useMutation(DELETE_ACCOUNT);

  const allergies = data?.user?.allergies || "";

  const updateAllergies = async (allergies: string) => {
    if (!userId) return;
    const result = await updateMutation({
      variables: { id: userId, allergies },
    });
    return result.data?.updateUserAllergies;
  };

  const deleteAccount = async () => {
    if (!userId) return;
    const result = await deleteMutation({
      variables: { id: userId },
    });
    return result.data?.deleteAccount;
  };

  return {
    allergies,
    loading,
    saving,
    deleting,
    error,
    updateAllergies,
    deleteAccount,
  };
}
