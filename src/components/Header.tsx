import Link from "next/link";
import Logo from "@/components/Logo";
import MobileMenu from "@/components/MobileMenu";

export default function Header() {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 h-16 flex items-center justify-between">
        <Logo />
        {/* Desktop : nav classique. Mobile : menu hamburger (MobileMenu). */}
        <nav className="hidden sm:flex items-center gap-6 text-sm font-medium">
          <Link href="/blog" className="text-slate-600 hover:text-slate-900">
            Blog
          </Link>
          <Link href="/compte" className="text-slate-600 hover:text-slate-900">
            Connexion
          </Link>
          <Link
            href="/#inscription"
            className="rounded-lg bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-dark transition-colors"
          >
            S&apos;inscrire
          </Link>
        </nav>
        <MobileMenu />
      </div>
    </header>
  );
}