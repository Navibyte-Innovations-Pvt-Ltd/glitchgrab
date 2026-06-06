"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { INPUT_BORDER_COLOR, INPUT_BORDER_HOVER, INPUT_BORDER_FOCUS, INPUT_ICON_SIZE, INPUT_ICON_COLOR, INPUT_PLACEHOLDER_COLOR } from "./input-styles";
import {
  Calendar,
  Check,
  CheckSquare,
  Clock,
  FileText,
  Hash,
  Image,
  Link2,
  List,
  Lock,
  LucideIcon,
  Mail,
  MapPin,
  Palette,
  Phone,
  Search,
  Star,
  Type,
} from "lucide-react";
import React from "react";
import { FieldValues, Path, useFormContext } from "react-hook-form";
import { IconType } from "react-icons";
import InputAddress from "./components/InputAddress/input";
import InputGoogleBusiness, {
  BusinessDetails,
} from "./components/InputGoogleBusiness/input";
import InputAITextArea from "./components/InputAITextArea";
import InputCheckbox from "./components/InputCheckBox";
import InputDate from "./components/InputDate";
import ImageInput from "./components/InputImage/InputImage";
import InputMultiCheckbox from "./components/InputMultiCheckbox";
import InputMultipleDates from "./components/InputMultipleDates";
import InputMultiSelect from "./components/InputMultiSelect";
import InputNumber from "./components/InputNumber";
import InputOTPController from "./components/InputOTP";
import InputPassword from "./components/InputPassword";
import InputPhone from "./components/InputPhone";
import InputRadio from "./components/InputRadio";
import InputRating from "./components/InputRating";
import InputSelect from "./components/InputSelect";
import InputSwitch from "./components/InputSwitch";
import InputList from "./components/InputList";
import InputTextArea from "./components/InputTextArea";
import ModernImageInput from "./components/ModernImageInput";
import MultiImageInput from "./components/multiImageInput";
import InputServicesSelection from "./components/InputServicesSelection";
import dynamic from "next/dynamic";
import { Skeleton } from "../ui/skeleton";
const DynamicInputEditorV2 = dynamic(() => import("./InputEditorJS"), {
  ssr: false,
  loading: () => {
    return <Skeleton className="h-40 w-full rounded-md" />;
  },
});

// Base type for form values
type DefaultFormValues = Record<string, unknown>;

// Function to get default icon for each input type
const getDefaultIcon = (type: string): LucideIcon => {
  const iconMap: Record<string, LucideIcon> = {
    text: Type,
    email: Mail,
    password: Lock,
    number: Hash,
    file: FileText,
    select: List,
    multiSelect: List,
    multiCheckbox: CheckSquare,
    "text-area": FileText,
    "ai-text-area": FileText,
    editor: FileText,
    date: Calendar,
    "multiple-dates": Calendar,
    "datetime-local": Clock,
    checkbox: CheckSquare,
    radio: CheckSquare,
    yes_no_radio: CheckSquare,
    phone: Phone,
    places_autocomplete: MapPin,
    rating: Star,
    avatar: Image,
    "modern-image": Image,
    multiSelect_images: Image,
    "color-picker": Palette,
    switch: CheckSquare,
    OTP: Hash,
    slug: Link2,
    "google-business-search": Search,
    "services-selection": List,
  };

  return iconMap[type] || Type;
};

export interface BaseInputProps<T extends FieldValues = DefaultFormValues> {
  label?: string;
  name: Path<T>;
  placeholder?: string;
  description?: string;
  type:
    | "text"
    | "password"
    | "email"
    | "OTP"
    | "avatar"
    | "number"
    | "file"
    | "select"
    | "multiSelect"
    | "multiCheckbox"
    | "multiSelect_images"
    | "rating"
    | "places_autocomplete"
    | "text-area"
    | "ai-text-area"
    | "editor"
    | "date"
    | "multiple-dates"
    | "datetime-local"
    | "checkbox"
    | "radio"
    | "yes_no_radio"
    | "switch"
    | "phone"
    | "modern-image"
    | "color-picker"
    | "list"
    | "slug"
    | "google-business-search"
    | "services-selection";
  uploadLabel?: string;
  footerNote?: string | null;
  className?: string;
  disabled?: boolean;
  autoComplete?: string;
  required?: boolean;
  onComplete?: (data: string) => void;
}

