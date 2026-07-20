module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo already includes the expo-router and reanimated plugins.
    presets: ["babel-preset-expo"],
  };
};
