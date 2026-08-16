const { getSentryExpoConfig } = require("@sentry/react-native/metro");

// getSentryExpoConfig enveloppe getDefaultConfig (expo/metro-config) - meme
// config de base, avec en plus l'instrumentation Sentry necessaire au bon
// fonctionnement du SDK (upload de source maps notamment).
const config = getSentryExpoConfig(__dirname);

// react-native-markdown-display -> markdown-it importe le module Node
// "punycode" (deprecie, retire des versions recentes de markdown-it, mais
// react-native-markdown-display est bloque sur une vieille version). Le
// runtime natif (Hermes) n'a pas ce module Node - ca fait planter le bundling
// Android/iOS (passait inapercu sur `npm run web`, qui le tolere). On
// redirige vers le paquet npm "punycode" (polyfill userland, meme API).
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  punycode: require.resolve("punycode"),
};

module.exports = config;
