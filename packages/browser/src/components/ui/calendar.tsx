import * as React from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils.ts";

type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  navLayout = "around",
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      navLayout={navLayout}
      className={cn("p-0", className)}
      classNames={{
        root: "w-fit",
        months:
          "flex flex-col gap-4 sm:flex-row sm:gap-5 [--cell-size:2.25rem] md:[--cell-size:2.5rem]",
        month: "relative flex flex-col gap-4",
        month_caption: "flex h-9 items-center justify-center px-10",
        caption_label: "text-sm font-semibold text-foreground",
        nav: "flex items-center gap-1",
        button_previous:
          "absolute top-0 left-0 inline-flex size-8 items-center justify-center rounded-full border border-border/75 bg-background text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground",
        button_next:
          "absolute top-0 right-0 inline-flex size-8 items-center justify-center rounded-full border border-border/75 bg-background text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday:
          "w-(--cell-size) text-center text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground",
        week: "mt-1 flex w-full",
        day: "relative h-(--cell-size) w-(--cell-size) p-0 text-center",
        day_button:
          "h-(--cell-size) w-(--cell-size) rounded-xl text-sm font-medium text-foreground outline-none transition-colors hover:bg-secondary focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-selected:opacity-100",
        today: "font-semibold text-primary",
        outside: "text-muted-foreground/45 aria-selected:text-muted-foreground/45",
        disabled: "text-muted-foreground/35",
        hidden: "invisible",
        selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        range_start:
          "bg-primary text-primary-foreground [&>button]:bg-primary [&>button]:text-primary-foreground",
        range_middle:
          "bg-primary/12 text-foreground [&>button]:rounded-none [&>button]:bg-primary/12",
        range_end:
          "bg-primary text-primary-foreground [&>button]:bg-primary [&>button]:text-primary-foreground",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: iconClassName, ...iconProps }) =>
          orientation === "left" ? (
            <ChevronLeftIcon className={cn("size-4", iconClassName)} {...iconProps} />
          ) : (
            <ChevronRightIcon className={cn("size-4", iconClassName)} {...iconProps} />
          ),
      }}
      {...props}
    />
  );
}

export { Calendar };
