import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Fonts, Playbook } from "@/constants/theme";

export function LoadingState({ label = "載入訓練內容…" }: { label?: string }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={Playbook.orange} size="large" />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>內容暫時無法載入</Text>
      <Text style={styles.text}>{message}</Text>
      <Pressable onPress={onRetry} style={styles.button}>
        <Text style={styles.buttonText}>重新嘗試</Text>
      </Pressable>
    </View>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>還沒有內容</Text>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 280,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    padding: 28,
  },
  title: {
    color: Playbook.ink,
    fontFamily: Fonts.display,
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  text: { color: Playbook.muted, fontSize: 14, lineHeight: 21, textAlign: "center" },
  button: {
    marginTop: 4,
    borderRadius: 8,
    backgroundColor: Playbook.ink,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  buttonText: { color: Playbook.paper, fontWeight: "800" },
});
