// Extends app.json. This is a separate file because JSON can't read
// environment variables, and the Android Google Maps key must never be
// committed. It's only needed for standalone Android builds, not Expo Go.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    config: {
      googleMaps: { apiKey: process.env.GOOGLE_MAPS_API_KEY },
    },
  },
});
