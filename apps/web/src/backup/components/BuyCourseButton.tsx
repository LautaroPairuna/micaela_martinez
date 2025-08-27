"use client";
import { useRouter } from "next/navigation";
import Button from "@/backup/components/ui/Button";
import { Play } from "lucide-react";
import { getToken } from "@/lib/auth"; // si aún no existe, cambiá la lógica adentro

export default function BuyCourseButton({
  courseId,
  size = "sm",
}: { courseId: string; size?: "sm" | "md" | "lg" }) {
  const router = useRouter();
  function onClick() {
    if (!getToken?.()) router.push("/auth");
    else alert("TODO: flujo de compra de curso");
  }
  return (
    <Button onClick={onClick} variant="primary" size={size}>
      <Play className="h-4 w-4" />
      Comprar curso
    </Button>
  );
}
