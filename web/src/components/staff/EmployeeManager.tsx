import { useState } from "react";
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiMail } from "react-icons/fi";
import { Button } from "../custom/Button";
import { Input } from "../custom/Input";
import { Card, CardContent } from "../custom/Card";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "../custom/Modal";
import { Badge } from "../custom/Badge";
import { Avatar } from "../custom/Avatar";
import { Spinner } from "../custom/Spinner";
import { addToast } from "../custom/Toast";
import { useEmployees } from "../../hooks/useEmployees";
import { useAuth } from "../../context/AuthContext";
import { ApolloWrapper } from "../ApolloWrapper";
import type { Employee } from "../../types";
import { validarEmail } from "../../libs/ValidateEmail";

function EmployeesManagerContent() {
  const { user } = useAuth();
  const restaurantId = user?.restaurantId || "";
  const {
    employees,
    loading,
    error,
    createEmployee,
    updateEmployee,
    removeEmployee,
  } = useEmployees(restaurantId);

  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    position: "",
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

  const filteredEmployees = employees.filter((emp) => {
    const name = emp.user?.name || "";
    const email = emp.user?.email || "";
    return (
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleOpenModal = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        name: employee.user?.name || "",
        email: employee.user?.email || "",
        password: "",
        position: employee.position || "",
      });
    } else {
      setEditingEmployee(null);
      setFormData({ name: "", email: "", password: "", position: "" });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.email) {
      addToast("El nombre y correo son requeridos", "error");
      return;
    }
    if (!formData.position) {
      addToast("El cargo del empleado es requerido", "error");
      return;
    }
    if (!validarEmail(formData.email)) {
      addToast("El correo es invalido", "error");
      return;
    }

    if (editingEmployee) {
      updateEmployee({
        id: editingEmployee.id,
        name: formData.name,
        email: formData.email,
        position: formData.position,
        restaurantId: parseInt(restaurantId),
      });
    } else {
      if (!formData.password) {
        addToast("La contraseña es requerida", "error");
        return;
      }
      createEmployee({
        name: formData.name,
        email: formData.email,
        role: "staff",
        password: formData.password,
        position: formData.position,
        restaurantId: parseInt(restaurantId),
      });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Empleados</h1>
          <p className="text-muted-foreground">
            Gestiona el personal del restaurante
          </p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <FiPlus size={18} />
          Nuevo empleado
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <FiSearch
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          size={18}
        />
        <Input
          placeholder="Buscar empleados..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEmployees.map((employee) => (
          <Card key={employee.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <Avatar name={employee.user?.name || "?"} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground truncate">
                      {employee.user?.name}
                    </h3>
                    <Badge variant="secondary">{employee.position}</Badge>
                  </div>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <FiMail size={14} />
                      <span className="truncate">{employee.user?.email}</span>
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <Badge
                      variant={employee.user?.role ? "default" : "secondary"}
                    >
                      {employee.user?.role || "empleado"}
                    </Badge>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenModal(employee)}
                      >
                        <FiEdit2 size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEmployee(employee.id)}
                      >
                        <FiTrash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredEmployees.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No se encontraron empleados.
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <ModalHeader onClose={() => setIsModalOpen(false)}>
          {editingEmployee ? "Editar empleado" : "Nuevo empleado"}
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <Input
              label="Nombre completo"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Nombre"
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
            {!editingEmployee && (
              <Input
                label="Contraseña"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="Contraseña"
              />
            )}
            <Input
              label="Cargo / Posición"
              value={formData.position}
              onChange={(e) =>
                setFormData({ ...formData, position: e.target.value })
              }
              placeholder="Ej. Mesero, Cocinero..."
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsModalOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            {editingEmployee ? "Guardar cambios" : "Crear empleado"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

export function EmployeesManager() {
  return (
    <ApolloWrapper>
      <EmployeesManagerContent />
    </ApolloWrapper>
  );
}
