export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
};

export type AuthAccount = { id: string; email: string | null };

export type AuthResponse = {
  user: AuthAccount | null;
  session: AuthSession | null;
  requiresEmailConfirmation?: boolean;
};

export type MemberOverview = {
  account: AuthAccount;
  profile: {
    displayName: string;
    avatarPath: string | null;
    skillLevel: string | null;
    dominantHand: string | null;
  } | null;
  favoriteMoves: {
    id: string;
    slug: string;
    name: string;
    summary: string;
  }[];
  favoriteWorkouts: {
    id: string;
    slug: string;
    name: string;
    description: string;
  }[];
  plans: {
    id: string;
    name: string;
    description: string;
    sourceTemplateId: string | null;
    updatedAt: string;
  }[];
};

export type PersonalPlanItem = {
  id: string;
  title: string;
  instructions: string;
  sets: number | null;
  reps: number | null;
  durationSeconds: number | null;
  restSeconds: number;
  sortOrder: number;
  move: { id: string; slug: string; name: string } | null;
};

export type PersonalPlanSection = {
  id: string;
  name: string;
  sortOrder: number;
  items: PersonalPlanItem[];
};

export type PersonalPlanDetail = {
  id: string;
  name: string;
  description: string;
  sourceTemplateId: string | null;
  updatedAt: string;
  sections: PersonalPlanSection[];
};

export type UserClipPlayer = {
  id: string;
  slug: string;
  name: string;
  shortName: string | null;
  avatarUrl: string | null;
};

export type UserClip = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  status: "pending" | "ready" | "errored";
  playbackId: string | null;
  streamUrl: string | null;
  thumbnailUrl: string | null;
  durationMs: number | null;
  originalFileName: string;
  fileSizeBytes: number;
  errorMessage: string | null;
  createdAt: string;
  players: UserClipPlayer[];
};

export type UserClipList = { items: UserClip[] };
export type UserClipOptions = { players: UserClipPlayer[] };

export type WorkoutSessionStatus =
  "active" | "paused" | "completed" | "abandoned";

export type WorkoutSessionItemStatus = "pending" | "completed" | "skipped";

export type WorkoutSessionSummary = {
  id: string;
  sourcePlanId: string | null;
  planName: string;
  planDescription: string;
  status: WorkoutSessionStatus;
  startedAt: string;
  pausedAt: string | null;
  accumulatedPauseSeconds: number;
  completedAt: string | null;
  elapsedSeconds: number | null;
  currentItemIndex: number;
  totalItems: number;
  completedItems: number;
};

export type WorkoutSessionItem = {
  id: string;
  moveId: string | null;
  moveSlug: string | null;
  title: string;
  instructions: string;
  sets: number | null;
  reps: number | null;
  durationSeconds: number | null;
  restSeconds: number;
  globalSortOrder: number;
  completedSets: number;
  status: WorkoutSessionItemStatus;
  completedAt: string | null;
};

export type WorkoutSessionDetail = WorkoutSessionSummary & {
  serverNow: string;
  sections: {
    id: string;
    name: string;
    sortOrder: number;
    items: WorkoutSessionItem[];
  }[];
};
