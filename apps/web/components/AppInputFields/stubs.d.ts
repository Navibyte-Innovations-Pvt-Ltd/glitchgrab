// Stubs for modules from the source project that don't exist in this codebase.
// These components are pasted from another project and reference project-specific providers/utils.

declare module "@/provider/google-maps-provider" {
  const GoogleMapsProvider: React.FC<{ children: React.ReactNode }>;
  export default GoogleMapsProvider;
}

declare module "@/lib/query-keys" {
  export const queryKeys: Record<string, unknown>;
}

declare module "@/components/ui/checkbox" {
  import * as React from "react";
  export const Checkbox: React.FC<React.InputHTMLAttributes<HTMLInputElement>>;
}

declare module "@/components/ui/calendar" {
  import * as React from "react";
  export const Calendar: React.FC<Record<string, unknown>>;
}

declare module "@/components/ui/tabs" {
  import * as React from "react";
  export const Tabs: React.FC<{ children: React.ReactNode }>;
  export const TabsList: React.FC<{ children: React.ReactNode }>;
  export const TabsTrigger: React.FC<{ value: string; children: React.ReactNode }>;
  export const TabsContent: React.FC<{ value: string; children: React.ReactNode }>;
}

declare module "@/components/ui/alert" {
  import * as React from "react";
  export const Alert: React.FC<{ children: React.ReactNode }>;
  export const AlertTitle: React.FC<{ children: React.ReactNode }>;
  export const AlertDescription: React.FC<{ children: React.ReactNode }>;
}

declare module "react-hot-toast" {
  const toast: {
    success: (msg: string) => void;
    error: (msg: string) => void;
    loading: (msg: string) => string;
    dismiss: (id?: string) => void;
  };
  export default toast;
}

declare module "react-image-crop" {
  import * as React from "react";
  export interface Crop { x: number; y: number; width: number; height: number; unit: "px" | "%"; }
  export interface PixelCrop extends Crop { unit: "px"; }
  export interface PercentCrop extends Crop { unit: "%"; }
  export const ReactCrop: React.FC<Record<string, unknown>>;
  export default ReactCrop;
}

declare module "@dnd-kit/sortable" {
  export function useSortable(args: { id: string | number }): Record<string, unknown>;
  export const SortableContext: React.FC<{ items: (string | number)[]; children: React.ReactNode }>;
  export const verticalListSortingStrategy: unknown;
  export const arrayMove: <T>(arr: T[], from: number, to: number) => T[];
}

declare module "date-fns" {
  export function format(date: Date, fmt: string): string;
  export function parse(dateStr: string, fmt: string, ref: Date): Date;
  export function isValid(date: unknown): boolean;
  export function addDays(date: Date, n: number): Date;
  export function startOfMonth(date: Date): Date;
  export function endOfMonth(date: Date): Date;
  export function eachDayOfInterval(interval: { start: Date; end: Date }): Date[];
  export function isSameDay(a: Date, b: Date): boolean;
  export function isBefore(a: Date, b: Date): boolean;
  export function isAfter(a: Date, b: Date): boolean;
}
