import { useState } from "react";
import { FiPlus, FiEdit2, FiTrash2, FiUsers, FiEye } from "react-icons/fi";
import { Button } from "../custom/Button";
import { Input } from "../custom/Input";
import { Card, CardContent } from "../custom/Card";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "../custom/Modal";
import { Badge } from "../custom/Badge";
import { Select } from "../custom/Select";
import { Spinner } from "../custom/Spinner";
import { addToast } from "../custom/Toast";
import { API_URL } from "../../config";
import { useTables } from "../../hooks/useTables";
import { useAuth } from "../../context/AuthContext";
import { ApolloWrapper } from "../ApolloWrapper";
import type { Order, Table } from "../../types/index";
import { IoQrCode, IoCash } from "react-icons/io5";
import { QRCodeSVG } from "qrcode.react";
import { useOrders } from "../../hooks/useOrders";
import { useBookings } from "../../hooks/useBookings";
import { useMutation } from "@apollo/client/react";
import { gql } from "@apollo/client";

const CREATE_PAYMENT = gql`
  mutation CreatePayment($input: CreatePaymentInput!) {
    createPayment(input: $input) {
      id
      status
    }
  }
`;

const statusColors: Record<string, string> = {
  libre: "success",
  available: "success",
  ocupada: "warning",
  occupied: "warning",
  reservada: "primary",
  reserved: "primary",
};

