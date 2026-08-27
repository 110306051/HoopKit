import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

export function LoadingState({ label = "載入訓練內容…" }: { label?: string }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator color="#111111" size="large" />
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
    color: "#111111",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  text: { color: "#666666", fontSize: 14, lineHeight: 21, textAlign: "center" },
  button: {
    marginTop: 4,
    borderRadius: 14,
    backgroundColor: "#111111",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  buttonText: { color: "#ffffff", fontWeight: "800" },
});
