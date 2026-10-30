"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";
import { layout, layoutWithLines, prepare, prepareWithSegments } from "@chenglou/pretext";
import { motion } from "motion/react";

interface Box {
  width: number;
  font: string;
  lineHeight: number;
  letterSpacing: number;
}

/**
 * Tracks the content box and resolved font of an element. Pretext measures with
 * canvas, so it needs a `font` string and must re-run once webfonts have loaded
 * and whenever the element is resized.
 */
export function useTextBox<T extends HTMLElement>(): [RefObject<T | null>, Box | null] {
  const ref = useRef<T>(null);
  const [box, setBox] = useState<Box | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let live = true;
    const measure = () => {
      if (!live) return;
      const cs = getComputedStyle(el);
      const next: Box = {
        width: el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
        font: `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`,
        lineHeight: parseFloat(cs.lineHeight),
        letterSpacing: parseFloat(cs.letterSpacing) || 0,
      };
      setBox((prev) =>
        prev && prev.width === next.width && prev.font === next.font && prev.lineHeight === next.lineHeight && prev.letterSpacing === next.letterSpacing
          ? prev
          : next,
      );
    };
    document.fonts.ready.then(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      live = false;
      ro.disconnect();
    };
  }, []);

  return [ref, box];
}

/** Height of `text` as a pre-wrap textarea would show it, without touching layout. */
export function useTextareaHeight(text: string, box: Box | null, minLines: number, maxLines: number) {
  const prepared = useMemo(
    () => (box ? prepare(text, box.font, { whiteSpace: "pre-wrap", letterSpacing: box.letterSpacing }) : null),
    [text, box],
  );
  if (!box || !prepared) return undefined;
  // A textarea shows one more line when its value ends with a newline.
  const lines = layout(prepared, box.width, box.lineHeight).lineCount + (text.endsWith("\n") ? 1 : 0);
  return Math.min(Math.max(lines, minLines), maxLines) * box.lineHeight;
}

interface PretextLinesProps {
  text: string;
  as?: "h2" | "h4" | "p";
  className?: string;
  style?: CSSProperties;
  delay?: number;
  /** Wipe a highlighter mark across each line after it appears. */
  mark?: boolean;
}

/**
 * Lays text out with pretext at the container width and renders every line as
 * its own masked element so lines can reveal one after another. Falls back to
 * plain text until fonts and width are known (and on the server).
 */
export function PretextLines({ text, as: Tag = "p", className, style, delay = 0, mark }: PretextLinesProps) {
  const [ref, box] = useTextBox<HTMLElement>();
  const prepared = useMemo(
    () => (box ? prepareWithSegments(text, box.font, { letterSpacing: box.letterSpacing }) : null),
    [text, box],
  );
  const lines = box && prepared && box.width > 0 ? layoutWithLines(prepared, box.width, box.lineHeight).lines : null;

  return (
    <Tag ref={ref as RefObject<never>} className={className} style={style} aria-label={lines ? text : undefined}>
      {lines
        ? lines.map((line, i) => (
            <span key={`${i}-${line.text}`} aria-hidden className="relative isolate block overflow-hidden whitespace-pre" style={{ height: box!.lineHeight }}>
              {mark && (
                <motion.span
                  className="absolute inset-y-[0.12em] left-0 -z-10 bg-fake/25"
                  style={{ width: line.width }}
                  initial={{ clipPath: "inset(0 100% 0 0)" }}
                  animate={{ clipPath: "inset(0 0% 0 0)" }}
                  transition={{ delay: delay + 0.5 + i * 0.12, duration: 0.6, ease: "easeOut" }}
                />
              )}
              <motion.span
                className="block"
                initial={{ y: "105%" }}
                animate={{ y: 0 }}
                transition={{ delay: delay + i * 0.08, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              >
                {line.text}
              </motion.span>
            </span>
          ))
        : text}
    </Tag>
  );
}
