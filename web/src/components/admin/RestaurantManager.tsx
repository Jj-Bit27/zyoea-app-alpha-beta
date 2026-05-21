import { useState } from "react";
import { FiPlus, FiSearch, FiEdit2, FiTrash2 } from "react-icons/fi";
import { Button } from "../custom/Button";
import { Input } from "../custom/Input";
import { Card, CardContent } from "../custom/Card";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "../custom/Modal";
import { Spinner } from "../custom/Spinner";
import { addToast } from "../custom/Toast";
import { useRestaurants } from "../../hooks/useRestaurants";
import { ApolloWrapper } from "../ApolloWrapper";

function RestaurantsManagerContent() {
  const { restaurants, loading, error, createRestaurant, deleteRestaurant } = useRestaurants();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "", address: "", email: "", phone: "", description: "", image: "", hours: "",
  });

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (error) return <div className="p-6 bg-destructive/10 text-destructive rounded-lg">{error.message}</div>;

  const filteredRestaurants = restaurants.filter((r: any) =>
    r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = () => {
    if (!formData.name || !formData.email) {
      addToast("Nombre y Email son obligatorios", "error");
      return;
    }
    createRestaurant({
      name: formData.name,
      address: formData.address,
      email: formData.email,
      phone: formData.phone,
      description: formData.description,
      image: formData.image || null,
      hours: formData.hours,
    });
    setFormData({ name: "", address: "", email: "", phone: "", description: "", image: "", hours: "" });
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Restaurantes</h1>
          <p className="text-muted-foreground">Gestiona los restaurantes de la plataforma</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <FiPlus size={18} />
          Registrar Restaurante
        </Button>
      </div>

      {/* Filtros */}
      <div className="relative max-w-md">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <Input
          placeholder="Buscar por nombre o email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Grid de Restaurantes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRestaurants.map((rest: any) => (
          <Card key={rest.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center text-primary font-bold text-xl">
                  {rest.name?.charAt(0)}
                </div>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">{rest.name}</h3>
              <p className="text-sm text-muted-foreground mb-2">{rest.email}</p>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{rest.description}</p>
              <div className="space-y-1 text-sm border-t border-border pt-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dirección:</span>
                  <span className="text-right max-w-[60%] truncate">{rest.address}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Teléfono:</span>
                  <span>{rest.phone}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-4 pt-2">
                <a href={`/admin/restaurants/${rest.id}`} className="flex-1">
                  <Button variant="outline" className="w-full" size="sm">
                    <FiEdit2 className="mr-2 h-4 w-4" /> Ver detalles
                  </Button>
                </a>
                <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => deleteRestaurant(rest.id)}>
                  <FiTrash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRestaurants.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">No se encontraron restaurantes.</div>
      )}

      {/* Modal Crear */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <ModalHeader onClose={() => setIsModalOpen(false)}>Nuevo Restaurante</ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <Input label="Nombre" placeholder="Nombre del restaurante" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            <Input label="Email" type="email" placeholder="correo@restaurante.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            <Input label="Teléfono" placeholder="+52 555 000 0000" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            <Input label="Dirección" placeholder="Dirección completa" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
            <Input label="Descripción" placeholder="Breve descripción" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            <Input label="Horario" placeholder="Lun-Dom 12:00-22:00" value={formData.hours} onChange={(e) => setFormData({ ...formData, hours: e.target.value })} />
            <Input label="URL imagen (opcional)" placeholder="https://..." value={formData.image} onChange={(e) => setFormData({ ...formData, image: e.target.value })} />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Guardar</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

export function RestaurantsManager() {
  return (
    <ApolloWrapper>
      <RestaurantsManagerContent />
    </ApolloWrapper>
  );
}
