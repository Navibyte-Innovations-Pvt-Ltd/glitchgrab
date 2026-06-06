"use client";

import * as React from "react";
import { OTPInput, OTPInputContext } from "input-otp";
import { MinusIcon } from "lucide-react";
import { cn } from "@/lib/utils";

function InputOTP({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<typeof OTPInput> & {
  containerClassName?: string;
}) {
  return (
    <OTPInput
      data-slot="input-otp"
      containerClassName={cn(
        "flex items-center gap-2 has-disabled:opacity-50",
        containerClassName
      )}
      className={cn("disabled:cursor-not-allowed", className)}
      {...props}
    />
  );
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-group"
      className={cn("flex items-center", className)}
      {...props}
    />
  );
}

function InputOTPSlot({
  index,
  className,
  ...props
}: React.ComponentProps<"div"> & { index: number }) {
  const inputOTPContext = React.useContext(OTPInputContext);
  const { char, hasFakeCaret, isActive } = inputOTPContext?.slots[index] ?? {};

  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive}
      data-has-caret={hasFakeCaret}
      className={cn(
        "relative flex h-9 w-9 items-center justify-center",
        "border-y border-r border-input text-sm shadow-xs transition-all",
        "first:rounded-l-md first:border-l last:rounded-r-md",
        "data-[active=true]:z-10 data-[active=true]:ring-1 data-[active=true]:ring-ring/30 data-[active=true]:border-ring/40",
        "data-[has-caret=true]:after:animate-caret-blink data-[has-caret=true]:after:absolute data-[has-caret=true]:after:inset-0 data-[has-caret=true]:after:flex data-[has-caret=true]:after:items-center data-[has-caret=true]:after:justify-center data-[has-caret=true]:after:font-thin data-[has-caret=true]:after:content-['|']",
        className
      )}
      {...props}
    >
      {char}
    </div>
  );
}

function InputOTPSeparator({ ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="input-otp-separator" role="separator" {...props}>
      <MinusIcon />
    </div>
  );
}

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };
