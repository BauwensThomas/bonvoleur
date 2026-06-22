// Registre des agents du projet (voir agents-claude.md et .claude/agents/).
// "appButton" = bouton "Lancer" sans argument sur la page Agents.

export interface AgentDef {
  name: string;
  label: string;
  role: string; // résumé court
  description: string; // explication détaillée, en clair
  cadence: string; // quand il tourne
  appButton: boolean; // bouton "Lancer" sur la page Agents
}

export const agents: AgentDef[] = [
  {
    name: "deal-writer",
    label: "Deal Writer",
    role: "Écrit l'email d'un bon plan.",
    description:
      "Quand un bon plan arrive, il met en forme l'email à envoyer : l'objet et le contenu (route, prix, dates, lien pour réserver). Si c'est une erreur de prix, il ajoute l'avertissement. Il n'invente rien : il utilise seulement les infos du deal. Il ne cherche pas les bons plans et ne vérifie pas les liens, c'est le rôle du Scanner.",
    cadence: "Automatique à chaque nouveau deal",
    appButton: false,
  },
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
    name: "social-clipper",
    label: "Social Clipper",
    role: "Partage l'article sur les réseaux.",
    description:
      "Prend le dernier article de blog et crée les publications pour Instagram et Facebook qui le mettent en avant, avec un appel à nous suivre, commenter et partager. Pensé pour fonctionner avec ManyChat (réponses et messages privés automatiques aux commentaires). Tourne 30 minutes après Content Publisher, pour publier juste après que l'article soit prêt.",
    cadence: "30 min après Content Publisher (via ManyChat)",
    appButton: false,
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
