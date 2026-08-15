import mobileAds, { AdsConsent } from "react-native-google-mobile-ads";

// Le SDK Google Mobile Ads DOIT etre initialise (mobileAds().initialize())
// avant toute requete de pub (banniere ou native), sinon la requete peut
// echouer silencieusement - piege connu si l'initialisation se fait dans un
// useEffect du layout racine pendant qu'un ecran enfant demande deja une pub
// en parallele. Promise partagee (singleton) : le premier appelant declenche
// vraiment le recueil du consentement RGPD + l'init, tous les suivants
// attendent juste la meme promesse deja en cours.
let readyPromise: Promise<void> | null = null;

export function initAds(): Promise<void> {
  if (!readyPromise) {
    readyPromise = (async () => {
      try {
        await AdsConsent.requestInfoUpdate();
        await AdsConsent.loadAndShowConsentFormIfRequired();
      } catch {
        // Le consentement echoue rarement mais ne doit jamais bloquer l'app.
      }
      await mobileAds().initialize();
    })();
  }
  return readyPromise;
}
