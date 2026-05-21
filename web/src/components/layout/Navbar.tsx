import { useState } from "react";
import {
  IoMenu,
  IoClose,
  IoRestaurant,
  IoReceipt,
  IoCalendar,
  IoCart,
  IoPerson,
  IoLogOut,
  IoHome,
} from "react-icons/io5";
import { useAuth } from "../../context/AuthContext";
import { useOrder } from "../../context/OrderContext";
import { ThemeToggle } from "../custom/ThemeToggle";
import { Button } from "../custom/Button";
import { Avatar } from "../custom/Avatar";

const userNavLinks = [
  { href: "/restaurants", label: "Restaurantes", icon: IoRestaurant },
  { href: "/bookings", label: "Reservas", icon: IoCalendar },
  { href: "/tickets", label: "Tickets", icon: IoReceipt },
  { href: "/my-orders", label: "Mis Órdenes", icon: IoCart },
];

interface NavbarProps {
  currentPath?: string;
}

export function Navbar({ currentPath = "" }: NavbarProps) {
  const { user, logout } = useAuth();
  const { itemCount } = useOrder();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Lógica de enlace activo basada en la prop que recibimos de Astro
  const isActive = (href: string) => {
    if (href === "/") return currentPath === "/";
    return currentPath.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2">
          <IoRestaurant className="h-7 w-7 text-primary" />
          <span className="text-xl font-bold text-foreground">Frugis</span>
        </a>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {user ? (
            <>
              {user.role === "client" &&
                userNavLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive(link.href)
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    <link.icon className="h-4 w-4" />
                    {link.label}
                  </a>
                ))}
            </>
          ) : (
            <a
              href="/restaurants"
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive("/restaurants")
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <IoRestaurant className="h-4 w-4" />
              Restaurantes
            </a>
          )}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {user?.role === "client" && (
            <a
              href="/order"
              className="relative flex h-10 w-10 items-center justify-center rounded-lg text-foreground hover:bg-secondary transition-colors"
            >
              <IoCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground animate-in zoom-in">
                  {itemCount}
                </span>
              )}
            </a>
          )}

          {user ? (
            <div className="relative hidden md:block">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-secondary transition-colors"
              >
                {/* Usamos la prop name para generar iniciales automáticas */}
                <Avatar size="sm" name={user.name} />
                <span className="text-sm font-medium text-foreground">
                  {user.name}
                </span>
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-border bg-card py-1 shadow-lg animate-in fade-in slide-in-from-top-2">
                  <a
                    href="/profile"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-secondary"
                  >
                    <IoPerson className="h-4 w-4" />
                    Mi Perfil
                  </a>
                  {(user.role === "admin" || user.role === "staff") && (
                    <a
                      href="/staff"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-secondary"
                    >
                      <IoHome className="h-4 w-4" />
                      Panel Staff
                    </a>
                  )}
                  {user.role === "superadmin" && (
                    <a
                      href="/admin"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-secondary"
                    >
                      <IoHome className="h-4 w-4" />
                      Panel Admin
                    </a>
                  )}
                  <hr className="my-1 border-border" />
                  <button
                    onClick={() => {
                      logout();
                      setIsProfileOpen(false);
                      // Redirigir al home tras logout si se desea
                      window.location.href = "/";
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-secondary"
                  >
                    <IoLogOut className="h-4 w-4" />
                    Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <a href="/login">
                <Button variant="ghost" size="sm">
                  Iniciar Sesión
                </Button>
              </a>
              <a href="/register">
                <Button size="sm">Registrarse</Button>
              </a>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-foreground hover:bg-secondary transition-colors md:hidden"
          >
            {isMenuOpen ? (
              <IoClose className="h-6 w-6" />
            ) : (
              <IoMenu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="border-t border-border bg-background px-4 py-4 md:hidden animate-in slide-in-from-top-5">
          <nav className="flex flex-col gap-1">
            {user ? (
              <>
                {user.role === "client" &&
                  userNavLinks.map((link) => (
                    <span key={link.href}>
                      <a
                        href={link.href}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          isActive(link.href)
                            ? "bg-secondary text-foreground"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        }`}
                      >
                        <link.icon className="h-4 w-4" />
                        {link.label}
                      </a>
                      <hr className="my-2 border-border" />
                    </span>
                  ))}
                <a
                  href="/profile"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <IoPerson className="h-5 w-5" />
                  Mi Perfil
                </a>
                <hr className="my-2 border-border" />
                {(user.role === "admin" || user.role === "staff") && (
                  <>
                    <a
                      href="/staff"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                      <IoHome className="h-5 w-5" />
                      Panel Staff
                    </a>
                    <hr className="my-2 border-border" />
                  </>
                )}
                {user.role === "superadmin" && (
                  <>
                    <a
                      href="/admin"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                      <IoHome className="h-5 w-5" />
                      Panel Admin
                    </a>
                    <hr className="my-2 border-border" />
                  </>
                )}
                <button
                  onClick={() => {
                    logout();
                    setIsMenuOpen(false);
                    window.location.href = "/";
                  }}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-secondary"
                >
                  <IoLogOut className="h-5 w-5" />
                  Cerrar Sesión
                </button>
              </>
            ) : (
              <>
                <a
                  href="/restaurants"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <IoRestaurant className="h-5 w-5" />
                  Restaurantes
                </a>
                <hr className="my-2 border-border" />
                <a
                  href="/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-center rounded-lg bg-secondary px-3 py-2.5 text-sm font-medium text-foreground"
                >
                  Iniciar Sesión
                </a>
                <a
                  href="/register"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-center rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground"
                >
                  Registrarse
                </a>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
