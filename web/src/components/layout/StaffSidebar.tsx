import React, { useState } from "react";
import {
  FiMenu,
  FiX,
  FiHome,
  FiUsers,
  FiGrid,
  FiPackage,
  FiCalendar,
  FiLayout,
  FiCreditCard,
  FiSettings,
  FiLogOut,
  FiChevronLeft,
  FiShoppingBag,
} from "react-icons/fi";
import { ThemeToggle } from "../custom/ThemeToggle";
import { useAuth } from "../../context/AuthContext";
import { MdOutlineSecurity } from "react-icons/md";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/staff", icon: <FiHome size={20} /> },
  {
    label: "Empleados",
    href: "/staff/employees",
    icon: <FiUsers size={20} />,
    adminOnly: true,
  },
  {
    label: "Categorías",
    href: "/staff/categories",
    icon: <FiGrid size={20} />,
  },
  {
    label: "Productos",
    href: "/staff/products",
    icon: <FiPackage size={20} />,
  },
  {
    label: "Reservas",
    href: "/staff/bookings",
    icon: <FiCalendar size={20} />,
  },
  {
    label: "Órdenes",
    href: "/staff/orders",
    icon: <FiShoppingBag size={20} />,
  },
  { label: "Mesas", href: "/staff/tables", icon: <FiLayout size={20} /> },
  { label: "Pagos", href: "/staff/payments", icon: <FiCreditCard size={20} /> },
  {
    label: "Configuración",
    href: "/staff/settings",
    icon: <FiSettings size={20} />,
    adminOnly: true,
  },
];

interface StaffSidebarProps {
  currentPath: string;
}

export function StaffSidebar({ currentPath }: StaffSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user } = useAuth();

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  const filteredNavItems = navItems.filter(
    (item) => !item.adminOnly || isAdmin,
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 bg-card rounded-lg shadow-md lg:hidden cursor-pointer"
        aria-label="Abrir menú"
      >
        <FiMenu size={24} />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full bg-card border-r border-border z-50
          transform transition-all duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:static
          ${isCollapsed ? "w-20" : "w-64"}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            {!isCollapsed && (
              <a href="/staff" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-sm">
                    <MdOutlineSecurity size={24} />
                  </span>
                </div>
                <span className="font-semibold text-foreground">
                  Staff Panel
                </span>
              </a>
            )}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-muted rounded-lg lg:hidden"
              aria-label="Cerrar menú"
            >
              <FiX size={20} />
            </button>
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`hidden lg:flex p-2 hover:bg-muted rounded-lg transition-transform ${
                isCollapsed ? "rotate-180" : ""
              }`}
              aria-label={isCollapsed ? "Expandir" : "Colapsar"}
            >
              <FiChevronLeft size={20} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {filteredNavItems.map((item) => {
              const isActive =
                item.href === "/staff"
                  ? currentPath === "/staff"
                  : currentPath.startsWith(item.href);

              return (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                    ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }
                    ${isCollapsed ? "justify-center" : ""}
                  `}
                  title={isCollapsed ? item.label : undefined}
                >
                  {item.icon}
                  {!isCollapsed && <span>{item.label}</span>}
                </a>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-border space-y-2">
            <div
              className={`flex ${isCollapsed ? "justify-center" : "justify-between"} items-center`}
            >
              {!isCollapsed && (
                <span className="text-sm text-muted-foreground">Tema</span>
              )}
              <ThemeToggle />
            </div>
            <a
              href="/"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ${
                isCollapsed ? "justify-center" : ""
              }`}
              title={isCollapsed ? "Volver al sitio" : undefined}
            >
              <FiLogOut size={20} />
              {!isCollapsed && <span>Volver al sitio</span>}
            </a>
          </div>
        </div>
      </aside>
    </>
  );
}
