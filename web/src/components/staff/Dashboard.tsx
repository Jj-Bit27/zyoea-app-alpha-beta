import {
  FiTrendingUp,
  FiUsers,
  FiShoppingBag,
  FiDollarSign,
  FiCalendar,
} from "react-icons/fi";
import { Card, CardContent, CardHeader, CardTitle } from "../custom/Card";
import { Spinner } from "../custom/Spinner";
import { useOrders } from "../../hooks/useOrders";
import { useBookings } from "../../hooks/useBookings";
import { useTables } from "../../hooks/useTables";
import { useAuth } from "../../context/AuthContext";
import { ApolloWrapper } from "../ApolloWrapper";

function DashboardContent() {
  const { user } = useAuth();
  const restaurantId = user?.restaurantId || "";

  const { orders, loading: loadingOrders } = useOrders(restaurantId);
  const { bookings, loading: loadingBookings } = useBookings(restaurantId);
  const { tables, loading: loadingTables } = useTables(restaurantId);

  const loading = loadingOrders || loadingBookings || loadingTables;

  if (!restaurantId) {
    return (
      <div className="p-6 bg-muted rounded-lg text-center">
        <p className="text-muted-foreground">
          No hay restaurante asociado a tu cuenta.
        </p>
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

  const activeOrders = orders.filter(
    (o) => o.status !== "entregado" && o.status !== "cancelado",
  );
  const totalRevenue = orders
    .filter((o) => o.status !== "CANCELADA" && o.status !== "cancelado")
    .reduce((sum, o) => sum + (o.total || 0), 0);
  const occupiedTables = tables.filter(
    (t) => t.status === "ocupada" || t.status === "occupied",
  ).length;
  const todayBookings = bookings.filter((b) => {
    if (!b.time) return false;
    const bookingDate = new Date(b.time);
    const today = new Date();
    return bookingDate.toDateString() === today.toDateString();
  });

  const stats = [
    {
      title: "Ingresos totales",
      value: `$${totalRevenue.toFixed(0)}`,
      icon: <FiDollarSign size={24} />,
      trend: "up",
    },
    {
      title: "Órdenes activas",
      value: String(activeOrders.length),
      icon: <FiShoppingBag size={24} />,
      trend: "up",
    },
    {
      title: "Reservas hoy",
      value: String(todayBookings.length),
      icon: <FiCalendar size={24} />,
      trend: "up",
    },
    {
      title: "Mesas ocupadas",
      value: `${occupiedTables}/${tables.length}`,
      icon: <FiUsers size={24} />,
      trend: "neutral",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Resumen de actividad del restaurante
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {stat.value}
                  </p>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg text-primary">
                  {stat.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FiShoppingBag size={20} />
              Órdenes recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-sm m-4 text-muted-foreground py-4 text-center">
                No hay órdenes recientes
              </p>
            ) : (
              <div className="space-y-4 m-4">
                {orders.slice(0, 5).map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-foreground">#{order.id}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.user_name} — Mesa {order.tableId || "—"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-foreground">
                        ${order.total}
                      </p>
                      <p className="text-xs px-2 py-0.5 rounded-full inline-block bg-primary/20 text-primary">
                        {order.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Bookings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 pb-4">
              <FiCalendar size={20} />
              Próximas reservas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <p className="text-sm m-4 text-muted-foreground py-4 text-center">
                No hay reservas próximas
              </p>
            ) : (
              <div className="space-y-4 m-4">
                {bookings.slice(0, 5).map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {b.user?.name || "Cliente"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {b.people} personas — Mesa {b.tableId}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary text-sm">
                        {b.time
                          ? new Date(b.time).toLocaleTimeString("es-MX", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <ApolloWrapper>
      <DashboardContent />
    </ApolloWrapper>
  );
}
