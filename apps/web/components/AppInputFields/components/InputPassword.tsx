"use client";

import { Button } from "@/components/ui/button";
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
import { Eye, EyeOff, Lock } from "lucide-react";
import { FC, useState } from "react";
import { useFormContext } from "react-hook-form";
import { InputFieldProps } from "../InputField";

const InputPassword: FC<Omit<InputFieldProps, "form">> = (props) => {
  const {
    label,
    name,
    placeholder,
    className,
    disabled = false,
    Icon,
    iconClassName,
    required = false,
    description,
  } = props;

  const form = useFormContext();

  if (!form) {
    throw new Error("InputPassword must be used within a FormProvider");
  }

  const [showPassword, setShowPassword] = useState(false);

  const togglePassword = () => {
    setShowPassword(!showPassword);
  };

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
              <div className="pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center">
                {Icon ? (
                  <Icon
                    className={cn(
                      `${INPUT_ICON_SIZE} ${INPUT_ICON_COLOR} transition-all duration-200`,
                      "group-hover:text-primary",
                      iconClassName
                    )}
                  />
                ) : (
                  <Lock
                    className={cn(
                      `${INPUT_ICON_SIZE} ${INPUT_ICON_COLOR} transition-all duration-200`,
                      "group-hover:text-primary",
                      iconClassName
                    )}
                  />
                )}
              </div>

              <Input
                type={showPassword ? "text" : "password"}
                className={cn(
                  "h-11 w-full min-w-0 py-2 pr-10 pl-10",
                  "transition-all duration-200",
                  `border ${INPUT_BORDER_COLOR} ${INPUT_BORDER_FOCUS}`,
                  INPUT_BORDER_HOVER,
                  "rounded-md shadow-none",
                  INPUT_PLACEHOLDER_COLOR,
                  "focus:ring-1 focus:ring-primary/20"
                )}
                placeholder={placeholder}
                {...field}
              />

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={togglePassword}
                className="absolute top-1/2 right-3 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </FormControl>
          {description && (
            <p className="mt-1 pl-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
              {description}
            </p>
          )}
          <FormMessage className="mt-1 animate-in text-xs font-medium text-destructive fade-in-50" />
        </FormItem>
      )}
    />
  );
};

export default InputPassword;
