import {
  FiUsers,
  FiShoppingBag,
  FiActivity,
  FiTrendingUp,
} from "react-icons/fi";
import type { Order, Restaurant } from "../../types";
import { Spinner } from "../custom/Spinner";
import { useRestaurants } from "../../hooks/useRestaurants";
import { ApolloWrapper } from "../ApolloWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "../custom/Card"

function AdminDashboardContent() {
  const { restaurants, loading, error } = useRestaurants();

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

  const activeRestaurants = restaurants.length;

  const stats = [
    {
      title: "Restaurantes Activos",
      value: String(activeRestaurants),
      change: "Total registrados",
      icon: <FiShoppingBag size={24} />,
      trend: "up",
    },
    {
      title: "Usuarios Registrados",
      value: "—",
      change: "Datos de la API",
      icon: <FiUsers size={24} />,
      trend: "up",
    },
    {
      title: "Tasa de Actividad",
      value: "—",
      change: "Datos de la API",
      icon: <FiActivity size={24} />,
      trend: "up",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Panel de SuperAdmin
        </h1>
        <p className="text-muted-foreground">
          Visión general del rendimiento de Suavus
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </p>
                <div className="p-2 bg-primary/10 rounded-full text-primary">
                  {stat.icon}
                </div>
              </div>
              <div className="flex flex-col mt-2">
                <span className="text-2xl font-bold text-foreground">
                  {stat.value}
                </span>
                <p className="text-xs text-muted-foreground flex items-center mt-1">
                  <FiTrendingUp className="mr-1 text-success" />
                  <span className="text-success font-medium">
                    {stat.change}
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Restaurants List */}
      <Card>
        <CardHeader>
          <CardTitle>Restaurantes Registrados</CardTitle>
        </CardHeader>
        <CardContent>
          {restaurants.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No hay restaurantes registrados
            </p>
          ) : (
            <div className="space-y-3">
              {restaurants.map((rest: Restaurant) => (
                <div
                  key={rest.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold">
                      {rest.name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{rest.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {rest.email}
                      </p>
                    </div>
                  </div>
                  <a
                    href={`/admin/restaurants/${rest.id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    Ver detalles
                  </a>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function AdminDashboard() {
  return (
    <ApolloWrapper>
      <AdminDashboardContent />
    </ApolloWrapper>
  );
}
