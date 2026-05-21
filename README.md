# 🍔 Zyoea App - Sistema de Gestión de Restaurantes

**Zyoea App** es una aplicación moderna y completa diseñada para la gestión integral de restaurantes. Incluye desde la toma de pedidos por parte de los clientes hasta la coordinación en tiempo real con la cocina, procesamiento de pagos y un panel de administración para personal y gerentes.

---

## ✨ Características Principales

- **📱 Panel de Cliente (Frontend)**: Realización de pedidos y carrito de compras dinámico.
- **💳 Pagos Integrados**: Procesamiento de pagos seguro con tarjeta a través de **Stripe** o cobros manuales en efectivo.
- **🍳 Cocina en Tiempo Real**: Tablero (Dashboard) para cocineros que recibe órdenes en tiempo real mediante **WebSockets**.
- **🪑 Gestión de Mesas Dinámica**:
  - Generación de **Códigos QR** únicos por mesa para que los clientes o meseros ordenen rápidamente.
  - **Escáner QR In-App** para agilizar la toma interactiva de pedidos en sitio.
  - Enlace automatizado de órdenes y capacidad mostrada en tiempo real.
- **📊 Panel de Administración / Staff**: Gestión de empleados, categorías, productos, reservaciones de mesas, historial de pagos y configuración global.
- **🚀 Backend Robusto**: API desarrollada en Golang alimentada mediante GraphQL para alta velocidad y consultas precisas.

---

## 🛠 Stack Tecnológico

El proyecto está dividido fundamentalmente en dos capas:

### Frontend (`/web`)

- **Framework**: [Astro.js](https://astro.build/)
- **UI Library**: [React](https://reactjs.org/)
- **Estilos**: Tailwind CSS
- **Gestión de Estado/Datos**: Apollo Client (GraphQL) + Nanostores
- **Librerías Clave**: `@stripe/react-stripe-js` (Pagos), `graphql-ws` (Tiempo Real), `@yudiel/react-qr-scanner` (Escáner).

### Backend (`/api`)

- **Lenguaje**: [Golang](https://go.dev/)
- **API**: GraphQL (usando `gqlgen`)
- **Base de Datos**: PostgreSQL

---

## 🚀 Instalación y Uso (Desarrollo Local)

### 1. Clonar el repositorio

```bash
git clone https://github.com/Jj-Bit27/zyoea-app.git
cd zyoea-app
```

### 2. Configuración del Backend (Golang)

Asegúrate de tener instalado Go y PostgreSQL localmente.

```bash
cd api
# Instalar dependencias
go mod tidy

# Ejecutar el servidor (normalmente en el puerto 8080)
go run main.go # O la ruta de tu binario principal en /cmd
```

_(Nota: Quizás necesites configurar tus `.env` en Go para la cadena de conexión a PostgreSQL y la configuración secreta de JWT)._

### 3. Configuración del Frontend (Astro + React)

Asegúrate de tener `Node.js` (versión 18 o superior) instalado.

```bash
cd web
# Instalar dependencias de npm
npm install

# Iniciar el entorno de desarrollo
npm run dev
```

La aplicación cliente estará corriendo por defecto en `http://localhost:4321`.

---

## 🔑 Variables de Entorno

Para que la integración de tarjetas funcione localmente, necesitas añadir tu clave pública de prueba de Stripe.

Crea un archivo `.env` o modifica los valores directamente (según la arquitectura interna) en `/web`:

```env
PUBLIC_STRIPE_KEY="pk_test_tu_llave_de_prueba"
PUBLIC_GRAPHQL_HTTP="http://localhost:8080/query"
PUBLIC_GRAPHQL_WS="ws://localhost:8080/query"
```

---

## 📂 Estructura del Proyecto

- `/api/`: Todo el código del servidor backend en Go, esquemas de base de datos y resolvers de GraphQL.
- `/web/src/pages/`: Rutas visibles de la aplicación de Astro.
- `/web/src/components/`: Componentes modulares de React aislados (Layouts, UI, Pagos, Cocina).
- `/web/src/context/`: Contextos globales (AuthContext y OrderContext).
- `/web/src/libs/`: Integraciones como la inicialización de Apollo (WebSockets e HTTP).

---

## 🤝 Contribución

Si deseas contribuir, por favor abre un issue primero para discutir los cambios o envía directamente tu _Pull Request_.

## 📄 Licencia

Distribuido bajo la Licencia MIT.
