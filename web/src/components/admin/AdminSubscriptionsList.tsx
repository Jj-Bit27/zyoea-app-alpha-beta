import { useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import {
  IoPricetag,
} from "react-icons/io5";
import { Card, CardContent, CardHeader, CardTitle } from "../custom/Card";
import { Badge } from "../custom/Badge";
import { Spinner } from "../custom/Spinner";

const ALL_SUBSCRIPTIONS = gql`
  query allSubscriptions {
    allSubscriptions {
      id
      restaurantId
      planId
      status
      currentPeriodEnd
      cancelledAt
      createdAt
      plan {
        id
        name
        price
        interval
      }
    }
  }
`;

function SubscriptionsContent() {
  const { data, loading, error } = useQuery(ALL_SUBSCRIPTIONS);

  if (loading) {
    return <div className="flex justify-center py-10"><Spinner size="lg" /></div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
        {error.message}
      </div>
    );
  }

  const subscriptions = data?.allSubscriptions || [];
  const active = subscriptions.filter((s: any) => s.status === "active");
  const cancelled = subscriptions.filter((s: any) => s.status === "cancelled");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">Suscripciones</h1>
        <Badge variant="primary">{active.length} activas</Badge>
        <Badge variant="secondary">{cancelled.length} canceladas</Badge>
      </div>

      {subscriptions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No hay suscripciones registradas
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {subscriptions.map((sub: any) => (
            <Card key={sub.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <IoPricetag className="text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      Restaurante #{sub.restaurantId}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{sub.plan?.name} — ${sub.plan?.price}/{sub.plan?.interval}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="text-right">
                    <Badge variant={sub.status === "active" ? "success" : "secondary"}>
                      {sub.status === "active" ? "Activa" : "Cancelada"}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      Creada: {new Date(sub.createdAt).toLocaleDateString("es-MX")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminSubscriptionsList() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Todas las Suscripciones</CardTitle>
      </CardHeader>
      <CardContent>
        <SubscriptionsContent />
      </CardContent>
    </Card>
  );
}
