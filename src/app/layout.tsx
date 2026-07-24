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

// Подтверждение проекта на Talent Protocol (talent.app) — тем же способом:
// сервис забирает страницу и ищет этот тег. Токен публичный по назначению
// (он виден в исходнике страницы любому), секретом не является.
const TALENT_VERIFICATION =
  process.env.NEXT_PUBLIC_TALENT_VERIFICATION ??
  "18ece4ad9c152aff1f5adcf83dcacdbfb79782d95d0ade6ccbabaad29324578d479c96a5a73d1536362c4e10080cae2e6b1174bde1acd16258fabbf2f4ed8b27";

export const metadata: Metadata = {
  title: "Аирдроп Хантер",
  description: "Мини-апка на Base: ИИ-агент, токен BMZH и рулетка аирдропа.",
  other: {
    ...(BASE_APP_ID ? { "base:app_id": BASE_APP_ID } : {}),
    ...(TALENT_VERIFICATION
      ? { "talentapp:project_verification": TALENT_VERIFICATION }
      : {}),
  },
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
