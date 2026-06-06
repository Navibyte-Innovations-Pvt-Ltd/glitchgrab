/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Styles for scrollable popover
const styles = `
  .date-picker-popover {
    max-height: 80vh !important;
    display: flex !important;
    flex-direction: column !important;
  }
  .date-picker-content {
    flex: 1;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: hsl(var(--primary) / 0.2) transparent;
  }
  .date-picker-content::-webkit-scrollbar {
    width: 4px;
  }
  .date-picker-content::-webkit-scrollbar-track {
    background: transparent;
  }
  .date-picker-content::-webkit-scrollbar-thumb {
    background-color: hsl(var(--primary) / 0.2);
    border-radius: 2px;
  }
  .date-picker-content::-webkit-scrollbar-thumb:hover {
    background-color: hsl(var(--primary) / 0.3);
  }
  .date-picker-footer {
    border-top: 1px solid hsl(var(--border));
    padding: 0.75rem;
    background: linear-gradient(to right, hsl(var(--muted) / 0.2), hsl(var(--muted) / 0.3));
    backdrop-filter: blur(8px);
  }
`;
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { format, getDaysInMonth } from "date-fns";
import {
  Calendar as CalendarIcon,
  X,
  Repeat,
  Trash2,
  Clock,
  Target,
  Plus,
  ChevronDown,
  Sparkles,
  Info,
  CheckCircle2,
} from "lucide-react";
import * as React from "react";
import { FieldValues, useFormContext, useWatch } from "react-hook-form";
import { BaseInputProps } from "../InputField";
import { INPUT_BORDER_COLOR, INPUT_BORDER_HOVER, INPUT_BORDER_FOCUS, INPUT_ICON_SIZE, INPUT_ICON_COLOR } from "../input-styles";

