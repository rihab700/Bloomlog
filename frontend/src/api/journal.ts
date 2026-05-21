import { JournalEntryCreate, JournalEntryPublic, JournalEntriesPublic, MoodLogCreate } from "../types";
import { apiRequest } from "./client";

export async function fetchEntries(token: string, page = 1, limit = 10, fromDate?: string, toDate?: string) {
  const query = new URLSearchParams({ offset: String((page - 1) * limit), limit: String(limit) });
  if (fromDate) query.set("from_date", fromDate);
  if (toDate) query.set("to_date", toDate);
  return apiRequest<JournalEntriesPublic>(`/journal-entries/?${query.toString()}`, { method: "GET" }, { token });
}

export async function fetchEntry(token: string, entryId: string) {
  return apiRequest<JournalEntryPublic>(`/journal-entries/${entryId}`, { method: "GET" }, { token });
}

export async function createEntry(token: string, entry: JournalEntryCreate) {
  return apiRequest<JournalEntryPublic>("/journal-entries/", {
    method: "POST",
    body: JSON.stringify(entry),
  }, { token });
}

export async function uploadMedia(token: string, entryId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return apiRequest(`/journal-entries/${entryId}/media/`, {
    method: "POST",
    body: formData,
  }, { token, formData: true });
}

export async function updateEntry(token: string, entryId: string, entryUpdate: Partial<JournalEntryPublic>) {
  return apiRequest<JournalEntryPublic>(`/journal-entries/${entryId}`, {
    method: "PATCH",
    body: JSON.stringify(entryUpdate),
  }, { token });
}

export async function deleteMedia(token: string, entryId: string, mediaId: string) {
  return apiRequest<void>(`/journal-entries/${entryId}/media/${mediaId}`, {
    method: "DELETE",
  }, { token });
}

export async function fetchMoodOptions(entryId: string) {
  return apiRequest<{ emotions: string[]; origins: string[] }>(`/journal-entries/${entryId}/mood/mood-options`, { method: "GET" });
}

export async function createMood(token: string, entryId: string, mood: MoodLogCreate) {
  return apiRequest(`/journal-entries/${entryId}/mood/`, {
    method: "POST",
    body: JSON.stringify(mood),
  }, { token });
}
