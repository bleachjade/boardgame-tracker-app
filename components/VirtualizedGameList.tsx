"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Game } from "@/lib/types";

interface VirtualizedGameListProps {
  games: Game[];
  itemHeight?: number;
  renderItem: (game: Game, index: number) => React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  overscan?: number;
}

export function VirtualizedGameList({
  games,
  itemHeight = 100,
  renderItem,
  className = "",
  style = {},
  overscan = 5
}: VirtualizedGameListProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = parentRef.current;
    if (!container) return;
    
    setContainerHeight(container.clientHeight);
    
    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };
    
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      games.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    return { startIndex, endIndex };
  }, [scrollTop, containerHeight, itemHeight, games.length, overscan]);

  const totalHeight = games.length * itemHeight;
  const offsetY = visibleRange.startIndex * itemHeight;

  return (
    <div 
      ref={parentRef}
      className={`relative ${className}`}
      style={{
        height: "100%",
        overflow: "auto",
        ...style
      }}
    >
      <div style={{ height: `${totalHeight}px`, position: "relative" }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {games.slice(visibleRange.startIndex, visibleRange.endIndex + 1).map((game, index) => (
            <div key={game.id} style={{ height: `${itemHeight}px` }}>
              {renderItem(game, visibleRange.startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface VirtualizedGameGridProps {
  games: Game[];
  itemHeight?: number;
  columns?: number;
  gap?: number;
  renderItem: (game: Game, index: number) => React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  overscan?: number;
}

export function VirtualizedGameGrid({
  games,
  itemHeight = 300,
  columns = 4,
  gap = 20,
  renderItem,
  className = "",
  style = {},
  overscan = 5
}: VirtualizedGameGridProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = parentRef.current;
    if (!container) return;
    
    setContainerHeight(container.clientHeight);
    
    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };
    
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  const rowCount = Math.ceil(games.length / columns);
  const rowHeight = itemHeight + gap;
  
  const visibleRange = useMemo(() => {
    const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const endRow = Math.min(
      rowCount - 1,
      Math.ceil((scrollTop + containerHeight) / rowHeight) + overscan
    );
    return { startRow, endRow };
  }, [scrollTop, containerHeight, rowHeight, rowCount, overscan]);

  const totalHeight = rowCount * rowHeight;
  const offsetY = visibleRange.startRow * rowHeight;

  return (
    <div 
      ref={parentRef}
      className={`relative ${className}`}
      style={{
        height: "100%",
        overflow: "auto",
        ...style
      }}
    >
      <div style={{ height: `${totalHeight}px`, position: "relative" }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {Array.from({ length: visibleRange.endRow - visibleRange.startRow + 1 }, (_, i) => {
            const rowIndex = visibleRange.startRow + i;
            const startCol = rowIndex * columns;
            const endCol = Math.min(startCol + columns, games.length);
            const rowGames = games.slice(startCol, endCol);
            
            return (
              <div
                key={rowIndex}
                style={{
                  position: "absolute",
                  top: rowIndex * rowHeight,
                  left: 0,
                  width: "100%",
                  height: `${itemHeight}px`,
                  display: "grid",
                  gridTemplateColumns: `repeat(${columns}, 1fr)`,
                  gap: `${gap}px`,
                }}
              >
                {rowGames.map((game, colIndex) => (
                  <div key={game.id} style={{ height: "100%" }}>
                    {renderItem(game, startCol + colIndex)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}