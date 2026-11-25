import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/nunito";
import "./globals.css";
import { SessionProvider } from "@/lib/session";
import Ambient from "@/components/Ambient";
import DemoRoot from "@/components/demo/DemoRoot";
import SetupNotice from "@/components/SetupNotice";

const DEMO = process.env.NEXT_PUBLIC_DEMO === "1";
// Kalitlar yo'q bo'lsa sayt qulamasdan, sozlash yo'riqnomasini ko'rsatadi
const CONFIGURED = DEMO || Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

export const metadata: Metadata = {
  title: {
    default: "ECO SCHOOL — Kichik harakatlar, katta o‘zgarishlar",
    template: "%s · ECO SCHOOL",
  },
  description:
    "ECO SCHOOL — maktab o‘quvchilari uchun ekologik platforma: challenge'lar, recycling, tadqiqotlar, reyting va eko-taqvim.",
  icons: {
    icon: [{ url: "/eco-icon.svg", type: "image/svg+xml" }],
    apple: "/eco-apple-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#040e09",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="uz" className="h-full antialiased" data-scroll-behavior="smooth">
      <body className="flex min-h-full flex-col">
        <Ambient />
        {CONFIGURED ? <SessionProvider>{DEMO ? <DemoRoot /> : children}</SessionProvider> : <SetupNotice />}
      </body>
    </html>
  );
}
