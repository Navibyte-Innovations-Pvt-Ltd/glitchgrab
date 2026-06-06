import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { INPUT_BORDER_COLOR, INPUT_ICON_SIZE, INPUT_ICON_COLOR, INPUT_PLACEHOLDER_COLOR } from "../input-styles";
import { useFormContext } from "react-hook-form";
import { InputFieldProps } from "../InputField";

const InputTextArea = (props: Omit<InputFieldProps, "form">) => {
  const {
    label,
    name,
    placeholder,
    className,
    disabled,
    Icon,
    iconClassName,
    description,
    required,
  } = props;

  const form = useFormContext();

  if (!form) {
    throw new Error("InputTextArea must be used within a FormProvider");
  }

  return (
    <FormField
      control={form.control}
      name={name}
      disabled={disabled}
      render={({ field }) => {
        return (
          <FormItem
            className={cn(
              "w-full max-w-100",
              "group transition-all duration-300 ease-in-out",
              className
            )}
          >
            <FormLabel
              className={cn(
                "text-sm font-medium transition-colors",
                "group-hover:text-primary",
                required &&
                  "after:ml-0.5 after:text-red-500 after:content-['*']"
              )}
            >
              {label}
            </FormLabel>
            <FormControl>
              <div className="relative w-full">
                {Icon && (
                  <Icon
                    className={cn(
                      `absolute top-3 left-3 z-10 ${INPUT_ICON_SIZE}`,
                      `${INPUT_ICON_COLOR} transition-colors duration-200`,
                      "group-hover:text-primary",
                      iconClassName
                    )}
                  />
                )}

                <Textarea
                  className={cn(
                    "min-h-20 w-full",
                    "transition-all duration-200",
                    `border-2 ${INPUT_BORDER_COLOR} focus:border-primary`,
                    "hover:border-primary/50",
                    "rounded-md shadow-none",
                    INPUT_PLACEHOLDER_COLOR,
                    "focus:ring-2 focus:ring-primary/20",
                    Icon ? "pl-10" : "pl-3"
                  )}
                  placeholder={placeholder}
                  {...field}
                />
              </div>
            </FormControl>
            {description && (
              <p className="mt-1 text-xs text-muted-foreground">
                {description}
              </p>
            )}
            <FormMessage className="mt-1 animate-in text-xs font-medium text-destructive fade-in-50" />
          </FormItem>
        );
      }}
    />
  );
};

export default InputTextArea;
