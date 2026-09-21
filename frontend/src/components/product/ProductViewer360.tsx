"use client";

import { useCallback, useRef, useState } from "react";

interface Props {
  images: string[];
  title: string;
  onExit?: () => void;
}

export function ProductViewer360({ images, title, onExit }: Props) {
  const [frame, setFrame] = useState(0);
  const [dragging, setDragging] = useState(false);
  const frameRef = useRef(0);
  const drag = useRef({ active: false, startX: 0, startFrame: 0 });

  const n = images.length;
  const wrap = (i: number) => ((i % n) + n) % n;

  const setF = useCallback((i: number) => {
    frameRef.current = i;
    setFrame(i);
  }, []);

  const begin = useCallback(
    (clientX: number) => {
      drag.current = { active: true, startX: clientX, startFrame: frameRef.current };
      setDragging(true);
    },
    []
  );

  const move = useCallback(
    (clientX: number) => {
      if (!drag.current.active) return;
      const dx = clientX - drag.current.startX;
      setF(wrap(drag.current.startFrame + Math.round(dx / 18)));
    },
    [setF, wrap]
  );

  const end = useCallback(() => {
    drag.current.active = false;
    setDragging(false);
  }, []);

  if (n < 2) return null;

  return (
    <div className="select-none" style={{ touchAction: "pan-y" }}>
      <div
        className="relative aspect-square bg-ivory border border-beige overflow-hidden mb-3"
        style={{ cursor: dragging ? "grabbing" : "grab" }}
        onMouseDown={(e) => begin(e.clientX)}
        onMouseMove={(e) => move(e.clientX)}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={(e) => begin(e.touches[0].clientX)}
        onTouchMove={(e) => move(e.touches[0].clientX)}
        onTouchEnd={end}
      >
        <img
          src={images[frame]}
          alt={title}
          className="w-full h-full object-cover pointer-events-none"
          draggable={false}
        />
        <div className="absolute top-3 left-3 bg-charcoal text-white text-[11px] font-semibold px-2.5 py-1.5">
          360°
        </div>
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <span className="text-[11px] text-grayx bg-white/90 border border-beige px-2.5 py-1.5">
            {frame + 1} / {n}
          </span>
          {onExit && (
            <button
              onClick={onExit}
              className="text-[11px] font-semibold px-2.5 py-1.5 bg-charcoal text-white cursor-pointer"
            >
              ✕ Exit
            </button>
          )}
        </div>
        <div className="absolute bottom-0 inset-x-0 h-1 bg-beige">
          <div className="h-full bg-gold transition-[width] duration-75" style={{ width: `${((frame + 1) / n) * 100}%` }} />
        </div>
      </div>

      <p className="text-[11px] text-grayx text-center">
        {dragging ? "Release to stop" : "Drag left / right to rotate 360°"}
      </p>

      <div className="grid gap-2 mt-3" style={{ gridTemplateColumns: `repeat(${Math.min(n, 6)}, 1fr)` }}>
        {images.map((url, i) => (
          <button
            key={i}
            onClick={() => setF(i)}
            className={`aspect-square border overflow-hidden bg-ivory cursor-pointer ${i === frame ? "border-gold" : "border-beige"}`}
          >
            <img src={url} alt="" className="w-full h-full object-cover" draggable={false} />
          </button>
        ))}
      </div>
    </div>
  );
}