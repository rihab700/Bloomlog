import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchEntry, uploadMedia, createMood, fetchMoodOptions } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { JournalEntryPublic, MoodLogCreate } from "../types";

export default function EntryDetail() {
  const { entryId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [entry, setEntry] = useState<JournalEntryPublic | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [moodError, setMoodError] = useState<string | null>(null);
  const [moodScore, setMoodScore] = useState(5);
  const [emotions, setEmotions] = useState<string[]>([]);
  const [origins, setOrigins] = useState<string[]>([]);
  const [availableEmotions, setAvailableEmotions] = useState<string[]>([]);
  const [availableOrigins, setAvailableOrigins] = useState<string[]>([]);

  useEffect(() => {
    if (!token || !entryId) return;

    fetchEntry(token, entryId)
      .then(setEntry)
      .catch(() => navigate("/"));

    fetchMoodOptions(entryId)
      .then((options) => {
        setAvailableEmotions(options.emotions);
        setAvailableOrigins(options.origins);
      })
      .catch(() => {
        setAvailableEmotions([]);
        setAvailableOrigins([]);
      });
  }, [token, entryId, navigate]);

  const handleMediaUpload = async () => {
    if (!token || !entryId || !mediaFile) return;
    setUploadError(null);
    try {
      await uploadMedia(token, entryId, mediaFile);
      if (entryId) {
        const refreshed = await fetchEntry(token, entryId);
        setEntry(refreshed);
      }
      setMediaFile(null);
    } catch (err) {
      setUploadError("Media upload failed. Check file type and try again.");
    }
  };

  const handleMoodSave = async () => {
    if (!token || !entryId) return;
    setMoodError(null);

    const moodPayload: MoodLogCreate = {
      mood_score: moodScore,
      emotions,
      origins,
    };

    try {
      await createMood(token, entryId, moodPayload);
      if (entryId) {
        const refreshed = await fetchEntry(token, entryId);
        setEntry(refreshed);
      }
    } catch (err) {
      setMoodError("Unable to save mood log. It may already exist.");
    }
  };

  if (!entry) {
    return <div className="page-container">Loading entry…</div>;
  }

  return (
    <div className="page-container">
      <div className="card card-wide">
        <button type="button" className="link-button" onClick={() => navigate(-1)}>
          ← Back
        </button>

        <h1>{entry.title || "Untitled entry"}</h1>
        <p>{entry.body_text || "No content"}</p>
        <p className="meta">Recorded at: {entry.recorded_at ? new Date(entry.recorded_at).toLocaleString() : "Not set"}</p>

        <section>
          <h2>Media attachments</h2>
          <div className="form-grid">
            <input type="file" onChange={(event) => setMediaFile(event.target.files?.[0] ?? null)} />
            <button type="button" onClick={handleMediaUpload} disabled={!mediaFile}>
              Upload media
            </button>
          </div>
          {uploadError && <div className="error">{uploadError}</div>}

          <div className="media-list">
            {entry.media.length === 0 ? (
              <p>No media attachments yet.</p>
            ) : (
              entry.media.map((item) => (
                <div key={item.id} className="media-item">
                  <div>{item.mime_type}</div>
                  <div>{item.file_size ? `${item.file_size} bytes` : "Size unknown"}</div>
                  <a href={item.url || "#"} target="_blank" rel="noreferrer">
                    View
                  </a>
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <h2>Mood log</h2>
          {entry.mood_log ? (
            <div className="mood-card">
              <p>Score: {entry.mood_log.mood_score}</p>
              <p>Emotions: {entry.mood_log.emotions.join(", ")}</p>
              <p>Origins: {entry.mood_log.origins.join(", ")}</p>
              <p>Logged at: {new Date(entry.mood_log.logged_at).toLocaleString()}</p>
            </div>
          ) : (
            <div className="form-grid">
              <label>
                Intensity
                <input
                  type="range"
                  value={moodScore}
                  min={1}
                  max={10}
                  onChange={(event) => setMoodScore(Number(event.target.value))}
                />
                <span>{moodScore}</span>
              </label>
              <label>
                Emotions
                <select multiple value={emotions} onChange={(event) => setEmotions(Array.from(event.currentTarget.selectedOptions, (option) => option.value))}>
                  {availableEmotions.map((emotion) => (
                    <option key={emotion} value={emotion}>
                      {emotion}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Origins
                <select multiple value={origins} onChange={(event) => setOrigins(Array.from(event.currentTarget.selectedOptions, (option) => option.value))}>
                  {availableOrigins.map((origin) => (
                    <option key={origin} value={origin}>
                      {origin}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" onClick={handleMoodSave}>
                Save mood log
              </button>
            </div>
          )}
          {moodError && <div className="error">{moodError}</div>}
        </section>
      </div>
    </div>
  );
}
