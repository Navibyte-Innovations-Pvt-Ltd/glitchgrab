import type { FieldValues, Path } from "react-hook-form";
import type { LucideIcon } from "lucide-react";
import type { IconType } from "react-icons";

type DefaultFormValues = Record<string, unknown>;

export interface BusinessDetails {
  name: string;
  address: string;
  placeId: string;
  lat?: number;
  lng?: number;
}

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

export interface InputFieldProps<T extends FieldValues = DefaultFormValues>
  extends BaseInputProps<T> {
  options?: { value: string | null; label: string }[];
  async_function?: (input: string) => Promise<{ value: string; label: string }[]>;
  Icon?: LucideIcon | IconType;
  iconClassName?: string;
  is_sorted?: true | false;
  isSearchable?: boolean;
  generationPrompt?: string;
  context?: string;
  maxLength?: number;
  aiButtonText?: string;
  detectLocation?: boolean;
  autoDetectLocation?: boolean;
  min?: number;
  max?: number;
  step?: number;
  minHeight?: string;
  onBusinessSelect?: (details: BusinessDetails) => void;
  aiEnabled?: boolean;
  aiPrompt?: string;
  aiContext?: string;
  packageIdsName?: string;
  serviceCurrency?: string;
  serviceHeaderActions?: React.ReactNode;
}
