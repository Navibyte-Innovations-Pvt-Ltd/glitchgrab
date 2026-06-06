/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { INPUT_BORDER_HEX, INPUT_ICON_SIZE, INPUT_ICON_COLOR } from "../input-styles";
import * as React from "react";
import { useFormContext } from "react-hook-form";
import Select, { components } from "react-select";
import { InputFieldProps } from "../InputField";

// Custom MenuList to block scroll propagation (Fix for Radix Dialog)
const MenuList = (props: any) => {
  return (
    <components.MenuList
      {...props}
      innerProps={{
        ...props.innerProps,
        onWheel: (e: any) => {
          e.stopPropagation();
        },
        onTouchMove: (e: any) => {
          e.stopPropagation();
        },
      }}
    >
      {props.children}
    </components.MenuList>
  );
};

const InputSelect: React.FC<Omit<InputFieldProps, "form">> = (props) => {
  const {
    label,
    name,
    placeholder,
    className,
    disabled = false,
    Icon,
    options,
    description,
    required,
    isSearchable = false,
  } = props;
  const form = useFormContext();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!form) {
    throw new Error("InputSelect must be used within a FormProvider");
  }

  const customStyles = {
    control: (provided: any, state: any) => ({
      ...provided,
      height: "44px",
      minHeight: "44px",
      border: state.isFocused
        ? "1px solid var(--primary)"
        : `1px solid ${INPUT_BORDER_HEX}`,
      borderColor: state.isFocused ? "var(--primary)" : INPUT_BORDER_HEX,
      borderRadius: "calc(var(--radius) - 2px)",
      backgroundColor: disabled ? "var(--muted)" : "transparent",
      boxShadow: state.isFocused ? "0 0 0 1px var(--primary)/0.2" : "none",
      transition: "all 200ms ease",
      "&:hover": {
        borderColor: "var(--primary)",
        cursor: "pointer",
      },
      paddingLeft: "38px",
    }),
    valueContainer: (provided: any) => ({
      ...provided,
      padding: "0 12px",
      paddingLeft: "0",
    }),
    input: (provided: any) => ({
      ...provided,
      color: "var(--foreground)",
    }),
    singleValue: (provided: any) => ({
      ...provided,
      color: "var(--foreground)",
      transition: "color 200ms ease",
    }),
    menu: (provided: any) => ({
      ...provided,
      backgroundColor: "var(--background)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius)",
      animation: "scaleIn 200ms ease",
      boxShadow:
        "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
      overflow: "hidden",
      zIndex: 99999, // Ensure it's above dialog
    }),
    menuPortal: (base: any) => ({
      ...base,
      zIndex: 99999, // Ensure portal is above everything
      pointerEvents: "auto", // Fix scrolling issues in Radix Dialog
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected
        ? "var(--primary)"
        : state.isFocused
          ? "var(--accent)"
          : "transparent",
      color: state.isSelected
        ? "var(--primary-foreground)"
        : "var(--foreground)",
      cursor: "pointer",
      transition: "all 150ms ease",
      "&:hover": {
        backgroundColor: state.isSelected ? "var(--primary)" : "var(--accent)",
      },
    }),
    dropdownIndicator: (provided: any, state: any) => ({
      ...provided,
      transition: "transform 200ms ease",
      transform: state.selectProps.menuIsOpen ? "rotate(180deg)" : null,
      color: state.isFocused ? "var(--primary)" : "var(--muted-foreground)",
      "&:hover": {
        color: "var(--primary)",
      },
    }),
  };

  // Sort options by label in ascending order
  const sortedOptions = React.useMemo(() => {
    if (!options) return [];
    return props.is_sorted
      ? [...options].sort((a, b) => a.label.localeCompare(b.label))
      : options;
  }, [options, props.is_sorted]);

  return (
    <FormField
      control={form.control}
      name={name}
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
              "min-h-5 text-sm font-medium",
              "transition-colors duration-200",
              "group-hover:text-primary",
              required && "after:ml-0.5 after:text-red-500 after:content-['*']",
            )}
          >
            {label}
          </FormLabel>
          <FormControl>
            <div className="relative flex w-full items-center">
              {Icon && (
                <div className={`absolute top-1/2 left-3 z-10 -translate-y-1/2 transform ${INPUT_ICON_COLOR} transition-colors group-hover:text-primary`}>
                  <Icon className={INPUT_ICON_SIZE} />
                </div>
              )}
              {mounted && (
                <Select
                  menuPortalTarget={document.body}
                  menuPlacement="auto"
                  {...field}
                  isDisabled={disabled}
                  options={sortedOptions.map((opt) => ({
                    value: opt.value,
                    label: opt.label,
                  }))}
                  placeholder={placeholder}
                  className="w-full"
                  classNamePrefix="rs"
                  styles={customStyles}
                  value={sortedOptions.find((opt) => opt.value === field.value)}
                  onChange={(newValue: any) => field.onChange(newValue?.value)}
                  components={{
                    IndicatorSeparator: () => null,
                    MenuList,
                  }}
                  isSearchable={isSearchable}
                  menuShouldScrollIntoView={false}
                  instanceId={`select-${name}`}
                />
              )}
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

export default InputSelect;
