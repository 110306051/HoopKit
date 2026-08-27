import { apiRequest } from "@/lib/api-client";
import type {
  MoveDetail,
  MoveSummary,
  Paginated,
  WorkoutDetail,
  WorkoutSummary,
} from "@/types/content";

export function getMoves(signal?: AbortSignal) {
  return apiRequest<Paginated<MoveSummary>>("/moves?limit=50", { signal });
}

export function getMove(slug: string, signal?: AbortSignal) {
  return apiRequest<MoveDetail>(`/moves/${encodeURIComponent(slug)}`, {
    signal,
  });
}

export function getWorkouts(signal?: AbortSignal) {
  return apiRequest<Paginated<WorkoutSummary>>("/workout-templates?limit=50", {
    signal,
  });
}

export function getWorkout(slug: string, signal?: AbortSignal) {
  return apiRequest<WorkoutDetail>(
    `/workout-templates/${encodeURIComponent(slug)}`,
    { signal },
  );
}
