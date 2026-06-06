"use client";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import * as React from "react";
import { useFormContext } from "react-hook-form";
import CreatableSelect from "react-select/creatable";
import { components as rsComponents } from "react-select";
import { InputFieldProps } from "../InputField";
import { INPUT_BORDER_HEX, INPUT_ICON_SIZE, INPUT_ICON_COLOR } from "../input-styles";

const InputMultiSelect: React.FC<InputFieldProps> = (props) => {
  const {
    label,
    name,
    options,
    className,
    placeholder,
    disabled,
    Icon,
    required,
    description,
  } = props;
  const form = useFormContext();

  if (!form) {
    throw new Error("InputMultiSelect must be used within a FormProvider");
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const customStyles = {
    control: (provided: any, state: any) => ({
      ...provided,
      width: "100%",
      maxWidth: "100%",
      minHeight: "44px",
      border: state.isFocused
        ? "1px solid var(--primary)"
        : `1px solid ${INPUT_BORDER_HEX}`,
      borderColor: state.isFocused ? "var(--primary)" : INPUT_BORDER_HEX,
      borderRadius: "var(--radius)",
      backgroundColor: disabled ? "var(--muted)" : "transparent",
      boxShadow: state.isFocused ? "0 0 0 1px var(--primary)/0.2" : "none",
      transition: "all 200ms ease",
      "&:hover": {
        borderColor: INPUT_BORDER_HEX,
        cursor: "pointer",
      },
      ...(Icon ? { paddingLeft: "38px" } : {}),
    }),
    valueContainer: (provided: any) => ({
      ...provided,
      padding: Icon ? "4px 12px" : "4px 8px",
      paddingLeft: Icon ? "0" : undefined,
      flexWrap: "nowrap" as const,
      gap: "4px",
      overflow: "hidden",
    }),
    input: (provided: any) => ({
      ...provided,
      color: "var(--foreground)",
    }),
    placeholder: (provided: any) => ({
      ...provided,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
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
      zIndex: 9999,
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "8px",
      backgroundColor: state.isSelected
        ? "color-mix(in oklab, var(--primary) 15%, transparent)"
        : state.isFocused
          ? "var(--accent)"
          : "transparent",
      color: state.isSelected ? "var(--primary)" : "var(--foreground)",
      fontWeight: state.isSelected ? 600 : 400,
      cursor: "pointer",
      transition: "all 150ms ease",
      "&:hover": {
        backgroundColor: state.isSelected
          ? "color-mix(in oklab, var(--primary) 20%, transparent)"
          : "var(--accent)",
      },
      zIndex: 9999,
    }),
    multiValue: (provided: any) => ({
      ...provided,
      backgroundColor: "color-mix(in oklab, var(--primary) 12%, transparent)",
      border: "1px solid color-mix(in oklab, var(--primary) 30%, transparent)",
      borderRadius: "9999px",
      margin: 0,
      maxWidth: "100%",
    }),
    multiValueLabel: (provided: any) => ({
      ...provided,
      color: "var(--primary)",
      fontSize: "12px",
      fontWeight: 600,
      padding: "3px 4px 3px 10px",
      paddingLeft: "10px",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      maxWidth: "180px",
    }),
    multiValueRemove: (provided: any) => ({
      ...provided,
      color: "var(--primary)",
      borderRadius: "9999px",
      paddingLeft: "4px",
      paddingRight: "6px",
      "&:hover": {
        backgroundColor: "var(--destructive)",
        color: "var(--destructive-foreground)",
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

  return (
    <FormField
      control={form.control}
      name={name}
      disabled={disabled}
      render={({ field }) => (
        <FormItem
          className={cn(
            "w-full min-w-0",
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
            <div className="w-full min-w-0 space-y-2">
              <div className="relative flex w-full min-w-0 items-center">
                {Icon && (
                  <div className="pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center">
                    <Icon
                      className={cn(
                        `${INPUT_ICON_SIZE} ${INPUT_ICON_COLOR} transition-all duration-200`,
                        "group-hover:text-primary",
                      )}
                    />
                  </div>
                )}
                <CreatableSelect
                  ref={field.ref}
                  onBlur={field.onBlur}
                  className="w-full"
                  value={
                    Array.isArray(field.value)
                      ? field.value.map(
                          (v: string | { label: string; value: string }) =>
                            typeof v === "string"
                              ? (options?.find((o) => o.value === v) ?? {
                                  label: v,
                                  value: v,
                                })
                              : v,
                        )
                      : []
                  }
                  placeholder={placeholder}
                  isMulti
                  name={name}
                  options={options}
                  instanceId={`select-${name}`}
                  controlShouldRenderValue={false}
                  hideSelectedOptions={false}
                  closeMenuOnSelect={false}
                  onChange={(newValue) => {
                    const values = [...(newValue ?? [])].map((v) =>
                      typeof v === "string" ? v : v.value,
                    );
                    field.onChange(values);
                  }}
                  styles={customStyles}
                  components={{
                    IndicatorSeparator: () => null,
                    Option: (optProps: any) => (
                      <rsComponents.Option {...optProps}>
                        <span className="truncate">{optProps.label}</span>
                        {optProps.isSelected && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ flexShrink: 0 }}
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </rsComponents.Option>
                    ),
                  }}
                  menuShouldScrollIntoView={false}
                />
              </div>
              {Array.isArray(field.value) && field.value.length > 0 && (
                <div className="flex flex-wrap gap-1.5 rounded-md border border-dashed border-primary/20 bg-primary/5 p-2">
                  {field.value.map((v: string | { label: string; value: string }) => {
                    const value = typeof v === "string" ? v : v.value;
                    const label =
                      typeof v === "string"
                        ? (options?.find((o) => o.value === v)?.label ?? v)
                        : v.label;
                    return (
                      <span
                        key={value}
                        className="flex max-w-full items-center gap-1 rounded-full border border-primary/30 bg-primary/10 py-0.5 pr-1 pl-2.5 text-xs font-semibold text-primary"
                      >
                        <span className="truncate">{label}</span>
                        <button
                          type="button"
                          aria-label={`Remove ${label}`}
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-primary transition-colors hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => {
                            const next = (field.value as Array<
                              string | { label: string; value: string }
                            >).filter((x) => {
                              const xv = typeof x === "string" ? x : x.value;
                              return xv !== value;
                            });
                            field.onChange(
                              next.map((x) =>
                                typeof x === "string" ? x : x.value,
                              ),
                            );
                          }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
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

export default InputMultiSelect;
