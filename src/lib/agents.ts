// Registre des agents du projet (voir agents-claude.md et .claude/agents/).
// "appButton" = bouton "Lancer" sans argument sur la page Agents.

export interface AgentDef {
  name: string;
  label: string;
  role: string; // résumé court
  description: string; // explication détaillée, en clair
  cadence: string; // quand il tourne
  appButton: boolean; // bouton "Lancer" sur la page Agents
  inactive?: boolean; // déclaré mais pas (encore) câblé -> badge "inactif"
}

export const agents: AgentDef[] = [
  {
    name: "deal-sender",
    label: "Deal Sender",
    role: "Envoie les bons plans aux bons abonnés.",
    description:
      "Envoie l'email aux abonnés selon les aéroports qu'ils ont choisis. Si un abonné a coché plusieurs aéroports, il reçoit UN seul email regroupant tous les bons plans qui le concernent (digest). Les désinscrits ne reçoivent rien.",
    cadence: "Automatique quand des deals arrivent",
    appButton: false,
  },
  {
    name: "content-publisher",
    label: "Content Publisher",
    role: "Écrit un article de blog.",
    description:
      "Rédige automatiquement un article de blog long et optimisé pour Google (angle précis, conseils, destinations), avec une FAQ en bas. Il évite de refaire un sujet déjà couvert (il connaît les articles existants et un contrôle de similarité régénère si besoin). L'article est PUBLIÉ directement. Sert à attirer du trafic gratuit depuis Google et à donner du contenu à partager.",
    cadence: "Tous les 3 jours à 19h",
    appButton: true,
  },
  {
    name: "newsletter",
    label: "Newsletter",
    role: "Envoie la newsletter du blog.",
    description:
      "Chaque vendredi, envoie un email aux abonnés (qui ont la newsletter activée) avec les 3 derniers articles de blog publiés. Les désinscrits et ceux qui ont désactivé la newsletter ne reçoivent rien. Le bouton « Lancer » l'envoie tout de suite.",
    cadence: "Vendredi (hebdomadaire)",
    appButton: true,
  },
  {
    name: "social-clipper",
    label: "Social Clipper",
    role: "Partage l'article sur les réseaux.",
    description:
      "À chaque article publié, Claude rédige une légende Instagram/Facebook et un webhook part vers Make, qui publie l'image + la légende sur IG et FB, avec un commentaire renvoyant à l'article. Sur Instagram (liens non cliquables), le lien cliquable est dans la BIO (adresse du blog) ; sur Facebook le lien du commentaire est cliquable. Le bouton « Lancer » rejoue l'envoi pour le dernier article publié.",
    cadence: "Automatique à chaque article (via Make)",
    appButton: true,
  },
  {
    name: "seo-route",
    label: "SEO Route",
    role: "Fiches destinations pour Google (automatique).",
    description:
      "Génère une fiche par destination, par exemple /vols-pas-chers/barcelone, avec un sélecteur d'aéroport de départ (Bruxelles, Charleroi, Paris, Lyon) : fourchettes de prix, meilleure période, compagnies, bouton d'inscription. But : capter le trafic Google (« vol pas cher Barcelone »). C'est AUTOMATIQUE après chaque scan planifié (les nouvelles villes ont leur fiche, contenu + photo + région, créée toute seule). Le bouton « Lancer » sert à forcer la génération après un scan lancé à la main, si /vols-pas-chers ne s'est pas encore mis à jour.",
    cadence: "Auto après chaque scan (+ bouton manuel)",
    appButton: true,
  },
];

export function findAgent(name: string): AgentDef | undefined {
  return agents.find((a) => a.name === name);
}
