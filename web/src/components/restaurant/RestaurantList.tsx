import { useState } from "react";
import { FiSearch, FiStar, FiTrash2, FiPlus } from "react-icons/fi"; // Agregué íconos útiles
import { Input } from "../custom/Input";
import { Button } from "../custom/Button"; // Asumo que tienes este componente
import { Card, CardContent } from "../custom/Card";
import { Badge } from "../custom/Badge"; // Asumo que tienes este componente
import { useRestaurants } from "../../hooks/useRestaurants"; // Importamos el hook PLURAL
import { ApolloWrapper } from "../ApolloWrapper"; // ¡Importante!
import { Spinner } from "../custom/Spinner"; // Componente de carga
import { useAuth } from "../../context/AuthContext";
import type { Restaurant } from "../../types";

const categories = [
  "Todas",
  "Italiana",
  "Hamburguesas",
  "Japonesa",
  "Mexicana",
  "Saludable",
  "Pizza",
];

function RestaurantsListContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const { user } = useAuth();

  // ✅ FORMA CORRECTA: Llamamos al hook directamente al inicio del componente
  // Ya no usamos getsRestaurants(), el hook nos da los datos vivos.
  const { restaurants, loading, error, deleteRestaurant } = useRestaurants();

  // 1. Manejo de estados de carga antes de renderizar nada complejo
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  // 2. Manejo de errores
  if (error) {
    return (
      <div className="p-6 bg-destructive/10 text-destructive rounded-lg text-center">
        Error al cargar: {error.message}
      </div>
    );
  }

  // 3. Lógica de filtrado (Cliente)
  const filtered = restaurants.filter((r: Restaurant) => {
    // Usamos ?. para evitar errores si algún campo viene null del backend
    const matchesSearch = r.name
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());

    // Si tu backend aún no trae categorías, comenta esta línea o asegura que r.category exista
    const matchesCategory = selectedCategory === "Todas"; // || r.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8">
      {/* Cabecera con título y botón de crear (opcional) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Restaurantes Activos</h2>
          <p className="text-muted-foreground">
            Gestiona los locales de la plataforma
          </p>
        </div>
        {/* Este botón podría abrir tu modal de creación */}
        {user?.role === "superadmin" && (
          <Button>
            <FiPlus className="mr-2" /> Nuevo Restaurante
          </Button>
        )}
      </div>

      {/* Buscador y Filtros */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <FiSearch
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={18}
          />
          <Input
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border hover:bg-secondary"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Resultados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((rest: Restaurant) => (
          <div key={rest.id} className="group relative">
            {/* Envolvemos en un div relativo para posicionar botones flotantes si queremos */}
            <a href={`/restaurants/${rest.id}`} className="block h-full">
              <Card className="h-full overflow-hidden hover:shadow-lg transition-all duration-300 border-transparent hover:border-border cursor-pointer">
                <div className="relative aspect-video overflow-hidden bg-muted">
                  <img
                    src={
                      rest.image ||
                      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&q=80"
                    }
                    alt={rest.name}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>

                <CardContent className="p-4">
                  <h3 className="text-lg font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                    {rest.name}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {rest.description || "Sin descripción disponible."}
                  </p>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">
                      {rest.address || "Sin dirección"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </a>

            {/* Botón de Eliminar (Ejemplo de uso de la mutación) */}
            {user?.role === "superadmin" && (
              <button
                onClick={(e) => {
                  e.preventDefault(); // Evita que el click navegue al enlace
                  e.stopPropagation();
                  deleteRestaurant(rest.id); // ¡Aquí usamos la función del hook!
                }}
                className="absolute top-2 left-2 p-2 bg-destructive/90 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive shadow-sm z-10"
                title="Eliminar restaurante"
              >
                <FiTrash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Estado vacío */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed border-muted rounded-xl">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4 text-3xl">
            😢
          </div>
          <h3 className="text-lg font-semibold">No encontramos restaurantes</h3>
          <p className="text-muted-foreground">
            Intenta cambiar los filtros o agrega uno nuevo.
          </p>
          <Button
            onClick={() => {
              setSearchTerm("");
              setSelectedCategory("Todas");
            }}
            className="mt-2"
          >
            Limpiar filtros
          </Button>
        </div>
      )}
    </div>
  );
}

export function RestaurantsList() {
  return (
    <ApolloWrapper>
      <RestaurantsListContent />
    </ApolloWrapper>
  );
}