function TablesManagerContent() {
  const { user } = useAuth();
  const restaurantId = user?.restaurantId || "";
  const { tables, loading, error, createTable, updateTable, deleteTable } =
    useTables(restaurantId);
  const [createPayment] = useMutation(CREATE_PAYMENT);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [totalOrder, setTotalOrder] = useState(0);
  const [formData, setFormData] = useState({
    number: "",
    capacity: "",
    status: "available",
  });
  const [showQR, setShowQR] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const { orders } = useOrders(restaurantId);
  const { bookings } = useBookings(restaurantId);

  // Calcular estado real de cada mesa en base a órdenes activas y reservas
  const getTableStatus = (table: Table): string => {
    // Verificar si hay una orden activa (ABIERTA o LISTA) en esta mesa
    const hasActiveOrder = orders.some(
      (o) =>
        String(o.tableId) === String(table.id) &&
        (o.status === "ABIERTA" || o.status === "LISTA"),
    );
    if (hasActiveOrder) return "occupied";

    // Verificar si hay una reserva activa (pending o confirmed) para esta mesa
    const hasActiveBooking = bookings.some(
      (b) =>
        String(b.tableId) === String(table.id) &&
        (b.status === "pending" || b.status === "confirmed"),
    );
    if (hasActiveBooking) return "reserved";

    return table.status || "available";
  };

  const [tableOrderDetails, setTableOrderDetails] = useState<Order[] | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const handleViewHistory = async (table: Table) => {
    setSelectedTable(table);
    setTableOrderDetails(null);
    setIsHistoryModalOpen(true);

    const activeOrders = orders.filter(
      (o) =>
        String(o.tableId) === String(table.id) &&
        (o.status === "ABIERTA" || o.status === "LISTA"),
    );
    const amount = activeOrders.reduce(
      (sum, order) => sum + order.total,
      0,
    );
    setTotalOrder(amount);

    if (activeOrders.length > 0) {
      setLoadingDetails(true);
      try {
        const res = await fetch(`${API_URL}/api/kitchen/orders?restaurantId=${restaurantId}`);
        if (res.ok) {
          const data = await res.json();
          const tableOrders = data.filter((o) =>
            activeOrders.some((ao) => String(ao.id) === String(o.id)),
          );
          setTableOrderDetails(tableOrders);
        }
      } catch (e) {
        console.error("Error fetching order details", e);
      } finally {
        setLoadingDetails(false);
      }
    }
  };

  const handlePayCash = async (table: Table) => {
    try {
      const activeOrders = orders.filter(
        (o) =>
          o.tableId === table.id &&
          o.status !== "entregado" &&
          o.status !== "cancelado",
      );
      const mockAmount = activeOrders.reduce(
        (sum, order) => sum + order.total,
        0,
      );
      await createPayment({
        variables: {
          input: {
            userId: user?.id?.toString() || "1",
            amount: mockAmount,
            currency: "MXN",
            paymentMethodId: "CASH",
            description: `Pago en efectivo para mesa ${table.number}`,
          },
        },
      });
      addToast("Pago registrado en efectivo exitosamente.", "success");
      setIsHistoryModalOpen(false);
    } catch (err) {
      console.error(err);
      addToast("Pago simulado en modo offline.", "success");
      setIsHistoryModalOpen(false);
    }
  };

  if (!restaurantId)
    return (
      <div className="p-6 bg-muted rounded-lg text-center">
        <p className="text-muted-foreground">
          No hay restaurante asociado a tu cuenta.
        </p>
      </div>
    );

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  if (error)
    return (
      <div className="p-6 bg-destructive/10 text-destructive rounded-lg">
        {error.message}
      </div>
    );

  const handleOpenModal = (table?: Table) => {
    if (table) {
      setEditingTable(table);
      setFormData({
        number: String(table.number),
        capacity: String(table.capacity),
        status: table.status,
      });
    } else {
      setEditingTable(null);
      const maxNumber = Math.max(...tables.map((t) => t.number), 0);
      setFormData({
        number: String(maxNumber + 1),
        capacity: "4",
        status: "available",
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.number || !formData.capacity) {
      addToast("Número o capacidad son requeridos", "error");
      return;
    }
    if (
      !formData.number.trim() ||
      isNaN(parseInt(formData.number)) ||
      formData.number.startsWith("-") ||
      formData.number.startsWith(".")
    ) {
      addToast("El numero de mesa no es valido", "error");
      return;
    }
    if (
      !formData.capacity.trim() ||
      isNaN(parseFloat(formData.capacity)) ||
      formData.capacity.trim() === "" ||
      formData.capacity.startsWith("-") ||
      formData.capacity.startsWith(".")
    ) {
      addToast("La capacidad no es valida", "error");
      return;
    }
    const input = {
      id: editingTable?.id,
      restaurant: parseInt(restaurantId),
      number: parseInt(formData.number),
      capacity: parseInt(formData.capacity),
      status: formData.status,
    };
    if (editingTable) {
      updateTable(editingTable.id, input);
    } else {
      createTable(input);
    }
    setIsModalOpen(false);
  };

  const stats = {
    total: tables.length,
    libre: tables.filter((t) => {
      const s = getTableStatus(t);
      return s === "libre" || s === "available";
    }).length,
    ocupada: tables.filter((t) => {
      const s = getTableStatus(t);
      return s === "ocupada" || s === "occupied";
    }).length,
    reservada: tables.filter((t) => {
      const s = getTableStatus(t);
      return s === "reservada" || s === "reserved";
    }).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mesas</h1>
          <p className="text-muted-foreground">
            Gestiona las mesas del restaurante
          </p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <FiPlus size={18} />
          Nueva mesa
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-success">{stats.libre}</p>
            <p className="text-sm text-muted-foreground">Libres</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-warning">{stats.ocupada}</p>
            <p className="text-sm text-muted-foreground">Ocupadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{stats.reservada}</p>
            <p className="text-sm text-muted-foreground">Reservadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {tables
          .sort((a, b) => a.number - b.number)
          .map((table) => {
            const computedStatus = getTableStatus(table);
            const isOccupied = computedStatus === "occupied" || computedStatus === "ocupada";
            const isReserved = computedStatus === "reserved" || computedStatus === "reservada";
            const statusLabel = isOccupied
              ? "Ocupada"
              : isReserved
                ? "Reservada"
                : "Libre";
            const statusVariant = isOccupied
              ? "warning"
              : isReserved
                ? "primary"
                : "success";

            return (
              <Card
                key={table.id}
                className={`overflow-hidden transition-all hover:shadow-md ${
                  isOccupied
                    ? "border-warning"
                    : isReserved
                      ? "border-primary"
                      : "border-success"
                }`}
              >
                <CardContent className="p-4">
                  <div className="text-center">
                    <div
                      className={`w-16 h-16 mx-auto rounded-lg flex items-center justify-center text-2xl font-bold mb-3 ${
                        isOccupied
                          ? "bg-warning/20 text-warning"
                          : isReserved
                            ? "bg-primary/20 text-primary"
                            : "bg-success/20 text-success"
                      }`}
                    >
                      {table.number}
                    </div>
                    <Badge variant={statusVariant as "warning" | "primary" | "success"} className="mb-2">
                      {statusLabel}
                    </Badge>
                    <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                      <FiUsers size={14} />
                      {table.capacity} personas
                    </p>
                  </div>

                  <div className="flex justify-center gap-1 mt-3">
                    <Button
                      fullWidth
                      variant={isOccupied ? "ghost" : "outline"}
                      size="sm"
                      onClick={() => handleViewHistory(table)}
                      title="Administrar"
                    >
                      <FiEye size={16} className="mr-2" />
                      {isOccupied ? "Cobrar" : "Detalle"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenModal(table)}
                    >
                      <FiEdit2 size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTable(table.id)}
                    >
                      <FiTrash2 size={16} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>

      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setShowQR(false);
        }}
      >
        <ModalHeader onClose={() => setIsHistoryModalOpen(false)}>
          Mesa {selectedTable?.number}
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            {loadingDetails ? (
              <div className="flex justify-center py-6">
                <Spinner size="md" />
              </div>
            ) : tableOrderDetails && tableOrderDetails.length > 0 ? (
              <div className="space-y-4">
                {tableOrderDetails.map((ord) => (
                  <div key={ord.id} className="bg-warning/10 border border-warning p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold">Orden #{ord.id}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 font-medium">
                        {ord.status === "ABIERTA" ? "En preparación" : "Lista"}
                      </span>
                    </div>
                    {ord.orderDetail && ord.orderDetail.length > 0 ? (
                      <div className="space-y-2 mb-3">
                        {ord.orderDetail.map((det) => (
                          <div key={det.id} className="flex items-center justify-between bg-white/50 dark:bg-black/10 rounded px-3 py-2 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground">{det.quantity}</span>
                              <span className="text-muted-foreground">×</span>
                              <span className="text-foreground">{det.product?.name || `Producto #${det.productId}`}</span>
                            </div>
                            <span className="font-medium text-foreground">${det.subtotal?.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic mb-3">Sin productos registrados</p>
                    )}
                    <p className="text-xl font-black text-warning font-mono">
                      Total: ${ord.total?.toFixed(2)}
                    </p>
                    <Button
                      className="mt-3 w-full flex items-center justify-center gap-2"
                      variant="ghost"
                      onClick={() => handlePayCash(selectedTable!)}
                    >
                      <IoCash /> Registrar Pago Efectivo
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-secondary p-4 rounded-lg text-center">
                <p>Esta mesa está disponible para recibir comensales.</p>
              </div>
            )}

            <hr className="my-2 border-border" />
            <Button
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
              onClick={() => setShowQR(!showQR)}
            >
              <IoQrCode /> {showQR ? "Ocultar QR" : "Generar QR para Clientes"}
            </Button>

            {showQR && selectedTable && (
              <div className="flex flex-col items-center p-4">
                <QRCodeSVG
                  value={`http://localhost:3000/restaurants/${restaurantId}?table=${selectedTable.number}`}
                  size={200}
                />
                <p className="text-sm text-muted-foreground mt-4 text-center">
                  El cliente puede escanear este código desde la app o su cámara
                  para hacer su orden vinculada a la mesa {selectedTable.number}
                  .
                </p>
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setIsHistoryModalOpen(false)}>
            Cerrar
          </Button>
        </ModalFooter>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <ModalHeader onClose={() => setIsModalOpen(false)}>
          {editingTable ? "Editar mesa" : "Nueva mesa"}
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <Input
              label="Número de mesa"
              type="number"
              value={formData.number}
              onChange={(e) =>
                setFormData({ ...formData, number: e.target.value })
              }
              placeholder="1"
            />
            <Input
              label="Capacidad (personas)"
              type="number"
              value={formData.capacity}
              onChange={(e) =>
                setFormData({ ...formData, capacity: e.target.value })
              }
              placeholder="4"
            />
            <Select
              label="Estado"
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
              options={[
                { value: "available", label: "Libre" },
                { value: "occupied", label: "Ocupada" },
                { value: "reserved", label: "Reservada" },
              ]}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsModalOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            {editingTable ? "Guardar cambios" : "Crear mesa"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

export function TablesManager() {
  return (
    <ApolloWrapper>
      <TablesManagerContent />
    </ApolloWrapper>
  );
}
