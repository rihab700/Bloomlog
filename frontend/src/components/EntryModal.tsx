import React, { useEffect, useState } from "react";
import { JournalEntryPublic } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { uploadMedia, fetchMoodOptions, createMood, deleteMedia } from "../api";

type Props = {
  entry: JournalEntryPublic | null;
  onClose: () => void;
  onSaved?: () => void;
};

export default function EntryModal({ entry, onClose, onSaved }: Props) {
  const { token } = useAuth();
  const [files, setFiles] = useState<File[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [mediaList, setMediaList] = useState(entry?.media ?? []);
  const [availableEmotions, setAvailableEmotions] = useState<string[]>([]);
  const [availableOrigins, setAvailableOrigins] = useState<string[]>([]);
  const [moodScore, setMoodScore] = useState(5);
  const [emotions, setEmotions] = useState<string[]>([]);
  const [origins, setOrigins] = useState<string[]>([]);
  const [newEmotion, setNewEmotion] = useState("");
  const [newOrigin, setNewOrigin] = useState("");

  useEffect(() => {
    if (!entry) return;
    setMediaList(entry.media ?? []);

    (async () => {
      try {
        const opts = await fetchMoodOptions(entry.id);
        setAvailableEmotions(opts.emotions);
        setAvailableOrigins(opts.origins);
      } catch (e) {
        setAvailableEmotions([]);
        setAvailableOrigins([]);
      }
    })();
  }, [entry]);

  if (!entry) return null;

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.currentTarget.files;
    if (!list) return setFiles(null);
    setFiles(Array.from(list));
  };

  const handleUpload = async () => {
    if (!files || !token) return;
    setUploading(true);
    try {
      for (const f of files) {
        const m = await uploadMedia(token, entry.id, f);
        // API returns created media; append to list
        setMediaList((cur) => (cur ? [m as any, ...cur] : [m as any]));
      }
      setFiles(null);
    } catch (err) {
      // ignore for now; UI could show error
      console.error("upload failed", err);
    } finally {
      setUploading(false);
    }
  };


  const handleAddEmotion = () => {
    const trimmed = newEmotion.trim();
    if (!trimmed || availableEmotions.includes(trimmed) || emotions.includes(trimmed)) {
      setNewEmotion("");
      return;
    }
    setAvailableEmotions((current) => [...current, trimmed]);
    setEmotions((current) => [...current, trimmed]);
    setNewEmotion("");
  };

  const handleAddOrigin = () => {
    const trimmed = newOrigin.trim();
    if (!trimmed || availableOrigins.includes(trimmed) || origins.includes(trimmed)) {
      setNewOrigin("");
      return;
    }
    setAvailableOrigins((current) => [...current, trimmed]);
    setOrigins((current) => [...current, trimmed]);
    setNewOrigin("");
  };

  const toggleEmotion = (value: string) => {
    setEmotions((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  };

  const toggleOrigin = (value: string) => {
    setOrigins((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  };

  const handleSaveMood = async () => {
    if (!token) return;
    try {
      await createMood(token, entry.id, {
        mood_score: moodScore,
        emotions,
        origins,
      });
      if (onSaved) onSaved();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="modal-overlay" role="dialog">
      <div className="modal-card">
        <header className="modal-header">
          <button className="modal-back" onClick={onClose}>←</button>
          <h3>Edit</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </header>

        <div className="modal-body">
          <label>
            Date
            <input value={entry.recorded_at ? new Date(entry.recorded_at).toLocaleDateString() : ""} readOnly />
          </label>
          <label>
            Name
            <input value={entry.title ?? ""} readOnly />
          </label>

          <label>
            Attachments (photos, audio, video, pdf)
            <input type="file" multiple onChange={handleFiles} />
            <div style={{ marginTop: 8 }}>
              <button className="btn" onClick={handleUpload} disabled={!files || uploading}>
                {uploading ? "Uploading…" : `Upload ${files ? `(${files.length})` : ""}`}
              </button>
            </div>
          </label>

          <label>
            Media
            <div className="media-list">
              {mediaList.length === 0 ? (
                <div>No media</div>
              ) : (
                mediaList.map((m, idx) => (
                  <div key={(m as any).id} className="media-item">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        {(m as any).mime_type?.startsWith("image/") ? (
                          <img src={(m as any).url} style={{ height: 48, borderRadius: 6 }} alt="media" />
                        ) : (m as any).mime_type?.startsWith("video/") ? (
                          <video src={(m as any).url} style={{ height: 48, borderRadius: 6 }} autoPlay muted loop playsInline />
                        ) : (
                          <div style={{ height: 48, width: 80, display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6", borderRadius: 6 }}>
                            <small>{(m as any).mime_type?.split("/")[0] || "file"}</small>
                          </div>
                        )}
                      </div>
                      <div style={{ marginLeft: 12, flex: 1 }}>
                        <div style={{ fontWeight: 700 }}>{(m as any).mime_type}</div>
                        <div style={{ color: "#6b7280", fontSize: 12 }}>{(m as any).file_size ? `${(m as any).file_size} bytes` : ""}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: "#6b7280" }}>{idx === 0 ? "Cover" : "Attachment"}</span>
                        <button
                          type="button"
                          className="btn quiet"
                          onClick={async () => {
                            if (!token) return;
                            const ok = window.confirm("Delete this attachment?");
                            if (!ok) return;
                            try {
                              await deleteMedia(token, entry.id, (m as any).id);
                              setMediaList((cur) => (cur ? cur.filter((it) => (it as any).id !== (m as any).id) : []));
                              if (onSaved) onSaved();
                            } catch (err) {
                              console.error("Failed to delete media", err);
                              alert("Failed to delete attachment");
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </label>

          <label>
            Note
            <textarea value={entry.body_text ?? ""} readOnly rows={6} />
          </label>

          <section className="mood-section">
            <h4>Mood</h4>
            <label>
              Intensity
              <input type="range" value={moodScore} min={1} max={10} onChange={(e) => setMoodScore(Number(e.target.value))} />
              <span>{moodScore}</span>
            </label>

            <div className="tag-select-group">
              <label>Emotions</label>
              <div className="tag-selected-row">
                {emotions.length === 0 ? (
                  <span className="tag-hint">Select or add emotions</span>
                ) : (
                  emotions.map((value) => (
                    <button key={value} type="button" className="tag-chip selected" onClick={() => toggleEmotion(value)}>
                      {value} ×
                    </button>
                  ))
                )}
              </div>
              <div className="tag-options-row">
                {availableEmotions.map((value) => (
                  <button key={value} type="button" className={`tag-chip ${emotions.includes(value) ? "selected" : ""}`} onClick={() => toggleEmotion(value)}>
                    {value}
                  </button>
                ))}
              </div>
              <div className="tag-add-row">
                <input value={newEmotion} onChange={(e) => setNewEmotion(e.target.value)} placeholder="Add new emotion" />
                <button type="button" className="btn" onClick={handleAddEmotion}>Add</button>
              </div>
            </div>

            <div className="tag-select-group">
              <label>Origins</label>
              <div className="tag-selected-row">
                {origins.length === 0 ? (
                  <span className="tag-hint">Select or add origins</span>
                ) : (
                  origins.map((value) => (
                    <button key={value} type="button" className="tag-chip selected" onClick={() => toggleOrigin(value)}>
                      {value} ×
                    </button>
                  ))
                )}
              </div>
              <div className="tag-options-row">
                {availableOrigins.map((value) => (
                  <button key={value} type="button" className={`tag-chip ${origins.includes(value) ? "selected" : ""}`} onClick={() => toggleOrigin(value)}>
                    {value}
                  </button>
                ))}
              </div>
              <div className="tag-add-row">
                <input value={newOrigin} onChange={(e) => setNewOrigin(e.target.value)} placeholder="Add new origin" />
                <button type="button" className="btn" onClick={handleAddOrigin}>Add</button>
              </div>
            </div>

            <div style={{ marginTop: 8 }}>
              <button className="btn primary" onClick={handleSaveMood}>Save mood</button>
            </div>
          </section>
        </div>

        <footer className="modal-footer">
          <button className="btn primary" onClick={onClose}>Soumettre</button>
          <button className="btn" onClick={onClose}>Annuler</button>
        </footer>
      </div>
    </div>
  );
}
