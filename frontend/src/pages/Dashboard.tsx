import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { fetchEntries, fetchEntry } from "../api";
import { JournalEntryCreate, JournalEntriesPublic, JournalEntryPublic } from "../types";
import JournalCard from "../components/JournalCard";
import EntryModal from "../components/EntryModal";

export default function Dashboard() {
  const { user, token, logout } = useAuth();
  const [entries, setEntries] = useState<JournalEntriesPublic | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeEntry, setActiveEntry] = useState<JournalEntryPublic | null>(null);

  useEffect(() => {
    if (!token) return;

    fetchEntries(token)
      .then(setEntries)
      .catch(() => setError("Unable to fetch entries."));
  }, [token]);

  const refreshEntries = async () => {
    if (!token) return;
    try {
      const refreshed = await fetchEntries(token);
      setEntries(refreshed);
    } catch (err) {
      console.error("refreshEntries error", err);
      setError("Unable to refresh entries.");
    }
  };

  const openEntry = async (id: string) => {
    if (!token) {
      setError("Authentication required to open entry");
      return;
    }
    try {
      const found = await fetchEntry(token, id);
      setActiveEntry(found);
    } catch (err) {
      console.error("openEntry error", err);
      if (err instanceof Error) setError(err.message);
      else setError("Unable to open entry");
    }
  };

  const refreshActiveEntry = async () => {
    if (!token || !activeEntry) return;
    try {
      const updated = await fetchEntry(token, activeEntry.id);
      setActiveEntry(updated);
      await refreshEntries();
    } catch (err) {
      console.error("refreshActiveEntry error", err);
      setError("Unable to refresh active entry.");
    }
  };

  return (
    <div className="page-container">
      <div className="topbar">
        <h1>Journals</h1>
        <div className="top-actions">
          <button className="btn black">+ New entry</button>
          <button className="quiet" onClick={logout}>Logout</button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="journal-grid">
        {entries?.entries?.map((entry) => (
          <JournalCard key={entry.id} entry={entry} onOpen={openEntry} />
        ))}
      </div>

      {activeEntry && <EntryModal entry={activeEntry} onClose={() => setActiveEntry(null)} onSaved={refreshActiveEntry} />}
    </div>
  );
}
