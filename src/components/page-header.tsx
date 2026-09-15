import type { ReactNode } from "react";
import type React from "react";

export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: string; actions?: ReactNode; eyebrow?: string }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        {eyebrow && <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-steel">{eyebrow}</p>}
        <h1 className="font-display text-[24px] font-semibold leading-tight tracking-tight">{title}</h1>
        {description && <p className="mt-0.5 text-[13px] text-steel">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** 표·폼을 감싸는 흰 패널. 그림자 없이 hairline 만. */
export function Panel({ children, className = "", ...rest }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`rounded-md border bg-card ${className}`} {...rest}>
      {children}
    </div>
  );
}

/** 비어 있는 상태 */
export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="max-w-sm text-[13px] text-steel">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
