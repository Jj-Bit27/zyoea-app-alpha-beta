import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";

// Singleton para asegurar una sola instancia en el cliente
let client: any = null;

export function getApolloClient() {
  if (!client || typeof window === "undefined") {
    client = new ApolloClient({
      link: new HttpLink({
        uri: "http://localhost:8080/query",
      }),
      cache: new InMemoryCache(),
    });
  }
  return client;
}
