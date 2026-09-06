import { DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as Sentry from "@sentry/react-native";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { Fonts, Playbook } from "@/constants/theme";
import { SessionProvider } from "@/providers/session-provider";

SplashScreen.preventAutoHideAsync();

const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();

Sentry.init({
  dsn: sentryDsn,
  enabled: Boolean(sentryDsn),
  environment: __DEV__ ? "development" : "production",
  tracesSampleRate: 0.1,
});

function RootLayout() {
  return (
    <SessionProvider>
      <ThemeProvider value={DefaultTheme}>
        <StatusBar style="dark" />
        <AnimatedSplashOverlay />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: Playbook.paper },
            headerTintColor: Playbook.ink,
            headerShadowVisible: false,
            headerTitleStyle: {
              fontFamily: Fonts.display,
              fontSize: 20,
              fontWeight: "900",
            },
            headerBackButtonDisplayMode: "minimal",
            contentStyle: { backgroundColor: Playbook.canvas },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="moves/[slug]" options={{ title: "招式詳細" }} />
          <Stack.Screen
            name="workouts/index"
            options={{ title: "公開訓練菜單" }}
          />
          <Stack.Screen
            name="workouts/[slug]"
            options={{ title: "菜單詳細" }}
          />
          <Stack.Screen name="account" options={{ title: "我的 HoopKit" }} />
          <Stack.Screen
            name="legal/privacy"
            options={{ title: "隱私權政策" }}
          />
          <Stack.Screen name="legal/terms" options={{ title: "服務條款" }} />
          <Stack.Screen name="my-clips/index" options={{ title: "我的片段" }} />
          <Stack.Screen
            name="my-plans/[id]"
            options={{ title: "編輯個人菜單" }}
          />
          <Stack.Screen name="training/[id]" options={{ title: "訓練執行" }} />
          <Stack.Screen
            name="training/history"
            options={{ title: "訓練紀錄" }}
          />
        </Stack>
      </ThemeProvider>
    </SessionProvider>
  );
}

export default Sentry.wrap(RootLayout);
