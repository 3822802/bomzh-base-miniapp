import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

// Подтверждение владения доменом на Base.dev делается мета-тегом
// <meta name="base:app_id" content="...">. ID выдаётся в окне «Add Domain»
// в кабинете Base.dev — кладём его в переменную NEXT_PUBLIC_BASE_APP_ID.
// Пока переменная не задана — тег просто не выводится.
const BASE_APP_ID = process.env.NEXT_PUBLIC_BASE_APP_ID;

export const metadata: Metadata = {
  title: "Фармодрочка",
  description: "Bomzh mini-app на Base: ИИ-агент, токен BMZH и рулетка.",
  ...(BASE_APP_ID ? { other: { "base:app_id": BASE_APP_ID } } : {}),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
