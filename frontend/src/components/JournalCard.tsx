import React, { useState } from "react";
import { JournalEntryPublic } from "../types";

type Props = {
  entry: JournalEntryPublic;
  onOpen: (id: string) => void;
};

export default function JournalCard({ entry, onOpen }: Props) {
  const mediaItems = entry.media?.filter((item) =>
    !!item.mime_type && (item.mime_type.startsWith("image/") || item.mime_type.startsWith("video/"))
  ) ?? [];

  const [activeIndex, setActiveIndex] = useState(0);
  const activeMedia = mediaItems[activeIndex];

  const goPrevious = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setActiveIndex((current) => Math.max(0, current - 1));
  };

  const goNext = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setActiveIndex((current) => Math.min(mediaItems.length - 1, current + 1));
  };

  return (
    <button className="journal-card" onClick={() => onOpen(entry.id)}>
      <div className="journal-card-media">
        {activeMedia ? (
          <div className="journal-card-main">
            {activeMedia.mime_type?.startsWith("video/") ? (
              <video src={activeMedia.url} autoPlay muted loop playsInline />
            ) : (
              <img src={activeMedia.url} alt={entry.title ?? "entry image"} />
            )}
            {mediaItems.length > 1 ? (
              <div className="journal-card-nav">
                <button type="button" onClick={goPrevious} disabled={activeIndex === 0}>
                  ‹
                </button>
                <span className="journal-card-nav-label">{`${activeIndex + 1}/${mediaItems.length}`}</span>
                <button type="button" onClick={goNext} disabled={activeIndex === mediaItems.length - 1}>
                  ›
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="journal-card-placeholder" />
        )}
      </div>
      <div className="journal-card-body">
        <div className="journal-card-date">{entry.recorded_at ? new Date(entry.recorded_at).toLocaleDateString() : ""}</div>
        <div className="journal-card-title">{entry.title || "Untitled"}</div>
      </div>
    </button>
  );
}
