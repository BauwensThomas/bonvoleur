module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          root: ["."],
          alias: {
            // sp-react-native-in-app-updates importe react-native-device-info
            // en dur - shim leger base sur expo-constants (deja present)
            // plutot que d'installer le vrai module natif, cf. react-native-device-info.js.
            "react-native-device-info": "./react-native-device-info.js",
          },
        },
      ],
    ],
  };
};
