import React, { useEffect, useState, useRef } from "react";
import { JournalEntryPublic } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { uploadMedia, fetchMoodOptions, createMood, deleteMedia, updateEntry } from "../api";

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
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recordedAt, setRecordedAt] = useState<string | null>(entry?.recorded_at ? new Date(entry.recorded_at).toISOString().slice(0,10) : null);
  const [dragOffsets, setDragOffsets] = useState<Record<string, number>>({});
  const [pendingDeletes, setPendingDeletes] = useState<Record<string, { timer: number; media: any }>>({});
  const [toasts, setToasts] = useState<Array<{ id: string; label: string }>>([]);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const carouselRef = useRef<HTMLDivElement | null>(null);
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
    setSelectedIndex(0);
    setRecordedAt(entry.recorded_at ? new Date(entry.recorded_at).toISOString().slice(0,10) : null);

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

  const handleSaveEntry = async () => {
    if (!token) return;
    try {
      const body: any = {};
      if (recordedAt) body.recorded_at = new Date(recordedAt).toISOString();
      const updated = await updateEntry(token, entry.id, body);
      if (onSaved) onSaved();
    } catch (err) {
      console.error("Failed to save entry", err);
      alert("Failed to save entry");
    }
  };

  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    const el = e.currentTarget as Element & { _dragStart?: number };
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    el._dragStart = e.clientX;
  };

  const handlePointerCancel = (e: React.PointerEvent, id: string) => {
    const el = e.currentTarget as Element & { _dragStart?: number };
    if (el._dragStart == null) return;
    el._dragStart = undefined;
    setDragOffsets((prev) => ({ ...prev, [id]: 0 }));
  };

  // Mouse fallback for environments without pointer events
  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    const el = e.currentTarget as Element & { _dragStart?: number };
    e.preventDefault();
    el._dragStart = e.clientX;
  };

  const handleMouseMove = (e: React.MouseEvent, id: string) => {
    const el = e.currentTarget as Element & { _dragStart?: number };
    if (el._dragStart == null) return;
    let dx = e.clientX - el._dragStart;
    if (dx > 0) dx = 0;
    setDragOffsets((prev) => ({ ...prev, [id]: dx }));
  };

  const handleMouseUp = (e: React.MouseEvent, id: string, m: any) => {
    const el = e.currentTarget as Element & { _dragStart?: number };
    if (el._dragStart == null) return;
    const dx = e.clientX - el._dragStart;
    el._dragStart = undefined;
    setDragOffsets((prev) => ({ ...prev, [id]: 0 }));
    if (dx < -80) scheduleDeletion(id, m);
  };

  // Touch fallback
  const handleTouchStart = (e: React.TouchEvent, id: string) => {
    const el = e.currentTarget as Element & { _dragStart?: number };
    el._dragStart = e.touches[0]?.clientX;
  };

  const handleTouchMove = (e: React.TouchEvent, id: string) => {
    const el = e.currentTarget as Element & { _dragStart?: number };
    if (el._dragStart == null) return;
    let dx = e.touches[0]?.clientX - el._dragStart;
    if (dx > 0) dx = 0;
    setDragOffsets((prev) => ({ ...prev, [id]: dx }));
  };

  const handleTouchEnd = (e: React.TouchEvent, id: string, m: any) => {
    const el = e.currentTarget as Element & { _dragStart?: number };
    if (el._dragStart == null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - el._dragStart;
    el._dragStart = undefined;
    setDragOffsets((prev) => ({ ...prev, [id]: 0 }));
    if (dx < -80) scheduleDeletion(id, m);
  };

  const handlePointerMove = (e: React.PointerEvent, id: string) => {
    const el = e.currentTarget as Element & { _dragStart?: number };
    if (el._dragStart == null) return;
    let dx = e.clientX - el._dragStart;
    if (dx > 0) dx = 0; // only allow left swipe
    setDragOffsets((prev) => ({ ...prev, [id]: dx }));
  };

  const performDelete = async (id: string) => {
    const pending = pendingDeletes[id];
    if (!pending) return;
    try {
      if (!token) return;
      await deleteMedia(token, entry.id, id);
      setPendingDeletes((cur) => {
        const copy = { ...cur };
        delete copy[id];
        return copy;
      });
      setToasts((cur) => cur.filter((t) => t.id !== id));
      if (onSaved) onSaved();
    } catch (err) {
      console.error("Failed to delete media", err);
      // restore UI if delete failed
      setPendingDeletes((cur) => {
        const copy = { ...cur };
        delete copy[id];
        return copy;
      });
      setToasts((cur) => cur.filter((t) => t.id !== id));
      alert("Failed to delete attachment");
    }
  };

  const scheduleDeletion = (id: string, m: any) => {
    // optimistic UI: remove from mediaList, show toast with undo, delay actual delete
    setMediaList((cur) => (cur ? cur.filter((it) => (it as any).id !== id) : []));
    setSelectedIndex((cur) => Math.max(0, Math.min(cur, (mediaList.length - 2))));
    const timer = window.setTimeout(() => performDelete(id), 6000);
    setPendingDeletes((cur) => ({ ...cur, [id]: { timer, media: m } }));
    setToasts((cur) => [...cur, { id, label: (m as any).mime_type || "attachment" }]);
  };

  const undoDeletion = (id: string) => {
    const pending = pendingDeletes[id];
    if (!pending) return;
    window.clearTimeout(pending.timer);
    setMediaList((cur) => (cur ? [pending.media, ...cur] : [pending.media]));
    setPendingDeletes((cur) => {
      const copy = { ...cur };
      delete copy[id];
      return copy;
    });
    setToasts((cur) => cur.filter((t) => t.id !== id));
  };

  const updateScrollState = () => {
    const el = carouselRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  const scrollCarousel = (direction: 1 | -1) => {
    const el = carouselRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.75;
    el.scrollBy({ left: amount * direction, behavior: "smooth" });
    window.setTimeout(updateScrollState, 250);
  };

  useEffect(() => {
    updateScrollState();
  }, [mediaList]);

  useEffect(() => {
    return () => {
      // cleanup timers on unmount
      Object.values(pendingDeletes).forEach((p) => window.clearTimeout(p.timer));
    };
  }, [pendingDeletes]);

  const handlePointerUp = (e: React.PointerEvent, id: string, m: any) => {
    const el = e.currentTarget as Element & { _dragStart?: number };
    if (el._dragStart == null) return;
    const dx = e.clientX - el._dragStart;
    el._dragStart = undefined;
    setDragOffsets((prev) => ({ ...prev, [id]: 0 }));
    if (dx < -80) {
      scheduleDeletion(id, m);
    }
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
            <input type="date" value={recordedAt ?? ""} onChange={(e) => setRecordedAt(e.target.value)} />
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
            {mediaList.length === 0 ? (
              <div>No media</div>
            ) : (
              <>
                <div className="media-carousel-wrapper">
                  <button className="carousel-arrow left" type="button" onClick={() => scrollCarousel(-1)} disabled={!canScrollLeft}>
                    ‹
                  </button>
                  <div className="media-carousel" ref={carouselRef} onScroll={updateScrollState}>
                    {mediaList.map((m, idx) => (
                      <div
                        key={(m as any).id}
                        className={`media-item ${selectedIndex === idx ? "selected" : ""}`}
                        style={{
                          transform: `translateX(${dragOffsets[(m as any).id] || 0}px)`,
                          transition: dragOffsets[(m as any).id] ? "none" : "transform 0.2s",
                          background: dragOffsets[(m as any).id] && dragOffsets[(m as any).id] < -20 ? "#fff1f2" : undefined,
                        }}
                        onPointerDown={(e) => handlePointerDown(e, (m as any).id)}
                        onPointerMove={(e) => handlePointerMove(e, (m as any).id)}
                        onPointerUp={(e) => handlePointerUp(e, (m as any).id, m)}
                        onPointerCancel={(e) => handlePointerCancel(e, (m as any).id)}
                        onPointerLeave={(e) => handlePointerCancel(e, (m as any).id)}
                        onMouseDown={(e) => handleMouseDown(e, (m as any).id)}
                        onMouseMove={(e) => handleMouseMove(e, (m as any).id)}
                        onMouseUp={(e) => handleMouseUp(e, (m as any).id, m)}
                        onTouchStart={(e) => handleTouchStart(e, (m as any).id)}
                        onTouchMove={(e) => handleTouchMove(e, (m as any).id)}
                        onTouchEnd={(e) => handleTouchEnd(e, (m as any).id, m)}
                        onClick={() => setSelectedIndex(idx)}
                        aria-label={(m as any).mime_type}
                      >
                        {(m as any).mime_type?.startsWith("image/") ? (
                          <img src={(m as any).url} alt="attachment preview" />
                        ) : (m as any).mime_type?.startsWith("video/") ? (
                          <video src={(m as any).url} autoPlay muted loop playsInline />
                        ) : (
                          <div className="media-item-placeholder"></div>
                        )}
                      </div>
                    ))}
                  </div>
                  <button className="carousel-arrow right" type="button" onClick={() => scrollCarousel(1)} disabled={!canScrollRight}>
                    ›
                  </button>
                </div>
              </>
            )}
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
          <button className="btn primary" onClick={async () => { await handleSaveEntry(); onClose(); }}>Soumettre</button>
          <button className="btn" onClick={onClose}>Annuler</button>
        </footer>
        <div className="toast-container">
          {toasts.map((t) => (
            <div key={t.id} className="toast">
              <div style={{ flex: 1 }}>{t.label} deleted</div>
              <button onClick={() => undoDeletion(t.id)}>Undo</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
