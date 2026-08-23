// Config dynamique (au lieu de app.json statique) uniquement pour pouvoir
// lire GOOGLE_SERVICES_JSON (variable d'environnement fichier EAS) au moment
// du build - google-services.json contient une cle et reste hors de git,
// donc EAS ne peut pas l'uploader tel quel depuis le repo local (avertissement
// vu au premier essai de build : "not checked in to your repository").
// En local (npm run web / dev client), le fichier existe physiquement dans
// le dossier donc le chemin relatif marche directement.
const { withSentry } = require("@sentry/react-native/expo");

const config = {
  expo: {
    name: "BonVoleur",
    slug: "bonvoleur-app",
    scheme: "bonvoleur",
    version: "1.2.5",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    ios: {
      supportsTablet: true,
    },
    android: {
      package: "com.bonvoleur.app",
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundImage: "./assets/android-icon-background.png",
        monochromeImage: "./assets/android-icon-monochrome.png",
      },
      predictiveBackGestureEnabled: false,
      // Android App Links : le retour Stripe (success_url/return_url =
      // site.canonicalBase + "/compte...") ouvre l'app au lieu du navigateur.
      // autoVerify:true declenche la verification du domaine via
      // /.well-known/assetlinks.json (public/.well-known/assetlinks.json,
      // empreinte SHA256 du certificat de signature genere localement).
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            { scheme: "https", host: "www.bonvoleur.com", pathPrefix: "/compte" },
            { scheme: "https", host: "bonvoleur.com", pathPrefix: "/compte" },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: [
      "expo-router",
      "expo-status-bar",
      [
        "expo-splash-screen",
        {
          image: "./assets/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
        },
      ],
      "expo-font",
      "expo-image",
      "expo-secure-store",
      "expo-web-browser",
      [
        "expo-notifications",
        {
          // Icone de notification Android : DOIT etre une silhouette blanche
          // sur fond transparent (pas de couleur) - Android teinte cette
          // silhouette avec `color` au lieu de l'afficher telle quelle.
          // Sans ce reglage, Android affiche un rond generique par defaut.
          icon: "./assets/plane-mark-white.png",
          color: "#0ea5e9",
        },
      ],
      "@react-native-community/datetimepicker",
      [
        "react-native-google-mobile-ads",
        {
          androidAppId: "ca-app-pub-3549294158319032~5588353652",
        },
      ],
    ],
    extra: {
      router: {},
      eas: {
        projectId: "b441eec0-fdda-4019-b2d4-e7621c6abee3",
      },
    },
    owner: "thozma",
  },
};

// Pas de authToken pour l'instant (pas d'upload de source maps/symboles de
// debug automatique au build - meme choix que cote site web pour l'instant,
// stack traces minifiees mais capture d'erreur deja fonctionnelle). A
// ajouter plus tard (SENTRY_AUTH_TOKEN en secret EAS) si besoin de stack
// traces lisibles.
module.exports = withSentry(config, {
  url: "https://sentry.io/",
  project: "react-native",
  organization: "bonvoleur",
});
