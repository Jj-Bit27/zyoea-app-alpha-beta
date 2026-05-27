import { FiStar, FiClock, FiMapPin, FiMessageSquare } from "react-icons/fi";
import { useRestaurantById } from "../../hooks/useRestaurants";
import { RestaurantMenu } from "./RestaurantMenu";
import { ReviewManager } from "./ReviewManager";
import { ApolloWrapper } from "../ApolloWrapper";
import { Spinner } from "../custom/Spinner";
import { Button } from "../custom/Button";
import { useReviews } from "../../hooks/useReviews";
import { ScheduleDisplay } from "./ScheduleDisplay";

function RestaurantDetailsContent({
  restaurantId,
}: {
  restaurantId: string;
}) {
  const { restaurant } = useRestaurantById(restaurantId);
  const { reviews, loading, error, createReview, deleteReview } = useReviews(restaurantId)

  if (!restaurant)
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );

  return (
    <>
      <div className="relative h-56 md:h-80 w-full">
        <img
          src={restaurant?.image}
          alt={restaurant?.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 from-black/80 to-transparent"></div>
        <div className="absolute bottom-0 left-0 p-4 md:p-8 max-w-7xl mx-auto w-full">
          <h1 className="text-3xl md:text-5xl font-bold mb-2">
            {restaurant?.name}
          </h1>
          <div className="flex flex-wrap gap-4 text-sm md:text-base items-center">
            <div className="flex items-center gap-1">
              <FiClock />
              <ScheduleDisplay hours={restaurant?.hours || ""} />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 flex flex-col lg:flex-row gap-4 md:gap-8">
        <div className="flex-1">
          <RestaurantMenu
            restaurantId={restaurantId}
            restaurantName={restaurant?.name || "Restaurante"}
          />
        </div>

        <div className="lg:w-80 space-y-6">
          <div className="sticky top-24 space-y-6">
            <div className="p-6 rounded-xl border">
              <h3 className="font-bold text-lg mb-4">Información</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <FiMapPin className="mt-1 text-blue-500" />
                  <p>{restaurant?.address}</p>
                </div>
                <div className="flex items-start gap-3">
                  <FiClock className="mt-1 text-blue-500" />
                  <div>
                    <p className="font-medium">Horario</p>
                    <ScheduleDisplay hours={restaurant?.hours || ""} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-12">
        <div className="border-t border-border pt-8">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <FiStar className="text-yellow-500" />
            Reseñas y Comentarios
          </h2>
          <ReviewManager
            restaurantId={restaurantId}
            restaurantName={restaurant?.name || ""}
            compact
          />
          {!reviews && (
            <div className="mt-6 text-center">
              <a href={`/restaurants/${restaurantId}/review`}>
                <Button variant="outline">
                  Ver todas las reseñas
                </Button>
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export function RestaurantDetails({
  restaurantId,
}: {
  restaurantId: string;
}) {
  return (
    <ApolloWrapper>
      <RestaurantDetailsContent restaurantId={restaurantId} />
    </ApolloWrapper>
  );
}
