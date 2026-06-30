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
              aria-label="Instagram"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium hover:border-brand hover:text-brand"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://hdzzfhjnjcblcejcpnkw.supabase.co/storage/v1/object/public/photos/brand/instagram.png"
                alt=""
                width={16}
                height={16}
                className="h-4 w-4"
              />
              Instagram
            </a>
            <a
              href={site.social.facebook}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium hover:border-brand hover:text-brand"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://hdzzfhjnjcblcejcpnkw.supabase.co/storage/v1/object/public/photos/brand/facebook.png"
                alt=""
                width={16}
                height={16}
                className="h-4 w-4"
              />
              Facebook
            </a>
          </div>
        </div>
        <div>
          <p className="font-semibold mb-2">Liens</p>
          <ul className="space-y-0.5 text-slate-600">
            <li>
              <Link href="/vols-pas-chers" className="block py-1 hover:text-slate-900">
                Vols pas chers
              </Link>
            </li>
            <li>
              <Link href="/blog" className="block py-1 hover:text-slate-900">
                Blog
              </Link>
            </li>
            <li>
              <Link href="/#inscription" className="block py-1 hover:text-slate-900">
                S&apos;inscrire
              </Link>
            </li>
            <li>
              <Link href="/compte" className="block py-1 hover:text-slate-900">
                Connexion
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-semibold mb-2">Légal</p>
          <ul className="space-y-0.5 text-slate-600">
            <li>
              <Link href="/mentions-legales" className="block py-1 hover:text-slate-900">
                Mentions légales
              </Link>
            </li>
            <li>
              <Link href="/confidentialite" className="block py-1 hover:text-slate-900">
                Politique de confidentialité
              </Link>
            </li>
            <li>
              <Link href="/conditions-generales" className="block py-1 hover:text-slate-900">
                Conditions générales
              </Link>
            </li>
            <li>
              <Link href="/desinscription" className="block py-1 hover:text-slate-900">
                Se désinscrire
              </Link>
            </li>
            <li>
              <CookieSettingsLink />
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-500 space-y-1">
        <p>
          © {new Date().getFullYear()} {site.name}. Nous ne vendons pas de
          billets, nous trouvons les bons plans.
        </p>
        <p>
          Ce site contient des liens affiliés. Si vous réservez via ces liens,
          nous percevons une commission, sans coût supplémentaire pour vous.
        </p>
      </div>
    </footer>
  );
}
