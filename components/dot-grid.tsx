"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

/**
 * Interactive dot-grid background (after reactbits.dev/backgrounds/dot-grid).
 * Dots near the pointer blend toward the active color; fast pointer moves and
 * clicks push dots away and they spring back. Colors default to the theme tokens.
 * Renders an absolutely positioned canvas: place it inside a `relative` parent.
 */
export function DotGrid({
  className,
  dotSize = 3,
  gap = 28,
  proximity = 140,
  baseColorVar = "--color-neutral-200",
  activeColorVar = "--color-primary-500",
}: {
  className?: string;
  dotSize?: number;
  gap?: number;
  /** Radius in px within which dots react to the pointer. */
  proximity?: number;
  baseColorVar?: string;
  activeColorVar?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let base: [number, number, number] = [39, 39, 42];
    let active: [number, number, number] = [255, 255, 255];
    function readColors() {
      const styles = getComputedStyle(document.documentElement);
      base = parseHex(styles.getPropertyValue(baseColorVar)) ?? base;
      active = parseHex(styles.getPropertyValue(activeColorVar)) ?? active;
    }
    readColors();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    type Dot = { x: number; y: number; ox: number; oy: number; vx: number; vy: number };
    let dots: Dot[] = [];
    let width = 0;
    let height = 0;
    const pointer = { x: -9999, y: -9999, lastX: 0, lastY: 0, lastT: 0 };
    let frame = 0;

    function layout() {
      const rect = canvas!.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      width = rect.width;
      height = rect.height;
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cols = Math.floor(width / gap);
      const rows = Math.floor(height / gap);
      const offsetX = (width - (cols - 1) * gap) / 2;
      const offsetY = (height - (rows - 1) * gap) / 2;
      dots = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          dots.push({ x: offsetX + c * gap, y: offsetY + r * gap, ox: 0, oy: 0, vx: 0, vy: 0 });
        }
      }
      requestDraw();
    }

    function push(cx: number, cy: number, radius: number, strength: number) {
      if (reduceMotion) return;
      for (const d of dots) {
        const dx = d.x - cx;
        const dy = d.y - cy;
        const dist = Math.hypot(dx, dy);
        if (dist > radius || dist === 0) continue;
        const force = (1 - dist / radius) * strength;
        d.vx += (dx / dist) * force;
        d.vy += (dy / dist) * force;
      }
    }

    function draw() {
      frame = 0;
      ctx!.clearRect(0, 0, width, height);
      let moving = false;

      for (const d of dots) {
        // Spring back to rest
        d.vx = (d.vx - d.ox * 0.08) * 0.82;
        d.vy = (d.vy - d.oy * 0.08) * 0.82;
        d.ox += d.vx;
        d.oy += d.vy;
        if (Math.abs(d.ox) + Math.abs(d.oy) + Math.abs(d.vx) + Math.abs(d.vy) > 0.05) moving = true;
        else d.ox = d.oy = d.vx = d.vy = 0;

        const dist = Math.hypot(d.x - pointer.x, d.y - pointer.y);
        const t = dist < proximity ? 1 - dist / proximity : 0;
        ctx!.fillStyle = `rgb(${mix(base[0], active[0], t)} ${mix(base[1], active[1], t)} ${mix(base[2], active[2], t)})`;
        ctx!.beginPath();
        ctx!.arc(d.x + d.ox, d.y + d.oy, dotSize / 2 + t * 0.75, 0, Math.PI * 2);
        ctx!.fill();
      }

      if (moving) requestDraw();
    }

    function requestDraw() {
      if (!frame) frame = requestAnimationFrame(draw);
    }

    function toLocal(event: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    function onPointerMove(event: PointerEvent) {
      const { x, y } = toLocal(event);
      const now = performance.now();
      const dt = Math.max(now - pointer.lastT, 1);
      const speed = Math.hypot(x - pointer.lastX, y - pointer.lastY) / dt; // px per ms
      if (speed > 1.2) push(x, y, proximity * 0.8, Math.min(speed, 4) * 1.5);
      pointer.x = pointer.lastX = x;
      pointer.y = pointer.lastY = y;
      pointer.lastT = now;
      requestDraw();
    }

    function onPointerLeave() {
      pointer.x = pointer.y = -9999;
      requestDraw();
    }

    function onClick(event: MouseEvent) {
      const { x, y } = toLocal(event as PointerEvent);
      push(x, y, proximity * 1.5, 6);
      requestDraw();
    }

    // Content sits above the canvas, so listen on the window rather than the canvas.
    const observer = new ResizeObserver(layout);
    // Re-read the theme colors when stylesheets change (e.g. a hot-reloaded token edit).
    const styleObserver = new MutationObserver(() => {
      readColors();
      requestDraw();
    });
    styleObserver.observe(document.head, { childList: true, subtree: true });
    observer.observe(canvas);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("click", onClick);

    return () => {
      observer.disconnect();
      styleObserver.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("click", onClick);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [dotSize, gap, proximity, baseColorVar, activeColorVar]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 size-full", className)}
    />
  );
}

function mix(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t);
}

function parseHex(value: string): [number, number, number] | null {
  let hex = value.trim().replace("#", "");
  // Production CSS minifies colors, e.g. #ffffff -> #fff
  if (/^[0-9a-f]{3}$/i.test(hex)) hex = hex.replace(/./g, (c) => c + c);
  if (!/^[0-9a-f]{6}$/i.test(hex)) return null;
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}
