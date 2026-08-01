// IDs des blocs AdSense (compte ca-pub-3549294158319032). Voir /admin pour
// l'interrupteur global (getAdsEnabled() dans settings.ts).
export const AD_CLIENT = "ca-pub-3549294158319032";

export const AD_SLOTS = {
  displayContent: "4510663013", // Accueil, fiche destination, /compte
  inArticleBlog: "6730346255", // Article de blog
  inFeedDestinations: { slot: "3125429152", layoutKey: "-6t+ed+2i-1n-4w" }, // Grille /vols-pas-chers
  inFeedBlog: { slot: "6575533663", layoutKey: "-6t+ed+2i-1n-4w" }, // Grille /blog
} as const;
