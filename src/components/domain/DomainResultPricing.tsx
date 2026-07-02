import type { DomainPriceDisplay } from "@/types/domain-purchase";

interface DomainResultPricingProps {
  display: DomainPriceDisplay;
  compact?: boolean;
}

/** Period-aware domain price — never shows a bare number without term context. */
export function DomainResultPricing({ display, compact = false }: DomainResultPricingProps) {
  return (
    <div className={`text-right ${compact ? "space-y-0.5" : "space-y-1"}`}>
      {display.saleLabel && (
        <p className={`font-semibold text-green-700 dark:text-green-400 ${compact ? "text-sm" : "text-base"}`}>
          {display.saleLabel}
        </p>
      )}
      <p className={`font-bold tabular-nums ${compact ? "text-base" : "text-lg"}`}>
        {display.registrationLabel}
      </p>
      {display.renewalLabel && (
        <p className="text-xs text-muted-foreground">{display.renewalLabel}</p>
      )}
      {display.isFallback && display.fallbackNote && (
        <p className="text-xs text-amber-700 dark:text-amber-400">{display.fallbackNote}</p>
      )}
    </div>
  );
}
