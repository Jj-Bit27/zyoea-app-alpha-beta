import { useState } from "react";
import {
  IoArrowBack,
  IoCash,
  IoCard,
  IoCheckmarkCircle,
} from "react-icons/io5";
import { Card, CardContent, CardHeader, CardTitle } from "../custom/Card";
import { Button } from "../custom/Button";
import { useAuth } from "../../context/AuthContext";
import { addToast } from "../custom/Toast";
import { useOrderById, useUpdateOrderPayment } from "../../hooks/useOrders";
import { useCreatePayment } from "../../hooks/usePayments";
import { ApolloWrapper } from "../ApolloWrapper";

type PaymentMethod = "cash" | "card" | null;

function PaymentFlowContent() {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);

  // Obtener orderId de los URL params
  const urlParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;
  const orderId = urlParams?.get("orderId") || "";

  // Hooks centralizados
  const { order, loading: loadingOrder } = useOrderById(orderId);
  const { updatePayment } = useUpdateOrderPayment();
  const { createPayment } = useCreatePayment();

  const total = order?.total || 0;

  const handleSelectCash = () => setPaymentMethod("cash");
  const handleSelectCard = () => setPaymentMethod("card");

  const handleConfirmCash = async () => {
    if (!order || !user) return;
    setIsProcessing(true);
    try {
      await updatePayment(order.id, true);
      setIsComplete(true);
      addToast("Pago registrado exitosamente", "success");
    } catch (err: unknown) {
      const apolloErr = err as { graphQLErrors?: Array<{ message?: string }>; message?: string };
      addToast(apolloErr.message || "Error al procesar el pago", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmCard = async () => {
    if (!order || !user) return;
    setIsProcessing(true);
    try {
      const mockStripeToken = "pm_mock_" + Math.floor(Math.random() * 10000);

      await createPayment({
        userId: user.id.toString(),
        amount: total,
        currency: "MXN",
        paymentMethodId: mockStripeToken,
        description: `Pago de orden #${order.id}`,
      });

      await updatePayment(order.id, true);

      setIsComplete(true);
      addToast("Pago con tarjeta procesado exitosamente", "success");
    } catch (err: unknown) {
      const apolloErr = err as { graphQLErrors?: Array<{ message?: string }>; message?: string };
      addToast(apolloErr.message || "Error al procesar el pago", "error");
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
        <p className="mt-2 text-muted-foreground">
          Necesitas iniciar sesión para pagar
        </p>
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
        <p className="mt-2 text-muted-foreground">
          Selecciona una orden desde tus pedidos
        </p>
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

  if (order.paid) {
    return (
      <Card className="max-w-md mx-auto text-center">
        <CardContent className="py-12">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <IoCheckmarkCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold">Esta orden ya fue pagada</h1>
          <div className="mt-6 rounded-lg bg-secondary p-4">
            <p className="text-sm text-muted-foreground">Total pagado</p>
            <p className="text-3xl font-bold">${total.toFixed(2)}</p>
          </div>
          <Button fullWidth className="mt-8" onClick={handleFinish}>
            Ver mis órdenes
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isComplete) {
    return (
      <Card className="max-w-md mx-auto text-center">
        <CardContent className="py-12">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <IoCheckmarkCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold">¡Pago exitoso!</h1>
          <p className="mt-4 text-muted-foreground">
            Tu pago ha sido procesado correctamente
          </p>
          <div className="mt-6 rounded-lg bg-secondary p-4">
            <p className="text-sm text-muted-foreground">Total pagado</p>
            <p className="text-3xl font-bold">${total.toFixed(2)}</p>
          </div>
          <Button fullWidth className="mt-8" onClick={handleFinish}>
            Ver mis órdenes
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <a
        href="/order/my-orders"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <IoArrowBack className="h-4 w-4" /> Volver a mis órdenes
      </a>

      <h1 className="text-2xl font-bold">Pagar Orden #{order.id}</h1>
      <p className="mt-1 text-muted-foreground">
        Selecciona cómo deseas pagar
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <button
          onClick={handleSelectCash}
          className={`flex flex-col items-center rounded-xl border-2 p-6 transition-all ${paymentMethod === "cash" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
        >
          <div
            className={`rounded-full p-4 ${paymentMethod === "cash" ? "bg-primary/10" : "bg-secondary"}`}
          >
            <IoCash
              className={`h-8 w-8 ${paymentMethod === "cash" ? "text-primary" : "text-muted-foreground"}`}
            />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Efectivo</h3>
          <p className="text-xs text-muted-foreground mt-1">Paga al mesero</p>
        </button>

        <button
          onClick={handleSelectCard}
          className={`flex flex-col items-center rounded-xl border-2 p-6 transition-all ${paymentMethod === "card" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
        >
          <div
            className={`rounded-full p-4 ${paymentMethod === "card" ? "bg-primary/10" : "bg-secondary"}`}
          >
            <IoCard
              className={`h-8 w-8 ${paymentMethod === "card" ? "text-primary" : "text-muted-foreground"}`}
            />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Tarjeta</h3>
          <p className="text-xs text-muted-foreground mt-1">Pago digital</p>
        </button>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Resumen de la orden</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Estado</span>
              <span className="font-medium">{order.status}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tipo</span>
              <span>{order.type}</span>
            </div>
            {order.notes && (
              <div className="flex justify-between text-sm">
                <span>Notas</span>
                <span className="italic">{order.notes}</span>
              </div>
            )}
          </div>
          <hr className="my-4 border-border" />
          <div className="flex justify-between pt-2">
            <span className="font-semibold">Total</span>
            <span className="text-xl font-bold text-primary">
              ${total.toFixed(2)}
            </span>
          </div>
        </CardContent>
      </Card>

      {paymentMethod === "cash" && (
        <Button
          fullWidth
          size="lg"
          className="mt-6"
          onClick={handleConfirmCash}
          isLoading={isProcessing}
        >
          Confirmar Pago en Efectivo
        </Button>
      )}

      {paymentMethod === "card" && (
        <Button
          fullWidth
          size="lg"
          className="mt-6"
          onClick={handleConfirmCard}
          isLoading={isProcessing}
        >
          Pagar ${total.toFixed(2)} con Tarjeta
        </Button>
      )}
    </div>
  );
}

export default function PaymentFlow() {
  return (
    <ApolloWrapper>
      <PaymentFlowContent />
    </ApolloWrapper>
  );
}
