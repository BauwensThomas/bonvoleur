# BonVoleur.com

Newsletter et plateforme d'alertes de vols pas chers depuis la Belgique et la France.

On surveille les prix des vols depuis les aéroports belges et français (BRU, CRL, LGG, CDG, LYS, etc.) et on envoie des alertes aux abonnés quand une promotion exceptionnelle ou une erreur de prix apparaît. Les abonnés réservent directement sur le site de la compagnie : nous ne vendons pas de billets.

Stack : Next.js / TypeScript / Tailwind CSS.

## Maintenance temporaire

Pour afficher la page de maintenance sans interrompre les routes cron, push et
mobile, définir dans l'environnement de déploiement :

```env
SITE_MAINTENANCE_ENABLED=TRUE
SITE_MAINTENANCE_UNTIL=2026-09-17T00:00:00+02:00
```

La page `/maintenance` est accessible pendant la coupure et le site se rouvre
automatiquement après la date indiquée. Mettre `SITE_MAINTENANCE_ENABLED=FALSE`
pour rouvrir immédiatement. Après un changement dans Vercel, redéployer le
projet.
