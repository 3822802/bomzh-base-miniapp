import type { NextConfig } from "next";

// Заголовки безопасности на все ответы.
// Намеренно НЕ ставим строгий script-src/connect-src CSP: апка подключает
// кошельки (MetaMask, Base Account) и ходит в RPC/Anthropic — жёсткий CSP
// их легко ломает и требует отдельной отладки. Берём то, что даёт защиту
// без риска сломать работу:
//  • frame-ancestors 'none' + X-Frame-Options — апку нельзя встроить в чужой
//    iframe (кликджекинг на странице, где подписывают транзакции);
//  • nosniff — браузер не угадывает MIME;
//  • Referrer-Policy — не утекает полный URL на сторонние домены;
//  • HSTS — только https (на Vercel всё равно https);
//  • Permissions-Policy — глушим сенсоры/камеру/геолокацию, они не нужны.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
