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
import { useRestaurants, useRestaurantById } from "../../hooks/useRestaurants";
import { useTables } from "../../hooks/useTables";
import { useBookings, useBookingsByUser } from "../../hooks/useBookings";
import { ApolloWrapper } from "../ApolloWrapper";
import { FiTrash2 } from "react-icons/fi";
import { type Booking } from "../../types";

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

const guestOptions = Array.from({ length: 10 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1} persona${i > 0 ? "s" : ""}`,
}));

const fallbackTimeOptions = [
  { value: "12:00", label: "12:00 PM" },
  { value: "13:00", label: "1:00 PM" },
  { value: "14:00", label: "2:00 PM" },
  { value: "18:00", label: "6:00 PM" },
  { value: "19:00", label: "7:00 PM" },
  { value: "20:00", label: "8:00 PM" },
  { value: "21:00", label: "9:00 PM" },
];

const emptyForm = {
  restaurantId: "",
  date: "",
  time: "",
  guests: "2",
  notes: "",
  tableId: "",
};

const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function generateTimeSlots(hoursStr: string | undefined | null, dateStr: string): { value: string; label: string }[] {
  if (!hoursStr || !dateStr) return [];
  try {
    const hours = JSON.parse(hoursStr);
    const date = new Date(dateStr + "T12:00:00");
    const dayKey = DAY_KEYS[date.getDay()];
    const ranges = hours[dayKey];
    if (!ranges || ranges.length === 0) return [];

    const slots: { value: string; label: string }[] = [];
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const isToday = dateStr === todayStr;

    for (const range of ranges) {
      const [openH, openM] = range.open.split(":").map(Number);
      const [closeH, closeM] = range.close.split(":").map(Number);
      const openMinutes = openH * 60 + openM;
      const closeMinutes = closeH * 60 + closeM;

      for (let m = openMinutes; m < closeMinutes; m += 60) {
        const h = Math.floor(m / 60);
        const min = m % 60;
        const timeStr = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;

        if (isToday) {
          const currentMinutes = now.getHours() * 60 + now.getMinutes();
          if (m <= currentMinutes) continue;
        }

        const hour12 = h % 12 || 12;
        const ampm = h < 12 ? "AM" : "PM";
        slots.push({ value: timeStr, label: `${hour12}:${String(min).padStart(2, "0")} ${ampm}` });
      }
    }

    return slots;
  } catch {
    return [];
  }
}

function BookingManagerContent() {
  const { user, isReady } = useAuth();
  const { showToast } = useToast();
  const { restaurants, loading: loadingRestaurants } = useRestaurants();
  const [createForm, setCreateForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);

  const { restaurant: createRestaurant } = useRestaurantById(createForm.restaurantId);
  const { restaurant: editRestaurant } = useRestaurantById(editForm.restaurantId);

  const createTimeOptions = generateTimeSlots(createRestaurant?.hours, createForm.date);
  const editTimeOptions = generateTimeSlots(editRestaurant?.hours, editForm.date);

  const [selectedRestaurantId, setSelectedRestaurantId] = useState("");
  const { createBooking } = useBookings(selectedRestaurantId);
  const { bookings, updateBooking, deleteBooking } = useBookingsByUser(
    user?.id.toString() ?? "",
  );

  const { tables: createTables } = useTables(createForm.restaurantId);
  const { tables: editTables } = useTables(editForm.restaurantId);

  const availableCreateTables = createTables.filter(
    (t) => t.status === "available" || t.status === "disponible",
  );
  const availableEditTables = editTables.filter(
    (t) => t.status === "available" || t.status === "disponible",
  );

  // Modal para crear nueva reserva
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Modal para editar reserva existente
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

  const userBookings = useMemo(() => {
    return bookings.filter((b) => String(b.user?.id) === user?.id);
  }, [bookings, user?.id]);

  const restaurantOptions = [
    { value: "", label: "Selecciona un restaurante" },
    ...restaurants.map((r) => ({ value: r.id, label: r.name })),
  ];

  if (!isReady) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

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

  const handleOpenEdit = (booking: Booking) => {
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
          {userBookings.map((booking) => (
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
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-sm text-muted-foreground">
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
                        (statusColors as Record<string, string>)[booking.status] || "secondary"
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
              options={createTimeOptions.length > 0 ? createTimeOptions : fallbackTimeOptions}
            />
            <Select
              label="Número de personas"
              value={createForm.guests}
              onChange={(e) =>
                setCreateForm({ ...createForm, guests: e.target.value })
              }
              options={guestOptions}
            />
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Mesa</label>
              <select
                value={createForm.tableId}
                onChange={(e) =>
                  setCreateForm({ ...createForm, tableId: e.target.value })
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Seleccionar mesa</option>
                {availableCreateTables.map((t) => (
                  <option key={t.id} value={t.id}>Mesa {t.number} ({t.capacity} pers.)</option>
                ))}
              </select>
            </div>
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
              options={editTimeOptions.length > 0 ? editTimeOptions : fallbackTimeOptions}
            />
            <Select
              label="Número de personas"
              value={editForm.guests}
              onChange={(e) =>
                setEditForm({ ...editForm, guests: e.target.value })
              }
              options={guestOptions}
            />
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Mesa</label>
              <select
                value={editForm.tableId}
                onChange={(e) =>
                  setEditForm({ ...editForm, tableId: e.target.value })
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Seleccionar mesa</option>
                {availableEditTables.map((t) => (
                  <option key={t.id} value={t.id}>Mesa {t.number} ({t.capacity} pers.)</option>
                ))}
              </select>
            </div>
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
