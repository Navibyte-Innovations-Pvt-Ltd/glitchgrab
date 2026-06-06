import { FormField } from "@/components/ui/form";
import React from "react";
import { FieldValues, useFormContext } from "react-hook-form";
import { InputFieldProps } from "../../InputField";
import AddressInput from "./components/address.miniform";
import { useGoogleMaps } from "@/provider/google-maps-provider";

const InputAddress: React.FC<Omit<InputFieldProps<FieldValues>, "form">> = (
  props,
) => {
  const { name } = props;
  const { isLoaded } = useGoogleMaps();

  const form = useFormContext();

  if (!form) {
    throw new Error("InputAddress must be used within a FormProvider");
  }

  if (!isLoaded) {
    return <p>Loading Script...</p>; // or return a loading spinner
  }

  return (
    <FormField
      disabled={props.disabled}
      control={form.control}
      name={name}
      render={({ field }) => {
        return (
          <AddressInput
            field={field}
            inputProps={{
              ...props,
              Icon: props.Icon,
            }}
          />
        );
      }}
    />
  );
};

export default React.memo(InputAddress);