const InputMultipleDates = <T extends FieldValues>({
  label,
  name,
  placeholder,
  className,
  disabled = false,
  required = false,
  description,
}: Omit<BaseInputProps<T>, "form" | "type">) => {
  const form = useFormContext<T>();
  const [open, setOpen] = React.useState(false);
  const [selectedDay, setSelectedDay] = React.useState<number>(1);
  // Suggestions feature disabled for now
  // const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  if (!form) {
    throw new Error("InputMultipleDates must be used within a FormProvider");
  }

  const selectedDates: string[] = useWatch({ control: form.control, name }) || [];

  // Smart suggestions for common compliance dates
  const smartSuggestions = [
    {
      day: 1,
      label: "1st of each month",
      description: "Monthly reports, invoices",
      icon: Target,
    },
    {
      day: 15,
      label: "15th of each month",
      description: "Mid-month reviews, payroll",
      icon: Clock,
    },
    {
      day: 30,
      label: "30th of each month",
      description: "Month-end closing, summaries",
      icon: Repeat,
    },
    {
      day: 5,
      label: "5th of each month",
      description: "Payment deadlines",
      icon: Target,
    },
    {
      day: 10,
      label: "10th of each month",
      description: "Tax submissions",
      icon: Clock,
    },
  ];

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    // Format as MM-DD (month-day only)
    const monthDay = format(date, "MM-dd");

    const currentDates: string[] = form.getValues(name) || [];

    // Check if date already exists
    if (currentDates.includes(monthDay)) {
      // Remove if already selected
      const updatedDates = currentDates.filter((d: string) => d !== monthDay);
      form.setValue(name, updatedDates as any);
    } else {
      // Add new date
      form.setValue(name, [...currentDates, monthDay] as any);
    }
  };

  const handleQuickSelection = (targetDay: number) => {
    setIsLoading(true);

    // Simulate processing time for better UX
    setTimeout(() => {
      const currentDates: string[] = form.getValues(name) || [];
      const newDates: string[] = [];

      // Generate dates for all 12 months
      for (let month = 1; month <= 12; month++) {
        let day = targetDay;

        // Handle last day of month or days that don't exist in some months
        if (
          targetDay === 31 ||
          targetDay > getDaysInMonth(new Date(2024, month - 1))
        ) {
          day = getDaysInMonth(new Date(2024, month - 1));
        }

        const monthDay = `${month.toString().padStart(2, "0")}-${day
          .toString()
          .padStart(2, "0")}`;

        // Only add if not already selected
        if (!currentDates.includes(monthDay)) {
          newDates.push(monthDay);
        }
      }

      // Add new dates to existing ones
      const updatedDates = [...currentDates, ...newDates];
      form.setValue(name, updatedDates as any);
      setIsLoading(false);

      // Auto-close dialog after adding dates
      setOpen(false);
    }, 300);
  };

  const removeDate = (dateToRemove: string) => {
    const currentDates: string[] = form.getValues(name) || [];
    const updatedDates = currentDates.filter((d: string) => d !== dateToRemove);
    form.setValue(name, updatedDates as any);
  };

  const clearAllDates = () => {
    form.setValue(name, [] as any);
  };

  const formatDisplayDate = (dateString: string) => {
    let monthStr, dayStr;
    const parts = dateString.split("-");
    if (parts.length === 3) {
      monthStr = parts[1];
      dayStr = parts[2];
    } else {
      monthStr = parts[0];
      dayStr = parts[1];
    }

    const month = parseInt(monthStr);
    const day = parseInt(dayStr);

    if (isNaN(month) || isNaN(day)) {
      // Fallback for full ISO strings or unexpected formats
      const d = new Date(dateString);
      if (!isNaN(d.getTime())) {
        return format(d, "MMM d");
      }
      return dateString;
    }

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${monthNames[month - 1] || "Unknown"} ${day || ""}`;
  };

  // Helper function (disabled with getPresetOptions)
  // const getOrdinalSuffix = (day: number) => {
  //   if (day >= 11 && day <= 13) return "th";
  //   switch (day % 10) {
  //     case 1:
  //       return "st";
  //     case 2:
  //       return "nd";
  //     case 3:
  //       return "rd";
  //     default:
  //       return "th";
  //   }
  // };

  // Preset options feature disabled for now
  // const getPresetOptions = () => [
  //   {
  //     day: 1,
  //     label: "1st of every month",
  //     icon: Target,
  //     color: "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100",
  //   },
  //   {
  //     day: 15,
  //     label: "15th of every month",
  //     icon: Clock,
  //     color: "bg-green-50 border-green-200 text-green-700 hover:bg-green-100",
  //   },
  //   {
  //     day: selectedDay,
  //     label: `${selectedDay}${getOrdinalSuffix(selectedDay)} of every month`,
  //     icon: Sparkles,
  //     color:
  //       "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100",
  //   },
  // ];

  // Sort dates by month then day for better display
  const sortedDates = [...selectedDates].sort((a, b) => {
    let partsA = a.split("-").map(Number);
    let partsB = b.split("-").map(Number);

    // Normalize to [month, day]
    if (partsA.length === 3) partsA = [partsA[1], partsA[2]];
    if (partsB.length === 3) partsB = [partsB[1], partsB[2]];

    const [monthA, dayA] = partsA;
    const [monthB, dayB] = partsB;
    return monthA - monthB || dayA - dayB;
  });

  // Create a date object for the current year to check if it's selected
  const isDateSelected = (date: Date) => {
    const monthDay = format(date, "MM-dd");
    return selectedDates.includes(monthDay);
  };

  return (
    <FormField
      control={form.control}
      name={name}
      disabled={disabled}
      render={() => (
        <FormItem
          className={cn(
            "w-full",
            "group transition-all duration-300 ease-in-out",
            className
          )}
        >
          <FormLabel
            className={cn(
              "min-h-5 text-sm font-medium transition-colors",
              "group-hover:text-primary",
              required && "after:ml-0.5 after:text-red-500 after:content-['*']"
            )}
          >
            {label}
          </FormLabel>
          <FormControl>
            <div className="space-y-3">
              {/* Selected Dates Display */}
              {selectedDates.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-foreground">
                        {selectedDates.length} Date
                        {selectedDates.length !== 1 ? "s" : ""} Selected
                      </span>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={clearAllDates}
                            className="h-7 px-2 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="mr-1 h-3 w-3" />
                            Clear All
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Remove all selected dates</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex max-h-30 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-border/50 bg-linear-to-r from-muted/30 to-muted/20 p-2">
                    {sortedDates.map((date: string) => (
                      <Badge
                        key={date}
                        variant="secondary"
                        className="group flex h-6 items-center justify-between gap-1 border-primary/10 bg-primary/5 px-2 text-xs font-medium text-primary transition-all duration-200 hover:bg-primary/10"
                      >
                        <span>{formatDisplayDate(date)}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => removeDate(date)}
                          className="ml-1 h-4 w-4 rounded-full p-0 text-primary/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Remove ${formatDisplayDate(date)}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Date Picker */}
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "group w-full justify-between text-left font-normal",
                      `border ${INPUT_BORDER_COLOR} ${INPUT_BORDER_HOVER} ${INPUT_BORDER_FOCUS}`,
                      "transition-all duration-200",
                      "shadow-none focus:ring-1 focus:ring-primary/20",
                      selectedDates.length === 0 && "text-muted-foreground",
                      "h-11 px-4 py-2"
                    )}
                  >
                    <div className="flex items-center">
                      <div className="mr-3 flex h-4 w-4 items-center justify-center">
                        <CalendarIcon className={`${INPUT_ICON_SIZE} ${INPUT_ICON_COLOR}`} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm">
                          {selectedDates.length > 0
                            ? `${selectedDates.length} date${
                                selectedDates.length > 1 ? "s" : ""
                              } selected`
                            : placeholder || "Select compliance dates"}
                        </span>
                        {selectedDates.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            Click to add more or modify dates
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {selectedDates.length > 0 && (
                        <Badge
                          variant="secondary"
                          className="bg-primary/10 text-primary"
                        >
                          {selectedDates.length}
                        </Badge>
                      )}
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
                    </div>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="date-picker-popover z-60 h-112.5 w-[320px] p-0"
                  align="start"
                >
                  <style jsx global>
                    {styles}
                  </style>
                  <Tabs defaultValue="calendar" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1">
                      <TabsTrigger
                        value="calendar"
                        className="flex items-center gap-2"
                      >
                        <CalendarIcon className="h-4 w-4" />
                        <span>Calendar</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="quick"
                        className="flex items-center gap-2"
                      >
                        <Target className="h-4 w-4" />
                        <span>Quick Add</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="suggestions"
                        className="flex items-center gap-2"
                      >
                        <Sparkles className="h-4 w-4" />
                        <span>Smart</span>
                      </TabsTrigger>
                    </TabsList>

                    <div className="date-picker-content">
                      <TabsContent value="calendar" className="m-0 p-4">
                        <div className="space-y-4">
                          <div className="rounded-lg border border-blue-500/20 bg-linear-to-r from-blue-500/5 to-blue-600/10 p-4">
                            <Calendar
                              mode="single"
                              selected={undefined}
                              onSelect={handleDateSelect}
                              initialFocus
                              className="w-full rounded-md border-0 [&_.rdp-cell]:rounded-lg [&_.rdp-day]:h-9 [&_.rdp-day]:w-9 [&_.rdp-day]:text-sm [&_.rdp-day]:font-medium"
                              modifiers={{
                                selected: isDateSelected,
                              }}
                              modifiersStyles={{
                                selected: {
                                  backgroundColor: "hsl(var(--primary))",
                                  color: "hsl(var(--primary-foreground))",
                                  fontWeight: "600",
                                },
                              }}
                            />
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="quick" className="m-0 p-4">
                        <div className="space-y-4">
                          <div className="space-y-3 rounded-lg border border-primary/20 bg-linear-to-r from-primary/5 to-primary/10 p-4">
                            <div className="flex items-center gap-2">
                              <Target className="h-4 w-4 text-primary" />
                              <Label
                                htmlFor="day-selector"
                                className="text-sm font-medium text-foreground"
                              >
                                Day of month (1-29)
                              </Label>
                            </div>
                            <div className="flex items-center gap-3">
                              <Input
                                id="day-selector"
                                type="number"
                                min="1"
                                max="29"
                                value={selectedDay}
                                onChange={(e) =>
                                  setSelectedDay(Number(e.target.value))
                                }
                                className="h-9 w-20 border-primary/30 text-center font-medium focus:border-primary focus:ring-primary"
                                placeholder="11"
                              />
                              <Button
                                type="button"
                                variant="default"
                                size="sm"
                                onClick={() =>
                                  handleQuickSelection(selectedDay)
                                }
                                className="h-9 flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                                disabled={
                                  selectedDay < 1 ||
                                  selectedDay > 29 ||
                                  isLoading
                                }
                              >
                                {isLoading ? (
                                  <>
                                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                                    Adding dates...
                                  </>
                                ) : (
                                  <>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add to all months
                                  </>
                                )}
                              </Button>
                            </div>
                            <div className="flex items-start gap-2 rounded-md bg-background/50 p-3">
                              <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                              <p className="text-xs text-muted-foreground">
                                This will add the <strong>{selectedDay}</strong>
                                <strong>
                                  {selectedDay === 1
                                    ? "st"
                                    : selectedDay === 2
                                    ? "nd"
                                    : selectedDay === 3
                                    ? "rd"
                                    : "th"}
                                </strong>{" "}
                                of every month. For shorter months, it adjusts
                                to the last available day.
                              </p>
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="suggestions" className="m-0 p-4">
                        <div className="space-y-3">
                          {smartSuggestions.map((suggestion) => {
                            const Icon = suggestion.icon;
                            return (
                              <Button
                                key={suggestion.day}
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedDay(suggestion.day);
                                  handleQuickSelection(suggestion.day);
                                }}
                                className="h-auto w-full justify-start border-orange-500/20 bg-linear-to-r from-orange-500/5 to-orange-600/10 p-3 text-left hover:from-orange-500/10 hover:to-orange-600/20"
                              >
                                <Icon className="mr-3 h-4 w-4 shrink-0 text-orange-600" />
                                <div className="text-left">
                                  <div className="text-sm font-medium">
                                    {suggestion.label}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {suggestion.description}
                                  </div>
                                </div>
                              </Button>
                            );
                          })}
                        </div>
                      </TabsContent>
                    </div>

                    <div className="date-picker-footer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-foreground">
                              {selectedDates.length}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            date{selectedDates.length !== 1 ? "s" : ""} selected
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          onClick={() => setOpen(false)}
                          className="h-8 bg-primary px-4 text-xs font-medium hover:bg-primary/90"
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Done
                        </Button>
                      </div>
                    </div>
                  </Tabs>
                </PopoverContent>
              </Popover>
            </div>
          </FormControl>
          {description && (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          )}
          <FormMessage className="mt-1 animate-in text-xs font-medium text-destructive fade-in-50" />
        </FormItem>
      )}
    />
  );
};

export default InputMultipleDates;
