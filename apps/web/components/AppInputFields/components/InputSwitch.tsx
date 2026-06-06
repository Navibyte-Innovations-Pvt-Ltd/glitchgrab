"use client";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { FieldValues, Path, useFormContext } from "react-hook-form";
import { IconType } from "react-icons";
import { INPUT_ICON_SIZE, INPUT_ICON_COLOR } from "../input-styles";

interface InputSwitchProps<T extends FieldValues> {
  label: string;
  name: Path<T>;
  description?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  Icon?: LucideIcon | IconType;
}

const InputSwitch = <T extends FieldValues>({
  label,
  name,
  description,
  className,
  disabled = false,
  required = false,
  Icon,
}: InputSwitchProps<T>) => {
  const form = useFormContext<T>();

  if (!form) {
    throw new Error("InputSwitch must be used within a FormProvider");
  }

  return (
    <FormField
      control={form.control}
      name={name}
      disabled={disabled}
      render={({ field }) => (
        <FormItem
          className={cn(
            "group flex flex-row items-center justify-between rounded-lg border p-4 transition-all duration-300 ease-in-out hover:border-primary",
            className
          )}
        >
          <div className="flex items-center gap-3">
            {Icon && (
              <div className={`${INPUT_ICON_COLOR} transition-colors group-hover:text-primary`}>
                <Icon className={INPUT_ICON_SIZE} />
              </div>
            )}
            <div className="space-y-0.5">
              <FormLabel
                className={cn(
                  "text-base transition-colors group-hover:text-primary",
                  required &&
                    "after:ml-0.5 after:text-destructive after:content-['*']"
                )}
              >
                {label}
              </FormLabel>
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>
          </div>
          <FormControl>
            <Switch
              checked={field.value}
              onCheckedChange={field.onChange}
              disabled={disabled}
            />
          </FormControl>
          <FormMessage className="mt-1 animate-in text-xs font-medium text-destructive fade-in-50" />
        </FormItem>
      )}
    />
  );
};

export default InputSwitch;
