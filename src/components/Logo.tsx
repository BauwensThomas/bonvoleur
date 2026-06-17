import Link from "next/link";
import { site } from "@/lib/site";

// Logo BonVoleur : avion en papier (icône "envoi/bon plan") + nom.
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label={`${site.name} accueil`}
      className={`flex items-center gap-2 text-lg font-bold ${className}`}
    >
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M22 2 11 13" />
          <path d="M22 2 15 22 11 13 2 9z" />
        </svg>
      </span>
      <span>
        {site.name}
        <span className="text-brand">.com</span>
      </span>
    </Link>
  );
}