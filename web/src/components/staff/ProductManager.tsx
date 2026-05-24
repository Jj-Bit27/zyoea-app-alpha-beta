import { useState } from "react";
import { FiPlus, FiEdit2, FiTrash2, FiSearch } from "react-icons/fi";
import { Button } from "../custom/Button";
import { Input } from "../custom/Input";
import { Card, CardContent } from "../custom/Card";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "../custom/Modal";
import { Textarea } from "../custom/Textarea";
import { Select } from "../custom/Select";
import { Badge } from "../custom/Badge";
import { Spinner } from "../custom/Spinner";
import { addToast } from "../custom/Toast";
import { useProducts } from "../../hooks/useProducts";
import { useCategories } from "../../hooks/useCategories";
import { useAuth } from "../../context/AuthContext";
import { ApolloWrapper } from "../ApolloWrapper";
import type { Product, Category } from "../../types";

interface FormData {
  name: string;
  description: string;
  price: string;
  category: string;
  image: string;
  ingredients: string;
  allergens: string;
  status: boolean;
}

function ProductsManagerContent() {
  const { user } = useAuth();
  const restaurantId = user?.restaurantId || "";
  const {
    products,
    loading,
    error,
    createProduct,
    updateProduct,
    deleteProduct,
  } = useProducts(restaurantId);
  const { categories } = useCategories(restaurantId);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    price: "",
    category: "",
    image: "",
    ingredients: "",
    allergens: "",
    status: true,
  });

  if (!restaurantId)
    return (
      <div className="p-6 bg-muted rounded-lg text-center">
        <p className="text-muted-foreground">
          No hay restaurante asociado a tu cuenta.
        </p>
      </div>
    );

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  if (error)
    return (
      <div className="p-6 bg-destructive/10 text-destructive rounded-lg">
        {error.message}
      </div>
    );

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      !filterCategory || product.category?.id === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description || "",
        price: String(product.price),
        category: product.category?.id || "",
        image: product.image || "",
        status: product.status ?? true,
        ingredients: product.ingredients || "",
        allergens: product.allergens || "",
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: "",
        description: "",
        price: "",
        category: "",
        image: "",
        status: true,
        ingredients: "",
        allergens: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (
      !formData.name ||
      !formData.price ||
      !formData.category ||
      !formData.description ||
      !formData.ingredients ||
      !formData.allergens
    ) {
      addToast("Completa los campos obligatorios", "error");
      return;
    }
    if (
      !formData.name.trim() ||
      isNaN(parseFloat(formData.price)) ||
      formData.price.trim() === "" ||
      formData.price.startsWith("-") ||
      formData.price.startsWith(".") ||
      !formData.description.trim() ||
      !formData.ingredients.trim() ||
      !formData.allergens.trim()
    ) {
      addToast(
        "Por favor, ingresa valores válidos para todos los campos requeridos",
        "error",
      );
      return;
    }
    const input = {
      id: editingProduct?.id,
      restaurant: parseInt(restaurantId),
      category: parseInt(formData.category),
      name: formData.name,
      ingredients: formData.ingredients,
      allergens: formData.allergens,
      description: formData.description,
      price: parseFloat(formData.price) || 0,
      image: formData.image || null,
      status: formData.status,
    };
    if (editingProduct) {
      updateProduct(editingProduct.id, input);
    } else {
      createProduct(input);
    }
    setIsModalOpen(false);
  };

  const categoryOptions = [
    { value: "", label: "Todas las categorías" },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Productos</h1>
          <p className="text-muted-foreground">
            Gestiona el menú del restaurante
          </p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <FiPlus size={18} />
          Nuevo producto
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <FiSearch
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={18}
          />
          <Input
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          options={categoryOptions}
        />
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredProducts.map((product) => (
          <Card
            key={product.id}
            className={`overflow-hidden transition-opacity ${!product.status ? "opacity-75" : ""}`}
          >
            <div className="relative aspect-video bg-muted">
              <img
                src={
                  product.image ||
                  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300"
                }
                alt={product.name}
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
              />
              {!product.status && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center backdrop-blur-[1px]">
                  <Badge variant="destructive" className="text-sm px-3 py-1">
                    No disponible
                  </Badge>
                </div>
              )}
            </div>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground line-clamp-1">
                    {product.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {product.category?.name}
                  </p>
                </div>
                <p className="font-bold text-primary">${product.price}</p>
              </div>
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2 min-h-[2.5em]">
                {product.description}
              </p>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                    product.status
                      ? "bg-success/20 text-success"
                      : "bg-destructive/20 text-destructive"
                  }`}
                >
                  {product.status ? "Disponible" : "Agotado"}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenModal(product)}
                  >
                    <FiEdit2 size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteProduct(product.id)}
                  >
                    <FiTrash2 size={16} />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No se encontraron productos con los filtros seleccionados.
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size="lg"
      >
        <ModalHeader onClose={() => setIsModalOpen(false)}>
          {editingProduct ? "Editar producto" : "Nuevo producto"}
        </ModalHeader>
        <ModalBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nombre"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Nombre del producto"
            />
            <Input
              label="Precio"
              type="number"
              value={formData.price}
              onChange={(e) =>
                setFormData({ ...formData, price: e.target.value })
              }
              placeholder="0.00"
            />
            <Select
              label="Categoría"
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              options={[
                { value: "", label: "Selecciona una categoría" },
                ...categories.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
            <Input
              label="URL de imagen"
              value={formData.image}
              onChange={(e) =>
                setFormData({ ...formData, image: e.target.value })
              }
              placeholder="https://..."
            />
            <div className="md:col-span-2">
              <Textarea
                label="Descripción"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Descripción del producto"
                rows={3}
              />
            </div>
            <div className="md:col-span-2">
              <Textarea
                label="Ingredientes"
                value={formData.ingredients}
                onChange={(e) =>
                  setFormData({ ...formData, ingredients: e.target.value })
                }
                placeholder="Ingredientes del producto"
                rows={3}
              />
            </div>
            <div className="md:col-span-2">
              <Textarea
                label="Alergenos"
                value={formData.allergens}
                onChange={(e) =>
                  setFormData({ ...formData, allergens: e.target.value })
                }
                placeholder="Alergenos del producto"
                rows={3}
              />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer w-fit">
                <input
                  type="checkbox"
                  checked={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-border"
                />
                <span className="text-sm text-foreground">
                  Producto disponible
                </span>
              </label>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsModalOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            {editingProduct ? "Guardar cambios" : "Crear producto"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

export function ProductsManager() {
  return (
    <ApolloWrapper>
      <ProductsManagerContent />
    </ApolloWrapper>
  );
}
