"use client";

import * as React from "react";
import PhoneInputPrimitive, {
  type Country,
} from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { cn } from "@/lib/utils";

export interface PhoneInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "onChange" | "value"
  > {
  value?: string;
  onChange?: (value: string | undefined) => void;
  defaultCountry?: Country;
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value, onChange, defaultCountry = "IN", ...props }, ref) => {
    return (
      <PhoneInputPrimitive
        international
        defaultCountry={defaultCountry}
        value={value}
        onChange={onChange}
        className={cn(
          "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
          "focus-within:ring-1 focus-within:ring-primary/20 focus-within:border-primary",
          "[&_.PhoneInputInput]:bg-transparent [&_.PhoneInputInput]:outline-none [&_.PhoneInputInput]:flex-1 [&_.PhoneInputInput]:min-w-0",
          "[&_.PhoneInputCountrySelect]:bg-background [&_.PhoneInputCountrySelect]:border-0 [&_.PhoneInputCountrySelect]:outline-none [&_.PhoneInputCountrySelect]:text-sm [&_.PhoneInputCountrySelect]:mr-2",
          "[&_.PhoneInputCountryIcon]:w-6 [&_.PhoneInputCountryIcon]:h-4 [&_.PhoneInputCountryIcon]:mr-1",
          className
        )}
        inputComponent={React.forwardRef<HTMLInputElement>((inputProps, inputRef) => (
          <input
            ref={inputRef ?? ref}
            {...inputProps}
            className="bg-transparent outline-none flex-1 min-w-0 text-sm placeholder:text-muted-foreground/50"
          />
        ))}
        {...props}
      />
    );
  }
);

PhoneInput.displayName = "PhoneInput";

export { PhoneInput };
