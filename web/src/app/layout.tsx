import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

// Substituto gratuito da Gotham (fonte oficial da marca no Manual de Identidade Visual, mas sem
// licença de uso web livre) — Montserrat é a alternativa geométrica mais próxima e é o par mais
// usado pra Gotham no mercado. Só os pesos realmente usados na UI (texto corrido, labels em
// negrito, títulos e números em destaque) — carregar a família toda (100-900) infla o payload
// de fonte à toa.
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Protege Club — Apuração de Comissões",
  description: "Sistema de apuração de comissões de consultores da Protege Club",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${montserrat.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
