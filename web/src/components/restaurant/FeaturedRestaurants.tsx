import { useRestaurants } from "../../hooks/useRestaurants";
import type { Restaurant } from "../../types";
import { ApolloWrapper } from "../ApolloWrapper";
import { Spinner } from "../custom/Spinner";

export function FeaturedRestaurantsContent() {
  const { restaurants, loading, error, deleteRestaurant } = useRestaurants();

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-destructive/10 text-destructive rounded-lg text-center">
        No se pudieron cargar los restaurantes.
      </div>
    );
  }

  const featuredRestaurants = restaurants.slice(0, 3);

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {featuredRestaurants.map((rest: Restaurant) => (
        <a
          key={rest.id}
          href={`/restaurants/${rest.id}`}
          className="group block overflow-hidden rounded-xl bg-card shadow-sm hover:shadow-lg transition-all"
        >
          <div className="relative aspect-video overflow-hidden">
            <img
              src={
                rest.image ||
                "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600"
              }
              alt={rest.name}
              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
            />
          </div>
          <div className="p-4">
            <h3 className="text-lg font-bold text-foreground">{rest.name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-1">
              {rest.address}
            </p>
          </div>
        </a>
      ))}
    </div>
  );
}

export function FeaturedRestaurants() {
  return (
    <ApolloWrapper>
      <FeaturedRestaurantsContent />
    </ApolloWrapper>
  );
}
