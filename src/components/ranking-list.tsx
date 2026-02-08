"use client";

import { useState, useRef, useCallback } from "react";

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

function GripIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="currentColor"
      className="opacity-30 group-hover:opacity-60 transition-opacity"
    >
      <circle cx="3.5" cy="2" r="1.2" />
      <circle cx="8.5" cy="2" r="1.2" />
      <circle cx="3.5" cy="6" r="1.2" />
      <circle cx="8.5" cy="6" r="1.2" />
      <circle cx="3.5" cy="10" r="1.2" />
      <circle cx="8.5" cy="10" r="1.2" />
    </svg>
  );
}

function InsertionIndicator() {
  return (
    <div className="flex items-center h-0.5 relative z-10 px-1 -my-px">
      <div className="w-2 h-2 rounded-full bg-accent shrink-0 -ml-0.5" />
      <div className="flex-1 h-0.5 bg-accent rounded-full" />
    </div>
  );
}

export default function RankingList({
  options,
  rankings,
  onChange,
}: RankingListProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [insertIndex, setInsertIndex] = useState<number | null>(null);
  const [dragSource, setDragSource] = useState<"available" | "ranked" | null>(
    null
  );
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const rankedOptions = rankings
    .map((id) => options.find((o) => o.id === id))
    .filter(Boolean) as Option[];

  const availableOptions = options.filter((o) => !rankings.includes(o.id));

  // Compute insertion index from cursor Y position using item midpoints.
  // This replaces the tiny drop-zone divs with full-item hit detection.
  const computeInsertIndex = useCallback(
    (clientY: number) => {
      if (rankedOptions.length === 0) {
        setInsertIndex(0);
        return;
      }
      for (let i = 0; i < rankedOptions.length; i++) {
        const el = itemRefs.current.get(rankedOptions[i].id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (clientY < rect.top + rect.height / 2) {
          setInsertIndex(i);
          return;
        }
      }
      setInsertIndex(rankedOptions.length);
    },
    [rankedOptions]
  );

  // Hide insertion indicator for no-op positions (dropping an item where it already is)
  function shouldShowIndicator(atIndex: number): boolean {
    if (insertIndex !== atIndex || !draggedId) return false;
    if (dragSource === "ranked") {
      const dragIdx = rankings.indexOf(draggedId);
      if (atIndex === dragIdx || atIndex === dragIdx + 1) return false;
    }
    return true;
  }

  function handleDragStart(
    e: React.DragEvent,
    id: string,
    source: "available" | "ranked"
  ) {
    setDraggedId(id);
    setDragSource(source);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragEnd() {
    setDraggedId(null);
    setInsertIndex(null);
    setDragSource(null);
  }

  function handleDropOnRanked(e: React.DragEvent) {
    e.preventDefault();
    if (!draggedId || insertIndex === null) return;

    const newRankings = rankings.filter((id) => id !== draggedId);
    let adjustedIndex = insertIndex;

    // When moving an item down within the ranked list, removing it first
    // shifts everything below up by one, so we compensate.
    if (dragSource === "ranked") {
      const dragIdx = rankings.indexOf(draggedId);
      if (insertIndex > dragIdx) adjustedIndex--;
    }

    newRankings.splice(Math.max(0, adjustedIndex), 0, draggedId);
    onChange(newRankings);
    handleDragEnd();
  }

  function handleDropOnAvailable(e: React.DragEvent) {
    e.preventDefault();
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
    [newRankings[index - 1], newRankings[index]] = [
      newRankings[index],
      newRankings[index - 1],
    ];
    onChange(newRankings);
  }

  function moveDown(index: number) {
    if (index === rankings.length - 1) return;
    const newRankings = [...rankings];
    [newRankings[index], newRankings[index + 1]] = [
      newRankings[index + 1],
      newRankings[index],
    ];
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
          className={`min-h-[80px] rounded-lg border-2 border-dashed p-2 transition-colors duration-150 ${
            draggedId ? "border-accent/50 bg-accent/5" : "border-border"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            computeInsertIndex(e.clientY);
          }}
          onDrop={handleDropOnRanked}
        >
          {rankedOptions.length === 0 ? (
            <p
              className={`py-6 text-center text-sm transition-colors ${
                draggedId ? "text-accent font-medium" : "text-muted"
              }`}
            >
              {draggedId
                ? "Drop here to rank"
                : "Drag options here or click + to rank them"}
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {rankedOptions.map((opt, index) => (
                <div key={opt.id}>
                  {shouldShowIndicator(index) && <InsertionIndicator />}
                  <div
                    ref={(el) => {
                      if (el) itemRefs.current.set(opt.id, el);
                    }}
                    draggable
                    onDragStart={(e) => handleDragStart(e, opt.id, "ranked")}
                    onDragEnd={handleDragEnd}
                    className={`group flex items-center gap-2 rounded-lg border px-2 py-2.5 select-none transition-all duration-150 ${
                      draggedId === opt.id
                        ? "opacity-25 scale-[0.97] border-border bg-surface/50"
                        : "border-border bg-surface hover:border-accent/30 cursor-grab active:cursor-grabbing"
                    }`}
                  >
                    <div className="shrink-0 p-0.5 cursor-grab active:cursor-grabbing">
                      <GripIcon />
                    </div>
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm leading-tight">
                        {opt.name}
                      </p>
                      {opt.description && (
                        <p className="text-xs text-muted truncate">
                          {opt.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveUp(index)}
                        disabled={index === 0}
                        className="p-1.5 text-muted hover:text-foreground disabled:opacity-20 transition-colors"
                        aria-label="Move up"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M4 10l4-4 4 4" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveDown(index)}
                        disabled={index === rankings.length - 1}
                        className="p-1.5 text-muted hover:text-foreground disabled:opacity-20 transition-colors"
                        aria-label="Move down"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M4 6l4 4 4-4" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromRankings(opt.id)}
                        className="p-1.5 text-muted hover:text-red-500 transition-colors"
                        aria-label="Remove from rankings"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        >
                          <path d="M4 4l8 8M12 4l-8 8" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {/* Insertion indicator after last item */}
                  {index === rankedOptions.length - 1 &&
                    shouldShowIndicator(rankedOptions.length) && (
                      <InsertionIndicator />
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
            className={`rounded-lg border p-2 transition-colors duration-150 ${
              draggedId && dragSource === "ranked"
                ? "border-accent/30 bg-accent/5"
                : "border-border"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setInsertIndex(null);
            }}
            onDrop={handleDropOnAvailable}
          >
            <div className="flex flex-col gap-1.5">
              {availableOptions.map((opt) => (
                <div
                  key={opt.id}
                  draggable
                  onDragStart={(e) =>
                    handleDragStart(e, opt.id, "available")
                  }
                  onDragEnd={handleDragEnd}
                  className={`group flex items-center gap-2 rounded-lg border bg-surface/60 px-2 py-2.5 select-none transition-all duration-150 ${
                    draggedId === opt.id
                      ? "opacity-25 scale-[0.97]"
                      : "border-border hover:border-accent/30 cursor-grab active:cursor-grabbing"
                  }`}
                >
                  <div className="shrink-0 p-0.5 cursor-grab active:cursor-grabbing">
                    <GripIcon />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm">
                      {opt.name}
                    </p>
                    {opt.description && (
                      <p className="text-xs text-muted truncate">
                        {opt.description}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted shrink-0">
                    {opt.capacity} {opt.capacity === 1 ? "spot" : "spots"}
                  </span>
                  <button
                    type="button"
                    onClick={() => addToRankings(opt.id)}
                    className="p-1.5 text-muted hover:text-primary transition-colors"
                    aria-label={`Add ${opt.name} to rankings`}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    >
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
