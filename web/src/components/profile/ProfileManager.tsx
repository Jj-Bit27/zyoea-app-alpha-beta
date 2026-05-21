import { useAuth } from "../../context/AuthContext";
import { Button } from "../custom/Button";
import { Input } from "../custom/Input";
import { Avatar } from "../custom/Avatar";
import { FiLogOut, FiSettings } from "react-icons/fi";

export function UserProfile() {
  const { user, logout } = useAuth();

  if (!user) {
    if (typeof window !== "undefined") window.location.href = "/login";
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center gap-6 p-6 bg-card rounded-xl border border-border shadow-sm">
        <Avatar name={user.name} size="xl" className="h-24 w-24 text-2xl" />
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-foreground">{user.name}</h2>
          <p className="text-muted-foreground">{user.email}</p>
          <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">
            {user.role}
          </div>
        </div>
        {/**
        <Button variant="outline" size="icon" title="Configuración">
          <FiSettings />
        </Button>
         */}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold">Mis Datos</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Nombre" defaultValue={user.name} disabled readOnly />
          <Input label="Email" defaultValue={user.email} disabled readOnly />
        </div>
      </div>

      <div className="pt-8 border-t border-border">
        <Button
          variant="destructive"
          onClick={logout}
          className="w-full md:w-auto"
        >
          <FiLogOut className="mr-2" /> Cerrar Sesión
        </Button>
      </div>
    </div>
  );
}
