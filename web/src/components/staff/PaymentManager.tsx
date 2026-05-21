import { useState } from "react";
import { FiDollarSign, FiCheck, FiClock, FiSearch } from "react-icons/fi";
import { Button } from "../custom/Button";
import { Input } from "../custom/Input";
import { Card, CardContent } from "../custom/Card";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "../custom/Modal";
import { Badge } from "../custom/Badge";
import { Spinner } from "../custom/Spinner";
import { addToast } from "../custom/Toast";
import { useOrders } from "../../hooks/useOrders";
import { useAuth } from "../../context/AuthContext";
import { ApolloWrapper } from "../ApolloWrapper";

function PaymentsManagerContent() {
  const { user } = useAuth();
  const restaurantId = user?.restaurantId || "";
  const { orders, loading, error, updateOrder } = useOrders(restaurantId);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState("");

  if (!restaurantId) return (
    <div className="p-6 bg-muted rounded-lg text-center">
      <p className="text-muted-foreground">No hay restaurante asociado a tu cuenta.</p>
    </div>
  );

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (error) return <div className="p-6 bg-destructive/10 text-destructive rounded-lg">{error.message}</div>;

  const pendingOrders = orders.filter((o: any) => !o.paid);
  const completedOrders = orders.filter((o: any) => o.paid);

  const filteredPending = pendingOrders.filter((o: any) =>
    String(o.id).toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.tableId && String(o.tableId).includes(searchTerm))
  );

  const handleOpenPayment = (order: any) => {
    setSelectedOrder(order);
    setReceivedAmount("");
    setIsModalOpen(true);
  };

  const handleProcessPayment = () => {
    if (!selectedOrder) return;
    const received = parseFloat(receivedAmount) || 0;
    if (received < selectedOrder.total) {
      addToast("El monto recibido es insuficiente", "error");
      return;
    }
    const change = received - selectedOrder.total;
    updateOrder(selectedOrder.id, "entregado");
    addToast(`Pago procesado. Cambio: $${change.toFixed(2)}`, "success");
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pagos en Efectivo</h1>
        <p className="text-muted-foreground">Gestiona los pagos pendientes en efectivo</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-warning/20 rounded-lg text-warning"><FiClock size={24} /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{pendingOrders.length}</p>
              <p className="text-sm text-muted-foreground">Pagos pendientes</p>
            </div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-success/20 rounded-lg text-success"><FiCheck size={24} /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{completedOrders.length}</p>
              <p className="text-sm text-muted-foreground">Completados</p>
            </div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/20 rounded-lg text-primary"><FiDollarSign size={24} /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                ${pendingOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0).toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">Total pendiente</p>
            </div>
          </div>
        </CardContent></Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <Input placeholder="Buscar por orden o mesa..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
      </div>

      {/* Pending Payments */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Pagos Pendientes</h2>
        {filteredPending.length === 0 ? (
          <Card><CardContent className="p-8 text-center">
            <FiCheck size={48} className="mx-auto text-success mb-4" />
            <p className="text-lg font-medium text-foreground">No hay pagos pendientes</p>
            <p className="text-muted-foreground">Todos los pagos han sido procesados</p>
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPending.map((order: any) => (
              <Card key={order.id} className="border-warning border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-foreground">#{order.id}</h3>
                      <p className="text-sm text-muted-foreground">{order.user_name} — Mesa {order.tableId || "—"}</p>
                    </div>
                    <Badge variant="warning">Pendiente</Badge>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <p className="text-lg font-bold text-foreground">Total: ${order.total}</p>
                    <Button size="sm" onClick={() => handleOpenPayment(order)}>Cobrar</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Payment Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <ModalHeader onClose={() => setIsModalOpen(false)}>
          Procesar Pago - #{selectedOrder?.id}
        </ModalHeader>
        <ModalBody>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Mesa {selectedOrder.tableId || "—"} — {selectedOrder.user_name}</p>
                <div className="mt-3 pt-3 border-t border-border flex justify-between">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="text-xl font-bold text-primary">${selectedOrder.total}</span>
                </div>
              </div>
              <Input label="Monto recibido" type="number" value={receivedAmount} onChange={(e) => setReceivedAmount(e.target.value)} placeholder="0.00" autoFocus />
              {receivedAmount && parseFloat(receivedAmount) >= selectedOrder.total && (
                <div className="p-4 bg-success/10 rounded-lg">
                  <p className="text-lg font-semibold text-success text-center">
                    Cambio: ${(parseFloat(receivedAmount) - selectedOrder.total).toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleProcessPayment} disabled={!receivedAmount || parseFloat(receivedAmount) < (selectedOrder?.total || 0)}>
            Confirmar pago
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

export function PaymentsManager() {
  return (
    <ApolloWrapper>
      <PaymentsManagerContent />
    </ApolloWrapper>
  );
}
