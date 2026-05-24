import { useMemo, useState } from "react";
import { IoArrowBack, IoAdd, IoSearch } from "react-icons/io5";
import { Card, CardContent } from "../custom/Card";
import { Button } from "../custom/Button";
import { Badge } from "../custom/Badge";
import { EmptyState } from "../custom/EmptyState";
import { useOrder } from "../../context/OrderContext";
import { useToast } from "../custom/Toast";
import { useAuth } from "../../context/AuthContext";
import { useProducts } from "../../hooks/useProducts";
import { useCategories } from "../../hooks/useCategories";
import { ApolloWrapper } from "../ApolloWrapper";
import { useRestaurantById } from "../../hooks/useRestaurants";
import type { Product } from "../../types";

export function ProductCatalogContent({
  restaurantId,
}: {
  restaurantId: string;
}) {
  const { addItem, restaurantId: currentRestaurantId } = useOrder();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { products } = useProducts(restaurantId);
  const { categories } = useCategories(restaurantId);
  const { restaurant } = useRestaurantById(restaurantId);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const restaurantCategories = categories;

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        !selectedCategory || p.categoryId === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, restaurantId, searchQuery, selectedCategory]);

  const handleAddToOrder = (product: Product) => {
    if (!user) {
      showToast("Inicia sesión para agregar productos", "warning");
      window.location.href = "/login";
      return;
    }
    const result = addItem(product);
    if (result.success) showToast(`${product.name} agregado`, "success");
    else showToast(result.message || "Error", "error");
  };

  const canAddProduct =
    !currentRestaurantId || currentRestaurantId === restaurantId;

  return (
    <>
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <a
            href={`/restaurants/${restaurantId}`}
            className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <IoArrowBack /> Volver a {restaurant?.name || "Restaurante"}
          </a>
          <h1 className="text-2xl font-bold">
            Menú de {restaurant?.name || "Restaurante"}
          </h1>

          <div className="relative mt-4 max-w-md">
            <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`rounded-full px-3 py-1.5 text-sm transition-colors ${selectedCategory === null ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"}`}
            >
              Todos
            </button>
            {restaurantCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`rounded-full px-3 py-1.5 text-sm transition-colors ${selectedCategory === cat.id ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="py-8">
        <div className="mx-auto max-w-7xl px-4">
          {!canAddProduct && (
            <div className="mb-6 rounded-lg bg-warning/10 border border-warning/30 p-4 flex flex-col items-start gap-2">
              <p className="text-sm text-warning-foreground">
                Ya tienes productos de otro restaurante. Vacía tu orden para
                cambiar.
              </p>
              <a href="/order">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-transparent text-warning-foreground"
                >
                  Ver mi orden
                </Button>
              </a>
            </div>
          )}

          {filteredProducts.length === 0 ? (
            <EmptyState
              icon={IoSearch}
              title="Sin resultados"
              description="Intenta con otro término"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product) => (
                <Card
                  key={product.id}
                  padding="none"
                  hoverable
                  className="overflow-hidden h-full"
                >
                  <a
                    href={`/restaurants/${restaurantId}/products/${product.id}`}
                  >
                    <div className="aspect-16/10 overflow-hidden">
                      <img
                        src={product.image || "/placeholder.svg"}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                      />
                    </div>
                  </a>
                  <CardContent className="p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-semibold line-clamp-1">
                          {product.name}
                        </h3>
                        <Badge
                          variant={
                            product.isAvailable ? "success" : "secondary"
                          }
                        >
                          {product.isAvailable ? "Disponible" : "Agotado"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {product.description}
                      </p>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-lg font-bold text-primary">
                        ${product.price}
                      </span>
                      {canAddProduct && product.isAvailable && (
                        <button
                          onClick={() => handleAddToOrder(product)}
                          className="h-9 w-9 flex items-center justify-center rounded-full bg-primary text-white hover:bg-primary/90 transition-colors"
                        >
                          <IoAdd className="h-6 w-6" />
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export function ProductCatalog({ restaurantId }: { restaurantId: string }) {
  return (
    <ApolloWrapper>
      <ProductCatalogContent restaurantId={restaurantId} />
    </ApolloWrapper>
  );
}
