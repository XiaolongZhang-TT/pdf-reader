import { useEffect, useRef, useState } from "react";
import { Icon, PaperMark } from "../lib/icons";
import type { IconName } from "../lib/icons";

export type ToastItem = {
  id: string;
  message: string;
  kind?: "info" | "success" | "error";
  icon?: IconName;
};

export function Toasts({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast-${toast.kind ?? "info"}`}
          onClick={() => onDismiss(toast.id)}
        >
          <Icon
            name={
              toast.icon ??
              (toast.kind === "error"
                ? "info"
                : toast.kind === "success"
                  ? "check"
                  : "info")
            }
            size={15}
          />
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}

export function DropOverlay({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="drop-overlay">
      <div className="drop-card">
        <Icon name="file" size={38} strokeWidth={1.3} />
        <div className="drop-title">松开以打开 PDF</div>
        <div className="drop-subtitle">文件只会在本机打开，不会上传</div>
      </div>
    </div>
  );
}

export function LoadingOverlay({
  progress,
  title,
  subtitle,
}: {
  progress: number | null;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="loading-overlay">
      <div className="loading-card">
        <PaperMark size={54} />
        <div className="loading-title">{title}</div>
        {subtitle && <div className="loading-subtitle">{subtitle}</div>}
        <div className="loading-bar">
          <div
            className={`loading-bar-fill ${progress === null ? "indeterminate" : ""}`}
            style={progress === null ? undefined : { width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function PasswordPrompt({
  open,
  incorrect,
  onSubmit,
  onCancel,
}: {
  open: boolean;
  incorrect: boolean;
  onSubmit: (password: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setValue("");
      const timer = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(timer);
    }
  }, [open, incorrect]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onMouseDown={onCancel}>
      <div
        className="modal-card"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-label="需要密码"
      >
        <div className="modal-icon">
          <Icon name="info" size={22} />
        </div>
        <h2>此文档已加密</h2>
        <p>
          {incorrect
            ? "密码不正确，请重试。"
            : "请输入打开该 PDF 所需的密码。"}
        </p>
        <input
          ref={inputRef}
          type="password"
          className="text-input"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onSubmit(value);
            if (event.key === "Escape") onCancel();
          }}
          placeholder="密码"
        />
        <div className="modal-actions">
          <button type="button" className="ghost-button" onClick={onCancel}>
            取消
          </button>
          <button
            type="button"
            className="primary-button compact"
            onClick={() => onSubmit(value)}
          >
            解锁
          </button>
        </div>
      </div>
    </div>
  );
}
