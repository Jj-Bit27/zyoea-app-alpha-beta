import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { gql } from "@apollo/client";
import {
  FiArrowLeft,
  FiEdit2,
  FiPlus,
  FiTrash2,
  FiUsers,
  FiShoppingBag,
  FiDollarSign,
} from "react-icons/fi";
import { Button } from "../custom/Button";
import { Input } from "../custom/Input";
import { Card, CardContent, CardHeader, CardTitle } from "../custom/Card";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "../custom/Modal";
import { Avatar } from "../custom/Avatar";
import { Textarea } from "../custom/Textarea";
import { useRestaurantById } from "../../hooks/useRestaurants";
import { useOrders } from "../../hooks/useOrders";
import { ApolloWrapper } from "../ApolloWrapper";
import { Spinner } from "../custom/Spinner";
import { useEmployees } from "../../hooks/useEmployees";
import { addToast } from "../custom/Toast";
import type { Employee, Restaurant } from "../../types";
import { validarEmail } from "../../libs/ValidateEmail";
import { $user } from "../../context/AuthContext";
import { ImageUploader } from "../upload/ImageUploader";

const GET_RESTAURANT_PAYMENT_METHOD = gql`
  query getRestaurantPaymentMethod($userId: ID!) {
    getRestaurantPaymentMethod(userId: $userId) {
      id
      accountHolderName
      bankAccountLast4
      routingNumber
      status
      activatedAt
    }
  }
`;

const CREATE_RESTAURANT_PAYMENT_METHOD = gql`
  mutation createRestaurantPaymentMethod($userId: ID!, $input: CreateRestaurantPaymentMethodInput!) {
    createRestaurantPaymentMethod(userId: $userId, input: $input) {
      id
      accountHolderName
      bankAccountLast4
      routingNumber
      status
    }
  }
`;

interface RestaurantData {
  name: string;
  address: string;
  email: string;
  description: string;
  image: string;
  phone: string;
  hours: string;
}

