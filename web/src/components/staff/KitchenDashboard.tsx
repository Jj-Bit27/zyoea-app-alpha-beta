import { useState } from "react";
import type { Order } from "../../types";
import { useAuth } from "../../context/AuthContext";
import { ApolloWrapper } from "../ApolloWrapper";
import { Spinner } from "../custom/Spinner";
import { useKitchen, STATUS_CONFIG, getStatusActions } from "../../hooks/useKitchen";

function KitchenDashboardContent() {
  const { user } = useAuth();
  const restaurantId = user?.restaurantId && user.restaurantId !== "0" ? user.restaurantId : undefined;
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const { orders, loading, error, refetch, updateStatus } = useKitchen(restaurantId);

  const filteredOrders = orders.filter((order) => {
    if (statusFilter === "ALL") return true;
    return order.status === statusFilter;
  });

  if (!restaurantId) {
    return (
      <div className="flex items-center justify-center py-12 md:h-64">
        <p className="text-muted-foreground">
          No tienes un restaurante asignado (restaurantId: {user?.restaurantId || "vacío"}).
          Un administrador debe vincularte a un restaurante en la tabla de empleados.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12 md:h-64">
        <p className="text-destructive">Error al cargar órdenes: {error.message}</p>
      </div>
    );
  }

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 md:h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">🍳 Cocina</h1>
          <p className="text-sm text-muted-foreground">
            Órdenes en tiempo real ·{" "}
            <span className="font-medium">{orders.length} activas</span>
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {["ALL", "ABIERTA", "LISTA", "COMPLETADA", "CANCELADA"].map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                statusFilter === f
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:bg-accent"
              }`}
            >
              {f === "ALL" ? "Todas" : STATUS_CONFIG[f]?.label || f}
            </button>
          ))}
          <button
            onClick={() => refetch()}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-card text-muted-foreground hover:bg-accent"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-4">🍽️</div>
          <h3 className="text-lg font-medium text-muted-foreground">
            No hay órdenes {statusFilter !== "ALL" ? STATUS_CONFIG[statusFilter]?.label.toLowerCase() : "activas"}
          </h3>
          <p className="text-sm text-muted-foreground/60 mt-1">
            Las órdenes nuevas aparecerán aquí automáticamente
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredOrders.map((order) => {
            const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.ABIERTA;
            return (
              <div
                key={order.id}
                className={`rounded-xl border bg-card shadow-sm overflow-hidden transition-all ${
                  order.status === "ABIERTA"
                    ? "ring-2 ring-yellow-400/30"
                    : order.status === "LISTA"
                      ? "ring-2 ring-blue-400/30"
                      : ""
                }`}
              >
                {/* Header */}
                <div className="p-5 border-b border-border/50 bg-muted/20">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-foreground">
                        Mesa {order.tableId || "—"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {order.user_name || `Usuario #${order.userId}`}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${config.color}`}>
                      {config.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">#{order.id}</span>
                    <span>·</span>
                    <span>
                      {order.date
                        ? new Date(order.date).toLocaleTimeString("es-ES", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </span>
                    {order.paid && (
                      <>
                        <span>·</span>
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          Pagado
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Notes - prominent */}
                {order.notes && (
                  <div className="mx-5 mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1">
                      📝 Notas:
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-400 whitespace-pre-wrap">
                      {order.notes}
                    </p>
                  </div>
                )}

                {/* Items - all items, no truncation */}
                <div className="px-5 py-4 space-y-3">
                  <h4 className="text-sm font-semibold text-foreground border-b border-border/50 pb-2">
                    Productos ({order.orderDetail?.length || 0})
                  </h4>
                  {order.orderDetail && order.orderDetail.length > 0 ? (
                    <div className="space-y-3">
                      {order.orderDetail.map((detail) => (
                        <div key={detail.id} className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span className="text-lg font-bold text-foreground min-w-[2rem] text-center">
                              {detail.quantity}
                            </span>
                            <span className="text-muted-foreground font-bold">×</span>
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate">
                                {detail.product?.name || `Producto #${detail.productId}`}
                              </p>
                              {detail.product?.price && (
                                <p className="text-xs text-muted-foreground">
                                  ${detail.product.price.toFixed(2)} c/u
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="font-semibold text-foreground shrink-0 ml-3">
                            ${detail.subtotal?.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic text-center py-4">
                      Sin productos registrados
                    </p>
                  )}
                </div>

                {/* Total */}
                <div className="px-5 pb-2">
                  <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                    <span className="text-lg font-bold text-foreground">Total</span>
                    <span className="text-xl font-bold text-primary">${order.total?.toFixed(2)}</span>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="px-5 pb-5 pt-2">
                  <div className="flex flex-wrap gap-2">
                    {getStatusActions(order.status).map((action) => (
                      <button
                        key={action.newStatus}
                        onClick={() => updateStatus(order.id, action.newStatus)}
                        className={`flex-1 px-4 py-2.5 text-sm font-semibold text-white rounded-lg transition-colors ${action.color}`}
                      >
                        {action.label}
                      </button>
                    ))}
                    <button
                      onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                      className="px-4 py-2.5 text-sm font-medium rounded-lg border border-border bg-card text-foreground hover:bg-accent transition-colors"
                    >
                      {selectedOrder?.id === order.id ? "Cerrar" : "Detalle completo"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="bg-card rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground">
                  Orden #{selectedOrder.id}
                </h2>
                <button onClick={() => setSelectedOrder(null)} className="text-muted-foreground hover:text-foreground">
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  ["Cliente", selectedOrder.user_name || "—"],
                  ["Mesa", selectedOrder.tableId || "—"],
                  [
                    "Estado",
                    <span
                      key="status"
                      className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                        (STATUS_CONFIG[selectedOrder.status] || STATUS_CONFIG.ABIERTA).color
                      }`}
                    >
                      {(STATUS_CONFIG[selectedOrder.status] || STATUS_CONFIG.ABIERTA).label}
                    </span>,
                  ],
                  ["Pagado", selectedOrder.paid ? "✅ Sí" : "❌ No"],
                  ["Total", `$${selectedOrder.total?.toFixed(2)}`],
                  [
                    "Fecha",
                    selectedOrder.date
                      ? new Date(selectedOrder.date).toLocaleString("es-ES")
                      : "—",
                  ],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <span className="text-muted-foreground">{label}:</span>
                    <p className="font-medium text-foreground">{value}</p>
                  </div>
                ))}
              </div>

              {selectedOrder.notes && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <span className="text-xs font-medium text-amber-800 dark:text-amber-300">
                    📝 Notas:
                  </span>
                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                    {selectedOrder.notes}
                  </p>
                </div>
              )}

              <div>
                <h3 className="font-semibold text-foreground mb-2">
                  Productos ({selectedOrder.orderDetail?.length || 0})
                </h3>
                <div className="space-y-2">
                  {selectedOrder.orderDetail?.map((detail) => (
                    <div
                      key={detail.id}
                      className="flex items-center justify-between bg-muted/50 rounded-lg p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-lg text-foreground">
                          {detail.quantity}
                        </span>
                        <div>
                          <p className="font-medium text-foreground">
                            {detail.product?.name || `Producto #${detail.productId}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ${detail.product?.price?.toFixed(2) || "0.00"} c/u
                          </p>
                        </div>
                      </div>
                      <span className="font-medium text-foreground">
                        ${detail.subtotal?.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                {getStatusActions(selectedOrder.status).map((action) => (
                  <button
                    key={action.newStatus}
                    onClick={() => {
                      updateStatus(selectedOrder.id, action.newStatus);
                      setSelectedOrder(null);
                    }}
                    className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${action.color}`}
                  >
                    {action.label}
                  </button>
                ))}
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-border bg-card text-foreground hover:bg-accent"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      {orders.filter((o) => o.status === "ABIERTA").length > 0 && (
        <div className="fixed bottom-4 right-4 animate-bounce">
          <div className="bg-yellow-500 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium">
            🔔 {orders.filter((o) => o.status === "ABIERTA").length} orden(es) en preparación
          </div>
        </div>
      )}
    </div>
  );
}

export function KitchenDashboard() {
  return (
    <ApolloWrapper>
      <KitchenDashboardContent />
    </ApolloWrapper>
  );
}
