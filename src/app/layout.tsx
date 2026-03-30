import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "МедКарта ЕСОЗ — Інтерактивна карта погашених направлень",
  description: "Візуалізація та аналіз медичних направлень, створених в системі ЕСОЗ в рамках Програми медичних гарантій",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uk">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
