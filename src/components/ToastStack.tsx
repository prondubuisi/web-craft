import { createPortal } from 'react-dom'
import { dismissToast, useToasts } from '../lib/toast'

export function ToastStack() {
  const toasts = useToasts()
  if (!toasts.length) return null
  return createPortal(
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.tone}`} data-vibe={t.vibe}>
          {t.tone === 'milestone' ? (
            <span className="toast-burst" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l2.8 2.8M16.2 16.2 19 19M19 5l-2.8 2.8M7.8 16.2 5 19" />
              </svg>
            </span>
          ) : null}
          <span className="toast-copy">
            <strong>{t.message}</strong>
            {t.detail ? <small>{t.detail}</small> : null}
          </span>
          {t.action ? (
            <a className="toast-action" href={t.action.href} onClick={() => dismissToast(t.id)}>
              {t.action.label}
            </a>
          ) : null}
          <button type="button" aria-label="Dismiss" onClick={() => dismissToast(t.id)}>
            ×
          </button>
        </div>
      ))}
    </div>,
    document.body,
  )
}
