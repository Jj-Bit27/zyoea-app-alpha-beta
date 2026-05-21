import { useState, useMemo } from "react";
import { IoAdd, IoCalendar, IoTrash, IoTime, IoPeople, IoPencil } from "react-icons/io5";
import { Card, CardContent } from "../custom/Card";
import { Button } from "../custom/Button";
import { Badge } from "../custom/Badge";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "../custom/Modal";
import { Input } from "../custom/Input";
import { Select } from "../custom/Select";
import { Textarea } from "../custom/Textarea";
import { EmptyState } from "../custom/EmptyState";
import { Spinner } from "../custom/Spinner";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../custom/Toast";
import { useRestaurants } from "../../hooks/useRestaurants";
import { useBookings, useBookingsByUser } from "../../hooks/useBookings";
import { ApolloWrapper } from "../ApolloWrapper";
import { FiTrash2 } from "react-icons/fi";

const statusColors = {
  pending: "warning",
  confirmed: "success",
  cancelled: "destructive",
  completed: "secondary",
} as const;

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  completed: "Completada",
};

const timeOptions = [
  { value: "12:00", label: "12:00 PM" },
  { value: "13:00", label: "1:00 PM" },
  { value: "14:00", label: "2:00 PM" },
  { value: "18:00", label: "6:00 PM" },
  { value: "19:00", label: "7:00 PM" },
  { value: "20:00", label: "8:00 PM" },
  { value: "21:00", label: "9:00 PM" },
];

