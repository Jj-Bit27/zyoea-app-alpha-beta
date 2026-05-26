import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  useUserOrders,
  useUpdateOrderPayment,
  useAddOrderItems,
  useRemoveOrderItem,
} from "../../hooks/useOrders";
import { useCreatePayment } from "../../hooks/usePayments";
import { useProducts } from "../../hooks/useProducts";
import { useOrderById } from "../../hooks/useOrders";
import { Button } from "../custom/Button";
import { Card, CardContent } from "../custom/Card";
import { Input } from "../custom/Input";
import { addToast } from "../custom/Toast";
import { ApolloWrapper } from "../ApolloWrapper";
import WaitTimeDisplay from "./WaitTimeDisplay";
import {
  FiClock,
  FiCheck,
  FiPackage,
  FiCreditCard,
  FiRefreshCw,
  FiEdit2,
  FiPlus,
  FiMinus,
  FiTrash2,
} from "react-icons/fi";
import {
  IoCash,
  IoCard,
  IoLockClosed,
  IoCheckmarkCircle,
  IoArrowBack,
  IoHourglass,
} from "react-icons/io5";
import type { Order } from "../../types";

const statusConfig: Record<
  string,
  { label: string; color: string; icon: typeof FiClock }
> = {
  ABIERTA: {
    label: "En preparación",
    color:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    icon: FiClock,
  },
  LISTA: {
    label: "Lista — ¡Puedes pagar!",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    icon: FiPackage,
  },
  COMPLETADA: {
    label: "Completada",
    color:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    icon: FiCheck,
  },
  PAGADO: {
    label: "Pagado",
    color:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    icon: FiCreditCard,
  },
};

// ── Pantalla de pago con tarjeta (inline) ────────────────────────────
function CardPaymentScreen({
  order,
  onSuccess,
  onBack,
}: {
  order: Order;
  onSuccess: () => void;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const { createPayment, loading: creatingPayment } = useCreatePayment();
  const { updatePayment, loading: updatingPayment } = useUpdateOrderPayment();
  const isProcessing = creatingPayment || updatingPayment;

  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const formatCardNumber = (v: string) => {
    const n = v.replace(/\D/g, "");
    const parts = n.match(/.{1,4}/g);
    return parts ? parts.join(" ") : n;
  };

  const formatExpiry = (v: string) => {
    const n = v.replace(/\D/g, "");
    if (n.length >= 2) return n.substring(0, 2) + "/" + n.substring(2, 4);
    return n;
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!cardNumber || cardNumber.replace(/\s/g, "").length < 16)
      e.cardNumber = "Ingresa un número válido";
    if (!cardName.trim()) e.cardName = "Ingresa el nombre del titular";
    if (!expiry || expiry.length < 5) e.expiry = "Ingresa una fecha válida";
    if (!cvv || cvv.length < 3) e.cvv = "Ingresa el CVV";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePay = async () => {
    if (!validate() || !user) return;
    try {
      const mockToken = "pm_mock_" + Math.floor(Math.random() * 10000);
      await createPayment({
        userId: user.id.toString(),
        amount: order.total,
        currency: "MXN",
        paymentMethodId: mockToken,
        description: `Pago con tarjeta - Orden #${order.id}`,
        orderId: parseInt(order.id),
      });
      await updatePayment(order.id, true);
      addToast("¡Pago con tarjeta exitoso!", "success");
      onSuccess();
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : "Error al procesar el pago", "error");
    }
  };

  return (
    <div className="mt-4 space-y-4 border-t border-border pt-4">
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground"
        >
          <IoArrowBack />
        </button>
        <h4 className="font-semibold flex items-center gap-2">
          <IoCard className="text-primary" /> Pago con Tarjeta — $
          {order.total.toFixed(2)}
        </h4>
      </div>
      <Input
        label="Número de tarjeta"
        placeholder="1234 5678 9012 3456"
        value={cardNumber}
        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
        maxLength={19}
        error={errors.cardNumber}
      />
      <Input
        label="Nombre del titular"
        placeholder="Nombre completo"
        value={cardName}
        onChange={(e) => setCardName(e.target.value.toUpperCase())}
        error={errors.cardName}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Fecha (MM/AA)"
          placeholder="MM/AA"
          value={expiry}
          onChange={(e) => setExpiry(formatExpiry(e.target.value))}
          maxLength={5}
          error={errors.expiry}
        />
        <Input
          label="CVV"
          placeholder="123"
          type="password"
          value={cvv}
          onChange={(e) => setCvv(e.target.value.replace(/\D/g, ""))}
          maxLength={4}
          error={errors.cvv}
        />
      </div>
      <div className="flex items-center gap-2 rounded-lg bg-secondary p-2 text-xs text-muted-foreground">
        <IoLockClosed /> Datos encriptados con SSL
      </div>
      <Button className="w-full" onClick={handlePay} isLoading={isProcessing}>
        Pagar ${order.total.toFixed(2)}
      </Button>
    </div>
  );
}

