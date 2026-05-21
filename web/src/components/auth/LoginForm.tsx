import { useState } from "react";
import { IoRestaurant, IoLogoGoogle, IoLogoFacebook } from "react-icons/io5";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../custom/Button";
import { Input } from "../custom/Input";
import { Card, CardContent, CardHeader } from "../custom/Card";
import { Spinner } from "../custom/Spinner";

export function LoginForm() {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(formData.email, formData.password);
      // Redirección basada en el rol (la lógica de rol está en el store,
      // pero aquí redirigimos a una ruta segura o al home)

      // Pequeño delay para que el usuario vea el toast de éxito
      setTimeout(() => {
        // Obtenemos el usuario recién logueado del localStorage para decidir a dónde ir
        // (O simplemente mandamos al home y que el middleware decida, pero aquí es front-end puro)
        const user = JSON.parse(localStorage.getItem("Frugis_user") || "{}");

        if (user.role === "superadmin") window.location.href = "/admin";
        else if (user.role === "admin" || user.role === "employee")
          window.location.href = "/staff";
        else window.location.href = "/";
      }, 500);
    } catch (error) {
      // El toast de error ya se maneja en el context
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
            Bienvenido de nuevo
          </h1>
          <p className="text-sm text-muted-foreground">
            Ingresa tus credenciales para acceder a tu cuenta
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
            <div className="space-y-1">
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
              <div className="flex justify-end">
                <a href="#" className="text-xs text-primary hover:underline">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Spinner size="sm" className="mr-2" /> : null}
              {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  O continúa con
                </span>
              </div>
            </div>

            {/*
            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" type="button">
                <IoLogoGoogle className="mr-2 h-4 w-4" />
                Google
              </Button>
              <Button variant="outline" type="button">
                <IoLogoFacebook className="mr-2 h-4 w-4" />
                Facebook
              </Button>
            </div> */}

            <div className="mt-4 text-center text-sm text-muted-foreground">
              ¿No tienes una cuenta?{" "}
              <a
                href="/register"
                className="text-primary hover:underline font-medium"
              >
                Regístrate
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
