import { FiPlus, FiAlertTriangle } from "react-icons/fi";
import { Button } from "../custom/Button";
import { Card, CardContent } from "../custom/Card";
import { Spinner } from "../custom/Spinner";
import { useOrder } from "../../context/OrderContext";
import { useProducts } from "../../hooks/useProducts";
import { useCategories } from "../../hooks/useCategories";
import { useAllergenDetection } from "../../hooks/useAllergenDetection";
import { ApolloWrapper } from "../ApolloWrapper";
import type { Product } from "../../types";

interface RestaurantMenuProps {
  restaurantId: string;
  restaurantName: string;
}

function RestaurantMenuContent({
  restaurantId,
  restaurantName,
}: RestaurantMenuProps) {
  const { addToCart } = useOrder();
  const { products, loading: productsLoading, error: productsError } = useProducts(restaurantId);
  const { categories, loading: catsLoading, error: catsError } = useCategories(restaurantId);
  const { userAllergies, getProductAllergens, hasConflict } = useAllergenDetection();

  if (productsLoading || catsLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (productsError) {
    return (
      <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
        Error al cargar productos: {productsError.message}
      </div>
    );
  }

  if (catsError) {
    return (
      <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
        Error al cargar categorías: {catsError.message}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {userAllergies.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3">
          <FiAlertTriangle className="text-amber-500 mt-0.5 shrink-0" size={20} />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Alérgenos registrados: {userAllergies.join(", ")}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              Los productos con alérgenos conflictivos se marcarán con una advertencia.
            </p>
          </div>
        </div>
      )}

      {categories.map((category) => {
        const catId = parseInt(category.id);
        const catProducts = products.filter((p) => {
          const pCatId = typeof p.categoryId === "string" ? parseInt(p.categoryId) : p.categoryId;
          return pCatId === catId;
        });

        if (catProducts.length === 0) return null;

        return (
          <div key={category.id} id={category.name.toLowerCase()}>
            <h2 className="text-2xl font-bold mb-4 text-foreground">
              {category.name}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {catProducts.map((item) => {
                const productAllergens = getProductAllergens(item);
                const conflict = hasConflict(productAllergens);
                return renderProductCard(item, conflict, restaurantId, restaurantName, addToCart);
              })}
            </div>
          </div>
        );
      })}

      {products.length > 0 && (() => {
        const categorizedIds = new Set<string>();
        categories.forEach((cat) => {
          const catId = parseInt(cat.id);
          products.forEach((p) => {
            const pCatId = typeof p.categoryId === "string" ? parseInt(p.categoryId) : p.categoryId;
            if (pCatId === catId) categorizedIds.add(p.id);
          });
        });
        const uncategorized = products.filter((p) => !categorizedIds.has(p.id));
        if (uncategorized.length === 0) return null;
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-foreground">Todos los productos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {uncategorized.map((item) => {
                const productAllergens = getProductAllergens(item);
                const conflict = hasConflict(productAllergens);
                return renderProductCard(item, conflict, restaurantId, restaurantName, addToCart);
              })}
            </div>
          </div>
        );
      })()}

      {categories.length === 0 && products.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No hay productos disponibles en este momento.
        </div>
      )}
    </div>
  );
}

function renderProductCard(item: Product, conflict: boolean, restaurantId: string, restaurantName: string, addToCart: (item: Product, restaurantId: string, restaurantName: string) => void) {
  return (
    <a
      key={item.id}
      href={`/restaurants/${restaurantId}/products/${item.id}`}
      className={`block rounded-xl transition-colors ${
        conflict ? "ring-2 ring-amber-400/50 rounded-xl" : ""
      }`}
    >
      <Card className="flex overflow-hidden hover:border-primary/50 transition-colors h-full">
        <div className="flex-1 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-lg">{item.name}</h3>
              {conflict && (
                <span className="shrink-0 text-xs font-medium text-amber-700 bg-amber-100 dark:bg-amber-900/50 dark:text-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <FiAlertTriangle size={12} />
                  Precaución
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {item.description}
            </p>
            {item.ingredients && (
              <p className="text-xs text-muted-foreground/60 mt-1">
                <span className="font-medium">Ingredientes:</span> {item.ingredients}
              </p>
            )}
            {item.allergens && (
              <p className="text-xs text-muted-foreground/60">
                <span className="font-medium">Alérgenos:</span> {item.allergens}
              </p>
            )}
            <p className="text-primary font-bold mt-2">
              ${item.price}
            </p>
          </div>
          <Button
            size="sm"
            className="w-fit mt-3"
            onClick={(e) => {
              e.preventDefault();
              addToCart(item, restaurantId, restaurantName);
            }}
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
