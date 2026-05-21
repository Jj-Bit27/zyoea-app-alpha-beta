import { useEffect, useState } from "react";
import { useQuery, useMutation, gql } from "@apollo/client";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../custom/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../custom/Card";
import { addToast } from "../custom/Toast";
import { FiCheck, FiRefreshCw, FiClock } from "react-icons/fi";

const GET_OPEN_ORDERS = gql`
  query OrdersOpen($restaurantId: ID!) {
    ordersOpen(restaurantId: $restaurantId) {
      id
      status
      user_name
      total
      tableId
      date
    }
  }
`;

const UPDATE_ORDER_STATUS = gql`
  mutation UpdateOrderStatus($id: ID!, $status: String!) {
    updateOrderStatus(id: $id, status: $status) {
      id
      status
    }
  }
`;

interface Order {
  id: string;
  status: string;
  user_name: string;
  total: number;
  tableId?: number;
  date: string;
}

export default function StaffOrderDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<{ abierta: Order[]; lista: Order[] }>({
    abierta: [],
    lista: [],
  });

  const restaurantId = user?.restaurantId?.toString() || "";

  const { data, loading, refetch } = useQuery(GET_OPEN_ORDERS, {
    variables: { restaurantId },
    skip: !restaurantId,
    pollInterval: 3000,
  });

  const [updateOrderStatus] = useMutation(UPDATE_ORDER_STATUS, {
    onCompleted: () => {
      addToast("Estado actualizado", "success");
      refetch();
    },
    onError: () => {
      addToast("Error al actualizar el estado", "error");
    },
  });

  useEffect(() => {
    if (data?.ordersOpen) {
      const abiertas = data.ordersOpen.filter(
        (o: Order) => o.status === "ABIERTA",
      );
      const listas = data.ordersOpen.filter((o: Order) => o.status === "LISTA");
      setOrders({ abierta: abiertas, lista: listas });
    }
  }, [data]);

  const handleMarkAsLista = (orderId: string) => {
    updateOrderStatus({
      variables: { id: orderId, status: "LISTA" },
    });
  };

  const handleMarkAsCompleted = (orderId: string) => {
    updateOrderStatus({
      variables: { id: orderId, status: "COMPLETADA" },
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
    <div className="w-full h-screen bg-background p-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Órdenes del Restaurante</h1>
        <Button onClick={() => refetch()} disabled={loading} variant="outline">
          <FiRefreshCw className={loading ? "animate-spin" : ""} />
          Actualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* En Preparación */}
        <div>
          <div className="mb-4 flex items-center gap-2">
            <FiClock className="text-orange-500" />
            <h2 className="text-xl font-bold">
              En Preparación ({orders.abierta.length})
            </h2>
          </div>
          <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
            {orders.abierta.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Sin órdenes en preparación
                </CardContent>
              </Card>
            ) : (
              orders.abierta.map((order) => (
                <Card key={order.id}>
                  <CardContent className="p-4">
                    <div className="mb-3">
                      <p className="font-semibold text-lg">{order.user_name}</p>
                      {order.tableId && (
                        <p className="text-sm text-muted-foreground">
                          Mesa {order.tableId}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        ${order.total.toFixed(2)}
                      </p>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => handleMarkAsLista(order.id)}
                      size="sm"
                    >
                      Marcar como lista
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Lista para Pagar */}
        <div>
          <div className="mb-4 flex items-center gap-2">
            <FiCheck className="text-green-500" />
            <h2 className="text-xl font-bold">
              Lista para Pagar ({orders.lista.length})
            </h2>
          </div>
          <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
            {orders.lista.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Sin órdenes listas para pagar
                </CardContent>
              </Card>
            ) : (
              orders.lista.map((order) => (
                <Card key={order.id} className="border-green-200">
                  <CardContent className="p-4">
                    <div className="mb-3">
                      <p className="font-semibold text-lg">{order.user_name}</p>
                      {order.tableId && (
                        <p className="text-sm text-muted-foreground">
                          Mesa {order.tableId}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        ${order.total.toFixed(2)}
                      </p>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => handleMarkAsCompleted(order.id)}
                      variant="success"
                      size="sm"
                    >
                      Entregada
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
