import React, { useState } from "react";
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
import { addToast } from "../custom/Toast";
import { useOrderById, useUpdateOrderPayment } from "../../hooks/useOrders";
import { useCreatePayment } from "../../hooks/usePayments";
import { ApolloWrapper } from "../ApolloWrapper";

function CardPaymentFormContent() {
  const { user } = useAuth();

  // Obtener orderId de los URL params
  const urlParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;
  const orderId = urlParams?.get("orderId") || "";

  // Hooks centralizados
  const { order, loading: loadingOrder } = useOrderById(orderId);
  const { createPayment } = useCreatePayment();
  const { updatePayment } = useUpdateOrderPayment();

  const total = order?.total || 0;

  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const parts = v.match(/.{1,4}/g);
    return parts ? parts.join(" ") : v;
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) return v.substring(0, 2) + "/" + v.substring(2, 4);
    return v;
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!cardNumber || cardNumber.replace(/\s/g, "").length < 16)
      newErrors.cardNumber = "Ingresa un número válido";
    if (!cardName.trim()) newErrors.cardName = "Ingresa el nombre del titular";
    if (!expiry || expiry.length < 5)
      newErrors.expiry = "Ingresa una fecha válida";
    if (!cvv || cvv.length < 3) newErrors.cvv = "Ingresa el CVV";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !user || !order) return;
    setIsProcessing(true);

    try {
      const mockStripeToken = "pm_mock_" + Math.floor(Math.random() * 10000);

      await createPayment({
        userId: user.id.toString(),
        amount: total,
        currency: "MXN",
        paymentMethodId: mockStripeToken,
        description: `Pago con tarjeta - Orden #${order.id}`,
      });

      await updatePayment(order.id, true);

      setIsComplete(true);
      addToast("Pago procesado exitosamente", "success");
    } catch (err: any) {
      console.error("Error procesando pago:", err);
      addToast(
        err?.graphQLErrors?.[0]?.message ||
          err?.message ||
          "Error al procesar el pago",
        "error",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinish = () => {
    window.location.href = "/order/my-orders";
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
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              maxLength={19}
              error={errors.cardNumber}
            />
            <Input
              label="Nombre del titular"
              placeholder="Nombre completo"
              value={cardName}
              onChange={(e) => setCardName(e.target.value.toUpperCase())}
              error={errors.cardName}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Fecha (MM/AA)"
                placeholder="MM/AA"
                value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                maxLength={5}
                error={errors.expiry}
              />
              <Input
                label="CVV"
                placeholder="123"
                type="password"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, ""))}
                maxLength={4}
                error={errors.cvv}
              />
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
              <IoLockClosed /> Datos encriptados con SSL
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
