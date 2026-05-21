import { useMemo } from "react";
import {
  IoCalendar,
  IoTime,
  IoPeople,
  IoTrash,
} from "react-icons/io5";
import { Card, CardContent } from "../custom/Card";
import { Button } from "../custom/Button";
import { Badge } from "../custom/Badge";
import { EmptyState } from "../custom/EmptyState";
import { Spinner } from "../custom/Spinner";
import { useAuth } from "../../context/AuthContext";
import { useBookings } from "../../hooks/useBookings";
import { ApolloWrapper } from "../ApolloWrapper";

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

function StaffBookingManagerContent() {
  const { user } = useAuth();
  const restaurantId = user?.restaurantId?.toString() || "";
  const { bookings, loading, deleteBooking } = useBookings(restaurantId);

  // Separar activas e historial
  const { active, history } = useMemo(() => {
    const active = bookings.filter(
      (b: any) => b.status === "pending" || b.status === "confirmed",
    );
    const history = bookings.filter(
      (b: any) => b.status === "cancelled" || b.status === "completed",
    );
    return { active, history };
  }, [bookings]);

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

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  const formatDate = (timeStr: string) => {
    const date = new Date(timeStr);
    return date.toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr);
    return date.toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderBooking = (booking: any, showDelete: boolean) => (
    <Card key={booking.id} className="group hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">
                {booking.user?.name || `Usuario #${booking.userId}`}
              </h3>
              <Badge
                variant={
                  (statusColors as any)[booking.status] || "secondary"
                }
              >
                {statusLabels[booking.status] || booking.status}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <IoCalendar size={14} />
                {booking.time ? formatDate(booking.time) : "—"}
              </span>
              <span className="flex items-center gap-1">
                <IoTime size={14} />
                {booking.time ? formatTime(booking.time) : "—"}
              </span>
              <span className="flex items-center gap-1">
                <IoPeople size={14} />
                {booking.people} personas
              </span>
            </div>
            {booking.tableId && (
              <p className="text-xs text-muted-foreground">
                Mesa #{booking.tableId}
              </p>
            )}
            {booking.user?.email && (
              <p className="text-xs text-muted-foreground">
                {booking.user.email}
              </p>
            )}
          </div>
          {showDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteBooking(booking.id)}
              className="text-destructive hover:text-destructive"
            >
              <IoTrash size={18} />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Reservas del Restaurante</h1>

      {/* Activas */}
      {active.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <IoCalendar className="text-primary" />
            Reservas Activas ({active.length})
          </h2>
          <div className="space-y-3">
            {active.map((b: any) => renderBooking(b, true))}
          </div>
        </div>
      )}

      {/* Historial */}
      {history.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 text-muted-foreground">
            Historial ({history.length})
          </h2>
          <div className="space-y-3 opacity-75">
            {history.map((b: any) => renderBooking(b, false))}
          </div>
        </div>
      )}

      {bookings.length === 0 && (
        <EmptyState
          icon={IoCalendar}
          title="Sin reservas"
          description="No hay reservas registradas para tu restaurante"
        />
      )}
    </div>
  );
}

export default function StaffBookingManager() {
  return (
    <ApolloWrapper>
      <StaffBookingManagerContent />
    </ApolloWrapper>
  );
}
