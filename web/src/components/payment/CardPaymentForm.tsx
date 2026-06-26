import React from "react";
import {
  IoArrowBack,
  IoCard,
  IoLockClosed,
  IoCheckmarkCircle,
} from "react-icons/io5";
import { Card, CardContent } from "../custom/Card";
import { Button } from "../custom/Button";
import { Input } from "../custom/Input";
import { useAuth } from "../../context/AuthContext";
import { useOrderById } from "../../hooks/useOrders";
import { useCardPayment } from "../../hooks/useCardPayment";
import { STRIPE_PUBLIC_KEY } from "../../config";
import { ApolloWrapper } from "../ApolloWrapper";

function CardPaymentFormContent() {
  const { user } = useAuth();

  const urlParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;
  const orderId = urlParams?.get("orderId") || "";

  const { order, loading: loadingOrder } = useOrderById(orderId);
  const total = order?.total || 0;

  const {
    cardNumber,
    setCardNumber,
    cardName,
    setCardName,
    expiry,
    setExpiry,
    cvv,
    setCvv,
    errors,
    isProcessing,
    isComplete,
    handlePay,
  } = useCardPayment(orderId, total);

  const handleFinish = () => {
    window.location.href = "/order/my-orders";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handlePay();
  };

  if (!user) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold">Inicia sesión</h1>
        <a href="/login" className="inline-block mt-4">
          <Button>Iniciar sesión</Button>
        </a>
      </div>
    );
  }

  if (!orderId) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold">No se encontró la orden</h1>
        <a href="/order/my-orders" className="inline-block mt-4">
          <Button>Ver mis órdenes</Button>
        </a>
      </div>
    );
  }

  if (loadingOrder) {
    return (
      <div className="text-center py-20">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Cargando orden...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold">Orden no encontrada</h1>
        <a href="/order/my-orders" className="inline-block mt-4">
          <Button>Ver mis órdenes</Button>
        </a>
      </div>
    );
  }

  if (isComplete || order.paid) {
    return (
      <Card className="max-w-md mx-auto text-center">
        <CardContent className="py-12">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <IoCheckmarkCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold">Pago Exitoso</h1>
          <p className="mt-4 text-muted-foreground">
            Tu pago ha sido procesado correctamente
          </p>
          <div className="mt-6 rounded-lg bg-secondary p-4">
            <p className="text-sm text-muted-foreground">Total pagado</p>
            <p className="text-3xl font-bold">${total.toFixed(2)}</p>
          </div>
          {cardNumber && (
            <p className="mt-4 text-sm text-muted-foreground">
              Tarjeta terminada en {cardNumber.slice(-4)}
            </p>
          )}
          <Button fullWidth className="mt-8" onClick={handleFinish}>
            Ver mis órdenes
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <a
        href={`/payment/card?orderId=${orderId}`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <IoArrowBack className="h-4 w-4" /> Volver
      </a>

      <div className="flex items-center gap-3 mb-6">
        <div className="rounded-full bg-primary/10 p-3">
          <IoCard className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Pago con Tarjeta</h1>
          <p className="text-sm text-muted-foreground">
            Orden #{order.id} — ${total.toFixed(2)}
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Número de tarjeta"
              placeholder="1234 5678 9012 3456"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              maxLength={19}
              error={errors.cardNumber}
            />
            <Input
              label="Nombre del titular"
              placeholder="Nombre completo"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              error={errors.cardName}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Fecha (MM/AA)"
                placeholder="MM/AA"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                maxLength={5}
                error={errors.expiry}
              />
              <Input
                label="CVV"
                placeholder="123"
                type="password"
                value={cvv}
                onChange={(e) => setCvv(e.target.value)}
                maxLength={4}
                error={errors.cvv}
              />
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
              <IoLockClosed /> {STRIPE_PUBLIC_KEY ? "Pago seguro con Stripe" : "Pago de prueba (sin Stripe)"}
            </div>
            <hr className="border-border" />
            <div className="flex justify-between items-center">
              <span className="font-semibold">Total a pagar</span>
              <span className="text-xl font-bold text-primary">
                ${total.toFixed(2)}
              </span>
            </div>
            <Button type="submit" fullWidth size="lg" isLoading={isProcessing}>
              Pagar ${total.toFixed(2)}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CardPaymentForm() {
  return (
    <ApolloWrapper>
      <CardPaymentFormContent />
    </ApolloWrapper>
  );
}
