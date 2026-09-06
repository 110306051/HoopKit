import { apiRequest } from "@/lib/api-client";
import type {
  MemberOverview,
  PersonalPlanDetail,
  PersonalPlanItem,
  PersonalPlanSection,
  UserClipList,
  UserClipOptions,
} from "@/types/member";

const authHeaders = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
});

export function getMemberOverview(accessToken: string, signal?: AbortSignal) {
  return apiRequest<MemberOverview>("/me", {
    signal,
    headers: authHeaders(accessToken),
  });
}

export function deleteAccount(accessToken: string) {
  return apiRequest<{ deleted: true }>("/me/account", {
    method: "DELETE",
    body: JSON.stringify({ confirmation: "DELETE" }),
    headers: authHeaders(accessToken),
  });
}

export type ReportTargetType = "user_clip" | "move" | "workout_template";
export type ReportReason =
  "inappropriate" | "copyright" | "misleading" | "safety" | "other";

export function createContentReport(
  accessToken: string,
  input: {
    targetType: ReportTargetType;
    targetId: string;
    reason: ReportReason;
    details?: string;
  },
) {
  return apiRequest<{ id: string; status: string; createdAt: string }>(
    "/me/reports",
    {
      method: "POST",
      body: JSON.stringify(input),
      headers: authHeaders(accessToken),
    },
  );
}

export function favoriteMove(accessToken: string, moveId: string) {
  return apiRequest<{ favorited: true }>(`/me/favorite-moves/${moveId}`, {
    method: "PUT",
    headers: authHeaders(accessToken),
  });
}

export function unfavoriteMove(accessToken: string, moveId: string) {
  return apiRequest<{ favorited: false }>(`/me/favorite-moves/${moveId}`, {
    method: "DELETE",
    headers: authHeaders(accessToken),
  });
}

export function favoriteWorkout(accessToken: string, templateId: string) {
  return apiRequest<{ favorited: true }>(
    `/me/favorite-workouts/${templateId}`,
    { method: "PUT", headers: authHeaders(accessToken) },
  );
}

export function unfavoriteWorkout(accessToken: string, templateId: string) {
  return apiRequest<{ favorited: false }>(
    `/me/favorite-workouts/${templateId}`,
    { method: "DELETE", headers: authHeaders(accessToken) },
  );
}

export function cloneWorkoutTemplate(accessToken: string, templateId: string) {
  return apiRequest<{ id: string; name: string }>(
    `/me/workout-plans/from-template/${templateId}`,
    {
      method: "POST",
      body: JSON.stringify({}),
      headers: authHeaders(accessToken),
    },
  );
}

export function createPersonalPlan(
  accessToken: string,
  input: { name: string; description?: string },
) {
  return apiRequest<{ id: string; name: string }>("/me/workout-plans", {
    method: "POST",
    body: JSON.stringify(input),
    headers: authHeaders(accessToken),
  });
}

export function getPersonalPlan(
  accessToken: string,
  planId: string,
  signal?: AbortSignal,
) {
  return apiRequest<PersonalPlanDetail>(`/me/workout-plans/${planId}`, {
    signal,
    headers: authHeaders(accessToken),
  });
}

export function updatePersonalPlan(
  accessToken: string,
  planId: string,
  input: { name?: string; description?: string },
) {
  return apiRequest(`/me/workout-plans/${planId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
    headers: authHeaders(accessToken),
  });
}

export function deletePersonalPlan(accessToken: string, planId: string) {
  return apiRequest<{ deleted: true }>(`/me/workout-plans/${planId}`, {
    method: "DELETE",
    headers: authHeaders(accessToken),
  });
}

export function createPlanSection(
  accessToken: string,
  planId: string,
  name: string,
) {
  return apiRequest<PersonalPlanSection>(
    `/me/workout-plans/${planId}/sections`,
    {
      method: "POST",
      body: JSON.stringify({ name }),
      headers: authHeaders(accessToken),
    },
  );
}

export function updatePlanSection(
  accessToken: string,
  planId: string,
  sectionId: string,
  name: string,
) {
  return apiRequest(`/me/workout-plans/${planId}/sections/${sectionId}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
    headers: authHeaders(accessToken),
  });
}

export function deletePlanSection(
  accessToken: string,
  planId: string,
  sectionId: string,
) {
  return apiRequest<{ deleted: true }>(
    `/me/workout-plans/${planId}/sections/${sectionId}`,
    { method: "DELETE", headers: authHeaders(accessToken) },
  );
}

export function reorderPlanSections(
  accessToken: string,
  planId: string,
  ids: string[],
) {
  return apiRequest<{ reordered: true }>(
    `/me/workout-plans/${planId}/sections/reorder`,
    {
      method: "PUT",
      body: JSON.stringify({ ids }),
      headers: authHeaders(accessToken),
    },
  );
}

export type PlanItemInput = {
  moveId?: string;
  title: string;
  instructions?: string;
  sets?: number;
  reps?: number;
  durationSeconds?: number;
  restSeconds?: number;
};

export function createPlanItem(
  accessToken: string,
  planId: string,
  sectionId: string,
  input: PlanItemInput,
) {
  return apiRequest<PersonalPlanItem>(
    `/me/workout-plans/${planId}/sections/${sectionId}/items`,
    {
      method: "POST",
      body: JSON.stringify(input),
      headers: authHeaders(accessToken),
    },
  );
}

export function updatePlanItem(
  accessToken: string,
  planId: string,
  itemId: string,
  input: Omit<PlanItemInput, "moveId">,
) {
  return apiRequest(`/me/workout-plans/${planId}/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
    headers: authHeaders(accessToken),
  });
}

export function deletePlanItem(
  accessToken: string,
  planId: string,
  itemId: string,
) {
  return apiRequest<{ deleted: true }>(
    `/me/workout-plans/${planId}/items/${itemId}`,
    { method: "DELETE", headers: authHeaders(accessToken) },
  );
}

export function reorderPlanItems(
  accessToken: string,
  planId: string,
  sectionId: string,
  ids: string[],
) {
  return apiRequest<{ reordered: true }>(
    `/me/workout-plans/${planId}/sections/${sectionId}/items/reorder`,
    {
      method: "PUT",
      body: JSON.stringify({ ids }),
      headers: authHeaders(accessToken),
    },
  );
}

export function getUserClips(accessToken: string, signal?: AbortSignal) {
  return apiRequest<UserClipList>("/me/clips", {
    signal,
    headers: authHeaders(accessToken),
  });
}

export function getUserClipOptions(accessToken: string, signal?: AbortSignal) {
  return apiRequest<UserClipOptions>("/me/clips/options", {
    signal,
    headers: authHeaders(accessToken),
  });
}

export type CreateUserClipUploadInput = {
  title: string;
  description?: string;
  playerIds: string[];
  tags: string[];
  fileName: string;
  contentType: string;
  fileSize: number;
};

export function createUserClipUpload(
  accessToken: string,
  input: CreateUserClipUploadInput,
) {
  return apiRequest<{ clipId: string; uploadId: string; uploadUrl: string }>(
    "/me/clips/upload-url",
    {
      method: "POST",
      body: JSON.stringify(input),
      headers: authHeaders(accessToken),
    },
  );
}

export function deleteUserClip(accessToken: string, clipId: string) {
  return apiRequest<{ deleted: true }>(`/me/clips/${clipId}`, {
    method: "DELETE",
    headers: authHeaders(accessToken),
  });
}
