// Fenêtre de fraîcheur partagée (membre + admin).
// Un deal que le scanner n'a plus revu depuis plus de FRESH_MAX_DAYS jours n'est
// plus montré aux membres (premium comme gratuit) : il reste en base pour
// l'historique et le contrôle des aéroports, mais un deal vieux d'un mois
// n'inspire pas confiance. On se base sur la date "vu" (published_at), qui est
// rafraîchie à chaque scan tant que le deal est encore trouvé.
export const FRESH_MAX_DAYS = 5;
export const FRESH_MAX_MS = FRESH_MAX_DAYS * 24 * 60 * 60 * 1000;
