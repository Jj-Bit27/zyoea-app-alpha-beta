import {
  IoRestaurant,
  IoLogoGithub,
  IoLogoTwitter,
  IoLogoInstagram,
} from "react-icons/io5";
import { useAuth } from "../../context/AuthContext";

export function Footer() {
  const { user, logout } = useAuth();
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className={`grid gap-6 md:gap-8 ${user ? "md:grid-cols-3" : "md:grid-cols-4"}`}>
          {/* Brand */}
          <div className="md:col-span-1">
            <a href="/" className="flex items-center gap-2">
              <IoRestaurant className="h-7 w-7 text-primary" />
              <span className="text-xl font-bold text-foreground">Suavus</span>
            </a>
            <p className="mt-3 text-sm text-muted-foreground">
              La mejor plataforma para descubrir restaurantes y disfrutar de
              experiencias gastronómicas únicas.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-foreground">Explorar</h4>
            <ul className="mt-3 space-y-2">
              <li>
                <a
                  href="/restaurantes"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Restaurantes
                </a>
              </li>
              <li>
                <a
                  href="/reservas"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Reservaciones
                </a>
              </li>
            </ul>
          </div>

          {user && (
            <div>
              <h4 className="font-semibold text-foreground">Cuenta</h4>
              <ul className="mt-3 space-y-2">
                <li>
                  <a
                    href="/login"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Iniciar Sesión
                  </a>
                </li>
                <li>
                  <a
                    href="/registro"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Registrarse
                  </a>
                </li>
              </ul>
            </div>
          )}

          <div>
            <h4 className="font-semibold text-foreground">Legal</h4>
            <ul className="mt-3 space-y-2">
              <li>
                <a
                  href="/legal/terms-users"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Términos de Servicio del Usuario
                </a>
              </li>
                            <li>
                <a
                  href="/legal/terms-restaurants"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Términos de Servicio del Restaurante
                </a>
              </li>
              <li>
                <a
                  href="/legal/privacy"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Política de Privacidad
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 md:flex-row">
          <p className="text-sm text-muted-foreground">
            © 2026 Suavus. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="#"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <IoLogoTwitter className="h-5 w-5" />
            </a>
            <a
              href="#"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <IoLogoInstagram className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
