import { atom, computed } from "nanostores";
import { useStore } from "@nanostores/react";
import { addToast } from "../components/custom/Toast";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  restaurantId: string;
  restaurantName: string;
  image?: string;
}

// --- 1. Estado Global ---
export const $cart = atom<CartItem[]>([]);

// --- 2. Persistencia ---
if (typeof window !== "undefined") {
  const stored = localStorage.getItem("Frugis_cart");
  if (stored) {
    try {
      $cart.set(JSON.parse(stored));
    } catch (e) {
      localStorage.removeItem("Frugis_cart");
    }
  }
}

$cart.subscribe((items) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("Frugis_cart", JSON.stringify(items));
  }
});

// --- 3. Valores Computados ---
export const $cartCount = computed($cart, (items) =>
  items.reduce((acc, item) => acc + item.quantity, 0),
);
export const $cartTotal = computed($cart, (items) =>
  items.reduce((acc, item) => acc + item.price * item.quantity, 0),
);

// --- 4. Acciones (Ahora devuelven un objeto result) ---

export const addToCart = (
  product: any,
  restaurantId?: string,
  restaurantName?: string,
) => {
  // Intentamos obtener el ID del restaurante del argumento O del producto mismo
  const targetRestaurantId = restaurantId || product.restaurantId;
  const targetRestaurantName =
    restaurantName || product.restaurantName || "Restaurante";

  if (!targetRestaurantId) {
    console.error("Falta el ID del restaurante para agregar al carrito");
    addToast("Error interno: Falta ID restaurante", "error");
    return { success: false, message: "Error interno: Falta ID restaurante" };
  }

  const currentItems = $cart.get();

  // Verificar si hay productos de OTRO restaurante — BLOQUEAR directamente
  const differentRestaurant = currentItems.find(
    (i) => i.restaurantId !== String(targetRestaurantId),
  );

  if (differentRestaurant) {
    addToast(
      `No puedes agregar productos de "${targetRestaurantName}" porque tu carrito tiene productos de "${differentRestaurant.restaurantName}". Vacía tu carrito primero.`,
      "error",
    );
    return {
      success: false,
      message: "No puedes mezclar productos de diferentes restaurantes",
    };
  }

  const existingItem = $cart.get().find((i) => i.id === String(product.id));

  if (existingItem) {
    $cart.set(
      $cart
        .get()
        .map((i) =>
          i.id === String(product.id) ? { ...i, quantity: i.quantity + 1 } : i,
        ),
    );
  } else {
    $cart.set([
      ...$cart.get(),
      {
        id: String(product.id),
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: 1,
        restaurantId: String(targetRestaurantId),
        restaurantName: targetRestaurantName,
      },
    ]);
  }

  addToast("Producto agregado al carrito", "success");
  return { success: true, message: "Producto agregado correctamente" };
};

export const removeFromCart = (id: string) => {
  $cart.set($cart.get().filter((i) => i.id !== id));
};

export const updateQuantity = (id: string, delta: number) => {
  const items = $cart.get().map((item) => {
    if (item.id === id) {
      return { ...item, quantity: Math.max(1, item.quantity + delta) };
    }
    return item;
  });
  $cart.set(items);
};

export const clearCart = () => {
  $cart.set([]);
};

// --- 5. Hook de Compatibilidad ---
export function useOrder() {
  const cart = useStore($cart);
  const itemCount = useStore($cartCount);
  const total = useStore($cartTotal);

  return {
    // Datos
    items: cart, // Para código legacy
    cart, // Para código nuevo
    restaurantId: cart.length > 0 ? cart[0].restaurantId : null,
    itemCount,
    total,

    // Acciones (Duplicamos nombres para compatibilidad total)
    addItem: addToCart, // Para código legacy
    addToCart, // Para código nuevo

    removeItem: removeFromCart,
    removeFromCart,

    updateQuantity,

    clearOrder: clearCart,
    clearCart,
  };
}
