"use client";

import { useEffect, useState } from "react";

import { format, parseISO } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type AdminTableDateRangeValue = {
  from: string | null;
  to: string | null;
};

type AdminTableDateRangeFilterProps = {
  align?: "start" | "center" | "end";
  ariaLabel?: string;
  className?: string;
  label?: string;
  onChange: (value: AdminTableDateRangeValue) => void;
  value: AdminTableDateRangeValue;
};

function parseDateRange(value: AdminTableDateRangeValue): DateRange | undefined {
  return {
    from: value.from ? parseISO(value.from) : undefined,
    to: value.to ? parseISO(value.to) : undefined,
  };
}

function formatDateRangeLabel(value: AdminTableDateRangeValue, label: string) {
  const dateRange = parseDateRange(value);

  if (!dateRange?.from) {
    return label;
  }

  if (!dateRange.to) {
    return format(dateRange.from, "d MMM yyyy");
  }

  return `${format(dateRange.from, "d MMM yyyy")} - ${format(dateRange.to, "d MMM yyyy")}`;
}

function serializeDateRange(dateRange: DateRange | undefined): AdminTableDateRangeValue {
  return {
    from: dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : null,
    to: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : null,
  };
}

export function AdminTableDateRangeFilter({
  align = "start",
  ariaLabel = "Filter by date range",
  className = "w-full justify-start gap-2 overflow-hidden sm:w-auto",
  label = "Date range",
  onChange,
  value,
}: AdminTableDateRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const hasValue = Boolean(value.from || value.to);
  const selectedDateRange = parseDateRange(value);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 639px)");

    const syncViewport = () => {
      setIsCompactViewport(mediaQuery.matches);
    };

    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);

    return () => mediaQuery.removeEventListener("change", syncViewport);
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button aria-label={ariaLabel} className={className} size="sm" type="button" variant="outline">
          <CalendarIcon data-icon="inline-start" />
          <span className="min-w-0 flex-1 truncate text-left">{formatDateRangeLabel(value, label)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={isCompactViewport ? "center" : align}
        className="w-[calc(100vw-2rem)] max-w-sm overflow-hidden p-0 sm:w-auto sm:max-w-none"
      >
        <Calendar
          className="w-full"
          defaultMonth={selectedDateRange?.from}
          mode="range"
          numberOfMonths={isCompactViewport ? 1 : 2}
          onSelect={(nextDateRange) => onChange(serializeDateRange(nextDateRange))}
          selected={selectedDateRange}
        />
        <div className="flex justify-end border-t p-2">
          <Button
            className="w-full sm:w-auto"
            disabled={!hasValue}
            onClick={() => onChange({ from: null, to: null })}
            size="sm"
            type="button"
            variant="ghost"
          >
            <X data-icon="inline-start" />
            Clear
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
