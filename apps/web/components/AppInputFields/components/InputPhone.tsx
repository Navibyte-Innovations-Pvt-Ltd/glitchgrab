import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { PhoneInput } from "@/components/ui/phone-input";
import { cn } from "@/lib/utils";
import { useFormContext } from "react-hook-form";
import { InputFieldProps } from "../InputField";

const InputPhone = (props: Omit<InputFieldProps, "form">) => {
  const {
    label,
    name,
    placeholder,
    className,
    disabled,
    required,
    description,
  } = props;

  const form = useFormContext();

  if (!form) {
    throw new Error("InputPhone must be used within a FormProvider");
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
            className,
          )}
        >
          <FormLabel
            className={cn(
              "min-h-5 text-sm font-medium transition-colors",
              "group-hover:text-primary",
              required && "after:ml-0.5 after:text-red-500 after:content-['*']",
            )}
          >
            {label}
          </FormLabel>
          <FormControl>
            <PhoneInput
              value={field.value ? field.value.replace(/[\s\-()]/g, "") : field.value}
              onChange={field.onChange}
              placeholder={placeholder || "Enter phone number"}
              disabled={disabled}
              name={name}
              defaultCountry="IN"
              className="h-11"
            />
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

export default InputPhone;
