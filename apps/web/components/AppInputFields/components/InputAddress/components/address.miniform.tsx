import { InputFieldProps } from "@/components/AppInputFields/InputField";
import { Button } from "@/components/ui/button";
import { FormControl, FormItem, FormLabel } from "@/components/ui/form";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { INPUT_BORDER_COLOR, INPUT_BORDER_HOVER, INPUT_BORDER_FOCUS_VISIBLE, INPUT_ICON_SIZE, INPUT_ICON_COLOR } from "@/components/AppInputFields/input-styles";
import { Check, Loader2, MapPin, PenLine } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { ControllerRenderProps, FieldValues } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";

type Props = {
  field: ControllerRenderProps<FieldValues, string>;
  inputProps: InputFieldProps<FieldValues>;
};

interface AddressSuggestion {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
}

interface AddressValue {
  address: string;
  position: {
    lat: number;
    lng: number;
  };
}

const AddressInput = ({ field, inputProps }: Props) => {
  const {
    label,
    placeholder,
    className,
    required = false,
    autoDetectLocation = false,
  } = inputProps;

  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [hasAttemptedAutoDetection, setHasAttemptedAutoDetection] =
    useState(false);
  const [isAutoDetected, setIsAutoDetected] = useState(false);
  const [userDisabledAutoDetection, setUserDisabledAutoDetection] =
    useState(false);

  // Auto-location detection functions
  const getCurrentLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        },
      );
    });
  };

  const geocodeCoordinates = async (
    lat: number,
    lng: number,
  ): Promise<string | null> => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`,
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        return data.results[0].formatted_address;
      }
      console.warn("Geocoding: No address found for location");
      return null;
    } catch (error) {
      console.error("Geocoding error:", error);
      return null;
    }
  };

  // Address suggestions query using Google Places Autocomplete (New) API
  const addressSuggestions = useQuery({
    queryKey: ["address-suggestions-form", searchValue],
    queryFn: async (): Promise<AddressSuggestion[]> => {
      if (!searchValue || searchValue.length < 2) {
        return [];
      }

      try {
        const response = await fetch("/api/places/autocomplete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: searchValue }),
        });

        if (!response.ok) {
          throw new Error(`Places API request failed: ${response.status}`);
        }

        const data = await response.json();

        interface PlacePrediction {
          placeId: string;
          text: { text: string };
          structuredFormat?: {
            mainText: { text: string };
            secondaryText?: { text: string };
          };
        }

        interface Suggestion {
          placePrediction: PlacePrediction;
        }

        if (data.suggestions && data.suggestions.length > 0) {
          return data.suggestions
            .filter((suggestion: Suggestion) => suggestion.placePrediction)
            .slice(0, 5)
            .map((suggestion: Suggestion) => ({
              place_id: suggestion.placePrediction.placeId,
              description: suggestion.placePrediction.text.text,
              main_text:
                suggestion.placePrediction.structuredFormat?.mainText?.text ||
                suggestion.placePrediction.text.text,
              secondary_text:
                suggestion.placePrediction.structuredFormat?.secondaryText
                  ?.text || "",
            }));
        }

        return [];
      } catch (error) {
        console.error("Error fetching address suggestions:", error);
        return [];
      }
    },
    enabled: Boolean(searchValue && searchValue.length >= 2),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  // Function to get coordinates from place_id using Places Details API
  const getPlaceDetails = async (
    placeId: string,
  ): Promise<{ lat: number; lng: number } | null> => {
    try {
      const response = await fetch(
        `/api/places/details?placeId=${encodeURIComponent(placeId)}`,
      );

      if (!response.ok) {
        throw new Error(
          `Places Details API request failed: ${response.status}`,
        );
      }

      const data = await response.json();

      if (data.location) {
        return {
          lat: data.location.latitude,
          lng: data.location.longitude,
        };
      }

      return null;
    } catch (error) {
      console.error("Error fetching place details:", error);
      return null;
    }
  };

  // Handle address selection from suggestions
  const handleAddressSelect = async (suggestion: AddressSuggestion) => {
    const coordinates = await getPlaceDetails(suggestion.place_id);

    field.onChange({
      address: suggestion.description,
      position: coordinates || { lat: 0, lng: 0 },
    });

    setSearchValue("");
    setOpen(false);
    setIsAutoDetected(false);
  };

  // Handle manual address entry (no Google match, or user skips lookup)
  const handleManualEntry = (manualText: string) => {
    const trimmed = manualText.trim();
    if (!trimmed) return;

    field.onChange({
      address: trimmed,
      position: { lat: 0, lng: 0 },
    });

    setSearchValue("");
    setOpen(false);
    setIsAutoDetected(false);
  };

  // Extract field.onChange to avoid dependency issues
  const fieldOnChange = field.onChange;

  // Memoize the field change handler to prevent unnecessary re-renders
  const handleFieldChange = useCallback(
    (newValue: AddressValue) => {
      fieldOnChange(newValue);
    },
    [fieldOnChange],
  );

  // Extract field value to avoid dependency issues
  const fieldValueAddress = field?.value?.address;

  // Auto-location detection effect
  useEffect(() => {
    const initializeLocation = async () => {
      // Prevent multiple attempts and infinite loops
      if (
        !autoDetectLocation ||
        hasAttemptedAutoDetection ||
        fieldValueAddress ||
        userDisabledAutoDetection
      ) {
        return;
      }

      setHasAttemptedAutoDetection(true);
      setIsLocationLoading(true);
      setLocationError(null);

      try {
        const position = await getCurrentLocation();
        const address = await geocodeCoordinates(position.lat, position.lng);

        if (!address) {
          throw new Error("No address found");
        }

        // Update the field with the detected location
        handleFieldChange({
          address: address,
          position: {
            lat: position.lat,
            lng: position.lng,
          },
        });

        setIsAutoDetected(true);
      } catch (error) {
        console.warn(error);
        // Gracefully handle location detection fallback
        setLocationError("Please enter manually");
      } finally {
        setIsLocationLoading(false);
      }
    };

    initializeLocation();
  }, [
    autoDetectLocation,
    hasAttemptedAutoDetection,
    fieldValueAddress,
    handleFieldChange,
    userDisabledAutoDetection,
  ]);

  // Clear auto-detected status if address changes externally (e.g., via Quick Search)
  useEffect(() => {
    if (fieldValueAddress && isAutoDetected) {
      // If the address changes to something else, it's no longer the "auto-detected" one
      // We don't reset it if it was just cleared, only if it's set to a new value
      setIsAutoDetected(false);
    }
  }, [fieldValueAddress, isAutoDetected]); // Only run when the address string changes or if it was auto-detected

  return (
    <FormItem
      className={cn(
        "w-full",
        "group transition-all duration-300 ease-in-out",
        className,
      )}
    >
      <FormLabel
        className={cn(
          "text-sm font-medium",
          "transition-colors duration-200",
          "group-hover:text-primary",
          required && "after:ml-0.5 after:text-red-500 after:content-['*']",
        )}
      >
        {label}
      </FormLabel>
      <FormControl>
        <div className="relative w-full">
          {/* Show auto-detected address in a special state */}
          {isAutoDetected && field?.value?.address && !isLocationLoading ? (
            <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3">
              <MapPin className="h-4 w-4 shrink-0 text-green-600" />
              <div className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-green-700">
                  {field.value.address}
                </span>
                <span className="text-xs text-green-600">
                  Location detected automatically
                </span>
              </div>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={() => {
                  setIsAutoDetected(false);
                  setUserDisabledAutoDetection(true);
                  setSearchValue("");
                  handleFieldChange({
                    address: "",
                    position: { lat: 0, lng: 0 },
                  });
                }}
                className="shrink-0 text-xs text-green-700 underline hover:text-green-800"
              >
                Edit
              </Button>
            </div>
          ) : (
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className={cn(
                    "grid h-11 w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-2 px-3 text-left font-normal",
                    `border ${INPUT_BORDER_COLOR} ${INPUT_BORDER_HOVER} ${INPUT_BORDER_FOCUS_VISIBLE} focus-visible:ring-1 focus-visible:ring-primary/20`,
                    !field?.value?.address && "text-muted-foreground",
                    isLocationLoading && "border-primary",
                  )}
                  disabled={isLocationLoading}
                >
                  {isLocationLoading ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                  ) : (
                    <MapPin className={`${INPUT_ICON_SIZE} shrink-0 ${INPUT_ICON_COLOR}`} />
                  )}
                  <span className="truncate" title={field?.value?.address}>
                    {isLocationLoading
                      ? "Detecting your location..."
                      : field?.value?.address ||
                        placeholder ||
                        "Search for your area..."}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[max(var(--radix-popover-trigger-width),400px)] p-0"
                align="start"
              >
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search for your area..."
                    value={searchValue}
                    onValueChange={setSearchValue}
                  />
                  <CommandList>
                    {addressSuggestions.isLoading &&
                      searchValue.length >= 2 && (
                        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading...
                        </div>
                      )}

                    {!addressSuggestions.isLoading &&
                      searchValue.length >= 2 &&
                      (!addressSuggestions.data ||
                        addressSuggestions.data.length === 0) && (
                        <CommandGroup>
                          <div className="flex flex-col items-center justify-center px-4 py-4 text-center">
                            <MapPin className="mb-2 h-6 w-6 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                              No locations found on Google
                            </p>
                          </div>
                          <CommandItem
                            value={`manual-${searchValue}`}
                            onSelect={() => handleManualEntry(searchValue)}
                            className="cursor-pointer border-t py-3"
                          >
                            <PenLine className="h-4 w-4 shrink-0 text-primary" />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium">
                                Use &quot;{searchValue}&quot; as address
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Save entered text manually (no map location)
                              </div>
                            </div>
                          </CommandItem>
                        </CommandGroup>
                      )}

                    {searchValue.length < 2 && (
                      <div className="flex flex-col items-center justify-center px-4 py-6 text-center">
                        <MapPin className="mb-2 h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Start typing to search for a location
                        </p>
                      </div>
                    )}

                    {addressSuggestions.data &&
                      addressSuggestions.data.length > 0 && (
                        <>
                          <CommandGroup heading="Suggested Locations">
                            {addressSuggestions.data.map((suggestion) => (
                              <CommandItem
                                key={suggestion.place_id}
                                value={suggestion.description}
                                onSelect={() => handleAddressSelect(suggestion)}
                                className="cursor-pointer py-3"
                              >
                                <div className="flex min-w-0 flex-1 items-center gap-2">
                                  <MapPin className="h-4 w-4 shrink-0 text-primary" />
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-medium">
                                      {suggestion.main_text}
                                    </div>
                                    {suggestion.secondary_text && (
                                      <div className="truncate text-xs text-muted-foreground">
                                        {suggestion.secondary_text}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <Check
                                  className={cn(
                                    "ml-auto h-4 w-4 shrink-0",
                                    field?.value?.address ===
                                      suggestion.description
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                          <CommandGroup>
                            <CommandItem
                              value={`manual-entry-${searchValue}`}
                              onSelect={() => handleManualEntry(searchValue)}
                              className="cursor-pointer border-t py-3"
                            >
                              <PenLine className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium">
                                  Use &quot;{searchValue}&quot; as address
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  None of these match — save typed text manually
                                </div>
                              </div>
                            </CommandItem>
                          </CommandGroup>
                        </>
                      )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </FormControl>
      {autoDetectLocation && !isAutoDetected && (
        <p
          className={cn(
            "mt-1 text-xs transition-colors duration-200",
            isLocationLoading ? "text-primary" : "text-muted-foreground",
          )}
        >
          {isLocationLoading
            ? "🔍 Detecting your current location..."
            : locationError
              ? "📍 Please enter your location manually"
              : hasAttemptedAutoDetection && !field?.value?.address
                ? "📍 Please search for your location manually"
                : "📍 Location will be detected automatically"}
        </p>
      )}
    </FormItem>
  );
};

export default React.memo(AddressInput);
