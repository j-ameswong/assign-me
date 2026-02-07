"use client";

import { useState, useRef } from "react";

interface Option {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
}

interface RankingListProps {
  options: Option[];
  rankings: string[];
  onChange: (rankings: string[]) => void;
}

export default function RankingList({ options, rankings, onChange }: RankingListProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragSource = useRef<"available" | "ranked" | null>(null);

  const rankedOptions = rankings
    .map((id) => options.find((o) => o.id === id))
    .filter(Boolean) as Option[];

  const availableOptions = options.filter((o) => !rankings.includes(o.id));

  function handleDragStart(id: string, source: "available" | "ranked") {
    setDraggedId(id);
    dragSource.current = source;
  }

  function handleDragEnd() {
    setDraggedId(null);
    setDragOverIndex(null);
    dragSource.current = null;
  }

  function handleDropOnRanked(dropIndex: number) {
    if (!draggedId) return;

    const newRankings = rankings.filter((id) => id !== draggedId);
    newRankings.splice(dropIndex, 0, draggedId);
    onChange(newRankings);
    handleDragEnd();
  }

  function handleDropOnAvailable() {
    if (!draggedId) return;
    onChange(rankings.filter((id) => id !== draggedId));
    handleDragEnd();
  }

  function addToRankings(id: string) {
    onChange([...rankings, id]);
  }

  function removeFromRankings(id: string) {
    onChange(rankings.filter((r) => r !== id));
  }

  function moveUp(index: number) {
    if (index === 0) return;
    const newRankings = [...rankings];
    [newRankings[index - 1], newRankings[index]] = [newRankings[index], newRankings[index - 1]];
    onChange(newRankings);
  }

  function moveDown(index: number) {
    if (index === rankings.length - 1) return;
    const newRankings = [...rankings];
    [newRankings[index], newRankings[index + 1]] = [newRankings[index + 1], newRankings[index]];
    onChange(newRankings);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Ranked list */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2">
          Your Rankings {rankings.length > 0 && `(${rankings.length})`}
        </h3>
        <div
          className="min-h-[80px] rounded-lg border-2 border-dashed border-border p-2 transition-colors"
          onDragOver={(e) => {
            e.preventDefault();
            if (rankedOptions.length === 0) setDragOverIndex(0);
          }}
          onDrop={() => {
            if (rankedOptions.length === 0) handleDropOnRanked(0);
          }}
        >
          {rankedOptions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              Drag options here or click the + button to rank them
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {rankedOptions.map((opt, index) => (
                <div key={opt.id}>
                  {/* Drop zone above each item */}
                  <div
                    className={`h-1 rounded transition-colors ${
                      dragOverIndex === index ? "bg-accent" : "bg-transparent"
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverIndex(index);
                    }}
                    onDragLeave={() => setDragOverIndex(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDropOnRanked(index);
                    }}
                  />
                  <div
                    draggable
                    onDragStart={() => handleDragStart(opt.id, "ranked")}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 cursor-grab active:cursor-grabbing transition-opacity ${
                      draggedId === opt.id ? "opacity-40" : ""
                    }`}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm">{opt.name}</p>
                      {opt.description && (
                        <p className="text-xs text-muted truncate">{opt.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveUp(index)}
                        disabled={index === 0}
                        className="p-1 text-muted hover:text-foreground disabled:opacity-30"
                        aria-label="Move up"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 10l4-4 4 4" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveDown(index)}
                        disabled={index === rankings.length - 1}
                        className="p-1 text-muted hover:text-foreground disabled:opacity-30"
                        aria-label="Move down"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 6l4 4 4-4" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromRankings(opt.id)}
                        className="p-1 text-muted hover:text-red-500"
                        aria-label="Remove from rankings"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 4l8 8M12 4l-8 8" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {/* Drop zone below last item */}
                  {index === rankedOptions.length - 1 && (
                    <div
                      className={`h-1 rounded transition-colors ${
                        dragOverIndex === rankedOptions.length ? "bg-accent" : "bg-transparent"
                      }`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverIndex(rankedOptions.length);
                      }}
                      onDragLeave={() => setDragOverIndex(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleDropOnRanked(rankedOptions.length);
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Available options */}
      {availableOptions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">
            Available Options ({availableOptions.length})
          </h3>
          <div
            className="rounded-lg border border-border p-2"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleDropOnAvailable();
            }}
          >
            <div className="flex flex-col gap-1.5">
              {availableOptions.map((opt) => (
                <div
                  key={opt.id}
                  draggable
                  onDragStart={() => handleDragStart(opt.id, "available")}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 rounded-lg border border-border bg-surface/60 px-3 py-2.5 cursor-grab active:cursor-grabbing transition-opacity ${
                    draggedId === opt.id ? "opacity-40" : ""
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm">{opt.name}</p>
                    {opt.description && (
                      <p className="text-xs text-muted truncate">{opt.description}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted shrink-0">
                    {opt.capacity} {opt.capacity === 1 ? "spot" : "spots"}
                  </span>
                  <button
                    type="button"
                    onClick={() => addToRankings(opt.id)}
                    className="p-1 text-muted hover:text-primary"
                    aria-label={`Add ${opt.name} to rankings`}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M8 3v10M3 8h10" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
