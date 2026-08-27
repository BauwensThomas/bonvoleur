import type { Metadata } from "next";
import { Rubik, Nunito_Sans } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { site } from "@/lib/site";
import CookieBanner from "@/components/CookieBanner";

// Rubik : titres (du caractère). Nunito Sans : corps (lisible).
const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});
const nunito = Nunito_Sans({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} - ${site.tagline}`,
    template: `%s - ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  openGraph: {
    type: "website",
    locale: "fr_BE",
    siteName: site.name,
    title: `${site.name} - ${site.tagline}`,
    description: site.description,
    url: site.url,
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} - ${site.tagline}`,
    description: site.description,
  },
  robots: { index: true, follow: true },
  // Bing Webmaster Tools - ancien compte perdu, nouvelle propriete creee le
  // 2026-08-27.
  verification: { other: { "msvalidate.01": "83EE57CB502C7BC5F3A83EBA319E856B" } },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      data-scroll-behavior="smooth"
      className={`${rubik.variable} ${nunito.variable} h-full antialiased`}
    >
      <head>
        {/* Google AdSense — verification de propriete du site, doit etre dans
            le <head> statique de CHAQUE page (pas seulement la homepage). */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3549294158319032"
          crossOrigin="anonymous"
        />
        {/* Travelpayouts Drive — doit être dans le HTML statique pour la vérification */}
        <script
          {...{ nowprocket: "", "seraph-accel-crit": "1" }}
          data-noptimize="1"
          data-cfasync="false"
          data-wpfc-render="false"
          data-no-defer="1"
          dangerouslySetInnerHTML={{
            __html: `(function () {
  var script = document.createElement("script");
  script.async = 1;
  script.src = 'https://emrldtp.com/NTQ0NTQ4.js?t=544548';
  document.head.appendChild(script);
})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <CookieBanner />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
