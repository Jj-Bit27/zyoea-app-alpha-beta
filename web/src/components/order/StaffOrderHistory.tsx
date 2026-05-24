import { useState, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { useOrders } from "../../hooks/useOrders";
import type { Order } from "../../types";
import { Card, CardContent, CardHeader, CardTitle } from "../custom/Card";
import { Button } from "../custom/Button";

import { Input } from "../custom/Input";
import { Badge } from "../custom/Badge";
import { ApolloWrapper } from "../ApolloWrapper";
import { FiRefreshCw, FiFilter, FiX } from "react-icons/fi";

const statusConfig: Record<
  string,
  {
    label: string;
    variant:
      | "default"
      | "secondary"
      | "outline"
      | "destructive"
      | "success"
      | "warning";
  }
> = {
  ABIERTA: { label: "Abierta", variant: "warning" },
  LISTA: { label: "Lista", variant: "default" },
  COMPLETADA: { label: "Completada", variant: "success" },
  PAGADO: { label: "Pagado", variant: "success" },
};

function StaffOrderHistoryContent() {
  const { user } = useAuth();
  const restaurantId = user?.restaurantId?.toString() || "";
  const { orders, loading, refetch } = useOrders(restaurantId);

  // Filtros
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Filtrar últimos 15 días + filtros del usuario
  const filteredOrders = useMemo(() => {
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    return orders.filter((order) => {
      // Filtro de 15 días
      const orderDate = new Date(order.date);
      if (orderDate < fifteenDaysAgo) return false;

      // Filtro de precio mínimo
      if (minPrice && order.total < parseFloat(minPrice)) return false;

      // Filtro de precio máximo
      if (maxPrice && order.total > parseFloat(maxPrice)) return false;

      // Filtro de estado
      if (statusFilter && order.status !== statusFilter) return false;

      return true;
    });
  }, [orders, minPrice, maxPrice, statusFilter]);

  // Estadísticas rápidas
  const stats = useMemo(() => {
    const total = filteredOrders.reduce(
      (sum, o) => sum + o.total,
      0,
    );
    const paid = filteredOrders.filter((o) => o.paid).length;
    const pending = filteredOrders.filter((o) => !o.paid).length;
    return { total, paid, pending, count: filteredOrders.length };
  }, [filteredOrders]);

  const clearFilters = () => {
    setMinPrice("");
    setMaxPrice("");
    setStatusFilter("");
  };

  const hasActiveFilters = minPrice || maxPrice || statusFilter;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!restaurantId) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-2">
          No tienes restaurante asignado
        </h2>
        <p className="text-muted-foreground">Contacta con el administrador</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Historial de Órdenes</h1>
          <p className="text-sm text-muted-foreground">Últimos 15 días</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <FiFilter className="mr-1" />
            Filtros
            {hasActiveFilters && (
              <span className="ml-1 w-2 h-2 bg-primary rounded-full inline-block" />
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={loading}
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.count}</p>
            <p className="text-xs text-muted-foreground">Total órdenes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">
              ${stats.total.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">Ingresos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
            <p className="text-xs text-muted-foreground">Pagadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">Pendientes</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      {showFilters && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Filtros</CardTitle>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <FiX className="mr-1" /> Limpiar
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Precio mínimo"
                type="number"
                placeholder="0"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
              <Input
                label="Precio máximo"
                type="number"
                placeholder="999"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Estado
                </label>
                <select
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="ABIERTA">Abierta</option>
                  <option value="LISTA">Lista</option>
                  <option value="COMPLETADA">Completada</option>
                  <option value="PAGADO">Pagado</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla de órdenes */}
      {loading ? (
        <div className="text-center py-10">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando órdenes...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No se encontraron órdenes con los filtros aplicados
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="text-left p-3 font-medium">ID</th>
                    <th className="text-left p-3 font-medium">Cliente</th>
                    <th className="text-left p-3 font-medium">Total</th>
                    <th className="text-left p-3 font-medium">Estado</th>
                    <th className="text-left p-3 font-medium">Pagado</th>
                    <th className="text-left p-3 font-medium">Mesa</th>
                    <th className="text-left p-3 font-medium">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => {
                    const config = statusConfig[order.status] || {
                      label: order.status,
                      variant: "secondary" as const,
                    };
                    return (
                      <tr
                        key={order.id}
                        className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors"
                      >
                        <td className="p-3 font-mono text-xs">#{order.id}</td>
                        <td className="p-3">{order.user_name}</td>
                        <td className="p-3 font-semibold">
                          ${order.total.toFixed(2)}
                        </td>
                        <td className="p-3">
                          <Badge variant={config.variant}>{config.label}</Badge>
                        </td>
                        <td className="p-3">
                          {order.paid ? (
                            <span className="text-green-600 font-medium">
                              ✓ Sí
                            </span>
                          ) : (
                            <span className="text-amber-600 font-medium">
                              ✗ No
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {order.tableId ? `Mesa ${order.tableId}` : "—"}
                        </td>
                        <td className="p-3 text-muted-foreground text-xs">
                          {formatDate(order.date)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function StaffOrderHistory() {
  return (
    <ApolloWrapper>
      <StaffOrderHistoryContent />
    </ApolloWrapper>
  );
}
