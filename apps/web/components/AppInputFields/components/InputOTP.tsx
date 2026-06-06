"use client";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";
import React from "react";
import { FieldValues, useFormContext } from "react-hook-form";
import { BaseInputProps } from "../InputField.types";

const InputOTPController = <T extends FieldValues>({
  label,
  name,
  disabled = false,
  required = false,
  description,
  onComplete,
}: Omit<BaseInputProps<T>, "form">) => {
  const form = useFormContext<T>();

  if (!form) {
    throw new Error("InputOTPController must be used within a FormProvider");
  }

  return (
    <FormField
      control={form.control}
      name={name}
      disabled={disabled}
      render={({ field }) => (
        <FormItem
          className={cn(
            "w-full max-w-100",
            "group transition-all duration-300 ease-in-out"
          )}
        >
          <FormLabel
            className={cn(
              "text-sm font-medium transition-colors",
              "group-hover:text-primary",
              required && "after:ml-0.5 after:text-red-500 after:content-['*']"
            )}
          >
            {label}
          </FormLabel>
          <FormControl>
            <div className="w-full">
              <InputOTP
                maxLength={6}
                value={field.value}
                onChange={field.onChange}
                disabled={disabled}
                className="w-full gap-2"
                onComplete={(data) => {
                  onComplete?.(data);
                }}
              >
                <InputOTPGroup className="w-full gap-2">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <InputOTPSlot
                      key={index}
                      index={index}
                      className={cn(
                        "h-14 w-full",
                        "rounded-md border-2",
                        "transition-all duration-200",
                        "focus:ring-2 focus:ring-primary/20",
                        "focus:border-primary",
                        "hover:border-primary/50",
                        "group-hover:shadow-sm",
                        "text-lg font-semibold"
                      )}
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
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

export default React.memo(InputOTPController) as <T extends FieldValues>(
  props: Omit<BaseInputProps<T>, "form">
) => React.ReactNode;
