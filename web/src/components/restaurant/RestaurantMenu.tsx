import { FiPlus, FiMinus, FiShoppingBag, FiStar } from "react-icons/fi";
import { Button } from "../custom/Button";
import { Card, CardContent } from "../custom/Card";
import { useOrder } from "../../context/OrderContext";
import { useProducts } from "../../hooks/useProducts";
import { useCategories } from "../../hooks/useCategories";
import { ApolloWrapper } from "../ApolloWrapper";

interface RestaurantMenuProps {
  restaurantId: string;
  restaurantName: string;
}

function RestaurantMenuContent({
  restaurantId,
  restaurantName,
}: RestaurantMenuProps) {
  const { addToCart } = useOrder();
  const { products } = useProducts(restaurantId);
  const { categories } = useCategories(restaurantId);

  return (
    <div className="space-y-8">
      {categories.map((category) => (
        <div key={category.id} id={category.name.toLowerCase()}>
          <h2 className="text-2xl font-bold mb-4 text-foreground">
            {category.name}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {products.map((item) => (
              <a
                key={item.id}
                href={`/restaurants/${restaurantId}/products/${item.id}`}
              >
                <Card className="flex overflow-hidden hover:border-primary/50 transition-colors">
                  <div className="flex-1 p-4 flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{item.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {item.description}
                      </p>
                      <p className="text-primary font-bold mt-2">
                        ${item.price}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="w-fit mt-3"
                      onClick={() =>
                        addToCart(item, restaurantId, restaurantName)
                      }
                    >
                      <FiPlus className="mr-1" /> Agregar
                    </Button>
                  </div>
                  {item.image && (
                    <div className="w-32 md:w-40 relative">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    </div>
                  )}
                </Card>
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function RestaurantMenu({
  restaurantId,
  restaurantName,
}: RestaurantMenuProps) {
  return (
    <ApolloWrapper>
      <RestaurantMenuContent
        restaurantId={restaurantId}
        restaurantName={restaurantName}
      />
    </ApolloWrapper>
  );
}
