// Application réelle d'une suggestion SEO approuvée (étape 8). N'applique que
// les combinaisons (type de page, type de suggestion) où le champ cible
// existe VRAIMENT en base - voir SEO-AUTOMATION.md pour le détail des cas non
// applicables (title/meta_description sur une fiche destination : générés
// dynamiquement, pas de colonne de surcharge).
import "server-only";

import { findOne, update } from "./db";
import { classifyPage, pageSlug } from "./seo-opportunities";
import { submitSitemap } from "./gsc";
import { site } from "./site";
import type { SeoSuggestion } from "./types";

export interface ApplyResult {
  applied: boolean;
  note: string;
}

const GSC_SITE_URL = "sc-domain:bonvoleur.com";

export async function applySeoSuggestion(s: SeoSuggestion): Promise<ApplyResult> {
  const pageType = classifyPage(s.page);
  const slug = pageSlug(s.page);

  if (pageType === "blog-article" && (s.suggestion_type === "title" || s.suggestion_type === "meta_description")) {
    const post = await findOne("posts", (p) => p.slug === slug);
    if (!post) return { applied: false, note: "Article de blog introuvable (slug non trouvé)." };
    const field = s.suggestion_type === "title" ? "title" : "meta_description";
    await update("posts", post.id, { [field]: s.proposed_value });
    await submitSitemap(GSC_SITE_URL, `${site.canonicalBase}/sitemap.xml`);
    return { applied: true, note: `Champ "${field}" mis à jour sur l'article, sitemap re-signalé à Google.` };
  }

  if (pageType === "destination" && s.suggestion_type === "content") {
    const route = await findOne("routes", (r) => r.slug === slug);
    if (!route) return { applied: false, note: "Fiche destination introuvable (slug non trouvé)." };
    await update("routes", route.id, { intro: s.proposed_value });
    await submitSitemap(GSC_SITE_URL, `${site.canonicalBase}/sitemap.xml`);
    return { applied: true, note: "Intro mise à jour sur la fiche destination, sitemap re-signalé à Google." };
  }

  return {
    applied: false,
    note: "Pas encore applicable automatiquement pour ce type de page/suggestion - à appliquer manuellement si pertinent.",
  };
}
