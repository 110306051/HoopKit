import { DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { SessionProvider } from "@/providers/session-provider";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SessionProvider>
      <ThemeProvider value={DefaultTheme}>
        <StatusBar style="dark" />
        <AnimatedSplashOverlay />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: "#ffffff" },
            headerTintColor: "#111111",
            headerShadowVisible: false,
            headerTitleStyle: { fontWeight: "800" },
            contentStyle: { backgroundColor: "#ffffff" },
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
