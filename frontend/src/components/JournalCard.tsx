import React from "react";
import { JournalEntryPublic } from "../types";

type Props = {
  entry: JournalEntryPublic;
  onOpen: (id: string) => void;
};

export default function JournalCard({ entry, onOpen }: Props) {
  // Only consider image or video media for cover/gallery
  const mediaItems = entry.media?.filter((item) =>
    !!item.mime_type && (item.mime_type.startsWith("image/") || item.mime_type.startsWith("video/"))
  ) ?? [];

  const cover = mediaItems[0]?.url ?? null;

  return (
    <button className="journal-card" onClick={() => onOpen(entry.id)}>
      <div className="journal-card-media">
        {cover ? (
          <div className="journal-card-main">
            {mediaItems[0]?.mime_type?.startsWith("video/") ? (
              <video src={cover} autoPlay muted loop playsInline />
            ) : (
              <img src={cover} alt={entry.title ?? "entry image"} />
            )}
          </div>
        ) : (
          <div className="journal-card-placeholder" />
        )}

        {mediaItems.length ? (
          <div className="journal-card-gallery">
            {mediaItems.map((item) => (
              <div key={item.id} className="journal-card-thumb">
                {item.url ? (
                  item.mime_type?.startsWith("video/") ? (
                    <video src={item.url} autoPlay muted loop playsInline />
                  ) : (
                    <img src={item.url} alt={entry.title ?? "entry thumbnail"} />
                  )
                ) : (
                  <div className="journal-card-thumb-placeholder">{item.mime_type?.split("/")[0] || "file"}</div>
                )}
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <div className="journal-card-body">
        <div className="journal-card-date">{entry.recorded_at ? new Date(entry.recorded_at).toLocaleDateString() : ""}</div>
        <div className="journal-card-title">{entry.title || "Untitled"}</div>
      </div>
    </button>
  );
}
