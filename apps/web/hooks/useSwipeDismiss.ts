"use client";

import { useRef, useState } from "react";
import type { CSSProperties, TouchEvent } from "react";

/**
 * Swipe-to-dismiss pour les bottom sheets.
 * Le doigt vers le bas déplace la feuille ; au-delà du seuil elle se ferme.
 * Utilise la propriété CSS `translate` (pas `transform`) pour cohabiter
 * avec les animations keyframes existantes.
 */
export function useSwipeDismiss(onClose: () => void, threshold = 110) {
  const [dy, setDy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef<number | null>(null);

  function onTouchStart(e: TouchEvent) {
    startY.current = e.touches[0].clientY;
    setDragging(true);
  }

  function onTouchMove(e: TouchEvent) {
    if (startY.current == null) return;
    const d = e.touches[0].clientY - startY.current;
    setDy(d > 0 ? d : 0); // uniquement vers le bas
  }

  function onTouchEnd() {
    if (dy > threshold) onClose();
    setDy(0);
    setDragging(false);
    startY.current = null;
  }

  const style: CSSProperties = {
    translate: dy > 0 ? `0 ${dy}px` : undefined,
    transition: dragging ? "none" : "translate 0.18s ease",
  };

  // onTouchCancel = même reset : sinon un geste interrompu par le navigateur
  // laisserait la feuille décalée ou bloquée en état de drag.
  return {
    style,
    handlers: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: onTouchEnd },
  };
}
