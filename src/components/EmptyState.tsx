import iconUrl from "../assets/icon.png";
import { t } from "../lib/i18n";
import { Icon } from "../lib/icons";
import type { RecentFile } from "../lib/types";
import { formatRelativeTime, stripExtension } from "../lib/utils";

type Props = {
  recents: RecentFile[];
  onOpen: () => void;
  onOpenRecent: (path: string) => void;
  onRemoveRecent: (path: string) => void;
  onRevealRecent: (path: string) => void;
};

export function EmptyState({
  recents,
  onOpen,
  onOpenRecent,
  onRemoveRecent,
  onRevealRecent,
}: Props) {
  return (
    <div className="empty-state">
      <div className="empty-inner">
        <div className="empty-hero">
          <img
            className="hero-icon"
            src={iconUrl}
            width={76}
            height={76}
            alt=""
            draggable={false}
          />
          <h1>Paper</h1>
          <p>{t("安静、专注的 PDF 阅读器")}</p>
        </div>

        <div className="empty-actions">
          <button type="button" className="primary-button" onClick={onOpen}>
            <Icon name="folder" size={17} />
            {t("打开 PDF")}
            <kbd>⌘O</kbd>
          </button>
          <span className="empty-hint">{t("也可以把 PDF 文件拖到这里")}</span>
        </div>

        {recents.length > 0 && (
          <section className="recent-section">
            <div className="recent-heading">
              <Icon name="clock" size={14} />
              <span>{t("最近打开")}</span>
            </div>
            <div className="recent-grid">
              {recents.slice(0, 6).map((file) => (
                <div
                  key={file.path}
                  className="recent-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpenRecent(file.path)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onOpenRecent(file.path);
                    }
                  }}
                >
                  <div className="recent-cover">
                    {file.cover ? (
                      <img src={file.cover} alt="" draggable={false} />
                    ) : (
                      <div className="recent-cover-placeholder">
                        <Icon name="file" size={26} />
                      </div>
                    )}
                    <div className="recent-actions">
                      <button
                        type="button"
                        className="mini-button"
                        title={t("在访达中显示")}
                        onClick={(event) => {
                          event.stopPropagation();
                          onRevealRecent(file.path);
                        }}
                      >
                        <Icon name="external" size={12} />
                      </button>
                      <button
                        type="button"
                        className="mini-button"
                        title={t("从最近列表中移除")}
                        onClick={(event) => {
                          event.stopPropagation();
                          onRemoveRecent(file.path);
                        }}
                      >
                        <Icon name="close" size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="recent-meta">
                    <div className="recent-name" title={file.name}>
                      {stripExtension(file.name)}
                    </div>
                    <div className="recent-sub">
                      {t("第 {page} / {total} 页 · {time}", {
                        page: file.page ?? 1,
                        total: file.total ?? "?",
                        time: formatRelativeTime(file.openedAt),
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="empty-footer">
          <span>{t("支持 macOS · Windows · Linux")}</span>
          <span className="dot-separator" />
          <span>{t("基于 PDF.js 渲染")}</span>
        </div>
      </div>
    </div>
  );
}
