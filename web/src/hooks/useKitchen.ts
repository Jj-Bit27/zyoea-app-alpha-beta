import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { addToast } from "../components/custom/Toast";
import type { Order } from "../types";

const API_URL = "http://localhost:8080";

const UPDATE_ORDER_STATUS = gql`
  mutation updateOrderStatus($id: ID!, $status: String!) {
    updateOrderStatus(id: $id, status: $status) {
      id
      status
    }
  }
`;

export function useKitchen(restaurantId: string | undefined) {
  const wsRef = useRef<WebSocket | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!restaurantId) return;
    try {
      const res = await fetch(`${API_URL}/api/kitchen/orders?restaurantId=${restaurantId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setOrders(data || []);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  const [updateStatusMutation] = useMutation(UPDATE_ORDER_STATUS, {
    onCompleted: () => {
      fetchOrders();
      addToast("Estado actualizado", "success");
    },
    onError: (err) => addToast(`Error: ${err.message}`, "error"),
  });

  // Polling every 5 seconds
  useEffect(() => {
    if (!restaurantId) return;
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [restaurantId, fetchOrders]);

  // WebSocket connection
  useEffect(() => {
    if (!restaurantId) return;

    const wsUrl = `${API_URL.replace("http", "ws")}/ws/orders?restaurantId=${restaurantId}`;
    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    const connect = () => {
      ws = new WebSocket(wsUrl);
      ws.onopen = () => console.log("[Kitchen WS] Conectado");
      ws.onmessage = () => {
        console.log("[Kitchen WS] Orden recibida");
        fetchOrders();
      };
      ws.onclose = () => {
        console.log("[Kitchen WS] Reconectando en 3s...");
        reconnectTimeout = setTimeout(connect, 3000);
      };
      ws.onerror = () => ws?.close();
      wsRef.current = ws;
    };

    connect();
    return () => {
      clearTimeout(reconnectTimeout);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [restaurantId, fetchOrders]);

  const updateStatus = useCallback(
    (id: string, status: string) => {
      updateStatusMutation({ variables: { id, status } });
    },
    [updateStatusMutation],
  );

  return {
    orders,
    loading,
    error,
    refetch: fetchOrders,
    updateStatus,
  };
}

export const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ABIERTA: { label: "En preparación", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-300" },
  LISTA: { label: "Lista", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-300" },
  COMPLETADA: { label: "Completada", color: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-300" },
  CANCELADA: { label: "Cancelada", color: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border-red-300" },
  PAGADO: { label: "Pagado", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 border-purple-300" },
};

export function getStatusActions(status: string): { label: string; newStatus: string; color: string }[] {
  switch (status) {
    case "ABIERTA":
      return [
        { label: "Marcar como lista", newStatus: "LISTA", color: "bg-blue-500 hover:bg-blue-600" },
        { label: "Cancelar orden", newStatus: "CANCELADA", color: "bg-red-500 hover:bg-red-600" },
      ];
    case "LISTA":
      return [
        { label: "Marcar completada", newStatus: "COMPLETADA", color: "bg-green-500 hover:bg-green-600" },
      ];
    case "COMPLETADA":
      return [
        { label: "Reabrir orden", newStatus: "ABIERTA", color: "bg-yellow-500 hover:bg-yellow-600" },
      ];
    default:
      return [];
  }
}
