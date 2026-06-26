import React, { useState } from "react";
import {
  FiMenu,
  FiX,
  FiHome,
  FiShoppingBag,
  FiLogOut,
  FiChevronLeft,
  FiCreditCard,
} from "react-icons/fi";
import { ThemeToggle } from "../custom/ThemeToggle";
import { MdOutlineSecurity } from "react-icons/md";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: <FiHome size={20} /> },
  {
    label: "Restaurantes",
    href: "/admin/restaurants",
    icon: <FiShoppingBag size={20} />,
  },
  {
    label: "Suscripciones",
    href: "/admin/subscriptions",
    icon: <FiCreditCard size={20} />,
  },
];

interface AdminSidebarProps {
  currentPath: string;
}

export function AdminSidebar({ currentPath }: AdminSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Función auxiliar para determinar si un link está activo
  const isLinkActive = (href: string) => {
    if (href === "/admin") {
      return currentPath === "/admin";
    }
    return currentPath.startsWith(href);
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 bg-card rounded-lg shadow-md lg:hidden"
        aria-label="Abrir menú"
      >
        <FiMenu size={24} />
      </button>

      {/* Overlay para móvil */}
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
              <a href="/admin" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-sm">
                    <MdOutlineSecurity size={24} />
                  </span>
                </div>
                <span className="font-semibold text-foreground">
                  SuperAdmin
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
            {navItems.map((item) => {
              const isActive = isLinkActive(item.href);
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
              {/* ThemeToggle ya es una isla de React, funciona perfecto aquí dentro */}
              <ThemeToggle />
            </div>
            <a
              href="/"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ${
                isCollapsed ? "justify-center" : ""
              }
              `}
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
