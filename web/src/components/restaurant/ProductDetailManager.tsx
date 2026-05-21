import { useState } from "react";
import { IoAdd, IoRemove, IoCart } from "react-icons/io5";
import { Card, CardContent } from "../custom/Card";
import { Button } from "../custom/Button";
import { Badge } from "../custom/Badge";
import { Textarea } from "../custom/Textarea";
import { Spinner } from "../custom/Spinner";
import { useOrder } from "../../context/OrderContext";
import { useToast } from "../custom/Toast";
import { useAuth } from "../../context/AuthContext";
import { useProductById } from "../../hooks/useProducts";
import { ApolloWrapper } from "../ApolloWrapper";

interface Props {
  productId: string;
  restaurantId: string;
}

function ProductDetailContent({ productId, restaurantId }: Props) {
  const { addItem, restaurantId: currentRestaurantId } = useOrder();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { product, loading, error } = useProductById(productId);

  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  if (error || !product)
    return (
      <div className="p-6 bg-destructive/10 text-destructive rounded-lg text-center">
        {error ? error.message : "Producto no encontrado"}
      </div>
    );

  const canAddProduct =
    !currentRestaurantId || currentRestaurantId === restaurantId;
  const totalPrice = product.price * quantity;

  const handleAddToOrder = () => {
    if (!user) {
      showToast("Inicia sesión para agregar productos", "warning");
      window.location.href = "/login";
      return;
    }

    if (user.role == "superadmin") {
      showToast(
        "Eres un usuario super admin, no puedes agregar nada al carrito",
        "warning",
      );
      return;
    }

    if (!canAddProduct) {
      showToast("Ya tienes productos de otro restaurante", "error");
      return;
    }

    for (let i = 0; i < quantity; i++) {
      const result = addItem(
        { ...product, notes },
        restaurantId,
        product.restaurant?.name,
      );
      if (!result.success) {
        showToast(result.message || "Error al agregar", "error");
        return;
      }
    }

    showToast(`${quantity}x ${product.name} agregado a tu orden`, "success");
    window.location.href = `/restaurants/${restaurantId}/products`;
  };

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Image Side */}
      <div className="overflow-hidden rounded-xl">
        <img
          src={product.image || "/placeholder.svg"}
          alt={product.name}
          className="h-full w-full object-cover max-h-96 lg:max-h-none transition-transform hover:scale-105 duration-500"
        />
      </div>

      {/* Details Side */}
      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {product.name}
            </h1>
            <p className="mt-1 text-muted-foreground">
              {product.restaurant?.name}
            </p>
          </div>
          <Badge
            variant={product.status ? "success" : "destructive"}
            className="shrink-0"
          >
            {product.status ? "Disponible" : "Agotado"}
          </Badge>
        </div>

        <p className="mt-4 text-lg text-muted-foreground">
          {product.description}
        </p>

        {product.ingredients && (
          <div className="mt-6">
            <h3 className="font-semibold text-foreground">Ingredientes</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {product.ingredients}
            </p>
          </div>
        )}

        <div className="mt-6">
          <span className="text-3xl font-bold text-primary">
            ${product.price}
          </span>
        </div>

        {/* Interactive Form */}
        {product.status && (
          <Card className="mt-3">
            <CardContent className="space-y-4 pt-2">
              {/* Quantity Selector */}
              <div>
                <label className="text-md font-medium text-foreground">
                  Cantidad
                </label>
                <div className="mt-2 flex items-center gap-4">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-foreground hover:bg-secondary transition-colors"
                  >
                    <IoRemove className="h-5 w-5" />
                  </button>
                  <span className="w-12 text-center text-lg font-semibold text-foreground">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-foreground hover:bg-secondary transition-colors"
                  >
                    <IoAdd className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Notes */}
              <Textarea
                label="Notas especiales (opcional)"
                placeholder="Ej: Sin cebolla, extra salsa..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              {/* Total and Add Button */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold text-foreground">
                    ${totalPrice}
                  </p>
                </div>
                {canAddProduct ? (
                  <Button size="lg" onClick={handleAddToOrder}>
                    <IoCart className="h-5 w-5" />
                    Agregar a la orden
                  </Button>
                ) : (
                  <div className="text-right">
                    <p className="text-xs text-destructive mb-1">
                      Orden de otro restaurante activa
                    </p>
                    <a href="/order">
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-transparent text-destructive border-destructive hover:bg-destructive/10"
                      >
                        Ver mi orden
                      </Button>
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function ProductDetailManager({
  productId,
  restaurantId,
}: Props) {
  return (
    <ApolloWrapper>
      <ProductDetailContent productId={productId} restaurantId={restaurantId} />
    </ApolloWrapper>
  );
}
