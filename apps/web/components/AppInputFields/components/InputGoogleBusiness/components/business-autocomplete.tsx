"use client";

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
import { Check, Loader2, PenLine, Store } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { businessKeys } from "@/lib/query-keys";
import { INPUT_BORDER_COLOR, INPUT_BORDER_HOVER, INPUT_BORDER_FOCUS_VISIBLE, INPUT_ICON_SIZE, INPUT_ICON_COLOR } from "@/components/AppInputFields/input-styles";

interface BusinessDetails {
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

interface AddressSuggestion {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
}

interface Props {
  onBusinessSelect: (details: BusinessDetails) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const BusinessAutocomplete = ({
  onBusinessSelect,
  label,
  placeholder,
  className,
  disabled,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(
    null,
  );

  // Address suggestions query using Google Places Autocomplete API
  const businessSuggestions = useQuery({
    queryKey: businessKeys.suggestions(searchValue),
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
        console.error("Error fetching business suggestions:", error);
        return [];
      }
    },
    enabled: Boolean(searchValue && searchValue.length >= 2),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Function to get detailed business info from place_id
  const getPlaceDetails = async (
    placeId: string,
  ): Promise<BusinessDetails | null> => {
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

      // Process phone number: Remove leading 0 and add +91 if missing
      let phone =
        data.internationalPhoneNumber || data.nationalPhoneNumber || "";
      if (phone) {
        // Remove spaces, dashes, parentheses
        let cleaned = phone.replace(/[\s\-\(\)]/g, "");

        // Remove leading zero if present (common in national format)
        if (cleaned.startsWith("0")) {
          cleaned = cleaned.substring(1);
        }

        // Ensure it has a + prefix. Default to +91 if no country code provided
        if (!cleaned.startsWith("+")) {
          // If it starts with 91 and has 12 digits total, it's likely already 91XXXXXXXXXX
          if (cleaned.startsWith("91") && cleaned.length === 12) {
            phone = `+${cleaned}`;
          } else {
            phone = `+91${cleaned}`;
          }
        } else {
          phone = cleaned;
        }
      }

      return {
        place_id: placeId,
        name: data.displayName?.text || "",
        formatted_address: data.formattedAddress || "",
        website_uri: data.websiteUri,
        national_phone_number: phone, // We return the formatted phone as national_phone_number
        location: data.location
          ? {
              lat: data.location.latitude,
              lng: data.location.longitude,
            }
          : undefined,
      };
    } catch (error) {
      console.error("Error fetching place details:", error);
      return null;
    }
  };

  const handleSelect = async (suggestion: AddressSuggestion) => {
    try {
      setSearchValue(suggestion.main_text); // Show name in input temporarily
      setSelectedBusinessId(suggestion.place_id);
      setOpen(false);

      const details = await getPlaceDetails(suggestion.place_id);
      if (details) {
        // Fallback to suggestion description if formatted_address is missing
        if (!details.formatted_address && suggestion.description) {
          details.formatted_address = suggestion.description;
        }
        onBusinessSelect(details);
      }
    } catch (error) {
      console.error("Failed to select business:", error);
    }
  };

  return (
    <FormItem className={cn("w-full min-w-0", className)}>
      {label && <FormLabel className="text-sm font-medium">{label}</FormLabel>}
      <FormControl>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn(
                "h-11 w-full min-w-0 justify-start gap-2 overflow-hidden text-left font-normal",
                `border ${INPUT_BORDER_COLOR} ${INPUT_BORDER_HOVER} ${INPUT_BORDER_FOCUS_VISIBLE} focus-visible:ring-1 focus-visible:ring-primary/20`,
                !searchValue && "text-muted-foreground",
                "bg-white dark:bg-slate-950",
              )}
              disabled={disabled}
            >
              <Store className={`${INPUT_ICON_SIZE} shrink-0 ${INPUT_ICON_COLOR}`} />
              <span className="truncate">
                {searchValue || placeholder || "Search business database..."}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-(--radix-popover-trigger-width) min-w-0 p-0 sm:w-[max(var(--radix-popover-trigger-width),400px)]"
            align="start"
          >
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Search business name..."
                value={searchValue}
                onValueChange={setSearchValue}
              />
              <CommandList>
                {businessSuggestions.isLoading && searchValue.length >= 2 && (
                  <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching database...
                  </div>
                )}

                {!businessSuggestions.isLoading &&
                  searchValue.length >= 2 &&
                  (!businessSuggestions.data ||
                    businessSuggestions.data.length === 0) && (
                    <CommandGroup>
                      <div className="flex flex-col items-center justify-center px-4 py-4 text-center">
                        <Store className="mb-2 h-6 w-6 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          No businesses found on Google
                        </p>
                      </div>
                      <CommandItem
                        value={searchValue}
                        onSelect={() => {
                          onBusinessSelect({
                            place_id: "",
                            name: searchValue,
                            formatted_address: "",
                          });
                          setOpen(false);
                        }}
                        className="cursor-pointer border-t py-3"
                      >
                        <PenLine className="h-4 w-4 shrink-0 text-primary" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium">
                            Use &quot;{searchValue}&quot; as business name
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Fill the remaining details manually
                          </div>
                        </div>
                      </CommandItem>
                    </CommandGroup>
                  )}

                {businessSuggestions.data &&
                  businessSuggestions.data.length > 0 && (
                    <CommandGroup heading="Business Results">
                      {businessSuggestions.data.map((suggestion) => (
                        <CommandItem
                          key={suggestion.place_id}
                          value={suggestion.description}
                          onSelect={() => handleSelect(suggestion)}
                          className="cursor-pointer py-3"
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <Store className="h-4 w-4 shrink-0 text-primary" />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium">
                                {suggestion.main_text}
                              </div>
                              <div className="truncate text-xs text-muted-foreground">
                                {suggestion.secondary_text}
                              </div>
                            </div>
                          </div>
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4 shrink-0",
                              selectedBusinessId === suggestion.place_id
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </FormControl>
    </FormItem>
  );
};

export default BusinessAutocomplete;
