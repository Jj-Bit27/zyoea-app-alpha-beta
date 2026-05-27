import { useState } from "react";
import { ApolloWrapper } from "../ApolloWrapper";
import { Button } from "../custom/Button";
import { Input } from "../custom/Input";
import { Spinner } from "../custom/Spinner";
import { useAuth } from "../../context/AuthContext";
import { useStaffOrder, calcCartTotal, addToCart, removeFromCart, deleteFromCart } from "../../hooks/useStaffOrder";
import type { StaffCartItem } from "../../hooks/useStaffOrder";
import type { Order, Product } from "../../types";

function StaffCreateOrderContent() {
  const { user } = useAuth();
  const [customerName, setCustomerName] = useState("");
  const [selectedTable, setSelectedTable] = useState("");
  const [notes, setNotes] = useState("");
  const [cart, setCart] = useState<StaffCartItem[]>([]);
  const [orderResult, setOrderResult] = useState<Order | null>(null);

  const restaurantId = user?.restaurantId || "";
  const { tables, products, loading, creating, createOrder } =
    useStaffOrder(restaurantId);

  const handleAddToCart = (product: Pick<Product, "id" | "name" | "price">) => setCart((prev) => addToCart(prev, product));
  const handleRemoveFromCart = (pid: number) => setCart((prev) => removeFromCart(prev, pid));
  const handleDeleteFromCart = (pid: number) => setCart((prev) => deleteFromCart(prev, pid));
  const total = calcCartTotal(cart);

  const handleCreateOrder = async () => {
    if (!restaurantId || !customerName) return;
    if (cart.length === 0) return;

    const result = await createOrder({
      user: user?.id ? parseInt(user.id) : null,
      user_name: customerName,
      restaurant: parseInt(restaurantId),
      status: "ABIERTA",
      type: "dine_in",
      total,
      notes: notes || null,
      table: selectedTable ? parseInt(selectedTable) : null,
      paid: false,
      items: cart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        subtotal: item.subtotal,
      })),
    });

    if (result) {
      setOrderResult(result);
    }
  };

  const handleNewOrder = () => {
    setCustomerName("");
    setSelectedTable("");
    setNotes("");
    setCart([]);
    setOrderResult(null);
  };

  if (orderResult) {
    return (
      <div className="max-w-md mx-auto mt-12 p-6 text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
          <svg className="h-8 w-8 text-green-600 dark:text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-foreground">¡Orden Creada!</h2>
        <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2">
          <p className="text-sm"><span className="text-muted-foreground">Orden #:</span> <span className="font-medium">{orderResult.id}</span></p>
          <p className="text-sm"><span className="text-muted-foreground">Cliente:</span> <span className="font-medium">{customerName}</span></p>
          <p className="text-sm"><span className="text-muted-foreground">Total:</span> <span className="font-medium">${total.toFixed(2)}</span></p>
          <p className="text-sm"><span className="text-muted-foreground">Estado:</span> <span className="font-medium text-yellow-600">En preparación</span></p>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleNewOrder} className="flex-1">Nueva orden</Button>
          <Button variant="outline" className="flex-1" onClick={() => (window.location.href = "/staff/kitchen")}>
            Ir a cocina
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Nueva Orden</h1>
        <p className="text-sm text-muted-foreground mt-1">Crea una orden para un cliente presencial</p>
      </div>

      {/* Step 1: Customer Info */}
      <div className="bg-card rounded-xl border border-border p-4 md:p-6 space-y-4">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
          Datos del cliente
        </h2>
        <Input label="Nombre del cliente" placeholder="Ej: Juan Pérez" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Mesa</label>
          <select
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Sin mesa (para llevar)</option>
            {tables.map((t) => (
              <option key={t.id} value={t.id}>Mesa {t.number} ({t.capacity} pers.)</option>
            ))}
          </select>
        </div>
        <Input label="Notas (opcional)" placeholder="Ej: Sin cebolla, bien cocido..." value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      {/* Step 2: Products */}
      <div className="bg-card rounded-xl border border-border p-4 md:p-6 space-y-4">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
          Productos {cart.length > 0 && <span className="text-sm text-muted-foreground font-normal">({cart.length} items)</span>}
        </h2>
        {!restaurantId ? (
          <p className="text-sm text-muted-foreground italic py-4 text-center">No tienes un restaurante asignado</p>
        ) : loading ? (
          <div className="flex items-center justify-center py-8"><Spinner size="md" /></div>
        ) : products.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-4 text-center">No hay productos disponibles</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 max-h-96 overflow-y-auto">
            {products.filter((p) => p.status !== false).map((product) => (
              <button key={product.id} onClick={() => handleAddToCart(product)}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-background hover:bg-accent transition-colors text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground">${product.price?.toFixed(2)}{product.category?.name && <> · {product.category.name}</>}</p>
                </div>
                <span className="text-lg shrink-0 ml-2">+</span>
              </button>
            ))}
          </div>
        )}
        {cart.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">Carrito</h3>
            <div className="space-y-1">
              {cart.map((item) => (
                <div key={item.productId} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">${item.price.toFixed(2)} c/u</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <button onClick={() => handleRemoveFromCart(item.productId)}
                      className="w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-destructive hover:text-destructive-foreground text-sm sm:text-base">−</button>
                    <span className="text-sm font-medium w-6 sm:w-8 text-center">{item.quantity}</span>
                    <button onClick={() => handleAddToCart({ id: String(item.productId), name: item.name, price: item.price })}
                      className="w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground text-sm sm:text-base">+</button>
                    <button onClick={() => handleDeleteFromCart(item.productId)}
                      className="w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-destructive hover:text-destructive-foreground text-sm sm:text-base ml-1">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="bg-card rounded-xl border border-border p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-lg font-bold text-foreground">Total: ${total.toFixed(2)}</span>
        </div>
        <Button onClick={handleCreateOrder} disabled={creating || !customerName || cart.length === 0} className="w-full">
          {creating ? <><Spinner size="sm" className="mr-2" /> Creando orden...</> : "Crear orden"}
        </Button>
      </div>
    </div>
  );
}

export function StaffCreateOrder() {
  return (
    <ApolloWrapper>
      <StaffCreateOrderContent />
    </ApolloWrapper>
  );
}
