import Header from "@/backup/components/Header";
import SubHeader from "@/backup/components/SubHeader";
import WhatsappLink from "@/components/ui/WhatsappLink";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <SubHeader />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <footer className="border-t border-white/10 py-10 mt-12">
        <div className="mx-auto max-w-6xl px-4 text-sm text-white/60">© 2025</div>
      </footer>
      <WhatsappLink />
    </>
  );
}

