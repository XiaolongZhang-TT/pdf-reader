import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { t } from "../lib/i18n";
import { Icon } from "../lib/icons";
import { ANNOTATION_COLORS } from "../lib/types";
import type { Annotation, AnnotationColor } from "../lib/types";
import { clamp, truncate } from "../lib/utils";

type Props = {
  annotation: Annotation;
  anchor: { x: number; y: number; width: number; height: number };
  onChangeColor: (color: AnnotationColor) => void;
  onSaveNote: (note: string) => void;
  onDelete: () => void;
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

const TYPE_LABEL: Record<Annotation["type"], string> = {
  highlight: "高亮",
  underline: "下划线",
  strikeout: "删除线",
  note: "便签",
};

const typeLabel = (type: Annotation["type"]) => t(TYPE_LABEL[type]);

export function AnnotationPopover({
  annotation,
  anchor,
  onChangeColor,
  onSaveNote,
  onDelete,
  onCopy,
  onClose,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [editingNote, setEditingNote] = useState(
    annotation.type === "note" || Boolean(annotation.note),
  );
  const [note, setNote] = useState(annotation.note ?? "");

  useEffect(() => {
    setNote(annotation.note ?? "");
    setEditingNote(annotation.type === "note" || Boolean(annotation.note));
  }, [annotation.id, annotation.note, annotation.type]);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const gap = 8;
    let left = anchor.x + anchor.width / 2 - rect.width / 2;
    let top = anchor.y + anchor.height + gap;
    if (top + rect.height > window.innerHeight - 12) {
      top = anchor.y - rect.height - gap;
    }
    left = clamp(left, 12, window.innerWidth - rect.width - 12);
    top = clamp(top, 60, window.innerHeight - rect.height - 12);
    setPos({ left, top });
  }, [anchor, editingNote]);

  const commitNote = () => {
    onSaveNote(note.trim());
  };

  return (
    <div
      ref={ref}
      className="annotation-popover"
      style={{
        left: pos?.left ?? -9999,
        top: pos?.top ?? -9999,
        visibility: pos ? "visible" : "hidden",
      }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div className="annotation-popover-head">
        <span
          className="annotation-type-dot"
          style={{ background: ANNOTATION_COLORS[annotation.color]?.value }}
        />
        <span className="annotation-type-label">{typeLabel(annotation.type)}</span>
        <span className="annotation-page">{t("第 {page} 页", { page: annotation.page })}</span>
        <button
          type="button"
          className="mini-icon-button"
          onClick={onClose}
          aria-label={t("取消")}
        >
          <Icon name="close" size={13} />
        </button>
      </div>

      {annotation.text && (
        <blockquote className="annotation-quote">
          {truncate(annotation.text, 140)}
        </blockquote>
      )}

      <div className="annotation-colors">
        {COLORS.map((name) => (
          <button
            key={name}
            type="button"
            className={`color-dot ${
              annotation.color === name ? "is-active" : ""
            }`}
            style={{ background: ANNOTATION_COLORS[name].value }}
            title={t(ANNOTATION_COLORS[name].label)}
            aria-label={t(ANNOTATION_COLORS[name].label)}
            onClick={() => onChangeColor(name)}
          />
        ))}
      </div>

      {editingNote ? (
        <div className="note-editor">
          <textarea
            className="note-textarea"
            placeholder={t("写下你的想法…")}
            value={note}
            autoFocus={annotation.type === "note" && !annotation.note}
            onChange={(event) => setNote(event.target.value)}
            onBlur={commitNote}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                commitNote();
                onClose();
              }
            }}
          />
          <div className="note-hint">{t("⌘↩ 保存")}</div>
        </div>
      ) : (
        <button
          type="button"
          className="annotation-add-note"
          onClick={() => setEditingNote(true)}
        >
          <Icon name="pencil" size={13} />
          {t("添加备注")}
        </button>
      )}

      <div className="annotation-popover-actions">
        <button type="button" className="popover-button" onClick={onCopy}>
          <Icon name="copy" size={13} />
          {t("复制文字")}
        </button>
        <button
          type="button"
          className="popover-button danger"
          onClick={onDelete}
        >
          <Icon name="trash" size={13} />
          {t("删除")}
        </button>
      </div>
    </div>
  );
}
