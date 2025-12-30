"use client"

import * as React from "react"
import { DayPicker } from "react-day-picker"
import { es } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={es}
      className={cn("p-3", className)}
      modifiersClassNames={{
        cte: "day_cte",
        suspension: "day_suspension",
        vacation: "day_vacation",
        taller: "day_taller",
        has_event: "day_has_event",
        has_private_event: "day_has_private_event",
      }}
      modifiersStyles={{
        cte: { border: '2px solid #f472b6', backgroundColor: '#fdf2f8', borderRadius: '100%', color: '#be185d', fontWeight: 'bold' },
        suspension: { backgroundColor: '#18181b', color: 'white', borderRadius: '100%', fontWeight: 'bold' },
        vacation: { backgroundColor: '#f4f4f5', color: '#a1a1aa' },
        taller: { backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fcd34d' }
      }}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4 w-full",
        caption: "flex justify-center pt-1 relative items-center mb-4",
        caption_label: "text-sm font-semibold",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        month_grid: "w-full border-collapse",
        weekdays: "grid grid-cols-7 w-full",
        weekday: "text-muted-foreground rounded-md w-full font-normal text-[0.8rem] text-center",
        week: "grid grid-cols-7 w-full mt-2",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 transition-all hover:rounded-full relative"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-full",
        day_today: "bg-accent text-accent-foreground font-bold",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        // Indicador de evento (punto azul/púrpura) via pseudo-elementos en CSS
        day_has_event: "after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-blue-500 after:rounded-full after:z-30",
        day_has_private_event: "after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-purple-500 after:rounded-full after:z-30",
        ...classNames,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
