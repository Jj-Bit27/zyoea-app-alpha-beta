import { useSearchParams } from "../../libs/useSearchParams";
import { Button } from "../custom/Button";
import { Card, CardContent } from "../custom/Card";
import { IoCheckmarkCircle, IoRestaurant, IoArrowForward } from "react-icons/io5";

export default function SubscriptionSuccess() {
  const params = useSearchParams();
  const restaurantId = params.get("restaurantId") || "";

  return (
    <div className="mx-auto max-w-lg px-4 py-20">
      <Card>
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <IoCheckmarkCircle className="h-14 w-14 text-green-600 dark:text-green-400" />
          </div>

          <h1 className="text-3xl font-bold">¡Bienvenido a Suavus!</h1>
          <p className="mt-4 text-muted-foreground text-lg">
            Tu restaurante ha sido creado y la suscripción está activa.
          </p>

          <div className="mt-8 rounded-lg bg-secondary/50 p-4">
            <div className="flex items-center justify-center gap-3">
              <IoRestaurant className="h-6 w-6 text-primary" />
              <span className="font-semibold">Restaurante #{restaurantId}</span>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <p className="text-sm text-muted-foreground">
              Ahora puedes agregar tu menú, configurar mesas, y administrar tu personal.
            </p>
            <a href="/login">
              <Button size="lg" className="w-full">
                Ir al panel de administración <IoArrowForward className="ml-2" />
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