const guestOptions = Array.from({ length: 10 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1} persona${i > 0 ? "s" : ""}`,
}));

const emptyForm = {
  restaurantId: "",
  date: "",
  time: "",
  guests: "2",
  notes: "",
  tableId: "1",
};

function BookingManagerContent() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { restaurants, loading: loadingRestaurants } = useRestaurants();

  const [selectedRestaurantId, setSelectedRestaurantId] = useState("");
  const { createBooking } = useBookings(selectedRestaurantId);
  const { bookings, updateBooking, deleteBooking } = useBookingsByUser(
    user?.id.toString() ?? "",
  );

  // Modal para crear nueva reserva
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyForm);

  // Modal para editar reserva existente
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<any>(null);
  const [editForm, setEditForm] = useState(emptyForm);

  const userBookings = useMemo(() => {
    return bookings.filter((b: any) => String(b.user.id) === user?.id);
  }, [bookings, user?.id]);

  const restaurantOptions = [
    { value: "", label: "Selecciona un restaurante" },
    ...restaurants.map((r: any) => ({ value: r.id, label: r.name })),
  ];

  if (!user) {
    return (
      <EmptyState
        icon={IoCalendar}
        title="Inicia sesión"
        description="Necesitas iniciar sesión para ver tus reservaciones"
        action={{
          label: "Iniciar Sesión",
          onClick: () => (window.location.href = "/login"),
        }}
      />
    );
  }

  const handleCreate = () => {
    if (!createForm.restaurantId || !createForm.date || !createForm.time) {
      showToast("Completa todos los campos requeridos", "error");
      return;
    }
    const timeString = `${createForm.date}T${createForm.time}:00Z`;
    createBooking({
      restaurant: parseInt(createForm.restaurantId),
      user: parseInt(user.id),
      table: parseInt(createForm.tableId),
      people: parseInt(createForm.guests),
      time: timeString,
      status: "pending",
    });
    setSelectedRestaurantId(createForm.restaurantId);
    setCreateForm(emptyForm);
    setIsCreateModalOpen(false);
  };

  const handleOpenEdit = (booking: any) => {
    const bookingDate = booking.time ? new Date(booking.time) : new Date();
    const dateStr = bookingDate.toISOString().split("T")[0];
    const hours = String(bookingDate.getUTCHours()).padStart(2, "0");
    const minutes = String(bookingDate.getUTCMinutes()).padStart(2, "0");
    const timeStr = `${hours}:${minutes}`;

    setEditingBooking(booking);
    setEditForm({
      restaurantId: String(booking.restaurantId),
      date: dateStr,
      time: timeStr,
      guests: String(booking.people),
      notes: "",
      tableId: String(booking.tableId || 1),
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editForm.date || !editForm.time) {
      showToast("Completa todos los campos requeridos", "error");
      return;
    }
    const timeString = `${editForm.date}T${editForm.time}:00Z`;
    updateBooking(editingBooking.id, {
      restaurant: parseInt(editForm.restaurantId),
      user: parseInt(user.id),
      table: parseInt(editForm.tableId),
      people: parseInt(editForm.guests),
      time: timeString,
      status: editingBooking.status,
    });
    setIsEditModalOpen(false);
    setEditingBooking(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mis Reservaciones</h1>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <IoAdd /> Nueva Reserva
        </Button>
      </div>

      {loadingRestaurants ? (
        <div className="flex justify-center py-10">
          <Spinner size="lg" />
        </div>
      ) : userBookings.length === 0 ? (
        <EmptyState
          icon={IoCalendar}
          title="No tienes reservaciones"
          description="Crea tu primera reservación en alguno de nuestros restaurantes"
          action={{
            label: "Crear Reservación",
            onClick: () => setIsCreateModalOpen(true),
          }}
        />
      ) : (
        <div className="space-y-4">
          {userBookings.map((booking: any) => (
            <Card
              key={booking.id}
              className="group hover:shadow-lg transition-shadow"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">
                      Restaurante #{booking.restaurantId}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <IoCalendar size={14} />
                        {booking.time
                          ? new Date(booking.time).toLocaleDateString("es-MX")
                          : "—"}
                      </span>
                      <span className="flex items-center gap-1">
                        <IoTime size={14} />
                        {booking.time
                          ? new Date(booking.time).toLocaleTimeString("es-MX", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </span>
                      <span className="flex items-center gap-1">
                        <IoPeople size={14} />
                        {booking.people} personas
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge
                      variant={
                        (statusColors as any)[booking.status] || "secondary"
                      }
                    >
                      {statusLabels[booking.status] || booking.status}
                    </Badge>
                    {/* Editar — solo si está pendiente o confirmada */}
                    {(booking.status === "pending" ||
                      booking.status === "confirmed") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(booking)}
                        title="Editar reserva"
                      >
                        <IoPencil size={16} />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteBooking(booking.id)}
                      title="Eliminar reserva"
                    >
                      <FiTrash2 size={16} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal — Nueva Reserva */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)}>
        <ModalHeader onClose={() => setIsCreateModalOpen(false)}>
          Nueva Reservación
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <Select
              label="Restaurante"
              value={createForm.restaurantId}
              onChange={(e) =>
                setCreateForm({ ...createForm, restaurantId: e.target.value })
              }
              options={restaurantOptions}
            />
            <Input
              label="Fecha"
              type="date"
              value={createForm.date}
              onChange={(e) =>
                setCreateForm({ ...createForm, date: e.target.value })
              }
            />
            <Select
              label="Hora"
              value={createForm.time}
              onChange={(e) =>
                setCreateForm({ ...createForm, time: e.target.value })
              }
              options={timeOptions}
            />
            <Select
              label="Número de personas"
              value={createForm.guests}
              onChange={(e) =>
                setCreateForm({ ...createForm, guests: e.target.value })
              }
              options={guestOptions}
            />
            <Input
              label="Número de Mesa"
              type="number"
              value={createForm.tableId}
              onChange={(e) =>
                setCreateForm({ ...createForm, tableId: e.target.value })
              }
              placeholder="1"
            />
            <Textarea
              label="Notas especiales (opcional)"
              value={createForm.notes}
              onChange={(e) =>
                setCreateForm({ ...createForm, notes: e.target.value })
              }
              placeholder="Alergias, ocasión especial..."
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCreate}>Confirmar Reservación</Button>
        </ModalFooter>
      </Modal>

      {/* Modal — Editar Reserva */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
        <ModalHeader onClose={() => setIsEditModalOpen(false)}>
          Editar Reservación
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <Input
              label="Fecha"
              type="date"
              value={editForm.date}
              onChange={(e) =>
                setEditForm({ ...editForm, date: e.target.value })
              }
            />
            <Select
              label="Hora"
              value={editForm.time}
              onChange={(e) =>
                setEditForm({ ...editForm, time: e.target.value })
              }
              options={timeOptions}
            />
            <Select
              label="Número de personas"
              value={editForm.guests}
              onChange={(e) =>
                setEditForm({ ...editForm, guests: e.target.value })
              }
              options={guestOptions}
            />
            <Input
              label="Número de Mesa"
              type="number"
              value={editForm.tableId}
              onChange={(e) =>
                setEditForm({ ...editForm, tableId: e.target.value })
              }
              placeholder="1"
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSaveEdit}>Guardar cambios</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

export default function BookingManager() {
  return (
    <ApolloWrapper>
      <BookingManagerContent />
    </ApolloWrapper>
  );
}
