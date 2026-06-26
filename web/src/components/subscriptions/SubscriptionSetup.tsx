import { useState } from "react";
import { useSearchParams } from "../../libs/useSearchParams";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../custom/Button";
import { Input } from "../custom/Input";
import { Card, CardContent, CardHeader } from "../custom/Card";
import { addToast } from "../custom/Toast";
import { getApolloClient } from "../../libs/apollo";
import { gql } from "@apollo/client";
import { ImageUploader } from "../upload/ImageUploader";

const CREATE_RESTAURANT = gql`
  mutation createRestaurant($input: CreateRestaurantInput!) {
    createRestaurant(input: $input) {
      id
      name
    }
  }
`;

const CREATE_EMPLOYEE = gql`
  mutation createEmployee($input: CreateEmployeeInput!) {
    createEmployee(input: $input) {
      id
      name
    }
  }
`;

export default function SubscriptionSetup() {
  const params = useSearchParams();
  const planId = params.get("planId") || "";
  const { user } = useAuth();

  const [step, setStep] = useState<"restaurant" | "manager">("restaurant");
  const [loading, setLoading] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurant, setRestaurant] = useState({
    name: "",
    address: "",
    email: "",
    phone: "",
    description: "",
    hours: "",
    image: "",
  });
  const [manager, setManager] = useState({
    name: "",
    email: "",
    password: "",
  });

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Inicia sesión para continuar</h1>
        <a href="/login" className="inline-block mt-4">
          <Button>Iniciar Sesión</Button>
        </a>
      </div>
    );
  }

  const handleCreateRestaurant = async () => {
    if (!restaurant.name || !restaurant.address || !restaurant.email || !restaurant.phone) {
      addToast("Completa todos los campos obligatorios del restaurante", "error");
      return;
    }
    setLoading(true);
    try {
      const client = getApolloClient();
      const { data } = await client.mutate({
        mutation: CREATE_RESTAURANT,
        variables: {
          input: {
            name: restaurant.name,
            address: restaurant.address,
            email: restaurant.email,
            phone: restaurant.phone,
            description: restaurant.description || "Restaurante en Suavus",
            hours: restaurant.hours || "Lunes a Domingo 10:00-22:00",
            image: restaurant.image || undefined,
          },
        },
      });
      const restId = data.createRestaurant.id;
      setRestaurantId(restId);
      addToast("Restaurante creado", "success");
      setStep("manager");
    } catch (err: unknown) {
      const apolloErr = err as { graphQLErrors?: Array<{ message?: string }>; message?: string };
      addToast(apolloErr.message || "Error al crear restaurante", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateManager = async () => {
    if (!restaurantId) {
      addToast("Primero crea el restaurante", "error");
      return;
    }
    if (!manager.name || !manager.email || !manager.password) {
      addToast("Todos los campos del gerente son obligatorios", "error");
      return;
    }
    setLoading(true);
    try {
      const client = getApolloClient();

      await client.mutate({
        mutation: CREATE_EMPLOYEE,
        variables: {
          input: {
            restaurantId: parseInt(restaurantId),
            name: manager.name,
            email: manager.email,
            password: manager.password,
            role: "admin",
            position: "Gerente",
          },
        },
      });
      addToast("Gerente creado exitosamente", "success");
      window.location.href = `/subscribe/pay?restaurantId=${restaurantId}&planId=${planId}`;
    } catch (err: unknown) {
      const apolloErr = err as { graphQLErrors?: Array<{ message?: string }>; message?: string };
      addToast(apolloErr.message || "Error al crear gerente", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">Configura tu Restaurante</h1>
        <p className="mt-2 text-muted-foreground">
          {step === "restaurant"
            ? "Cuéntanos sobre tu restaurante"
            : "Ahora crea un gerente para administrarlo"}
        </p>
      </div>

      {step === "restaurant" && (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Información del Restaurante</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Nombre del restaurante *"
              placeholder="Ej: La Casa de la Abuela"
              value={restaurant.name}
              onChange={(e) => setRestaurant({ ...restaurant, name: e.target.value })}
            />
            <Input
              label="Dirección"
              placeholder="Calle y número"
              value={restaurant.address}
              onChange={(e) => setRestaurant({ ...restaurant, address: e.target.value })}
            />
            <Input
              label="Correo electrónico"
              placeholder="contacto@restaurante.com"
              value={restaurant.email}
              onChange={(e) => setRestaurant({ ...restaurant, email: e.target.value })}
            />
            <Input
              label="Teléfono"
              placeholder="+52 555 123 4567"
              value={restaurant.phone}
              onChange={(e) => setRestaurant({ ...restaurant, phone: e.target.value })}
            />
            <Input
              label="Horario"
              placeholder="Lunes a Domingo 10:00-22:00"
              value={restaurant.hours}
              onChange={(e) => setRestaurant({ ...restaurant, hours: e.target.value })}
            />
            <div>
              <label className="text-sm font-medium">Descripción</label>
              <textarea
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                rows={3}
                placeholder="Breve descripción de tu restaurante"
                value={restaurant.description}
                onChange={(e) => setRestaurant({ ...restaurant, description: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Logo / Imagen</label>
              <ImageUploader
                onUpload={(url: string) => setRestaurant({ ...restaurant, image: url })}
              />
            </div>
            <Button
              className="w-full"
              size="lg"
              onClick={handleCreateRestaurant}
              isLoading={loading}
            >
              Continuar
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "manager" && (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Crear Gerente</h2>
            <p className="text-sm text-muted-foreground">
              Esta persona podrá administrar el restaurante
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Nombre completo *"
              placeholder="Nombre del gerente"
              value={manager.name}
              onChange={(e) => setManager({ ...manager, name: e.target.value })}
            />
            <Input
              label="Correo electrónico *"
              type="email"
              placeholder="gerente@restaurante.com"
              value={manager.email}
              onChange={(e) => setManager({ ...manager, email: e.target.value })}
            />
            <Input
              label="Contraseña *"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={manager.password}
              onChange={(e) => setManager({ ...manager, password: e.target.value })}
            />
            <Button
              className="w-full"
              size="lg"
              onClick={handleCreateManager}
              isLoading={loading}
            >
              Crear y continuar al pago
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
