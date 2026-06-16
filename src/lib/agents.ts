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
      "Rédige automatiquement un article de blog long et optimisé pour Google (guide, conseils, destinations), avec une FAQ en bas. L'article est enregistré en brouillon : tu le relis avant publication. Sert à attirer du trafic gratuit depuis Google et à donner du contenu à partager.",
    cadence: "Tous les 2 jours à 19h",
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
    role: "Crée des pages Google par trajet.",
    description:
      "Génère une page par trajet, par exemple /vols-pas-chers/bruxelles-barcelone. Le but : quand quelqu'un tape « vol pas cher Bruxelles Barcelone » sur Google, il tombe sur notre site. Chaque page donne le prix moyen, la meilleure période, les compagnies, et un bouton pour s'inscrire. C'est ce qu'on appelle le SEO programmatique : beaucoup de pages ciblées pour capter le trafic Google gratuitement.",
    cadence: "Sur demande (via Claude Code)",
    appButton: false,
  },
];

export function findAgent(name: string): AgentDef | undefined {
  return agents.find((a) => a.name === name);
}
