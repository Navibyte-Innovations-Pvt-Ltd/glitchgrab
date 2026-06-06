"use client";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { INPUT_BORDER_COLOR, INPUT_BORDER_FOCUS, INPUT_BORDER_HOVER, INPUT_ICON_SIZE, INPUT_ICON_COLOR, INPUT_PLACEHOLDER_COLOR } from "../input-styles";
import { LucideIcon } from "lucide-react";
import React from "react";
import { FieldValues, Path, useFormContext } from "react-hook-form";
import { IconType } from "react-icons";

interface InputNumberProps<T extends FieldValues> {
  label?: string;
  name: Path<T>;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  description?: string;
  Icon?: LucideIcon | IconType;
  iconClassName?: string;
  min?: number;
  max?: number;
  step?: number;
}

const InputNumber = <T extends FieldValues>({
  label,
  name,
  placeholder,
  className,
  disabled = false,
  required = false,
  description,
  Icon,
  iconClassName,
  min,
  max,
  step = 1,
}: InputNumberProps<T>) => {
  const form = useFormContext<T>();

  if (!form) {
    throw new Error("InputNumber must be used within a FormProvider");
  }

  return (
    <FormField
      control={form.control}
      name={name}
      disabled={disabled}
      render={({ field }) => (
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
            <div className="relative w-full">
              {Icon && (
                <div className="pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center">
                  <Icon
                    className={cn(
                      `${INPUT_ICON_SIZE} ${INPUT_ICON_COLOR} transition-all duration-200`,
                      "group-hover:text-primary",
                      iconClassName
                    )}
                  />
                </div>
              )}
              <Input
                type="number"
                min={min}
                max={max}
                step={step}
                onWheel={(e) => e.currentTarget.blur()}
                className={cn(
                  "h-11 w-full",
                  "transition-all duration-200",
                  `border ${INPUT_BORDER_COLOR} ${INPUT_BORDER_FOCUS}`,
                  INPUT_BORDER_HOVER,
                  "rounded-md shadow-none",
                  INPUT_PLACEHOLDER_COLOR,
                  "focus:ring-1 focus:ring-primary/20",
                  Icon ? "pl-10" : "pl-3"
                )}
                placeholder={placeholder}
                {...field}
                value={field.value ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
                  // Convert to number if value is not empty, otherwise keep as empty string
                  if (value === "") {
                    field.onChange("");
                  } else {
                    const numValue = parseInt(value, 10);
                    if (!isNaN(numValue)) {
                      field.onChange(numValue);
                    }
                  }
                }}
              />
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

export default React.memo(InputNumber) as <T extends FieldValues>(
  props: InputNumberProps<T>
) => React.ReactNode;
