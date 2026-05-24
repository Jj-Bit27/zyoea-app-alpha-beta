import { useState } from "react";
import { ApolloWrapper } from "../ApolloWrapper";
import { Button } from "../custom/Button";
import { Spinner } from "../custom/Spinner";
import { addToast } from "../custom/Toast";
import { useRestaurants } from "../../hooks/useRestaurants";
import { useTables } from "../../hooks/useTables";

interface TableSelectorProps {
  onSelect: (tableId: number, tableNumber: number, restaurantId: number, restaurantName: string) => void;
}

function TableSelectorContent({ onSelect }: TableSelectorProps) {
  const [selectedRestaurant, setSelectedRestaurant] = useState("");
  const [selectedTable, setSelectedTable] = useState("");

  const { restaurants, loading: restLoading } = useRestaurants();
  const { tables, loading: tableLoading } = useTables(selectedRestaurant);

  const availableTables = tables.filter(
    (t: any) => t.status === "available" || t.status === "disponible",
  );

  const handleConfirm = () => {
    if (!selectedRestaurant || !selectedTable) {
      addToast("Selecciona un restaurante y una mesa", "error");
      return;
    }
    const rest = restaurants.find((r: any) => r.id === selectedRestaurant);
    const table = tables.find((t: any) => t.id === selectedTable);
    if (rest && table) {
      localStorage.setItem(
        "Frugis_table",
        JSON.stringify({
          tableId: parseInt(selectedTable),
          tableNumber: table.number,
          restaurantId: parseInt(selectedRestaurant),
          restaurantName: rest.name,
        }),
      );
      onSelect(parseInt(selectedTable), table.number, parseInt(selectedRestaurant), rest.name);
      addToast(`Mesa ${table.number} seleccionada`, "success");
    }
  };

  if (restLoading) {
    return <div className="flex items-center justify-center h-32"><Spinner size="md" /></div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Restaurante</label>
        <select
          value={selectedRestaurant}
          onChange={(e) => { setSelectedRestaurant(e.target.value); setSelectedTable(""); }}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Selecciona un restaurante</option>
          {restaurants.map((r: any) => (
            <option key={r.id} value={r.id}>{r.name} — {r.address || ""}</option>
          ))}
        </select>
      </div>

      {selectedRestaurant && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Mesa</label>
          {tableLoading ? (
            <div className="flex items-center justify-center h-20"><Spinner size="sm" /></div>
          ) : availableTables.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-4 text-center">No hay mesas disponibles</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {availableTables.map((t: any) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTable(t.id)}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    selectedTable === t.id
                      ? "border-primary bg-primary/10 text-primary font-semibold ring-2 ring-primary/30"
                      : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-accent"
                  }`}
                >
                  <div className="text-lg font-bold">{t.number}</div>
                  <div className="text-xs text-muted-foreground">{t.capacity} pers.</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedRestaurant && selectedTable && (
        <Button onClick={handleConfirm} className="w-full">Confirmar mesa</Button>
      )}
    </div>
  );
}

export function TableSelector(props: TableSelectorProps) {
  return (
    <ApolloWrapper>
      <TableSelectorContent {...props} />
    </ApolloWrapper>
  );
}

export function getSavedTable(): { tableId: number; tableNumber: number; restaurantId: number; restaurantName: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem("Frugis_table");
    return stored ? JSON.parse(stored) : null;
  } catch { return null; }
}

export function clearSavedTable() {
  if (typeof window !== "undefined") localStorage.removeItem("Frugis_table");
}
