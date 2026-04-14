import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";

interface InnerPageHeaderProps {
  /** Last segment of the route, e.g. "repos", "tokens". Used in breadcrumb. */
  segment: string;
  /** Optional icon for breadcrumb leading. */
  icon?: LucideIcon;
  /** Big lowercase title (e.g. "api_tokens", "repositories"). */
  title: string;
  /** One-line mono subhead, shown after a vertical divider on desktop. */
  subtitle?: React.ReactNode;
  /** Meta pill/accent line below subtitle (optional, mono, cyan-ish). */
  meta?: React.ReactNode;
  /** Right-side primary action — already styled. */
  action?: React.ReactNode;
}

/**
 * Shared page header for all inner dashboard pages.
 * Breadcrumb + title + mono subhead + primary action.
 * Matches the terminal-dev design vocab (mono metadata, uppercase tracked labels).
 */
export function InnerPageHeader({
  segment,
  icon: Icon,
  title,
  subtitle,
  meta,
  action,
}: InnerPageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-6 border-b border-border">
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6 min-w-0">
        <div className="min-w-0">
          <div className="font-mono text-[10px] text-muted-foreground mb-1.5 flex items-center gap-1.5 uppercase tracking-widest">
            {Icon && <Icon className="h-3 w-3 shrink-0" />}
            <span>/</span>
            <span>dashboard</span>
            <ChevronRight className="h-3 w-3 shrink-0" />
            <span className="text-foreground">{segment}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-foreground leading-none lowercase">
            {title}
          </h1>
        </div>

        {(subtitle || meta) && (
          <div className="sm:h-8 sm:border-l sm:border-border sm:pl-4 flex flex-col justify-end pb-0.5 min-w-0">
            {subtitle && (
              <p className="font-mono text-[11px] text-muted-foreground leading-tight truncate">
                {subtitle}
              </p>
            )}
            {meta && (
              <p className="font-mono text-[11px] text-primary/70 leading-tight truncate">
                {meta}
              </p>
            )}
          </div>
        )}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
