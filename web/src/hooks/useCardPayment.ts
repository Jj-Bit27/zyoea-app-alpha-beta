import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useCreatePayment } from "./usePayments";
import { useUpdateOrderPayment } from "./useOrders";
import { addToast } from "../components/custom/Toast";
import { STRIPE_PUBLIC_KEY } from "../config";
import { formatCardNumber, formatExpiry, extractGraphQLError } from "../libs/formatters";

export function useCardPayment(orderId: string, total: number) {
  const { user } = useAuth();
  const { createPayment } = useCreatePayment();
  const { updatePayment } = useUpdateOrderPayment();

  const [cardNumber, setCardNumberRaw] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiryRaw] = useState("");
  const [cvv, setCvv] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setCardNumber = (v: string) => setCardNumberRaw(formatCardNumber(v));
  const setExpiry = (v: string) => setExpiryRaw(formatExpiry(v));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!cardNumber || cardNumber.replace(/\s/g, "").length < 16)
      e.cardNumber = "Ingresa un número válido";
    if (!cardName.trim()) e.cardName = "Ingresa el nombre del titular";
    if (!expiry || expiry.length < 5) e.expiry = "Ingresa una fecha válida";
    if (!cvv || cvv.length < 3) e.cvv = "Ingresa el CVV";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePay = async (): Promise<boolean> => {
    if (!validate() || !user || !orderId) return false;
    setIsProcessing(true);
    try {
      let paymentMethodId = "pm_mock_" + Math.floor(Math.random() * 10000);

      if (STRIPE_PUBLIC_KEY) {
        const { loadStripe } = await import("@stripe/stripe-js");
        const stripe = await loadStripe(STRIPE_PUBLIC_KEY);
        if (stripe) {
          const { error, paymentMethod } = await stripe.createPaymentMethod({
            type: "card",
            card: {
              number: cardNumber.replace(/\s/g, ""),
              exp_month: parseInt(expiry.split("/")[0]),
              exp_year: parseInt("20" + expiry.split("/")[1]),
              cvc: cvv,
            },
            billing_details: { name: cardName },
          });
          if (error) {
            addToast(error.message || "Error con la tarjeta", "error");
            setIsProcessing(false);
            return false;
          }
          paymentMethodId = paymentMethod.id;
        }
      }

      await createPayment({
        userId: user.id.toString(),
        amount: total,
        currency: "MXN",
        paymentMethodId,
        description: `Pago con tarjeta - Orden #${orderId}`,
        orderId: parseInt(orderId),
      });
      await updatePayment(orderId, true);
      setIsComplete(true);
      addToast("Pago procesado exitosamente", "success");
      return true;
    } catch (err: unknown) {
      addToast(extractGraphQLError(err), "error");
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    cardNumber,
    setCardNumber,
    cardName,
    setCardName,
    expiry,
    setExpiry,
    cvv,
    setCvv: (v: string) => setCvv(v.replace(/\D/g, "")),
    errors,
    isProcessing,
    isComplete,
    validate,
    handlePay,
    reset: () => {
      setCardNumberRaw("");
      setCardName("");
      setExpiryRaw("");
      setCvv("");
      setErrors({});
      setIsProcessing(false);
      setIsComplete(false);
    },
  };
}
