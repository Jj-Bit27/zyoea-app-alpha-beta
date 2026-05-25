import { ApolloClient, InMemoryCache, HttpLink, type NormalizedCacheObject } from "@apollo/client";
import { GRAPHQL_URL } from "../config";

// Singleton para asegurar una sola instancia en el cliente
let client: ApolloClient<NormalizedCacheObject> | null = null;

export function getApolloClient() {
  if (!client || typeof window === "undefined") {
    client = new ApolloClient({
      link: new HttpLink({
        uri: GRAPHQL_URL,
      }),
      cache: new InMemoryCache(),
    });
  }
  return client;
}
