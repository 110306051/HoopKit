import { StyleSheet, Text, View } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import type { HighlightClip } from "@/types/content";

export function MuxHighlightPlayer({ clip }: { clip: HighlightClip }) {
  const player = useVideoPlayer(
    { uri: clip.streamUrl, contentType: "hls" },
    (instance) => {
      instance.currentTime = clip.startSeconds;
    },
  );

  return (
    <View style={styles.card}>
      <VideoView
        player={player}
        nativeControls
        contentFit="contain"
        style={styles.video}
      />
      <View style={styles.meta}>
        <Text style={styles.title}>{clip.title}</Text>
        <Text style={styles.time}>
          {formatTime(clip.startSeconds)} – {formatTime(clip.endSeconds)}
          {clip.player ? ` · ${clip.player.name}` : ""}
        </Text>
      </View>
    </View>
  );
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    borderRadius: 20,
    backgroundColor: "#181e18",
    borderWidth: 1,
    borderColor: "#2c352b",
  },
  video: { width: "100%", aspectRatio: 16 / 9, backgroundColor: "#000" },
  meta: { padding: 14, gap: 4 },
  title: { color: "#fff", fontSize: 16, fontWeight: "800" },
  time: { color: "#9ba598", fontSize: 12 },
});
