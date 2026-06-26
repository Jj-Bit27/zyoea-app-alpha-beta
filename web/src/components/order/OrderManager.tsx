import { useOrder, $cart, addToCart as localAddToCart, clearCart as clearLocalCart } from "../../context/OrderContext";
import { useAuth } from "../../context/AuthContext";
import { useCreateOrder, useAddOrderItems, useUserOrders } from "../../hooks/useOrders";
import { useTables } from "../../hooks/useTables";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { gql } from "@apollo/client";
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
import WaitTimeDisplay from "./WaitTimeDisplay";

const GET_CART = gql`
  query getCart($userId: ID!) {
    getCart(userId: $userId) {
      id
      productId
      productName
      productImage
      quantity
      price
      restaurantId
    }
  }
`;

const ADD_TO_CART = gql`
  mutation addToCart($userId: ID!, $productId: Int!, $quantity: Int!, $restaurantId: Int!) {
    addToCart(userId: $userId, productId: $productId, quantity: $quantity, restaurantId: $restaurantId) {
      id
    }
  }
`;

const UPDATE_CART_ITEM = gql`
  mutation updateCartItem($userId: ID!, $productId: Int!, $quantity: Int!) {
    updateCartItem(userId: $userId, productId: $productId, quantity: $quantity) {
      id
    }
  }
`;

const REMOVE_FROM_CART = gql`
  mutation removeFromCart($userId: ID!, $productId: Int!) {
    removeFromCart(userId: $userId, productId: $productId)
  }
`;

const CLEAR_CART = gql`
  mutation clearCart($userId: ID!) {
    clearCart(userId: $userId)
  }
`;

