import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useUserAllergies } from "../../hooks/useUserAllergies";
import { useUserProfile } from "../../hooks/useUserProfile";
import { ApolloWrapper } from "../ApolloWrapper";
import { Button } from "../custom/Button";
import { Input } from "../custom/Input";
import { Textarea } from "../custom/Textarea";
import { Avatar } from "../custom/Avatar";
import { addToast } from "../custom/Toast";
import { FiLogOut, FiAlertTriangle, FiTrash2, FiSave } from "react-icons/fi";

const ALLERGEN_OPTIONS = [
  "Gluten",
  "Lactosa",
  "Huevo",
  "Cacahuate",
  "Frutos secos",
  "Soja",
  "Pescado",
  "Mariscos",
  "Apio",
  "Mostaza",
  "Sésamo",
  "Sulfitos",
  "Altramuces",
  "Moluscos",
];

export function UserProfileContent() {
  const { user, logout } = useAuth();
  const {
    allergies: savedAllergies,
    updateAllergies,
    saving,
    deleteAccount,
  } = useUserAllergies(user?.id);
  const { updateUser, saving: savingProfile } = useUserProfile(user?.id);
  const [allergies, setAllergies] = useState("");
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [editName, setEditName] = useState(user?.name || "");
  const [editEmail, setEditEmail] = useState(user?.email || "");

  useEffect(() => {
    if (savedAllergies) {
      setAllergies(savedAllergies);
      setSelectedAllergens(
        savedAllergies
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      );
    }
  }, [savedAllergies]);

  const toggleAllergen = (allergen: string) => {
    setSelectedAllergens((prev) => {
      const next = prev.includes(allergen)
        ? prev.filter((a) => a !== allergen)
        : [...prev, allergen];
      const str = next.join(", ");
      setAllergies(str);
      return next;
    });
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    if (!editName.trim() || !editEmail.trim()) {
      addToast("Nombre y email son requeridos", "error");
      return;
    }
    try {
      const result = await updateUser(editName.trim(), editEmail.trim());
      if (result) {
        user.name = result.name;
        user.email = result.email;
        localStorage.setItem("Suavus_user", JSON.stringify(user));
        addToast("Perfil actualizado", "success");
      }
    } catch {
      addToast("Error al actualizar perfil", "error");
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    try {
      const result = await updateAllergies(allergies);
      if (result?.allergies !== undefined) {
        user.allergies = result.allergies;
        localStorage.setItem("Suavus_user", JSON.stringify(user));
      }
      addToast("Alergias guardadas correctamente", "success");
    } catch {
      addToast("Error al guardar alergias", "error");
    }
  };

  if (!user) {
    if (typeof window !== "undefined") window.location.href = "/login";
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center gap-6 p-6 bg-card rounded-xl border border-border shadow-sm">
        <Avatar name={user.name} size="xl" className="h-20 w-20 sm:h-24 sm:w-24 text-xl sm:text-2xl" />
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-foreground">{user.name}</h2>
          <p className="text-muted-foreground">{user.email}</p>
          <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">
            {user.role}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold">Mis Datos</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Nombre"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
          <Input
            label="Email"
            type="email"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
          />
        </div>
        <Button onClick={handleSaveProfile} disabled={savingProfile}>
          <FiSave className="mr-1" /> {savingProfile ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>

      <div className="space-y-4 p-6 bg-card rounded-xl border border-border">
        <div className="flex items-center gap-2">
          <FiAlertTriangle className="text-amber-500" size={20} />
          <h3 className="text-lg font-bold">Mis Alergias e Intolerancias</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Selecciona los ingredientes o alérgenos a los que eres alérgico. Esta
          información se usará para advertirte en el menú del restaurante.
        </p>
        <div className="flex flex-wrap gap-2">
          {ALLERGEN_OPTIONS.map((allergen) => (
            <button
              key={allergen}
              type="button"
              onClick={() => toggleAllergen(allergen)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                selectedAllergens.includes(allergen)
                  ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300"
                  : "bg-background text-muted-foreground border-border hover:bg-accent"
              }`}
            >
              {allergen}
            </button>
          ))}
        </div>
        <Textarea
          label="O escribe manualmente otros alérgenos (separados por coma)"
          value={allergies}
          onChange={(e) => {
            setAllergies(e.target.value);
            setSelectedAllergens(
              e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            );
          }}
          placeholder="Ej: gluten, lactosa, cacahuate"
          rows={2}
        />
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Guardando..." : "Guardar mis alergias"}
        </Button>
      </div>

      <div className="pt-8 border-t border-border space-y-4">
        <Button
          variant="destructive"
          onClick={logout}
          className="w-full md:w-auto"
        >
          <FiLogOut className="mr-2" /> Cerrar Sesión
        </Button>

        <div className="pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground mb-3">
            Eliminarás permanentemente tu cuenta y todos tus datos.
          </p>
          <Button
            variant="destructive"
            className="w-full md:w-auto bg-destructive/80 hover:bg-destructive"
            onClick={async () => {
              if (!confirm("¿Estás seguro de eliminar tu cuenta? Esta acción no se puede deshacer.")) return;
              if (!confirm("¿Confirmas que deseas eliminar permanentemente tu cuenta y todos tus datos?")) return;
              try {
                await deleteAccount();
                addToast("Cuenta eliminada permanentemente", "info");
                logout();
              } catch {
                addToast("Error al eliminar la cuenta", "error");
              }
            }}
          >
            <FiTrash2 className="mr-2" /> Borrar cuenta
          </Button>
        </div>
      </div>
    </div>
  );
}

export function UserProfile() {
  return (
    <ApolloWrapper>
      <UserProfileContent />
    </ApolloWrapper>
  );
}
