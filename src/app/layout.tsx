import type { Metadata, Viewport } from "next";
import { Press_Start_2P } from "next/font/google";
import "./globals.css";
import "./nes.css";
import { Providers } from "./providers";

// Пиксельный шрифт NES. Кириллица нужна — почти весь текст на русском.
const press = Press_Start_2P({
  weight: "400",
  subsets: ["latin", "cyrillic"],
  variable: "--font-press",
  display: "swap",
});

// Подтверждение владения доменом на Base.dev делается мета-тегом
// <meta name="base:app_id" content="...">. ID выдан в окне «Add Domain»
// в кабинете Base.dev. Это публичный идентификатор для подтверждения домена,
// не секрет — можно держать прямо в коде. Переменная окружения, если задана,
// перекрывает значение (на случай смены домена/ID без правки кода).
const BASE_APP_ID =
  process.env.NEXT_PUBLIC_BASE_APP_ID ?? "6a61df15426d14cfbad57a59";

export const metadata: Metadata = {
  title: "Аирдроп Хантер",
  description: "Мини-апка на Base: ИИ-агент, токен BMZH и рулетка аирдропа.",
  ...(BASE_APP_ID ? { other: { "base:app_id": BASE_APP_ID } } : {}),
};

// Мини-апка открывается во встроенном браузере кошелька: запрещаем зум
// по двойному тапу и красим системную строку под небо.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#8ab6f0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${press.variable} h-full`}>
      <body className="nes h-full overflow-hidden bg-[#1b1b28]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