export function RestaurantDetailContent({ id }: { id: string }) {
  const { restaurant, updateRestaurant } = useRestaurantById(id);
  const {
    employees,
    loading,
    error,
    createEmployee,
    updateEmployee,
    removeEmployee,
  } = useEmployees(id);
  const { orders } = useOrders(id);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Employee | null>(null);

  const [formData, setFormData] = useState<RestaurantData>({
    name: "",
    address: "",
    email: "",
    description: "",
    image: "",
    phone: "",
    hours: "",
  });

  const [adminFormData, setAdminFormData] = useState({
    name: "",
    email: "",
    password: "",
    position: "",
  });

  const currentUser = $user.get();
  const userId = currentUser?.id || "";
  const { data: pmData } = useQuery(GET_RESTAURANT_PAYMENT_METHOD, {
    variables: { userId },
    skip: !userId,
  });
  const existingPayment = pmData?.getRestaurantPaymentMethod;
  const [createPaymentMethod] = useMutation(CREATE_RESTAURANT_PAYMENT_METHOD);
  const [pmForm, setPmForm] = useState({ accountHolderName: "", clabe: "" });
  const [pmModalOpen, setPmModalOpen] = useState(false);

  const handleSavePaymentMethod = async () => {
    if (!pmForm.accountHolderName || !pmForm.clabe) {
      addToast("Todos los campos son requeridos", "error");
      return;
    }
    try {
      await createPaymentMethod({
        variables: {
          userId,
          input: {
            accountHolderName: pmForm.accountHolderName,
            clabe: pmForm.clabe,
          },
        },
        refetchQueries: [{ query: GET_RESTAURANT_PAYMENT_METHOD, variables: { userId } }],
      });
      addToast("Método de pago guardado exitosamente", "success");
      setPmModalOpen(false);
    } catch {
      addToast("Error al guardar método de pago", "error");
    }
  };

  const handleSaveRestaurant = async () => {
    updateRestaurant({
      id: id,
      name: formData.name,
      description: formData.description,
      image: formData.image || "",
      address: formData.address,
      phone: formData.phone,
      email: formData.email,
      hours: formData.hours,
    });
    setIsEditModalOpen(false);
  };

  const activeOrders = orders.filter(
    (o) => o.status !== "entregado" && o.status !== "cancelado",
  );
  const totalRevenue = orders.reduce(
    (sum: number, o) => sum + (o.total || 0),
    0,
  );

  console.log(employees);

  const admins = employees.filter((emp) => emp.user?.role == "admin");

  const handleOpenEditModal = (restaurant?: Restaurant) => {
    if (restaurant) {
      setFormData({
        name: restaurant.name,
        address: restaurant.address,
        email: restaurant.email,
        description: restaurant.description,
        image: restaurant.image || "",
        phone: restaurant.phone,
        hours: restaurant.hours,
      });
    }
    setIsEditModalOpen(true);
  };

  const handleOpenAdminModal = (admin?: Employee) => {
    if (admin) {
      setEditingAdmin(admin);
      setAdminFormData({
        name: admin.user?.name || "",
        email: admin.user?.email || "",
        password: "",
        position: admin.position || "",
      });
    } else {
      setEditingAdmin(null);
      setAdminFormData({ name: "", email: "", password: "", position: "" });
    }
    setIsAdminModalOpen(true);
  };

  const handleSaveAdmin = () => {
    if (!adminFormData.name || !adminFormData.email) {
      addToast("Nombre y email son requeridos", "error");
      return;
    }
    if (!adminFormData.position) {
      addToast("El cargo del empleado es requerid", "error")
      return
    }
    if (!adminFormData.email || !validarEmail(adminFormData.email)) {
      addToast("El correo es invalido o no hay", "error")
      return;
    }
    if (editingAdmin) {
      updateEmployee({
        id: editingAdmin.id,
        name: adminFormData.name,
        email: adminFormData.email,
        position: adminFormData.position,
        restaurantId: parseInt(id),
      });
    } else {
      if (!adminFormData.password) {
        addToast("La contraseña es requerida", "error");
        return;
      }
      createEmployee({
        name: adminFormData.name,
        email: adminFormData.email,
        role: "admin",
        password: adminFormData.password,
        position: adminFormData.position,
        restaurantId: parseInt(id),
      });
    }
    setIsAdminModalOpen(false);
  };

  if (!restaurant)
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <a href="/admin/restaurants">
          <Button variant="ghost" size="sm">
            <FiArrowLeft size={18} />
            Volver
          </Button>
        </a>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {restaurant?.name}
          </h1>
          <p className="text-muted-foreground">
            Gestiona la información del restaurante ID: {id}
          </p>
        </div>
      </div>

      {/* Restaurant Info Card */}
      <Card>
        <CardContent className="p-0">
          <div className="relative h-56 sm:h-64">
            <img
              src={restaurant?.image || "/placeholder.svg"}
              alt={restaurant?.name}
              className="object-cover w-full h-full"
            />
          </div>
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-xl font-bold text-foreground">
                  {restaurant?.name}
                </h2>
                <p className="text-muted-foreground mt-2">
                  {restaurant?.description}
                </p>
                {/* ... (Iconos de MapPin, Phone, Mail iguales) */}
              </div>
              <Button onClick={() => handleOpenEditModal(restaurant)}>
                <FiEdit2 size={16} />
                Editar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 bg-primary/20 rounded-lg text-primary">
              <FiShoppingBag size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {activeOrders.length.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">Órdenes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 bg-success/20 rounded-lg text-success">
              <FiDollarSign size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                ${totalRevenue.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">Ingresos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 bg-accent/20 rounded-lg text-accent">
              <FiUsers size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {admins.length}
              </p>
              <p className="text-sm text-muted-foreground">Admins</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admins */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Administradores</CardTitle>
          <Button size="sm" onClick={() => handleOpenAdminModal()}>
            <FiPlus size={16} />
            Agregar
          </Button>
        </CardHeader>
        <CardContent>
          {admins.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay administradores asignados
            </p>
          ) : (
            <div className="space-y-3">
              {admins.map((admin) => (
                <div
                  key={admin.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={admin.user?.name} size="md" />
                    <div>
                      <p className="font-medium text-foreground">
                        {admin.user?.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {admin.user?.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenAdminModal(admin)}
                    >
                      <FiEdit2 size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEmployee(admin.id)}
                    >
                      <FiTrash2 size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Método de cobro (Stripe Connect)</CardTitle>
          {!existingPayment && (
            <Button size="sm" onClick={() => setPmModalOpen(true)}>
              <FiPlus size={16} />
              Configurar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {existingPayment ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Titular: <span className="font-medium text-foreground">{existingPayment.accountHolderName}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Cuenta: <span className="font-medium text-foreground">****{existingPayment.bankAccountLast4}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Routing: <span className="font-medium text-foreground">{existingPayment.routingNumber}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Estado: <span className="font-medium text-green-600">{existingPayment.status}</span>
              </p>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No has configurado un método de cobro. Agrega tu cuenta bancaria para recibir pagos.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Payment Method Modal */}
      <Modal isOpen={pmModalOpen} onClose={() => setPmModalOpen(false)}>
        <ModalHeader onClose={() => setPmModalOpen(false)}>
          Configurar método de cobro
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ingresa los datos de tu cuenta bancaria (CLABE) para recibir pagos vía Stripe Connect.
            </p>
            <Input
              label="Nombre del titular"
              value={pmForm.accountHolderName}
              onChange={(e) =>
                setPmForm({ ...pmForm, accountHolderName: e.target.value })
              }
              placeholder="Nombre completo del titular de la cuenta"
            />
            <Input
              label="CLABE (18 dígitos)"
              value={pmForm.clabe}
              onChange={(e) =>
                setPmForm({ ...pmForm, clabe: e.target.value })
              }
              placeholder="123456789012345678"
              maxLength={18}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setPmModalOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSavePaymentMethod}>
            Guardar método de cobro
          </Button>
        </ModalFooter>
      </Modal>

      {/* Edit Restaurant Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => handleOpenEditModal()}
        size="lg"
      >
        <ModalHeader onClose={() => setIsEditModalOpen(false)}>
          Editar restaurante
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <Input
              label="Nombre"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Nombre del restaurante"
            />
            <Textarea
              label="Descripción"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              placeholder="Una breve descripcion sobre tu restaurante y que ofreces"
            />
            <Input
              label="Dirección"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              placeholder="Nombre y numero donde se encuentra el local"
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Teléfono"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="526141234567"
              />
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="correo@ejemplo.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Imagen del restaurante</label>
              <ImageUploader currentImage={formData.image} onUpload={(url) => setFormData({ ...formData, image: url })} />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSaveRestaurant}>Guardar cambios</Button>
        </ModalFooter>
      </Modal>

      {/* Admin Modal */}
      <Modal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
      >
        <ModalHeader onClose={() => setIsAdminModalOpen(false)}>
          {editingAdmin ? "Editar administrador" : "Nuevo administrador"}
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <Input
              label="Nombre"
              value={adminFormData.name}
              onChange={(e) =>
                setAdminFormData({ ...adminFormData, name: e.target.value })
              }
              placeholder="Nombre completo"
            />
            <Input
              label="Email"
              type="email"
              value={adminFormData.email}
              onChange={(e) =>
                setAdminFormData({ ...adminFormData, email: e.target.value })
              }
              placeholder="correo@ejemplo.com"
            />
            {!editingAdmin && (
              <Input
                label="Contraseña"
                value={adminFormData.password}
                type="password"
                onChange={(e) =>
                  setAdminFormData({
                    ...adminFormData,
                    password: e.target.value,
                  })
                }
                placeholder="Contraseña"
              />
            )}
            <Input
              label="Cargo / Posición"
              value={adminFormData.position}
              onChange={(e) =>
                setAdminFormData({ ...adminFormData, position: e.target.value })
              }
              placeholder="Ej. Mesero, Cocinero..."
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsAdminModalOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSaveAdmin}>
            {editingAdmin ? "Guardar cambios" : "Crear administrador"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

export function RestaurantDetail({ id }: { id: string }) {
  return (
    <ApolloWrapper>
      <RestaurantDetailContent id={id} />
    </ApolloWrapper>
  );
}
