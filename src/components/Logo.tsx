import Link from "next/link";
import { site } from "@/lib/site";

// Logo BonVoleur : ton icône (public/logo.svg) + le nom.
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label={`${site.name} accueil`}
      className={`flex items-center gap-2 text-lg font-bold ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="" className="h-9 w-auto" />
      <span>
        {site.name}
        <span className="text-brand">.com</span>
      </span>
    </Link>
  );
}
