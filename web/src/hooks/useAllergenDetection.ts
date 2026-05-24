import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useUserAllergies } from "./useUserAllergies";

export function useAllergenDetection() {
  const { user } = useAuth();
  const { allergies: freshAllergies } = useUserAllergies(user?.id);

  const allergies = freshAllergies ?? user?.allergies ?? "";

  const userAllergies = useMemo(() => {
    if (!allergies) return [];
    return allergies.split(",").map((s: string) => s.trim().toLowerCase()).filter(Boolean);
  }, [allergies]);

  function getProductAllergens(product: { allergens?: string; ingredients?: string }): string[] {
    const parts: string[] = [];
    if (product.allergens) parts.push(product.allergens);
    if (product.ingredients) parts.push(product.ingredients);
    return parts.join(", ").toLowerCase().split(/[,;]/).map((s: string) => s.trim()).filter(Boolean);
  }

  function hasConflict(productAllergens: string[]): boolean {
    if (userAllergies.length === 0) return false;
    return userAllergies.some((ua) =>
      productAllergens.some((pa) => pa.includes(ua.toLowerCase())),
    );
  }

  return {
    userAllergies,
    getProductAllergens,
    hasConflict,
  };
}
