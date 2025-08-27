"use client";
import { useState } from "react";
import Button from "@/backup/components/ui/Button";
import { ShoppingCart } from "lucide-react";

export default function AddToCartButton({
  productId,
  size = "sm",
}: { productId: string; size?: "sm" | "md" | "lg" }) {
  const [state, setState] = useState<"idle" | "adding" | "added">("idle");

  async function add() {
    setState("adding");
    try {
      // TODO: POST /api/carrito
      await new Promise((r) => setTimeout(r, 600));
      setState("added");
      setTimeout(() => setState("idle"), 1200);
    } catch {
      setState("idle");
    }
  }

  return (
    <Button
      onClick={add}
      variant="primary"
      size={size}
      loading={state === "adding"}
      aria-live="polite"
    >
      <ShoppingCart className="h-4 w-4" />
      {state === "added" ? "Agregado ✓" : "Agregar"}
    </Button>
  );
}
