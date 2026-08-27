export type ContentStatus = "draft" | "published" | "archived";

export type Player = {
  id: string;
  slug: string;
  fullName: string;
  shortName: string | null;
  bio: string;
  position: string;
  teamName: string | null;
  nationality: string | null;
  avatarPath: string | null;
  status: ContentStatus;
  publishedAt: string | null;
  createdAt?: string;
  updatedAt: string;
};

export type MediaAsset = {
  id: string;
  title: string;
  provider: string;
  providerAssetId: string | null;
  playbackId: string | null;
  kind: string;
  status: string;
  sourceUrl: string | null;
  thumbnailUrl: string | null;
  durationMs: number | null;
  width: number | null;
  height: number | null;
  originalFileName: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Move = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  difficulty: string;
  howToUse: string;
  whenToUse: string;
  coachingCues: string[];
  commonMistakes: string[];
  status: ContentStatus;
  publishedAt: string | null;
  updatedAt: string;
  category: string;
  coverAsset: MediaAsset | null;
  players: Array<(Player & { relation: string }) | null>;
  tags: string[];
  steps: Array<{
    id: string;
    title: string;
    description: string;
    sortOrder: number;
  }>;
  clips: Array<{
    id: string;
    title: string;
    startMs: number;
    endMs: number;
    coverTimeMs: number | null;
    playerName: string | null;
    mediaAsset: MediaAsset | null;
  }>;
};

export type WorkoutTemplate = {
  id: string;
  slug: string;
  name: string;
  description: string;
  warmupNotes: string;
  difficulty: string;
  estimatedDurationMinutes: number | null;
  status: ContentStatus;
  publishedAt: string | null;
  updatedAt: string;
  sourcePlayerName: string | null;
  coverAsset: MediaAsset | null;
  sections: Array<{
    id: string;
    name: string;
    description: string;
    sortOrder: number;
    items: Array<{
      id: string;
      title: string;
      instructions: string;
      sets: number | null;
      reps: number | null;
      durationSeconds: number | null;
      restSeconds: number;
      sortOrder: number;
      moveName: string | null;
    }>;
  }>;
};

export type ContentLibrary = {
  players: Player[];
  moves: Move[];
  workoutTemplates: WorkoutTemplate[];
  mediaAssets: MediaAsset[];
};

export type AdminIdentity = {
  id: string;
  email: string | null;
  role: "editor" | "admin";
};

export type DashboardData = {
  user: AdminIdentity;
  metrics: {
    players: number;
    moves: number;
    workoutTemplates: number;
    mediaAssets: number;
  };
};

export type EditorialOption = {
  id: string;
  name: string;
  status?: ContentStatus;
};

export type EditorialMediaOption = {
  id: string;
  title: string;
  kind: string;
  provider: string;
  status: string;
  thumbnailUrl: string | null;
  sourceUrl: string | null;
  durationMs: number | null;
};

export type EditorialOptions = {
  categories: EditorialOption[];
  tags: EditorialOption[];
  players: EditorialOption[];
  mediaAssets: EditorialMediaOption[];
  moves: EditorialOption[];
};

export type MoveEditor = {
  id: string;
  categoryId: string;
  slug: string;
  name: string;
  summary: string;
  difficulty: string;
  howToUse: string;
  whenToUse: string;
  coachingCues: string[];
  commonMistakes: string[];
  coverAssetId: string | null;
  status: ContentStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  playerIds: string[];
  tagIds: string[];
  steps: Array<{ id?: string; title: string; description: string }>;
  clips: Array<{
    id?: string;
    title: string;
    mediaAssetId: string;
    playerId: string | null;
    startMs: number;
    endMs: number;
    coverTimeMs: number | null;
  }>;
};

export type WorkoutEditorItem = {
  id?: string;
  moveId: string | null;
  title: string;
  instructions: string;
  sets: number | null;
  reps: number | null;
  durationSeconds: number | null;
  restSeconds: number;
};

export type WorkoutEditorSection = {
  id?: string;
  name: string;
  description: string;
  items: WorkoutEditorItem[];
};

export type WorkoutEditor = {
  id: string;
  sourcePlayerId: string | null;
  slug: string;
  name: string;
  description: string;
  warmupNotes: string;
  difficulty: string;
  estimatedDurationMinutes: number | null;
  coverAssetId: string | null;
  status: ContentStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  sections: WorkoutEditorSection[];
};
