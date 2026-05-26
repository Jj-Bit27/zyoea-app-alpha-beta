import { useState } from "react";
import {
  IoRestaurant,
  IoLogoGoogle,
  IoLogoFacebook,
  IoLogoTwitter,
} from "react-icons/io5";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../custom/Button";
import { Input } from "../custom/Input";
import { Card, CardContent, CardHeader } from "../custom/Card";
import { API_URL } from "../../config";
import { Spinner } from "../custom/Spinner";
import { addToast } from "../custom/Toast";
import { validarEmail } from "../../libs/ValidateEmail";

export function RegisterForm() {
  const { register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !validarEmail(formData.email)) {
      addToast("El correo esta mal escrito o no hay correo", "error")
      return;
    }
    if (!formData.password) {
      addToast("La contraseña es obligatoria", "error")
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      addToast("Las contraseñas no coinciden", "error");
      return;
    }

    if (formData.password.length < 6) {
      addToast("La contraseña debe tener al menos 6 caracteres", "error");
      return;
    }

    setIsLoading(true);
    try {
      await register(formData.name, formData.email, formData.password);
      // Redirigir al home tras registro exitoso
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
    } catch (error) {
      // Error manejado en context
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-4">
              <IoRestaurant className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Crear una cuenta
          </h1>
          <p className="text-sm text-muted-foreground">
            Únete a Suavus y comienza a disfrutar
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nombre completo"
              placeholder="Juan Pérez"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
            <Input
              label="Correo electrónico"
              type="email"
              placeholder="nombre@ejemplo.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
            />
            <Input
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
            />
            <Input
              label="Confirmar contraseña"
              type="password"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
              required
            />

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Spinner size="sm" className="mr-2" /> : null}
              {isLoading ? "Creando cuenta..." : "Registrarse"}
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  O regístrate con
                </span>
              </div>
            </div>

            <div className="grid gap-3"> {/* grid-cols-3 */}
              <Button
                variant="outline"
                type="button"
                onClick={() =>
                  (window.location.href = `${API_URL}/auth/google`)
                }
              >
                <IoLogoGoogle className="mr-2 h-4 w-4" />
                Google
              </Button>
              {/*<Button
                variant="outline"
                type="button"
                onClick={() =>
                  (window.location.href = `${API_URL}/auth/facebook`)
                }
              >
                <IoLogoFacebook className="mr-2 h-4 w-4" />
                Facebook
              </Button>
              <Button
                variant="outline"
                type="button"
                onClick={() =>
                  (window.location.href = `${API_URL}/auth/twitter`)
                }
              >
                <IoLogoTwitter className="mr-2 h-4 w-4" />X
              </Button>*/}
            </div>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              ¿Ya tienes una cuenta?{" "}
              <a
                href="/login"
                className="text-primary hover:underline font-medium"
              >
                Inicia Sesión
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
