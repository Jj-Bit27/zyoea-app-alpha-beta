import { useState } from "react";
import { FiSearch, FiCalendar, FiClock, FiUsers } from "react-icons/fi";
import { Input } from "../custom/Input";
import { Card, CardContent } from "../custom/Card";
import { Badge } from "../custom/Badge";
import { Select } from "../custom/Select";
import { Spinner } from "../custom/Spinner";
import { useBookings } from "../../hooks/useBookings";
import { useAuth } from "../../context/AuthContext";
import { ApolloWrapper } from "../ApolloWrapper";

const statusColors: Record<string, any> = {
  pendiente: "warning",
  pending: "warning",
  confirmada: "success",
  confirmed: "success",
  completada: "secondary",
  completed: "secondary",
  cancelada: "destructive",
  cancelled: "destructive",
};

function BookingsManagerContent() {
  const { user } = useAuth();
  const restaurantId = user?.restaurantId || "";
  const { bookings, loading, error } = useBookings(restaurantId);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDate, setFilterDate] = useState("");

  if (!restaurantId) return (
    <div className="p-6 bg-muted rounded-lg text-center">
      <p className="text-muted-foreground">No hay restaurante asociado a tu cuenta.</p>
    </div>
  );

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (error) return <div className="p-6 bg-destructive/10 text-destructive rounded-lg">{error.message}</div>;

  const filteredBookings = bookings.filter((b: any) => {
    const name = b.user?.name || "";
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || b.status === filterStatus;
    const matchesDate = !filterDate || (b.time && b.time.startsWith(filterDate));
    return matchesSearch && matchesStatus && matchesDate;
  });

  const groupedByDate = filteredBookings.reduce((acc: Record<string, any[]>, b: any) => {
    const date = b.time ? b.time.split("T")[0] : "Sin fecha";
    if (!acc[date]) acc[date] = [];
    acc[date].push(b);
    return acc;
  }, {});

  const formatDate = (dateStr: string) => {
    if (dateStr === "Sin fecha") return dateStr;
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reservas</h1>
        <p className="text-muted-foreground">Visualiza las reservas del restaurante</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-auto" />
        <Select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          options={[
            { value: "", label: "Todos los estados" },
            { value: "pending", label: "Pendiente" },
            { value: "confirmed", label: "Confirmada" },
            { value: "completed", label: "Completada" },
            { value: "cancelled", label: "Cancelada" },
          ]}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{filteredBookings.length}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-warning">
              {filteredBookings.filter((b: any) => b.status === "pending" || b.status === "pendiente").length}
            </p>
            <p className="text-sm text-muted-foreground">Pendientes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-success">
              {filteredBookings.filter((b: any) => b.status === "confirmed" || b.status === "confirmada").length}
            </p>
            <p className="text-sm text-muted-foreground">Confirmadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-destructive">
              {filteredBookings.filter((b: any) => b.status === "cancelled" || b.status === "cancelada").length}
            </p>
            <p className="text-sm text-muted-foreground">Canceladas</p>
          </CardContent>
        </Card>
      </div>

      {/* Bookings grouped by date */}
      <div className="space-y-6">
        {Object.entries(groupedByDate)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, dayBookings]) => (
            <div key={date}>
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2 capitalize">
                <FiCalendar size={18} />
                {formatDate(date)}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(dayBookings as any[]).sort((a: any, b: any) => (a.time || "").localeCompare(b.time || "")).map((booking: any) => (
                  <Card key={booking.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-foreground">{booking.user?.name || "Cliente"}</h3>
                          <p className="text-sm text-muted-foreground">{booking.user?.email}</p>
                        </div>
                        <Badge variant={statusColors[booking.status] || "secondary"}>
                          {booking.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <FiClock size={14} />
                          {booking.time ? new Date(booking.time).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) : "—"}
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <FiUsers size={14} />
                          {booking.people} personas
                        </div>
                        <div className="text-muted-foreground">
                          Mesa {booking.tableId}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
      </div>

      {Object.keys(groupedByDate).length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <FiCalendar size={48} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-foreground">No hay reservas</p>
            <p className="text-muted-foreground">No se encontraron reservas con los filtros seleccionados</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function BookingsManager() {
  return (
    <ApolloWrapper>
      <BookingsManagerContent />
    </ApolloWrapper>
  );
}