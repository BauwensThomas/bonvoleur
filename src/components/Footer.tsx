import Link from "next/link";
import { site } from "@/lib/site";
import Logo from "@/components/Logo";
import CookieSettingsLink from "@/components/CookieSettingsLink";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10 flex flex-col gap-8 sm:flex-row sm:justify-between text-sm">
        <div>
          <Logo />
          <p className="mt-2 text-slate-600">{site.promise}</p>
          <div className="mt-4 flex gap-3">
            <a
              href={site.social.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium hover:border-brand hover:text-brand"
            >
              Instagram
            </a>
            <a
              href={site.social.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium hover:border-brand hover:text-brand"
            >
              Facebook
            </a>
          </div>
        </div>
        <div>
          <p className="font-semibold mb-2">Liens</p>
          <ul className="space-y-1 text-slate-600">
            <li>
              <Link href="/blog" className="hover:text-slate-900">
                Blog
              </Link>
            </li>
            <li>
              <Link href="/#inscription" className="hover:text-slate-900">
                S&apos;inscrire
              </Link>
            </li>
            <li>
              <Link href="/compte" className="hover:text-slate-900">
                Connexion
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-semibold mb-2">Légal</p>
          <ul className="space-y-1 text-slate-600">
            <li>
              <Link href="/mentions-legales" className="hover:text-slate-900">
                Mentions légales
              </Link>
            </li>
            <li>
              <Link href="/confidentialite" className="hover:text-slate-900">
                Politique de confidentialité
              </Link>
            </li>
            <li>
              <Link href="/conditions-generales" className="hover:text-slate-900">
                Conditions générales
              </Link>
            </li>
            <li>
              <Link href="/desinscription" className="hover:text-slate-900">
                Se désinscrire
              </Link>
            </li>
            <li>
              <CookieSettingsLink />
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} {site.name}. Nous ne vendons pas de
        billets, nous trouvons les bons plans.
      </div>
    </footer>
  );
}
