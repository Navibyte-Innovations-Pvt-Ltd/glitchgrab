import React from "react";
import { INPUT_BORDER_COLOR } from "@/components/AppInputFields/input-styles";
import BusinessAutocomplete from "./components/business-autocomplete";
import { useGoogleMaps } from "@/provider/google-maps-provider";

export interface BusinessDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  website_uri?: string;
  national_phone_number?: string;
  location?: {
    lat: number;
    lng: number;
  };
}

interface InputGoogleBusinessProps {
  onBusinessSelect: (details: BusinessDetails) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const InputGoogleBusiness: React.FC<InputGoogleBusinessProps> = (props) => {
  const { isLoaded } = useGoogleMaps();

  if (!isLoaded) {
    return (
      <div className={`h-11 w-full rounded-md border ${INPUT_BORDER_COLOR} bg-muted/50 px-3 py-2 text-sm text-muted-foreground`}>
        Loading Maps...
      </div>
    );
  }

  return <BusinessAutocomplete {...props} />;
};

export default React.memo(InputGoogleBusiness);
