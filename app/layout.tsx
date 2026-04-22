import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "myfilmstrip — tiny memories, made with love",
  description:
    "turn your favourite photos into vintage film strips. free, instantly, no signup.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&family=DM+Serif+Display&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Cedarville+Cursive&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
