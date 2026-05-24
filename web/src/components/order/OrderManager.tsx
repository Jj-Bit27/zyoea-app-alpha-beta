import { useOrder } from "../../context/OrderContext";
import { useAuth } from "../../context/AuthContext";
import { useCreateOrder, useAddOrderItems, useUserOrders } from "../../hooks/useOrders";
import { useTables } from "../../hooks/useTables";
import { useState, useMemo } from "react";
import {
  FiTrash2,
  FiMinus,
  FiPlus,
  FiCheck,
  FiShoppingBag,
} from "react-icons/fi";
import { Button } from "../custom/Button";
import { Card, CardContent } from "../custom/Card";
import { addToast } from "../custom/Toast";
import { ApolloWrapper } from "../ApolloWrapper";

export function CartManagerContent() {
  const { cart, total, updateQuantity, removeFromCart, clearCart } = useOrder();
  const { user } = useAuth();
  const { createOrder, loading: creatingOrder } = useCreateOrder();
  const { addItems, loading: addingItems } = useAddOrderItems();
  const { orders: userOrders } = useUserOrders(user?.id ?? "");
  const [orderCreated, setOrderCreated] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const finalTotal = total;

  const restaurantId = cart.length > 0 ? cart[0].restaurantId : "";
  const { tables: allTables } = useTables(restaurantId);
  const availableTables = allTables.filter(
    (t) => t.status === "available" || t.status === "disponible",
  );

  const activeOrder = useMemo(() => {
    if (!restaurantId) return null;
    return userOrders.find(
      (o) =>
        String(o.restaurantId) === restaurantId &&
        (o.status === "ABIERTA" || o.status === "LISTA"),
    ) || null;
  }, [userOrders, restaurantId]);

  const loading = creatingOrder || addingItems;

  const handleFinalizeOrder = async () => {
    if (cart.length === 0) return;

    if (!user) {
      addToast("Debes iniciar sesión para hacer un pedido", "error");
      window.location.href = "/login";
      return;
    }

    try {
      if (activeOrder) {
        // Add items to existing active order
        const result = await addItems(activeOrder.id, cart.map((item) => ({
          productId: parseInt(item.id),
          quantity: item.quantity,
          subtotal: item.price * item.quantity,
        })));

        setCreatedOrderId(activeOrder.id);
        setOrderCreated(true);
        addToast("¡Productos agregados a tu orden activa!", "success");
        clearCart();
      } else {
        // Create new order
        const result = await createOrder({
          user: parseInt(user.id.toString()),
          user_name: user.name || "Cliente",
          restaurant: parseInt(cart[0].restaurantId),
          status: "ABIERTA",
          type: "app",
          total: finalTotal,
          table: selectedTable ? parseInt(selectedTable) : null,
          paid: false,
          items: cart.map((item) => ({
            productId: parseInt(item.id),
            quantity: item.quantity,
            subtotal: item.price * item.quantity,
          })),
        });

        setCreatedOrderId(result?.id || null);
        setOrderCreated(true);
        addToast("¡Pedido enviado con éxito!", "success");
        clearCart();
      }
    } catch (error: unknown) {
      console.error("Error creando la orden:", error);
      const err = error as { graphQLErrors?: Array<{ message: string }>; message?: string };
      const message =
        err?.graphQLErrors?.[0]?.message ||
        err?.message ||
        "Hubo un problema al procesar tu pedido";
      addToast(message, "error");
    }
  };

  // Pantalla de éxito después de crear la orden
  if (orderCreated) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <Card>
          <CardContent className="p-8">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiCheck size={40} className="text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">¡Pedido enviado!</h2>
            <p className="text-muted-foreground mb-4">
              Tu orden ha sido enviada al restaurante. Recibirás una
              notificación cuando esté lista.
            </p>
            {createdOrderId && (
              <p className="text-sm text-muted-foreground mb-6">
                Orden #{createdOrderId}
              </p>
            )}
            <div className="space-y-3">
              <Button
                className="w-full"
                onClick={() => (window.location.href = "/order/my-orders")}
              >
                Ver mis órdenes
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => (window.location.href = "/restaurants")}
              >
                Seguir explorando
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
          <FiShoppingBag size={40} className="text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Tu carrito está vacío</h2>
        <p className="text-muted-foreground mb-6">
          Parece que aún no has agregado nada delicioso.
        </p>
        <Button onClick={() => (window.location.href = "/restaurants")}>
          Ir a explorar
        </Button>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      {/* Active order banner */}
      {activeOrder && (
        <div className="lg:col-span-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-center gap-3">
          <span className="text-lg">📋</span>
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
              Tienes una orden activa (#{activeOrder.id})
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Los productos se agregarán a tu orden existente en lugar de crear una nueva.
            </p>
          </div>
        </div>
      )}

      {/* Items List */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold">
            Tu pedido de{" "}
            <span className="text-primary">{cart[0]?.restaurantName}</span>
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearCart}
            className="text-destructive"
            disabled={loading}
          >
            Vaciar carrito
          </Button>
        </div>

        {cart.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-4 flex gap-4 items-center">
              {item.image && (
                <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-semibold">{item.name}</h3>
                <p className="text-primary font-bold">${item.price}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => updateQuantity(item.id, -1)}
                  className="p-1 rounded-md hover:bg-secondary disabled:opacity-50"
                  disabled={item.quantity <= 1 || loading}
                >
                  <FiMinus size={16} />
                </button>
                <span className="w-4 text-center font-medium">
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.id, 1)}
                  className="p-1 rounded-md hover:bg-secondary disabled:opacity-50"
                  disabled={loading}
                >
                  <FiPlus size={16} />
                </button>
              </div>
              <button
                onClick={() => removeFromCart(item.id)}
                className="p-2 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                disabled={loading}
              >
                <FiTrash2 />
              </button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary */}
      <div className="lg:col-span-1">
        <Card className="sticky top-24">
          <CardContent className="p-6 space-y-4">
            <h3 className="text-lg font-bold border-b border-border pb-4">
              Resumen
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex justify-between text-lg font-bold border-t border-border pt-4">
              <span>Total</span>
              <span className="text-primary">${finalTotal.toFixed(2)}</span>
            </div>
            {availableTables.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Selecciona tu mesa
                </label>
                <select
                  value={selectedTable}
                  onChange={(e) => setSelectedTable(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Sin mesa asignada</option>
                  {availableTables.map((t) => (
                    <option key={t.id} value={t.id}>
                      Mesa {t.number} ({t.capacity} pers.)
                    </option>
                  ))}
                </select>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              El pago se realizará cuando el restaurante prepare tu orden.
            </p>
            <Button
              className="w-full mt-6"
              size="lg"
              onClick={handleFinalizeOrder}
              disabled={loading}
            >
              {loading ? (
                "Enviando pedido..."
              ) : (
                <>
                  Finalizar la orden <FiCheck className="ml-2" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function CartManager() {
  return (
    <ApolloWrapper>
      <CartManagerContent />
    </ApolloWrapper>
  );
}
