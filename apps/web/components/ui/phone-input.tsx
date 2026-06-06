"use client";

import * as React from "react";
import PhoneInputPrimitive from "react-phone-number-input";
import type { Country } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { cn } from "@/lib/utils";

export interface PhoneInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "onChange" | "value"
  > {
  value?: string;
  onChange?: (value?: string) => void;
  defaultCountry?: Country;
}

const CustomInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>((props, ref) => (
  <input
    ref={ref}
    {...props}
    className="bg-transparent outline-none flex-1 min-w-0 text-sm placeholder:text-muted-foreground/50"
  />
));
CustomInput.displayName = "CustomInput";

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value, onChange, defaultCountry = "IN", ...props }, _ref) => {
    return (
      <PhoneInputPrimitive
        international
        defaultCountry={defaultCountry}
        value={value}
        onChange={onChange ?? (() => {})}
        style={
          {
            "--PhoneInputCountryFlag-borderColor": "transparent",
            "--PhoneInputCountryFlag-borderColor--focus": "transparent",
            "--PhoneInputCountrySelectArrow-color": "currentColor",
            "--PhoneInputCountrySelectArrow-opacity": "0.25",
            "--PhoneInput-color--focus": "transparent",
          } as React.CSSProperties
        }
        className={cn(
          "flex h-11 w-full rounded-md border border-zinc-700 bg-background px-3 py-2 text-sm gap-2",
          "transition-colors duration-150",
          "focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/10",
          "[&_.PhoneInputInput]:bg-transparent [&_.PhoneInputInput]:outline-none [&_.PhoneInputInput]:flex-1 [&_.PhoneInputInput]:min-w-0 [&_.PhoneInputInput]:text-foreground",
          "[&_.PhoneInputCountry]:flex [&_.PhoneInputCountry]:items-center [&_.PhoneInputCountry]:gap-1",
          "[&_.PhoneInputCountrySelect]:absolute [&_.PhoneInputCountrySelect]:inset-0 [&_.PhoneInputCountrySelect]:opacity-0 [&_.PhoneInputCountrySelect]:cursor-pointer",
          "[&_.PhoneInputCountryIcon--border]:shadow-none [&_.PhoneInputCountryIcon--border]:bg-transparent",
          className
        )}
        inputComponent={CustomInput}
        {...(props as object)}
      />
    );
  }
);

PhoneInput.displayName = "PhoneInput";

export { PhoneInput };
