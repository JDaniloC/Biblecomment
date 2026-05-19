import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "br.com.biblecomment.app",
  appName: "Bible Comment",
  webDir: "src",
  server: {
    url: "https://biblecomment.com.br",
    androidScheme: "https",
    cleartext: false,
  },
  android: {
    // Detected by nextjs middleware (parseClient) for future app-only UI.
    appendUserAgent: "BiblecommentApp/0.1.0 (Android; Capacitor)",
  },
  plugins: {
    SplashScreen: { launchAutoHide: true, launchFadeOutDuration: 300 },
  },
};

export default config;
