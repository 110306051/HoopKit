import { apiRequest } from "@/lib/api-client";
import type {
  WorkoutSessionDetail,
  WorkoutSessionSummary,
} from "@/types/member";

const authHeaders = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
});

export function startWorkoutSession(accessToken: string, planId: string) {
  return apiRequest<WorkoutSessionDetail>("/me/workout-sessions", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ planId }),
  });
}

export function getWorkoutSession(
  accessToken: string,
  sessionId: string,
  signal?: AbortSignal,
) {
  return apiRequest<WorkoutSessionDetail>(`/me/workout-sessions/${sessionId}`, {
    headers: authHeaders(accessToken),
    signal,
  });
}

export function getActiveWorkoutSession(accessToken: string) {
  return apiRequest<WorkoutSessionDetail | null>(
    "/me/workout-sessions/active",
    {
      headers: authHeaders(accessToken),
    },
  );
}

export function listWorkoutSessions(accessToken: string, signal?: AbortSignal) {
  return apiRequest<{ items: WorkoutSessionSummary[] }>(
    "/me/workout-sessions",
    { headers: authHeaders(accessToken), signal },
  );
}

function sessionAction(
  accessToken: string,
  sessionId: string,
  action: "pause" | "resume" | "abandon",
) {
  return apiRequest<WorkoutSessionDetail>(
    `/me/workout-sessions/${sessionId}/${action}`,
    { method: "POST", headers: authHeaders(accessToken) },
  );
}

export const pauseWorkoutSession = (accessToken: string, sessionId: string) =>
  sessionAction(accessToken, sessionId, "pause");

export const resumeWorkoutSession = (accessToken: string, sessionId: string) =>
  sessionAction(accessToken, sessionId, "resume");

export const abandonWorkoutSession = (accessToken: string, sessionId: string) =>
  sessionAction(accessToken, sessionId, "abandon");

function itemAction(
  accessToken: string,
  sessionId: string,
  itemId: string,
  action: "complete-set" | "skip",
) {
  return apiRequest<WorkoutSessionDetail>(
    `/me/workout-sessions/${sessionId}/items/${itemId}/${action}`,
    { method: "POST", headers: authHeaders(accessToken) },
  );
}

export const completeWorkoutSet = (
  accessToken: string,
  sessionId: string,
  itemId: string,
) => itemAction(accessToken, sessionId, itemId, "complete-set");

export const skipWorkoutItem = (
  accessToken: string,
  sessionId: string,
  itemId: string,
) => itemAction(accessToken, sessionId, itemId, "skip");
