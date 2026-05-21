import { ApolloProvider } from "@apollo/client/react";
import { getApolloClient } from "../libs/apollo"; // Tu singleton
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export function ApolloWrapper({ children }: Props) {
  // Obtenemos la instancia única del cliente
  const client = getApolloClient();

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
