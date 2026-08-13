// Application réelle d'une suggestion SEO approuvée (étape 8).
// - Article de blog (title/meta_description) : colonnes réelles sur `posts`.
// - Fiche destination (content = intro) : colonne réelle sur `routes`.
// - TOUTE AUTRE page, pour title/meta_description (accueil, listings,
//   fiches destination) : pas de colonne dédiée en base, donc écrit dans une
//   surcharge générique `site_settings` (seo_override:{chemin}:{champ}, voir
//   settings.ts) - lue par le generateMetadata() de chaque page concernée.
//   Marche pour n'importe quel chemin, y compris des pages non encore
//   couvertes explicitement ici tant que leur generateMetadata() lit aussi
//   cette surcharge.
// - `content`/`internal_links` restent volontairement manuels partout ailleurs
//   qu'une fiche destination : réécrire du contenu ou insérer des liens dans
//   du JSX/markdown est un risque différent (mise en page, ton éditorial) -
//   voir SEO-AUTOMATION.md.
import "server-only";

import { revalidatePath } from "next/cache";
import { getAll, findOne, update } from "./db";
import { classifyPage, pageSlug } from "./seo-opportunities";
import { destinationSlug } from "./routes";
import { revalidateDestinations } from "./revalidate-destinations";
import { submitSitemap } from "./gsc";
import { setSeoOverride, type SeoOverrideField } from "./settings";
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
    revalidatePath(`/blog/${slug}`);
    revalidatePath("/blog");
    await submitSitemap(GSC_SITE_URL, `${site.canonicalBase}/sitemap.xml`);
    return { applied: true, note: `Champ "${field}" mis à jour sur l'article, sitemap re-signalé à Google.` };
  }

  if (pageType === "destination" && s.suggestion_type === "content") {
    // Piège : le slug de la FICHE (destinationSlug, basé sur la ville) n'est
    // PAS le slug d'une ligne `routes` (basé sur la paire origine-destination)
    // - une destination peut regrouper plusieurs routes (une par aéroport de
    // départ). On met à jour l'intro sur TOUTES les routes de cette ville
    // pour rester cohérent, quelle que soit celle que la fiche affiche en 1er.
    const allRoutes = await getAll("routes");
    const matches = allRoutes.filter((r) => destinationSlug(r.destination_city) === slug);
    if (matches.length === 0) return { applied: false, note: "Aucune route trouvée pour cette destination (slug non trouvé)." };
    for (const r of matches) {
      await update("routes", r.id, { intro: s.proposed_value });
    }
    revalidateDestinations(slug);
    await submitSitemap(GSC_SITE_URL, `${site.canonicalBase}/sitemap.xml`);
    return {
      applied: true,
      note: `Intro mise à jour sur ${matches.length} route${matches.length > 1 ? "s" : ""} vers cette destination, sitemap re-signalé à Google.`,
    };
  }

  // Title/meta_description sur n'importe quelle AUTRE page (accueil, listing
  // blog, listing destinations, fiche destination) : pas de colonne dédiée en
  // base pour ces pages, donc surcharge générique par chemin.
  const OVERRIDABLE_PAGE_TYPES = ["home", "destination-listing", "blog-listing", "destination"];
  if (
    OVERRIDABLE_PAGE_TYPES.includes(pageType) &&
    (s.suggestion_type === "title" || s.suggestion_type === "meta_description")
  ) {
    let path: string;
    try {
      path = new URL(s.page).pathname;
    } catch {
      return { applied: false, note: "URL de page invalide." };
    }
    const field: SeoOverrideField = s.suggestion_type === "title" ? "title" : "meta_description";
    await setSeoOverride(path, field, s.proposed_value);
    revalidatePath(path);
    await submitSitemap(GSC_SITE_URL, `${site.canonicalBase}/sitemap.xml`);
    return {
      applied: true,
      note: `Surcharge "${field}" enregistrée pour ${path}, sitemap re-signalé à Google.`,
    };
  }

  return {
    applied: false,
    note: "Pas encore applicable automatiquement pour ce type de page/suggestion - à appliquer manuellement si pertinent.",
  };
}
