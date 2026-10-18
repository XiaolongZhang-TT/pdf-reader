import { useLayoutEffect, useRef, useState } from "react";
import { Icon } from "../lib/icons";
import { ANNOTATION_COLORS } from "../lib/types";
import type { AnnotationColor, SelectionInfo } from "../lib/types";
import { clamp } from "../lib/utils";

type Props = {
  selection: SelectionInfo;
  onHighlight: (color: AnnotationColor) => void;
  onUnderline: (color: AnnotationColor) => void;
  onStrikeout: (color: AnnotationColor) => void;
  onNote: (color: AnnotationColor) => void;
  onCopy: () => void;
  onClose: () => void;
};

const COLORS: AnnotationColor[] = [
  "yellow",
  "green",
  "blue",
  "pink",
  "purple",
  "orange",
];

export function SelectionMenu({
  selection,
  onHighlight,
  onUnderline,
  onStrikeout,
  onNote,
  onCopy,
  onClose,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [color, setColor] = useState<AnnotationColor>("yellow");

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const gap = 10;
    const anchor = selection.anchor;
    let left = anchor.x + anchor.width / 2 - rect.width / 2;
    let top = anchor.y - rect.height - gap;
    if (top < 58) top = anchor.y + anchor.height + gap;
    left = clamp(left, 12, window.innerWidth - rect.width - 12);
    top = clamp(top, 58, window.innerHeight - rect.height - 12);
    setPos({ left, top });
  }, [selection.anchor]);

  return (
    <div
      ref={ref}
      className="selection-menu"
      style={{
        left: pos?.left ?? -9999,
        top: pos?.top ?? -9999,
        visibility: pos ? "visible" : "hidden",
      }}
      onMouseDown={(event) => event.preventDefault()}
      onMouseUp={(event) => event.stopPropagation()}
    >
      <div className="selection-colors" role="group" aria-label="高亮颜色">
        {COLORS.map((name) => (
          <button
            key={name}
            type="button"
            className={`color-dot ${color === name ? "is-active" : ""}`}
            style={{ background: ANNOTATION_COLORS[name].value }}
            title={`${ANNOTATION_COLORS[name].label}高亮`}
            aria-label={`${ANNOTATION_COLORS[name].label}高亮`}
            onClick={() => {
              setColor(name);
              onHighlight(name);
            }}
          />
        ))}
      </div>
      <div className="selection-divider" />
      <button
        type="button"
        className="selection-action"
        title="下划线"
        onClick={() => onUnderline(color)}
      >
        <Icon name="underline" size={16} />
      </button>
      <button
        type="button"
        className="selection-action"
        title="删除线"
        onClick={() => onStrikeout(color)}
      >
        <Icon name="strikeout" size={16} />
      </button>
      <button
        type="button"
        className="selection-action"
        title="添加便签"
        onClick={() => onNote(color)}
      >
        <Icon name="note" size={16} />
      </button>
      <button
        type="button"
        className="selection-action"
        title="复制文字 ⌘C"
        onClick={onCopy}
      >
        <Icon name="copy" size={15} />
      </button>
      <button
        type="button"
        className="selection-action"
        title="取消"
        onClick={onClose}
      >
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}
