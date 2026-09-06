import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Fonts, Playbook } from "@/constants/theme";

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  busy?: boolean;
  error?: string | null;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * Cross-platform confirmation dialog for actions that should not execute from
 * a single accidental tap. React Native Web does not implement Alert.alert(),
 * so this component deliberately uses Modal on every platform.
 */
export function ConfirmDialog({
  visible,
  title,
  description,
  confirmLabel,
  cancelLabel = "取消",
  busy = false,
  error,
  destructive = true,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={() => {
        if (!busy) onCancel();
      }}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel={cancelLabel}
          accessibilityRole="button"
          disabled={busy}
          onPress={onCancel}
          style={StyleSheet.absoluteFill}
        />
        <View accessibilityViewIsModal style={styles.dialog}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={onCancel}
              style={[
                styles.button,
                styles.cancelButton,
                busy && styles.disabled,
              ]}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={onConfirm}
              style={[
                styles.button,
                destructive ? styles.dangerButton : styles.confirmButton,
                busy && styles.disabled,
              ]}
            >
              {busy ? (
                <ActivityIndicator color={Playbook.paper} size="small" />
              ) : (
                <Text style={styles.confirmText}>{confirmLabel}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    padding: 20,
  },
  dialog: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 10,
    backgroundColor: Playbook.paper,
    padding: 20,
    gap: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 12,
  },
  title: { color: Playbook.ink, fontFamily: Fonts.display, fontSize: 24, fontWeight: "900" },
  description: { color: Playbook.muted, fontSize: 14, lineHeight: 21 },
  error: { color: Playbook.danger, fontSize: 13, lineHeight: 19 },
  actions: { flexDirection: "row", gap: 10, marginTop: 6 },
  button: {
    flex: 1,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    paddingHorizontal: 14,
  },
  cancelButton: { borderWidth: 1, borderColor: Playbook.line },
  confirmButton: { backgroundColor: Playbook.ink },
  dangerButton: { backgroundColor: Playbook.danger },
  cancelText: { color: Playbook.inkSoft, fontWeight: "800" },
  confirmText: { color: Playbook.paper, fontWeight: "900" },
  disabled: { opacity: 0.55 },
});
