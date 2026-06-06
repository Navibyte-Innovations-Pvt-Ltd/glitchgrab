"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import React from "react";
import { FieldValues, useFormContext } from "react-hook-form";
import { BiImage, BiX } from "react-icons/bi";
import { BaseInputProps } from "../InputField";

const MultiImageInput = <T extends FieldValues>({
  label,
  name,
  required = false,
  description,
}: Omit<BaseInputProps<T>, "form">) => {
  const imageRef = React.useRef<HTMLInputElement>(null);
  const form = useFormContext<T>();

  if (!form) {
    throw new Error("MultiImageInput must be used within a FormProvider");
  }

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => {
        const files = field.value as File[] | undefined;
        return (
          <FormItem
            className={cn(
              "w-full max-w-100",
              "group transition-all duration-300 ease-in-out"
            )}
          >
            <FormLabel
              className={cn(
                "text-sm font-medium",
                "transition-colors duration-200",
                "group-hover:text-primary",
                required &&
                  "after:ml-0.5 after:text-red-500 after:content-['*']"
              )}
            >
              {label}
            </FormLabel>
            <FormControl>
              <div
                className={cn(
                  "flex items-center justify-between",
                  "rounded-lg border-2 border-dashed",
                  "cursor-pointer p-4",
                  "transition-all duration-200",
                  "hover:border-primary/50 hover:bg-primary/5",
                  "group-hover:shadow-sm",
                  "w-full"
                )}
              >
                <div
                  className="flex w-full flex-wrap gap-2"
                  onClick={() => imageRef.current?.click()}
                >
                  {files && files.length > 0 ? (
                    files.map((item: File, index: number) => (
                      <Avatar
                        key={index}
                        className={cn(
                          "h-12 w-12",
                          "border-2 border-transparent",
                          "hover:scale-110 hover:border-primary",
                          "cursor-pointer",
                          "transition-all duration-200",
                          "rounded-lg"
                        )}
                      >
                        <AvatarImage src={URL.createObjectURL(item)} />
                        <AvatarFallback>
                          <BiImage className="h-6 w-6 text-muted-foreground" />
                        </AvatarFallback>
                      </Avatar>
                    ))
                  ) : (
                    <div className="flex w-full items-center justify-center gap-2 text-muted-foreground">
                      <BiImage className="h-5 w-5" />
                      <p className="text-sm">Click to Choose Images</p>
                    </div>
                  )}
                </div>
                {files && files.length > 0 && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => field.onChange([])}
                    className={cn(
                      "h-8 w-8 rounded-full",
                      "hover:bg-destructive/10 hover:text-destructive",
                      "transition-all duration-200"
                    )}
                  >
                    <BiX className="h-5 w-5" />
                  </Button>
                )}
                <input
                  ref={imageRef}
                  onChange={(e) => {
                    if (e.target.files) {
                      field.onChange(Array.from(e.target.files));
                    }
                  }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  multiple
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

export default React.memo(MultiImageInput) as <T extends FieldValues>(
  props: Omit<BaseInputProps<T>, "form">
) => React.ReactNode;