export interface InputFieldProps<
  T extends FieldValues = DefaultFormValues,
> extends BaseInputProps<T> {
  options?: {
    value: string | null;
    label: string;
  }[];
  async_function?: (
    input: string,
  ) => Promise<{ value: string; label: string }[]>;
  Icon?: LucideIcon | IconType;
  iconClassName?: string;
  is_sorted?: true | false;
  isSearchable?: boolean;
  // AI-specific props
  generationPrompt?: string;
  context?: string;
  maxLength?: number;
  aiButtonText?: string;
  // Location-specific props
  detectLocation?: boolean;
  autoDetectLocation?: boolean;
  // Number input props
  min?: number;
  max?: number;
  step?: number;
  // Editor-specific props
  minHeight?: string;
  // Google Business Search prop
  onBusinessSelect?: (details: BusinessDetails) => void;
  // List AI props
  aiEnabled?: boolean;
  aiPrompt?: string;
  aiContext?: string;
  // Services Selection props
  packageIdsName?: string;
  serviceCurrency?: string;
  serviceHeaderActions?: React.ReactNode;
}

const InputField = <T extends FieldValues>({
  label,
  name,
  placeholder,
  type,
  className,
  disabled = false,
  autoComplete = "off",
  Icon,
  iconClassName,
  required = false,
  options,
  description,
  isSearchable,
  is_sorted = false,
  onComplete,
  generationPrompt,
  context,
  maxLength,
  aiButtonText,
  detectLocation = false,
  autoDetectLocation = false,
  min,
  max,
  step,
  uploadLabel,
  footerNote,
  onBusinessSelect,
  packageIdsName,
  minHeight,
  serviceCurrency,
  serviceHeaderActions,
  aiEnabled,
  aiPrompt,
  aiContext,
}: InputFieldProps<T>) => {
  const form = useFormContext<T>();

  if (!form) {
    throw new Error("InputField must be used within a FormProvider");
  }

  // Use provided icon or get default icon for the input type
  const ComponentIcon = Icon || getDefaultIcon(type);

  if (type === "OTP") {
    return (
      <InputOTPController
        label={label}
        name={name}
        disabled={disabled}
        required={required}
        type={type}
        description={description}
        onComplete={onComplete}
        placeholder={placeholder}
      />
    );
  }

  if (type === "modern-image") {
    return (
      <ModernImageInput
        label={label}
        name={name}
        className={className}
        required={required}
        description={description}
        disabled={disabled}
        uploadLabel={uploadLabel}
        footerNote={footerNote}
      />
    );
  }

  if (type === "avatar") {
    return (
      <ImageInput
        label={label}
        name={name}
        className={className}
        disabled={disabled}
        required={required}
        type={type}
        description={description}
        placeholder={placeholder}
        uploadLabel={uploadLabel}
        footerNote={footerNote}
      />
    );
  }

  if (type === "select" && options) {
    return (
      <InputSelect
        label={label}
        name={name}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        Icon={ComponentIcon}
        options={options}
        required={required}
        type={type}
        description={description}
        isSearchable={isSearchable}
        is_sorted={is_sorted}
      />
    );
  }

  if (type === "multiSelect" && options) {
    return (
      <InputMultiSelect
        label={label}
        name={name}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        Icon={ComponentIcon}
        options={options}
        required={required}
        type={type}
        description={description}
      />
    );
  }

  if (type === "multiCheckbox" && options) {
    return (
      <InputMultiCheckbox
        label={label}
        name={name}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        options={options}
        required={required}
        type={type}
        description={description}
      />
    );
  }

  if (type === "multiSelect_images") {
    return (
      <MultiImageInput
        label={label}
        name={name}
        required={required}
        type={type}
        placeholder={placeholder}
        description={description}
      />
    );
  }

  if (type === "rating") {
    return (
      <InputRating
        label={label}
        name={name}
        className={className}
        disabled={disabled}
        required={required}
        type={type}
        description={description}
        Icon={ComponentIcon}
        placeholder={placeholder}
      />
    );
  }

  if (type === "places_autocomplete") {
    return (
      <InputAddress
        label={label}
        name={name}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        required={required}
        type={type}
        description={description}
        Icon={ComponentIcon}
        detectLocation={detectLocation}
        autoDetectLocation={autoDetectLocation}
      />
    );
  }

  if (type === "google-business-search") {
    return (
      <InputGoogleBusiness
        label={label}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        onBusinessSelect={onBusinessSelect || (() => {})}
      />
    );
  }

  if (type === "checkbox") {
    return (
      <InputCheckbox
        label={label}
        name={name}
        className={className}
        disabled={disabled}
        required={required}
        type={type}
        description={description}
        Icon={ComponentIcon}
        placeholder={placeholder}
      />
    );
  }

  if (type === "radio" && options) {
    return (
      <InputRadio
        label={label}
        name={name}
        options={options}
        className={className}
        Icon={ComponentIcon}
        iconClassName={iconClassName}
        required={required}
        type={type}
        description={description}
        placeholder={placeholder}
      />
    );
  }

  if (type === "yes_no_radio") {
    return (
      <InputRadio
        label={label}
        name={name}
        options={[
          { label: "Yes", value: "Yes" },
          { label: "No", value: "No" },
        ]}
        className={className}
        Icon={ComponentIcon}
        iconClassName={iconClassName}
        required={required}
        type="radio"
        description={description}
        placeholder={placeholder}
      />
    );
  }

  if (type === "password") {
    return (
      <InputPassword
        label={label}
        name={name}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        Icon={ComponentIcon}
        iconClassName={iconClassName}
        required={required}
        type={type}
        description={description}
      />
    );
  }

  if (type === "date") {
    return (
      <InputDate
        label={label}
        name={name}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        required={required}
        type={type}
        description={description}
      />
    );
  }

  if (type === "multiple-dates") {
    return (
      <InputMultipleDates
        label={label}
        name={name}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        required={required}
        description={description}
      />
    );
  }

  if (type === "number") {
    return (
      <InputNumber
        label={label}
        name={name}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        required={required}
        description={description}
        Icon={ComponentIcon}
        iconClassName={iconClassName}
        min={min}
        max={max}
        step={step}
      />
    );
  }

  if (type === "switch") {
    return (
      <InputSwitch
        label={label || ""}
        name={name}
        description={description}
        className={className}
        disabled={disabled}
        required={required}
        Icon={ComponentIcon}
      />
    );
  }

  if (type === "phone") {
    return (
      <InputPhone
        label={label}
        name={name}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        required={required}
        type={type}
        description={description}
        Icon={ComponentIcon}
        iconClassName={iconClassName}
      />
    );
  }

  if (type === "text-area") {
    return (
      <InputTextArea
        label={label}
        name={name}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        required={required}
        type={type}
        description={description}
        Icon={ComponentIcon}
        iconClassName={iconClassName}
      />
    );
  }

  if (type === "editor") {
    return (
      <DynamicInputEditorV2
        label={label}
        name={name}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        required={required}
        description={description}
        Icon={ComponentIcon as LucideIcon}
        iconClassName={iconClassName}
        context={context}
        defaultPrompt={generationPrompt}
        minHeight={minHeight}
      />
    );
  }

  if (type === "ai-text-area") {
    return (
      <InputAITextArea
        label={label}
        name={name}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        required={required}
        description={description}
        Icon={ComponentIcon}
        iconClassName={iconClassName}
        generationPrompt={generationPrompt}
        context={context}
        maxLength={maxLength}
        aiButtonText={aiButtonText}
      />
    );
  }

  if (type === "list") {
    return (
      <InputList
        name={name}
        label={label}
        placeholder={placeholder}
        description={description}
        className={className}
        required={required}
        aiEnabled={aiEnabled}
        aiPrompt={aiPrompt}
        aiContext={aiContext}
      />
    );
  }

  if (type === "services-selection" && packageIdsName) {
    return (
      <InputServicesSelection
        serviceIdsName={name}
        packageIdsName={packageIdsName as Path<T>}
        currency={serviceCurrency || "INR"}
        headerActions={serviceHeaderActions}
        className={className}
      />
    );
  }

  if (type === "color-picker") {
    return (
      <FormField
        control={form.control}
        name={name}
        disabled={disabled}
        render={({ field }) => (
          <FormItem
            className={cn(
              "relative w-full",
              "group transition-all duration-300 ease-in-out",
              className,
            )}
          >
            <FormLabel
              className={cn(
                "text-sm font-medium transition-colors",
                "group-hover:text-primary",
                required &&
                  "after:ml-0.5 after:text-red-500 after:content-['*']",
              )}
            >
              {label}
            </FormLabel>
            <FormControl>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    className={cn(
                      "h-11 w-full px-3 py-2 text-left",
                      `border-2 ${INPUT_BORDER_COLOR} bg-background`,
                      "rounded-md shadow-none transition-colors",
                      "hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                      "flex items-center gap-2",
                    )}
                  >
                    <div
                      className="h-4 w-4 shrink-0 rounded border border-gray-300"
                      style={{ backgroundColor: field.value || "#3B82F6" }}
                    />
                    <span className="flex-1 truncate text-sm">
                      {field.value === "var(--primary)"
                        ? "Brand Primary"
                        : field.value || "#3B82F6"}
                    </span>
                    <svg
                      className={`${INPUT_ICON_SIZE} shrink-0 ${INPUT_ICON_COLOR}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 p-3" align="start">
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Choose a color</h4>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        "var(--primary)",
                        "#3B82F6",
                        "#10B981",
                        "#F59E0B",
                        "#EF4444",
                        "#8B5CF6",
                        "#F97316",
                        "#06B6D4",
                        "#84CC16",
                        "#EC4899",
                        "#6B7280",
                        "#14B8A6",
                        "#A855F7",
                        "#DC2626",
                        "#059669",
                        "#D97706",
                        "#7C3AED",
                        "#0891B2",
                        "#65A30D",
                        "#BE185D",
                      ].map((color) => (
                        <Button
                          key={color}
                          type="button"
                          variant="outline"
                          size="icon"
                          title={
                            color === "var(--primary)" ? "Brand Primary" : color
                          }
                          className={cn(
                            "h-8 w-8 rounded-md border-2 transition-all duration-200",
                            "hover:shadow-md",
                            "focus:ring-2 focus:ring-primary/50 focus:outline-none",
                            field.value === color
                              ? "border-primary ring-2 ring-primary/20"
                              : "border-gray-300 hover:border-gray-400",
                          )}
                          style={{ backgroundColor: color }}
                          onClick={() => field.onChange(color)}
                          disabled={disabled}
                        >
                          {field.value === color && (
                            <Check className="mx-auto h-4 w-4 text-white" />
                          )}
                        </Button>
                      ))}
                    </div>

                    {/* Custom color input */}
                    <div className="border-t pt-2">
                      <label className="mb-1 block text-xs text-muted-foreground">
                        Custom color (hex):
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={
                            field.value === "var(--primary)"
                              ? "Brand Primary"
                              : field.value || ""
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            field.onChange(
                              val === "Brand Primary" ? "var(--primary)" : val,
                            );
                          }}
                          placeholder="#3B82F6"
                          className="flex-1 rounded border px-2 py-1 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                          pattern="^#[0-9A-Fa-f]{6}$"
                          disabled={disabled}
                        />
                        <input
                          type="color"
                          value={
                            field.value === "var(--primary)"
                              ? "#1e6fd9"
                              : field.value || "#3B82F6"
                          }
                          onChange={(e) => field.onChange(e.target.value)}
                          className="h-6 w-8 cursor-pointer rounded border"
                          disabled={disabled}
                        />
                      </div>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
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
  }

  if (type === "datetime-local") {
    return (
      <FormField
        control={form.control}
        name={name}
        disabled={disabled}
        render={({ field }) => (
          <FormItem className={cn("w-full", className)}>
            <FormLabel
              className={cn(
                "text-sm font-medium",
                required &&
                  "after:ml-0.5 after:text-red-500 after:content-['*']",
              )}
            >
              {label}
            </FormLabel>
            <FormControl>
              <input
                type="datetime-local"
                className={cn(`h-11 w-full rounded-md border-2 px-3 shadow-none focus:border-primary focus:ring-2 focus:ring-primary/20 ${INPUT_PLACEHOLDER_COLOR}`, INPUT_BORDER_COLOR)}
                {...field}
              />
            </FormControl>
            {description && (
              <p className="mt-1 pl-3 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                {description}
              </p>
            )}
            <FormMessage className="mt-1 animate-in text-xs font-medium text-destructive fade-in-50" />
          </FormItem>
        )}
      />
    );
  }

  if (type === "slug") {
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
              <div className="relative w-full">
                <div className="pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center">
                  <ComponentIcon
                    className={cn(
                      `${INPUT_ICON_SIZE} ${INPUT_ICON_COLOR} transition-all duration-200`,
                      "group-hover:text-primary",
                      iconClassName,
                    )}
                  />
                </div>
                <Input
                  autoComplete={autoComplete}
                  className={cn(
                    "h-11 w-full min-w-0 py-2 pr-3 pl-10",
                    "transition-all duration-200",
                    `border ${INPUT_BORDER_COLOR} ${INPUT_BORDER_FOCUS}`,
                    INPUT_BORDER_HOVER,
                    "rounded-md shadow-none",
                    INPUT_PLACEHOLDER_COLOR,
                    "focus:ring-1 focus:ring-primary/20",
                    className,
                  )}
                  type="text"
                  placeholder={placeholder}
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) => {
                    const slugified = e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9\s-]/g, "")
                      .replace(/\s+/g, "-")
                      .replace(/-+/g, "-");
                    field.onChange(slugified);
                  }}
                />
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
            <div className="relative w-full">
              <div className="pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center">
                <ComponentIcon
                  className={cn(
                    `${INPUT_ICON_SIZE} ${INPUT_ICON_COLOR} transition-all duration-200`,
                    "group-hover:text-primary",
                    iconClassName,
                  )}
                />
              </div>
              <Input
                autoComplete={autoComplete}
                onWheel={(e) => e.currentTarget.blur()}
                className={cn(
                  "h-11 w-full min-w-0 py-2 pr-3 pl-10",
                  "transition-all duration-200",
                  `border ${INPUT_BORDER_COLOR} ${INPUT_BORDER_FOCUS}`,
                  INPUT_BORDER_HOVER,
                  "rounded-md shadow-none",
                  "placeholder:text-muted-foreground/50",
                  "focus:ring-1 focus:ring-primary/20",
                  className,
                )}
                type={type}
                placeholder={placeholder}
                {...field}
                value={field.value ?? ""} // Ensure value is always a string
              />
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

export default React.memo(InputField) as <T extends FieldValues>(
  props: InputFieldProps<T>,
) => React.ReactNode;