export function CartManagerContent() {
  const { cart, total, updateQuantity, removeFromCart, clearCart } = useOrder();
  const { user } = useAuth();
  const { createOrder, loading: creatingOrder } = useCreateOrder();
  const { addItems, loading: addingItems } = useAddOrderItems();
  const { orders: userOrders } = useUserOrders(user?.id ?? "");
  const [orderCreated, setOrderCreated] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [createdOrderWaitTime, setCreatedOrderWaitTime] = useState<number>(0);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [orderType, setOrderType] = useState<"dine_in" | "takeaway">("dine_in");
  const finalTotal = total;

  const restaurantId = cart.length > 0 ? cart[0].restaurantId : "";
  const { tables: allTables } = useTables(restaurantId);
  const availableTables = allTables.filter(
    (t) => t.status === "available" || t.status === "disponible",
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      const qrTable = localStorage.getItem("qr_table_number");
      if (qrTable) {
        const table = availableTables.find(
          (t) => String(t.number) === qrTable,
        );
        if (table) setSelectedTable(String(table.id));
        localStorage.removeItem("qr_table_number");
      }
    }
  }, [availableTables]);

  const activeOrder = useMemo(() => {
    if (!restaurantId) return null;
    return userOrders.find(
      (o) =>
        String(o.restaurantId) === restaurantId &&
        (o.status === "ABIERTA" || o.status === "LISTA"),
    ) || null;
  }, [userOrders, restaurantId]);

  const loading = creatingOrder || addingItems;

  const userId = user?.id || "";
  const { data: cartData } = useQuery(GET_CART, {
    variables: { userId },
    skip: !userId,
  });
  const [addToCartBd] = useMutation(ADD_TO_CART);
  const [updateCartItemBd] = useMutation(UPDATE_CART_ITEM);
  const [removeFromCartBd] = useMutation(REMOVE_FROM_CART);
  const [clearCartBd] = useMutation(CLEAR_CART);

  // Load BD cart into local state on mount
  useEffect(() => {
    if (cartData?.getCart?.length > 0) {
      const bdCart = cartData.getCart;
      // Only sync if local cart is empty (initial load)
      if (cart.length === 0) {
        clearLocalCart();
        for (const item of bdCart) {
          localAddToCart(
            { id: item.productId, name: item.productName, price: item.price, image: item.productImage },
            item.restaurantId,
            item.productName,
          );
        }
      }
    }
  }, [cartData]);

  // Wrap local operations with BD sync
  const syncedUpdateQuantity = (id: string, delta: number) => {
    if (!userId) return updateQuantity(id, delta);
    const item = cart.find((i) => i.id === id);
    if (!item) return;
    const newQty = Math.max(1, (item.quantity || 1) + delta);
    updateQuantity(id, delta);
    updateCartItemBd({
      variables: { userId, productId: parseInt(id), quantity: newQty },
    });
  };

  const syncedRemoveFromCart = (id: string) => {
    if (!userId) return removeFromCart(id);
    removeFromCart(id);
    removeFromCartBd({ variables: { userId, productId: parseInt(id) } });
  };

  const syncedClearCart = () => {
    if (!userId) return clearLocalCart();
    clearLocalCart();
    clearCartBd({ variables: { userId } });
  };

  const handleFinalizeOrder = async () => {
    if (cart.length === 0) return;

    if (!user) {
      addToast("Debes iniciar sesión para hacer un pedido", "error");
      window.location.href = "/login";
      return;
    }

    if (orderType === "dine_in") {
      if (!selectedTable) {
        addToast("Selecciona una mesa para comer aquí", "error");
        return;
      }
      const tableIsAvailable = availableTables.some((t) => String(t.id) === selectedTable);
      if (!tableIsAvailable) {
        addToast("La mesa seleccionada ya no está disponible", "error");
        setSelectedTable("");
        return;
      }
    }

    try {
      // Sync local cart to BD before finalizing
      if (userId && cart.length > 0 && !activeOrder) {
        clearCartBd({ variables: { userId } });
        for (const item of cart) {
          await addToCartBd({
            variables: {
              userId,
              productId: parseInt(item.id),
              quantity: item.quantity,
              restaurantId: parseInt(item.restaurantId),
            },
          });
        }
      }

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
        syncedClearCart();
      } else {
        // Create new order
        const result = await createOrder({
          user: parseInt(user.id.toString()),
          user_name: user.name || "Cliente",
          restaurant: parseInt(cart[0].restaurantId),
          status: "ABIERTA",
          type: orderType,
          total: finalTotal,
          table: orderType === "dine_in" ? (selectedTable ? parseInt(selectedTable) : null) : null,
          paid: false,
          items: cart.map((item) => ({
            productId: parseInt(item.id),
            quantity: item.quantity,
            subtotal: item.price * item.quantity,
          })),
        });

        setCreatedOrderId(result?.id || null);
        setCreatedOrderWaitTime((result as { estimatedWaitTime?: number })?.estimatedWaitTime || 0);
        setOrderCreated(true);
        addToast("¡Pedido enviado con éxito!", "success");
        syncedClearCart();
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
              <p className="text-sm text-muted-foreground mb-2">
                Orden #{createdOrderId}
              </p>
            )}
            {createdOrderWaitTime > 0 && (
              <div className="flex justify-center mb-6">
                <WaitTimeDisplay estimatedMinutes={createdOrderWaitTime} size="lg" />
              </div>
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
    <div className="grid lg:grid-cols-3 gap-4 md:gap-8">
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
            onClick={syncedClearCart}
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
                  onClick={() => syncedUpdateQuantity(item.id, -1)}
                  className="p-1 rounded-md hover:bg-secondary disabled:opacity-50"
                  disabled={item.quantity <= 1 || loading}
                >
                  <FiMinus size={16} />
                </button>
                <span className="w-4 text-center font-medium">
                  {item.quantity}
                </span>
                <button
                  onClick={() => syncedUpdateQuantity(item.id, 1)}
                  className="p-1 rounded-md hover:bg-secondary disabled:opacity-50"
                  disabled={loading}
                >
                  <FiPlus size={16} />
                </button>
              </div>
              <button
                onClick={() => syncedRemoveFromCart(item.id)}
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

            {/* Tipo de orden: Comer aquí / Para llevar */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                ¿Cómo quieres tu pedido?
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setOrderType("dine_in"); setSelectedTable(""); }}
                  className={`flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-all ${
                    orderType === "dine_in"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  Comer aquí
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType("takeaway")}
                  className={`flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-all ${
                    orderType === "takeaway"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  Para llevar
                </button>
              </div>
            </div>

            {/* Selección de mesa solo si es dine_in */}
            {orderType === "dine_in" && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Selecciona tu mesa <span className="text-destructive">*</span>
                </label>
                {availableTables.length === 0 ? (
                  <p className="text-sm text-destructive">No hay mesas disponibles en este momento</p>
                ) : (
                  <select
                    value={selectedTable}
                    onChange={(e) => setSelectedTable(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">-- Elige una mesa --</option>
                    {availableTables.map((t) => (
                      <option key={t.id} value={t.id}>
                        Mesa {t.number} ({t.capacity} pers.)
                      </option>
                    ))}
                  </select>
                )}
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
