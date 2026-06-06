"use client";

import { Checkbox } from "@/components/ui/checkbox";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { FieldValues, useFormContext } from "react-hook-form";
import { InputFieldProps } from "../InputField";

interface MultiCheckboxOption {
  value: string | null;
  label: string;
  description?: string;
}

const InputMultiCheckbox = <T extends FieldValues>({
  label,
  name,
  className,
  disabled,
  required = false,
  description,
  options = [],
  placeholder,
}: Omit<InputFieldProps<T>, "form">) => {
  const form = useFormContext<T>();

  if (!form) {
    throw new Error("InputMultiCheckbox must be used within a FormProvider");
  }

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn("space-y-3", className)}>
          {label && (
            <FormLabel
              className={cn(
                required &&
                  "after:ml-0.5 after:text-red-500 after:content-['*']"
              )}
            >
              {label}
            </FormLabel>
          )}
          <FormControl>
            <div className="max-h-40 overflow-y-auto rounded-lg border p-3">
              {options.length > 0 ? (
                <div className="space-y-2">
                  {options.map((option: MultiCheckboxOption) => (
                    <div
                      key={option.value}
                      className="flex items-start space-x-2"
                    >
                      <Checkbox
                        id={`${name}-${option.value}`}
                        checked={field.value?.includes(option.value) || false}
                        onCheckedChange={(checked) => {
                          const currentValue = field.value || [];
                          if (checked) {
                            field.onChange([...currentValue, option.value]);
                          } else {
                            field.onChange(
                              currentValue.filter(
                                (val: string) => val !== option.value
                              )
                            );
                          }
                        }}
                        disabled={disabled}
                      />
                      <div className="space-y-1 leading-none">
                        <Label
                          htmlFor={`${name}-${option.value}`}
                          className="cursor-pointer text-sm font-normal"
                        >
                          {option.label}
                        </Label>
                        {option.description && (
                          <p className="text-xs text-gray-500">
                            {option.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  {placeholder || "No options available"}
                </div>
              )}
            </div>
          </FormControl>
          {description && (
            <p className="text-xs text-gray-600">{description}</p>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default InputMultiCheckbox;