// ── Pantalla de espera de mesero (efectivo) ──────────────────────────
function CashWaitingScreen({
  order,
  onSuccess,
  onBack,
}: {
  order: Order;
  onSuccess: () => void;
  onBack: () => void;
}) {
  const { updatePayment, loading } = useUpdateOrderPayment();

  const handleConfirm = async () => {
    try {
      await updatePayment(order.id, true);
      addToast("¡Pago en efectivo registrado!", "success");
      onSuccess();
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : "Error al registrar el pago", "error");
    }
  };

  return (
    <div className="mt-4 space-y-4 border-t border-border pt-4 text-center">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm mb-2"
      >
        <IoArrowBack size={14} /> Cambiar método
      </button>
      <div className="mx-auto w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
        <IoHourglass className="h-8 w-8 text-amber-600 dark:text-amber-400 animate-pulse" />
      </div>
      <h4 className="font-semibold text-lg">Esperando al mesero...</h4>
      <p className="text-sm text-muted-foreground">
        Un mesero se acercará a tu mesa para cobrar{" "}
        <span className="font-bold text-foreground">
          ${order.total.toFixed(2)}
        </span>{" "}
        en efectivo.
      </p>
      <p className="text-xs text-muted-foreground">
        Cuando el mesero confirme el pago, presiona el botón de abajo.
      </p>
      <Button className="w-full" onClick={handleConfirm} isLoading={loading}>
        <IoCash className="mr-2" /> Confirmar pago recibido
      </Button>
    </div>
  );
}

