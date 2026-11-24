import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import BottomDock from "@/components/BottomDock";
import { ScrollProgress } from "@/components/effects";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <ScrollProgress />
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <BottomDock />
    </>
  );
}
