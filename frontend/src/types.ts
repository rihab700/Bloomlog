export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface UserPublic {
  id: string;
  email: string;
  full_name?: string | null;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
}

export interface JournalEntryBase {
  title?: string | null;
  body_text?: string | null;
}

export interface JournalEntryCreate extends JournalEntryBase {
  recorded_at?: string | null;
}

export interface MediaPublic {
  id: string;
  media_type: string;
  mime_type: string;
  file_size?: number | null;
  duration?: number | null;
  media_metadata?: Record<string, unknown> | null;
  s3_key: string;
  uploaded_at: string;
  url?: string | null;
}

export interface MoodLogPublic {
  id: string;
  mood_score: number;
  emotions: string[];
  origins: string[];
  logged_at: string;
}

export interface JournalEntryPublic extends JournalEntryBase {
  id: string;
  updated_at: string;
  recorded_at?: string | null;
  cover_media_id?: string | null;
  media: MediaPublic[];
  mood_log?: MoodLogPublic | null;
}

export interface JournalEntriesPublic {
  entries: JournalEntryPublic[];
  count: number;
  page?: number | null;
  page_size?: number | null;
  next_cursor?: string | null;
}

export interface MoodLogCreate {
  mood_score: number;
  emotions: string[];
  origins: string[];
}
