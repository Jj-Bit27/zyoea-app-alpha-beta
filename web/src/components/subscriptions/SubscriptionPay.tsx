import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "../../libs/useSearchParams";
import { useAuth } from "../../context/AuthContext";
import { useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { useCreatePayment } from "../../hooks/usePayments";
import { useCreateSubscription } from "../../hooks/useSubscriptions";
import { Button } from "../custom/Button";
import { Card, CardContent } from "../custom/Card";
import { Input } from "../custom/Input";
import { Spinner } from "../custom/Spinner";
import { addToast } from "../custom/Toast";
import { ApolloWrapper } from "../ApolloWrapper";
import { STRIPE_PUBLIC_KEY } from "../../config";
import { IoCheckmarkCircle, IoCard, IoLockClosed } from "react-icons/io5";

const GET_PLAN = gql`
  query subscriptionPlans {
    subscriptionPlans {
      id
      name
      price
      interval
      description
    }
  }
`;

function PayContent() {
  const params = useSearchParams();
  const restaurantId = params.get("restaurantId") || "";
  const planId = params.get("planId") || "";
  const { user } = useAuth();
  const { createPayment } = useCreatePayment();
  const { createSubscription } = useCreateSubscription();
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const [stripeLoaded, setStripeLoaded] = useState(false);
  const [stripe, setStripe] = useState<any>(null);
  const cardRef = useRef<any>(null);
  const [cardholderName, setCardholderName] = useState("");

  const { data: plansData, loading: plansLoading } = useQuery(GET_PLAN, {
    skip: !planId,
  });

  const plan = plansData?.subscriptionPlans?.find((p: any) => String(p.id) === planId);

  useEffect(() => {
    if (!STRIPE_PUBLIC_KEY) return;
    let cancelled = false;
    import("@stripe/stripe-js").then(({ loadStripe }) => {
      if (cancelled) return;
      loadStripe(STRIPE_PUBLIC_KEY).then((s) => {
        if (cancelled || !s) return;
        setStripe(s);
        setStripeLoaded(true);
      });
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!stripe || cardRef.current) return;
    const elements = stripe.elements();
    const card = elements.create("card", {
      style: {
        base: {
          fontSize: "16px",
          fontFamily: "inherit",
          color: "#1f2937",
          "::placeholder": { color: "#9ca3af" },
        },
      },
    });
    const container = document.getElementById("card-element");
    if (container) {
      card.mount(container);
      cardRef.current = card;
    }
    return () => { cardRef.current?.destroy(); cardRef.current = null; };
  }, [stripe]);

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Inicia sesión</h1>
        <a href="/login"><Button className="mt-4">Iniciar Sesión</Button></a>
      </div>
    );
  }

  if (plansLoading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  if (!plan) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Plan no encontrado</h1>
        <p className="mt-2 text-muted-foreground">Selecciona un plan primero</p>
        <a href="/plans"><Button className="mt-4">Ver planes</Button></a>
      </div>
    );
  }

  const amount = parseFloat(plan.price);

  const handlePay = async () => {
    setProcessing(true);
    try {
      let paymentMethodId = "pm_mock_" + Math.floor(Math.random() * 10000);

      if (stripe && cardRef.current) {
        const { error, paymentMethod } = await stripe.createPaymentMethod({
          type: "card",
          card: cardElement,
          billing_details: { name: cardholderName || user.name || "" },
        });
        if (error) {
          addToast(error.message || "Error con la tarjeta", "error");
          setProcessing(false);
          return;
        }
        paymentMethodId = paymentMethod.id;
      }

      const paymentResult = await createPayment({
        userId: String(user.id),
        amount: amount,
        currency: "MXN",
        paymentMethodId,
        description: `Suscripción ${plan.name} - Restaurante #${restaurantId}`,
      });

      if (paymentResult?.status === "succeeded" || paymentResult?.status === "processing") {
        await createSubscription({
          variables: {
            input: {
              restaurantId: parseInt(restaurantId),
              planId: parseInt(planId),
              stripeSubscriptionId: paymentResult.stripePaymentIntentId || "sub_" + Date.now(),
              currentPeriodStart: new Date().toISOString(),
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            },
          },
        });
        setDone(true);
        addToast("¡Suscripción activada exitosamente!", "success");
      } else {
        addToast("El pago no pudo completarse", "error");
      }
    } catch (err: unknown) {
      const apolloErr = err as { graphQLErrors?: Array<{ message?: string }>; message?: string };
      addToast(apolloErr.message || "Error al procesar el pago", "error");
    } finally {
      setProcessing(false);
    }
  };

  if (done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <IoCheckmarkCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-2xl font-bold">¡Suscripción activada!</h1>
        <p className="mt-4 text-muted-foreground">
          Tu restaurante está listo. Puedes comenzar a configurarlo desde el panel.
        </p>
        <a href={`/subscribe/success?restaurantId=${restaurantId}`}>
          <Button className="mt-6">Ir al panel</Button>
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <Card>
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <IoCard className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Pago de Suscripción</h1>
          <p className="mt-2 text-muted-foreground">
            Activa tu plan para comenzar a usar Suavus
          </p>

          <div className="mt-8 rounded-lg bg-secondary/50 p-4">
            <div className="flex justify-between text-sm">
              <span>Plan</span>
              <span className="font-medium">{plan.name}</span>
            </div>
            {plan.description && (
              <div className="flex justify-between text-sm mt-2">
                <span>Descripción</span>
                <span className="font-medium text-muted-foreground">{plan.description}</span>
              </div>
            )}
            <div className="flex justify-between text-sm mt-2">
              <span>Restaurante</span>
              <span className="font-medium">#{restaurantId}</span>
            </div>
            <hr className="my-3 border-border" />
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span className="text-primary">${amount.toFixed(2)} MXN / {plan.interval}</span>
            </div>
          </div>

          <div className="mt-6 text-left space-y-4">
            {stripeLoaded ? (
              <>
                <Input
                  label="Nombre del titular"
                  placeholder="Nombre en la tarjeta"
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                />
                <div>
                  <label className="text-sm font-medium mb-1 block">Datos de la tarjeta</label>
                  <div
                    id="card-element"
                    className="rounded-lg border border-border bg-background p-3"
                  />
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center">
                {STRIPE_PUBLIC_KEY ? "Cargando formulario de pago..." : "Usando pago de prueba (sin Stripe configurado)"}
              </p>
            )}
          </div>

          <Button
            className="w-full mt-6"
            size="lg"
            onClick={handlePay}
            isLoading={processing}
          >
            {processing ? "Procesando..." : `Pagar $${amount.toFixed(2)} MXN`}
          </Button>

          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <IoLockClosed /> Pago seguro procesado por Stripe
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SubscriptionPay() {
  return (
    <ApolloWrapper>
      <PayContent />
    </ApolloWrapper>
  );
}
