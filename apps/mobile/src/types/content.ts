export type PlayerSummary = {
  id: string;
  slug: string;
  name: string;
  shortName: string | null;
  avatarUrl: string | null;
};

export type MediaSummary = {
  id: string;
  title: string;
  kind: string;
  sourceUrl: string | null;
  thumbnailUrl: string | null;
  durationMs: number | null;
};

export type MoveSummary = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  difficulty: string;
  publishedAt: string;
  category: { id: string; slug: string; name: string } | null;
  cover: MediaSummary | null;
  players: PlayerSummary[];
};

export type HighlightClip = {
  id: string;
  title: string;
  startSeconds: number;
  endSeconds: number;
  coverTimeSeconds: number | null;
  player: PlayerSummary | null;
  playbackId: string;
  streamUrl: string;
  thumbnailUrl: string;
};

export type MoveDetail = MoveSummary & {
  howToUse: string;
  whenToUse: string;
  coachingCues: string[];
  commonMistakes: string[];
  tags: { id: string; slug: string; name: string }[];
  steps: { id: string; title: string; description: string }[];
  clips: HighlightClip[];
};

export type WorkoutSummary = {
  id: string;
  slug: string;
  name: string;
  description: string;
  difficulty: string;
  estimatedDurationMinutes: number | null;
  publishedAt: string;
  sourcePlayer: PlayerSummary | null;
  cover: MediaSummary | null;
};

export type WorkoutDetail = WorkoutSummary & {
  warmupNotes: string;
  sections: {
    id: string;
    name: string;
    description: string;
    items: {
      id: string;
      title: string;
      instructions: string;
      sets: number | null;
      reps: number | null;
      durationSeconds: number | null;
      restSeconds: number;
      move: { slug: string; name: string } | null;
    }[];
  }[];
};

export type Paginated<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
};
