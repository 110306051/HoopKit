import type { CSSProperties } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Fonts, Playbook } from "@/constants/theme";
import type { HighlightClip } from "@/types/content";

export function MuxHighlightPlayer({ clip }: { clip: HighlightClip }) {
  const query = new URLSearchParams({
    "metadata-video-title": clip.title,
    "start-time": String(clip.startSeconds),
  });
  const playerUrl = `https://player.mux.com/${encodeURIComponent(clip.playbackId)}?${query.toString()}`;

  return (
    <View style={styles.card}>
      <iframe
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
        src={playerUrl}
        style={iframeStyle}
        title={`${clip.title} 影片`}
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

const iframeStyle: CSSProperties = {
  aspectRatio: "16 / 9",
  background: "#000",
  border: 0,
  display: "block",
  width: "100%",
};

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    backgroundColor: Playbook.film,
    borderWidth: 1,
    borderColor: "#27282D",
  },
  meta: { padding: 14, gap: 4 },
  title: {
    color: Playbook.paper,
    fontFamily: Fonts.display,
    fontSize: 20,
    fontWeight: "900",
  },
  time: { color: "#FFFFFF73", fontFamily: Fonts.mono, fontSize: 10 },
});
