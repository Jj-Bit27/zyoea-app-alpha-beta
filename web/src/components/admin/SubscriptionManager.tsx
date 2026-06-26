import { useState } from "react";
import { IoCard, IoCheckmarkCircle } from "react-icons/io5";
import { Card, CardContent, CardHeader } from "../custom/Card";
import { Button } from "../custom/Button";
import { Badge } from "../custom/Badge";
import { Spinner } from "../custom/Spinner";
import { ApolloWrapper } from "../ApolloWrapper";
import { useSubscriptionPlans, useCreateSubscription } from "../../hooks/useSubscriptions";
import { addToast } from "../custom/Toast";

function SubscriptionPlansContent() {
  const { plans, loading } = useSubscriptionPlans();
  const { createSubscription } = useCreateSubscription();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleSelect = (planId: string) => {
    setSelectedPlan(planId);
    addToast("Redirigiendo al pago...", "info");
  };

  if (loading) {
    return <div className="flex justify-center py-10"><Spinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Planes de Suscripción</h1>
        <p className="text-muted-foreground mt-2">
          Elige el plan ideal para tu restaurante
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan: any) => (
          <Card key={plan.id} className={`relative ${selectedPlan === plan.id ? 'ring-2 ring-primary' : ''}`}>
            <CardHeader>
              <h3 className="text-xl font-bold">{plan.name}</h3>
              <div className="mt-2">
                <span className="text-3xl font-bold">${plan.price}</span>
                <span className="text-muted-foreground">/{plan.interval}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {plan.description && (
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              )}
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <IoCheckmarkCircle className="text-green-500 flex-shrink-0" />
                  Hasta {plan.maxRestaurants} {plan.maxRestaurants === 1 ? 'restaurante' : 'restaurantes'}
                </li>
                <li className="flex items-center gap-2">
                  <IoCheckmarkCircle className="text-green-500 flex-shrink-0" />
                  Hasta {plan.maxEmployees} empleados
                </li>
                <li className="flex items-center gap-2">
                  <IoCheckmarkCircle className="text-green-500 flex-shrink-0" />
                  Hasta {plan.maxProducts} productos
                </li>
              </ul>
              {plan.features && (
                <div className="text-xs text-muted-foreground whitespace-pre-line">
                  {plan.features}
                </div>
              )}
              <Button
                className="w-full"
                onClick={() => handleSelect(plan.id)}
                disabled={selectedPlan === plan.id}
              >
                {selectedPlan === plan.id ? "Seleccionado" : "Seleccionar Plan"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function SubscriptionPlans() {
  return (
    <ApolloWrapper>
      <SubscriptionPlansContent />
    </ApolloWrapper>
  );
}
