import type { MetadataRoute } from "next";

/** Манифест PWA (tasks.md 17.1): установка на главный экран телефона и компьютера. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Salary — финансовый аналитик",
    short_name: "Salary",
    description: "Доходы, расходы, бюджеты и цели — с графиками и офлайн-вводом.",
    lang: "ru",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f0fdf4",
    theme_color: "#047857",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Добавить операцию",
        short_name: "Добавить",
        url: "/transactions?new=1",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Аналитика",
        url: "/analytics",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
