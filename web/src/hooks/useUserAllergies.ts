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

export function useUserAllergies(userId: string | undefined) {
  const { data, loading, error } = useQuery(GET_USER, {
    variables: { id: userId },
    skip: !userId,
  });

  const [updateMutation, { loading: saving }] = useMutation(UPDATE_USER_ALLERGIES);

  const allergies = data?.user?.allergies || "";

  const updateAllergies = async (allergies: string) => {
    if (!userId) return;
    const result = await updateMutation({
      variables: { id: userId, allergies },
    });
    return result.data?.updateUserAllergies;
  };

  return {
    allergies,
    loading,
    saving,
    error,
    updateAllergies,
  };
}
