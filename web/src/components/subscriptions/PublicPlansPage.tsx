import { useState } from "react";
import { IoCheckmarkCircle, IoArrowForward, IoMail } from "react-icons/io5";
import { Card, CardContent, CardHeader } from "../custom/Card";
import { Button } from "../custom/Button";
import { Spinner } from "../custom/Spinner";
import { Badge } from "../custom/Badge";
import { ApolloWrapper } from "../ApolloWrapper";
import { useSubscriptionPlans } from "../../hooks/useSubscriptions";

function parseFeatures(features: string): string[] {
  try {
    const parsed = JSON.parse(features);
    return Array.isArray(parsed) ? parsed : [features];
  } catch {
    return features.split(",").map((f: string) => f.trim()).filter(Boolean);
  }
}

function PlansContent() {
  const { plans, loading } = useSubscriptionPlans();
  const [selected, setSelected] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  const standardPlans = plans.slice(0, 2);

  const handleSubscribe = (planId: string) => {
    setSelected(planId);
    window.location.href = `/subscribe/setup?planId=${planId}`;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="text-center mb-12">
        <Badge variant="primary" className="mb-4">Planes</Badge>
        <h1 className="text-4xl font-bold text-foreground">
          Impulsa tu restaurante con Suavus
        </h1>
        <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto">
          Elige el plan ideal para digitalizar tu restaurante. Sin compromisos, cancela cuando quieras.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {standardPlans.map((plan: any) => (
          <Card
            key={plan.id}
            className={`relative flex flex-col transition-all ${
              selected === plan.id ? "ring-2 ring-primary scale-[1.02]" : ""
            }`}
          >
            <CardHeader className="text-center pb-0">
              <h3 className="text-xl font-bold">{plan.name}</h3>
              <div className="mt-4">
                <span className="text-4xl font-bold">${plan.price}</span>
                <span className="text-muted-foreground">/{plan.interval}</span>
              </div>
              {plan.description && (
                <p className="mt-3 text-sm text-muted-foreground">{plan.description}</p>
              )}
            </CardHeader>
            <CardContent className="flex-1 flex flex-col pt-6">
              <ul className="space-y-3 text-sm flex-1">
                <li className="flex items-start gap-3">
                  <IoCheckmarkCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                  <span>Hasta <strong>{plan.maxRestaurants}</strong> {plan.maxRestaurants === 1 ? 'restaurante' : 'restaurantes'}</span>
                </li>
                <li className="flex items-start gap-3">
                  <IoCheckmarkCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                  <span>Hasta <strong>{plan.maxEmployees}</strong> empleados</span>
                </li>
                <li className="flex items-start gap-3">
                  <IoCheckmarkCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                  <span>Hasta <strong>{plan.maxProducts}</strong> productos en menú</span>
                </li>
                {plan.features && parseFeatures(plan.features).map((f: string, i: number) => (
                  <li key={i} className="flex items-start gap-3">
                    <IoCheckmarkCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="w-full mt-6"
                size="lg"
                onClick={() => handleSubscribe(plan.id)}
              >
                Suscribirse <IoArrowForward className="ml-2" />
              </Button>
            </CardContent>
          </Card>
        ))}

        {/* Servicio Personalizado */}
        <Card className="relative flex flex-col border-dashed border-2 border-primary/30 bg-primary/5">
          <CardHeader className="text-center pb-0">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <IoMail className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold">Servicio Personalizado</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              ¿Necesitas algo más? Contáctanos para crear un plan a tu medida.
            </p>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center pt-6">
            <div className="rounded-lg bg-card p-6 text-center shadow-sm w-full">
              <p className="text-sm font-medium text-muted-foreground mb-2">Escríbenos a:</p>
              <a
                href="mailto:soporte@suavus.app"
                className="text-lg font-bold text-primary hover:underline"
              >
                soporte@suavus.app
              </a>
              <p className="mt-4 text-xs text-muted-foreground">
                Te responderemos en menos de 24 horas
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function PublicPlansPage() {
  return (
    <ApolloWrapper>
      <PlansContent />
    </ApolloWrapper>
  );
}
