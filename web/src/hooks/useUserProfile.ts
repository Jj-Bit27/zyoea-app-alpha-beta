import { useMutation } from "@apollo/client/react";
import { gql } from "@apollo/client";
import type { User } from "../types";

const UPDATE_USER = gql`
  mutation updateUser($id: ID!, $name: String, $email: String) {
    updateUser(id: $id, name: $name, email: $email) {
      id
      name
      email
      role
      isVerified
    }
  }
`;

export function useUserProfile(userId: string | undefined) {
  const [updateMutation, { loading }] = useMutation(UPDATE_USER);

  const updateUser = async (name: string, email: string): Promise<User | null> => {
    if (!userId) return null;
    try {
      const { data } = await updateMutation({ variables: { id: userId, name, email } });
      return data?.updateUser || null;
    } catch {
      return null;
    }
  };

  return { updateUser, saving: loading };
}
