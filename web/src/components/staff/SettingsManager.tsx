import { useState, useEffect } from "react";
import { FiSave, FiMapPin, FiPhone, FiMail } from "react-icons/fi";
import { Button } from "../custom/Button";
import { Input } from "../custom/Input";
import { Card, CardContent, CardHeader, CardTitle } from "../custom/Card";
import { Textarea } from "../custom/Textarea";
import { Spinner } from "../custom/Spinner";
import { useRestaurantById } from "../../hooks/useRestaurants";
import { useAuth } from "../../context/AuthContext";
import { ApolloWrapper } from "../ApolloWrapper";
import { RestaurantHoursEditor } from "../restaurant/RestaurantHoursEditor";
import { validarEmail } from "../../libs/ValidateEmail";
import { addToast } from "../custom/Toast";

function ConfigManagerContent() {
  const { user } = useAuth();
  const restaurantId = user?.restaurantId || "";
  const { restaurant, loading, error, updateRestaurant } =
    useRestaurantById(restaurantId);

  const [config, setConfig] = useState({
    name: "",
    description: "",
    image: "",
    address: "",
    phone: "",
    email: "",
    hours: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (restaurant) {
      setConfig({
        name: restaurant.name || "",
        description: restaurant.description || "",
        image: restaurant.image || "",
        address: restaurant.address || "",
        phone: restaurant.phone || "",
        email: restaurant.email || "",
        hours: restaurant.hours || "",
      });
    }
  }, [restaurant]);

  if (!restaurantId)
    return (
      <div className="p-6 bg-muted rounded-lg text-center">
        <p className="text-muted-foreground">
          No hay restaurante asociado a tu cuenta.
        </p>
      </div>
    );

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  if (error)
    return (
      <div className="p-6 bg-destructive/10 text-destructive rounded-lg">
        {error.message}
      </div>
    );

  const handleSave = async () => {
    setIsSaving(true);

    if (!config.name) {
      addToast("El nombre es requerido", "error");
      return;
    }
    if (!config.email || !validarEmail(config.email)) {
      addToast("El correo es invalido o no hay ninguno", "error");
      return;
    }
    if (!config.description) {
      addToast("La descripcion es requerida", "error");
      return;
    }
    if (!config.address) {
      addToast("La direccion es requerida", "error");
      return;
    }
    if (!config.phone) {
      addToast("El telefono es requerido", "error");
      return;
    }
    if (!config.hours) {
      addToast("El horario es requerido", "error");
      return;
    }

    updateRestaurant({
      id: restaurantId,
      name: config.name,
      description: config.description,
      image: config.image || "",
      address: config.address,
      phone: config.phone,
      email: config.email,
      hours: config.hours,
    });
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
          <p className="text-muted-foreground">
            Personaliza la información del restaurante
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          <FiSave size={18} />
          {isSaving ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Información básica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Nombre del restaurante"
              value={config.name}
              onChange={(e) => setConfig({ ...config, name: e.target.value })}
              placeholder="Nombre"
            />
            <Textarea
              label="Descripción"
              value={config.description}
              onChange={(e) =>
                setConfig({ ...config, description: e.target.value })
              }
              placeholder="Descripción"
              rows={3}
            />
            <Input
              label="URL del logo / imagen"
              value={config.image}
              onChange={(e) => setConfig({ ...config, image: e.target.value })}
              placeholder="https://..."
            />
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle>Información de contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <FiMapPin
                className="absolute left-3 top-9 text-muted-foreground"
                size={18}
              />
              <Input
                label="Dirección"
                value={config.address}
                onChange={(e) =>
                  setConfig({ ...config, address: e.target.value })
                }
                placeholder="Dirección completa"
                className="pl-10"
              />
            </div>
            <div className="relative">
              <FiPhone
                className="absolute left-3 top-9 text-muted-foreground"
                size={18}
              />
              <Input
                label="Teléfono"
                value={config.phone}
                onChange={(e) =>
                  setConfig({ ...config, phone: e.target.value })
                }
                placeholder="+52 555 000 0000"
                className="pl-10"
              />
            </div>
            <div className="relative">
              <FiMail
                className="absolute left-3 top-9 text-muted-foreground"
                size={18}
              />
              <Input
                label="Email"
                type="email"
                value={config.email}
                onChange={(e) =>
                  setConfig({ ...config, email: e.target.value })
                }
                placeholder="correo@ejemplo.com"
                className="pl-10"
              />
            </div>
            <RestaurantHoursEditor
              hours={config.hours}
              onChange={(val) => setConfig({ ...config, hours: val })}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function ConfigManager() {
  return (
    <ApolloWrapper>
      <ConfigManagerContent />
    </ApolloWrapper>
  );
}
