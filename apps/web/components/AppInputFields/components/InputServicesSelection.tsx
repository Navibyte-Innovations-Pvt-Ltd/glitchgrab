"use client";

import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { FieldValues, Path, useFormContext } from "react-hook-form";
import { Package, Pencil, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { useServices } from "@/app/api/services/services.hook";
import { useServicePackages } from "@/app/api/service-packages/service-packages.hook";
import { ServicePackageCard } from "@/components/proposals/service-package-card";
import { EditServiceDialog } from "@/app/dashboard/services/_components/edit-service-dialog";
import { EditServicePackageDialog } from "@/app/dashboard/services/_components/edit-service-package-dialog";
import type { Currency } from "@/lib/currency-utils";

interface InputServicesSelectionProps<T extends FieldValues> {
  serviceIdsName: Path<T>;
  packageIdsName: Path<T>;
  currency: string;
  /** Extra actions rendered in the header row (e.g. save button) */
  headerActions?: React.ReactNode;
  className?: string;
}

function ServicesSelectionSkeleton() {
  return (
    <div className="space-y-4 p-3 sm:p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[180, 144, 200, 160, 192].map((w, i) => (
          <div key={i} className="space-y-3 rounded-xl border border-slate-200/60 p-4">
            <Skeleton className="h-5" style={{ width: w }} />
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-14 rounded-md" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const editButtonClass =
  "flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 text-slate-400 opacity-60 transition-all group-hover:opacity-100 hover:bg-slate-200 hover:text-primary hover:opacity-100 dark:bg-slate-900";

function InputServicesSelection<T extends FieldValues>({
  serviceIdsName,
  packageIdsName,
  currency,
  headerActions,
  className,
}: InputServicesSelectionProps<T>) {
  const form = useFormContext<T>();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: servicesData, isLoading: servicesLoading } = useServices();
  const { data: packagesData, isLoading: packagesLoading } =
    useServicePackages();

  const filteredServices = useMemo(
    () =>
      (servicesData?.services || []).filter((s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [servicesData?.services, searchQuery],
  );

  const filteredPackages = useMemo(
    () =>
      (packagesData?.packages || []).filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [packagesData?.packages, searchQuery],
  );

  const isLoading = servicesLoading || packagesLoading;

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
            <Package className="h-4.5 w-4.5" />
          </div>
          <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Services & Deliverables
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full max-w-64">
            <span className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400">
              <Search className="h-3.5 w-3.5" />
            </span>
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 rounded-lg border-slate-200 bg-slate-50/50 pl-9 text-xs font-medium transition-all focus:bg-white dark:border-slate-800 dark:bg-slate-950"
            />
          </div>
          {headerActions}
        </div>
      </div>

      {/* Cards Container */}
      <div className="mt-3 min-h-0 flex-1 space-y-4 overflow-y-auto rounded-xl border border-slate-200/60 bg-white p-3 shadow-sm sm:space-y-5 sm:p-4 dark:border-slate-800/60 dark:bg-slate-900/40">
        {isLoading ? (
          <ServicesSelectionSkeleton />
        ) : (
          <>
            {/* Packages Grid */}
            {filteredPackages.length > 0 && (
              <FormField
                control={form.control}
                name={packageIdsName}
                render={() => (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-2">
                    {filteredPackages.map((pkg) => {
                      const allIncluded = (pkg.services ?? []).flatMap(
                        (s) => (s.service?.included as string[]) ?? [],
                      );
                      const allExcluded = (pkg.services ?? []).flatMap(
                        (s) => (s.service?.excluded as string[]) ?? [],
                      );
                      return (
                        <FormField
                          key={pkg.id}
                          control={form.control}
                          name={packageIdsName}
                          render={({ field }) => {
                            const values = (field.value as string[]) || [];
                            const isSelected = values.includes(pkg.id);
                            return (
                              <ServicePackageCard
                                name={pkg.name}
                                type="package"
                                price={pkg.packagePrice || 0}
                                currency={currency as Currency}
                                billingType={pkg.billingType}
                                billingCycle={pkg.billingCycle}
                                categoryName={
                                  pkg.complianceType?.name || "General"
                                }
                                categoryColor={
                                  pkg.complianceType?.color || "#94a3b8"
                                }
                                included={[...new Set(allIncluded)]}
                                excluded={[...new Set(allExcluded)]}
                                isSelected={isSelected}
                                onToggle={() => {
                                  if (isSelected) {
                                    field.onChange(
                                      values.filter((v) => v !== pkg.id),
                                    );
                                  } else {
                                    field.onChange([...values, pkg.id]);
                                  }
                                }}
                                editButton={
                                  <EditServicePackageDialog
                                    servicePackage={pkg}
                                  >
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className={editButtonClass}
                                      title="Edit package"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                  </EditServicePackageDialog>
                                }
                              />
                            );
                          }}
                        />
                      );
                    })}
                  </div>
                )}
              />
            )}

            {/* Services Grid */}
            {filteredServices.length > 0 && (
              <FormField
                control={form.control}
                name={serviceIdsName}
                render={() => (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-2">
                    {filteredServices.map((service) => (
                      <FormField
                        key={service.id}
                        control={form.control}
                        name={serviceIdsName}
                        render={({ field }) => {
                          const values = (field.value as string[]) || [];
                          const isSelected = values.includes(service.id);
                          return (
                            <ServicePackageCard
                              name={service.name}
                              type="service"
                              price={service.baseRate || 0}
                              currency={currency as Currency}
                              billingType={service.billingType}
                              billingCycle={service.billingCycle}
                              categoryName={
                                service.complianceType?.name || "General"
                              }
                              categoryColor={
                                service.complianceType?.color || "#94a3b8"
                              }
                              included={
                                (service.included as string[]) ?? []
                              }
                              excluded={
                                (service.excluded as string[]) ?? []
                              }
                              isSelected={isSelected}
                              onToggle={() => {
                                if (isSelected) {
                                  field.onChange(
                                    values.filter((v) => v !== service.id),
                                  );
                                } else {
                                  field.onChange([...values, service.id]);
                                }
                              }}
                              editButton={
                                <EditServiceDialog
                                  service={{
                                    id: service.id,
                                    name: service.name,
                                    included:
                                      (service.included as string[]) || [],
                                    excluded:
                                      (service.excluded as string[]) || [],
                                    baseRate: service.baseRate || 0,
                                    currency: service.currency || "INR",
                                    taxRate: service.taxRate,
                                    billingType: service.billingType,
                                    fixedPrice: service.fixedPrice,
                                    hourlyRate: service.hourlyRate,
                                    perUserRate: service.perUserRate,
                                    subscriptionPrice:
                                      service.subscriptionPrice,
                                    subscriptionPeriod:
                                      service.subscriptionPeriod,
                                    customPrice: service.customPrice,
                                    milestones:
                                      service.milestones?.map((m) => ({
                                        name: m.name,
                                        price: m.price,
                                        description: m.description,
                                      })) || null,
                                    isRecurring: service.isRecurring,
                                    billingCycle: service.billingCycle,
                                    duration: service.duration,
                                    complianceTypeId:
                                      service.complianceTypeId,
                                    isActive: service.isActive,
                                  }}
                                >
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className={editButtonClass}
                                    title="Edit service"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                </EditServiceDialog>
                              }
                            />
                          );
                        }}
                      />
                    ))}
                  </div>
                )}
              />
            )}

            {/* Empty State */}
            {filteredServices.length === 0 && filteredPackages.length === 0 && (
              <div className="flex flex-col items-center justify-center space-y-3 rounded-md border border-dashed border-slate-200 bg-slate-50 py-10 text-center dark:border-slate-800 dark:bg-slate-950/50">
                <div className="rounded-md bg-white p-3 shadow-sm dark:bg-slate-900">
                  <Search className="h-5 w-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-200">
                    No services found
                  </p>
                  <p className="mx-auto max-w-50 text-xs text-slate-500">
                    Try adjusting your search terms or check if services are
                    active.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default InputServicesSelection;