// ── Modal de edición de orden ─────────────────────────────────────────
function EditOrderPanel({
  order,
  onClose,
  onSaved,
}: {
  order: Order;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { addItems, loading } = useAddOrderItems();
  const { removeItem, loading: removing } = useRemoveOrderItem();
  const { order: fullOrder, loading: loadingDetail, refetch } = useOrderById(order.id);
  const { products, loading: loadingProducts } = useProducts(
    String(order.restaurantId),
  );
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);

  const increment = (id: string) =>
    setQuantities((q) => ({ ...q, [id]: (q[id] || 0) + 1 }));
  const decrement = (id: string) =>
    setQuantities((q) => ({ ...q, [id]: Math.max(0, (q[id] || 0) - 1) }));

  const selectedItems = Object.entries(quantities).filter(([, qty]) => qty > 0);
  const addedTotal = selectedItems.reduce((sum, [id, qty]) => {
    const p = products.find((p) => String(p.id) === id);
    return sum + (p ? p.price * qty : 0);
  }, 0);

  const handleSave = async () => {
    if (selectedItems.length === 0) {
      addToast("Selecciona al menos un producto", "warning");
      return;
    }
    try {
      const items = selectedItems.map(([id, qty]) => {
        const p = products.find((p) => String(p.id) === id)!;
        return {
          productId: parseInt(id),
          quantity: qty,
          subtotal: p.price * qty,
        };
      });
      await addItems(order.id, items);
      addToast("Productos agregados a tu orden", "success");
      refetch();
      onSaved();
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : "Error al agregar productos", "error");
    }
  };

  const handleRemoveItem = async (detailId: string) => {
    if (!confirm("¿Quitar este producto de la orden?")) return;
    setRemovingItemId(detailId);
    try {
      await removeItem(order.id, detailId);
      addToast("Producto eliminado", "success");
      refetch();
      onSaved();
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : "Error al eliminar producto", "error");
    } finally {
      setRemovingItemId(null);
    }
  };

  const existingDetails = fullOrder?.orderDetail || [];

  return (
    <div className="mt-4 space-y-4 border-t border-border pt-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold flex items-center gap-2">
          <FiEdit2 className="text-primary" /> Editar orden #{order.id}
        </h4>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          Cancelar
        </button>
      </div>

      {/* Current Items */}
      {loadingDetail ? (
        <p className="text-sm text-muted-foreground">Cargando items...</p>
      ) : existingDetails.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
            Productos actuales
          </p>
          <div className="space-y-1">
            {existingDetails.map((detail) => (
              <div
                key={detail.id}
                className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="font-medium text-sm text-foreground">
                    {detail.quantity}x
                  </span>
                  <span className="text-sm text-foreground truncate">
                    {detail.product?.name || `Producto #${detail.productId}`}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm text-muted-foreground">
                    ${detail.subtotal?.toFixed(2)}
                  </span>
                  <button
                    onClick={() => handleRemoveItem(detail.id)}
                    disabled={removingItemId === detail.id}
                    className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    title="Quitar producto"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Add new items */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
          Agregar productos
        </p>
        {loadingProducts ? (
          <p className="text-sm text-muted-foreground">Cargando productos...</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div>
                  <p className="text-sm font-medium">{product.name}</p>
                  <p className="text-xs text-primary">
                    ${product.price.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => decrement(String(product.id))}
                    className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-secondary"
                  >
                    <FiMinus size={12} />
                  </button>
                  <span className="w-5 text-center text-sm font-medium">
                    {quantities[String(product.id)] || 0}
                  </span>
                  <button
                    onClick={() => increment(String(product.id))}
                    className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-secondary"
                  >
                    <FiPlus size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedItems.length > 0 && (
        <div className="flex justify-between items-center text-sm font-semibold pt-2 border-t border-border">
          <span>Se agregará:</span>
          <span className="text-primary">+${addedTotal.toFixed(2)}</span>
        </div>
      )}

      <Button
        className="w-full"
        onClick={handleSave}
        isLoading={loading}
        disabled={selectedItems.length === 0}
      >
        Agregar productos
      </Button>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────
function UserOrdersContent() {
  const { user } = useAuth();
  const { orders, loading, refetch } = useUserOrders(
    user?.id?.toString() || "",
  );

  // Estado de UI por orden
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<
    "select" | "cash" | "card" | "done" | null
  >(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-2">Inicia sesión</h2>
        <p className="text-muted-foreground mb-6">
          Necesitas iniciar sesión para ver tus órdenes.
        </p>
        <Button onClick={() => (window.location.href = "/login")}>
          Iniciar sesión
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Cargando tus órdenes...</p>
      </div>
    );
  }

  const typedOrders: Order[] = orders;

  if (typedOrders.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
          <FiPackage size={40} className="text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Sin órdenes</h2>
        <p className="text-muted-foreground mb-6">
          Aún no has realizado ningún pedido.
        </p>
        <Button onClick={() => (window.location.href = "/restaurants")}>
          Explorar restaurantes
        </Button>
      </div>
    );
  }

  const activeOrders = typedOrders.filter(
    (o) => !o.paid && ["ABIERTA", "LISTA", "COMPLETADA"].includes(o.status),
  );
  const pastOrders = typedOrders.filter(
    (o) => o.paid || !["ABIERTA", "LISTA", "COMPLETADA"].includes(o.status),
  );

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const handleOpenPay = (orderId: string) => {
    setExpandedOrderId(orderId);
    setPaymentMode("select");
    setEditingOrderId(null);
  };

  const handlePaySuccess = () => {
    setPaymentMode("done");
    refetch();
  };

  const handleOpenEdit = (orderId: string) => {
    setEditingOrderId(orderId);
    setExpandedOrderId(null);
    setPaymentMode(null);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Mis Órdenes</h1>
        <Button
          onClick={() => refetch()}
          disabled={loading}
          variant="outline"
          size="sm"
        >
          <FiRefreshCw className={loading ? "animate-spin mr-2" : "mr-2"} />
          Actualizar
        </Button>
      </div>

      {/* Órdenes activas */}
      {activeOrders.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FiClock className="text-amber-500" />
            Órdenes Activas ({activeOrders.length})
          </h3>
          <div className="space-y-4">
            {activeOrders.map((order) => {
              const config = statusConfig[order.status] || statusConfig.ABIERTA;
              const StatusIcon = config.icon;
              const isPayable =
                order.status === "LISTA" || order.status === "COMPLETADA";
              const isEditable = order.status === "ABIERTA" || order.status === "LISTA";
              const isThisExpanded = expandedOrderId === order.id;
              const isThisEditing = editingOrderId === order.id;

              return (
                <Card key={order.id} className="overflow-hidden">
                  <CardContent className="p-5">
                    {/* Info principal */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-bold text-lg">Orden #{order.id}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(order.date || order.createdAt?.toString())}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config.color}`}
                      >
                        <StatusIcon size={12} />
                        {config.label}
                      </span>
                    </div>

                    <div className="flex justify-between items-center mb-4">
                      <span className="text-muted-foreground text-sm">
                        Total
                      </span>
                      <span className="text-xl font-bold text-primary">
                        ${order.total.toFixed(2)}
                      </span>
                    </div>

                    {order.estimatedWaitTime != null && order.estimatedWaitTime > 0 && (
                      <div className="mb-4">
                        <WaitTimeDisplay
                          estimatedMinutes={order.estimatedWaitTime}
                          actualMinutes={order.actualWaitTime}
                          size="md"
                        />
                      </div>
                    )}

                    {order.notes && (
                      <p className="text-sm text-muted-foreground mb-4 italic">
                        Nota: {order.notes}
                      </p>
                    )}

                    {/* Acciones */}
                    <div className="flex gap-2">
                      {isEditable && !isThisEditing && (
                        <Button
                          variant="outline"
                          className="flex-1"
                          size="sm"
                          onClick={() => handleOpenEdit(order.id)}
                        >
                          <FiEdit2 className="mr-1" size={14} />
                          Editar pedido
                        </Button>
                      )}
                      {isPayable && !isThisExpanded && (
                        <Button
                          className="flex-1"
                          size="sm"
                          onClick={() => handleOpenPay(order.id)}
                        >
                          <FiCreditCard className="mr-1" size={14} />
                          Pagar ahora
                        </Button>
                      )}
                      {!isPayable && !isEditable && (
                        <p className="text-sm text-center text-muted-foreground w-full py-1">
                          Esperando al restaurante...
                        </p>
                      )}
                      {!isPayable && isEditable && !isThisEditing && (
                        <p className="text-xs text-muted-foreground mt-1 w-full">
                          {order.status === "ABIERTA"
                            ? "Tu pedido se está preparando — puedes agregar más productos mientras."
                            : "Tu pedido está listo — puedes agregar más productos si lo deseas."}
                        </p>
                      )}
                    </div>

                    {/* Panel edición */}
                    {isThisEditing && (
                      <EditOrderPanel
                        order={order}
                        onClose={() => setEditingOrderId(null)}
                        onSaved={() => {
                          setEditingOrderId(null);
                          refetch();
                        }}
                      />
                    )}

                    {/* Panel pago — selección de método */}
                    {isThisExpanded && paymentMode === "select" && (
                      <div className="mt-4 border-t border-border pt-4 space-y-3">
                        <h4 className="font-semibold text-center">
                          ¿Cómo quieres pagar?
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => setPaymentMode("cash")}
                            className="flex flex-col items-center p-4 rounded-xl border-2 border-border hover:border-primary/50 transition-all"
                          >
                            <IoCash className="h-8 w-8 text-muted-foreground mb-2" />
                            <span className="text-sm font-medium">
                              Efectivo
                            </span>
                            <span className="text-xs text-muted-foreground">
                              El mesero vendrá a cobrar
                            </span>
                          </button>
                          <button
                            onClick={() => setPaymentMode("card")}
                            className="flex flex-col items-center p-4 rounded-xl border-2 border-border hover:border-primary/50 transition-all"
                          >
                            <IoCard className="h-8 w-8 text-muted-foreground mb-2" />
                            <span className="text-sm font-medium">Tarjeta</span>
                            <span className="text-xs text-muted-foreground">
                              Pago digital seguro
                            </span>
                          </button>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            setExpandedOrderId(null);
                            setPaymentMode(null);
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    )}

                    {/* Panel pago — efectivo */}
                    {isThisExpanded && paymentMode === "cash" && (
                      <CashWaitingScreen
                        order={order}
                        onSuccess={handlePaySuccess}
                        onBack={() => setPaymentMode("select")}
                      />
                    )}

                    {/* Panel pago — tarjeta */}
                    {isThisExpanded && paymentMode === "card" && (
                      <CardPaymentScreen
                        order={order}
                        onSuccess={handlePaySuccess}
                        onBack={() => setPaymentMode("select")}
                      />
                    )}

                    {/* Pago exitoso */}
                    {isThisExpanded && paymentMode === "done" && (
                      <div className="mt-4 border-t border-border pt-4 text-center space-y-3">
                        <IoCheckmarkCircle className="h-12 w-12 text-green-500 mx-auto" />
                        <p className="font-semibold">¡Pago registrado!</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            setExpandedOrderId(null);
                            setPaymentMode(null);
                          }}
                        >
                          Cerrar
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Historial */}
      {pastOrders.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FiCheck className="text-green-500" />
            Historial ({pastOrders.length})
          </h3>
          <div className="space-y-3">
            {pastOrders.map((order) => (
              <Card key={order.id} className="opacity-75">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Orden #{order.id}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(order.date || order.createdAt?.toString())}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${order.total.toFixed(2)}</p>
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                      {order.paid ? "✓ Pagado" : order.status}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function UserOrdersList() {
  return (
    <ApolloWrapper>
      <UserOrdersContent />
    </ApolloWrapper>
  );
}
