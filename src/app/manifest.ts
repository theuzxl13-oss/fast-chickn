import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/constants";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND.name} — Delivery`,
    short_name: BRAND.name,
    description: BRAND.slogan,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F7F5F3",
    theme_color: "#FF5A1F",
    lang: "pt-BR",
    categories: ["food", "shopping"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Meus pedidos", url: "/pedidos" },
      { name: "Buscar", url: "/busca" },
    ],
  };
}
