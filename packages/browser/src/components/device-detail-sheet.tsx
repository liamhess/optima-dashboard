import { useEffect, useState, type JSX } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { AlertCircleIcon, ArrowUpRightIcon, WifiIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  Sheet,
  SheetContent,
  SheetDismissButton,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { cn } from "@/lib/utils.ts";
import {
  formatDateLabel,
  formatDateTimeLabel,
  getDeviceOnlineStatus,
  type DeviceConflictField,
  type DeviceListItem,
  type DeviceTableRow,
} from "@/devices.ts";
import { lifecycleOptions } from "@/lifecycles.ts";
import { trpc } from "@/trpc.ts";

const editableFieldLabels: Record<DeviceConflictField, string> = {
  lifecycle: "Lifecycle",
  serialNumber: "Seriennummer",
  macAddress: "MAC-Adresse",
  notes: "Notiz",
};

const onlineIndicatorClassNameByTone: Record<DeviceTableRow["onlineTone"], string> = {
  neutral: "size-2.5 rounded-full bg-muted-foreground/35",
  positive: "size-2.5 rounded-full bg-primary",
  warning: "size-2.5 rounded-full bg-amber-500",
  danger: "size-2.5 rounded-full bg-red-500",
};

type DeviceDetailSheetProps = {
  device: DeviceListItem | undefined;
  error: { message: string } | null;
  isLoading: boolean;
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
};

type DeviceDetailFormValues = {
  lifecycle: string;
  serialNumber: string;
  macAddress: string;
  notes: string;
};

type DetailValueProps = {
  label: string;
  value: string;
};

type DetailSectionProps = {
  children: JSX.Element | JSX.Element[] | string;
  title: string;
};

function toFormValues(device: DeviceListItem | undefined): DeviceDetailFormValues {
  return {
    lifecycle: device?.lifecycle ?? lifecycleOptions[0],
    serialNumber: device?.serialNumber ?? "",
    macAddress: device?.macAddress ?? "",
    notes: device?.notes ?? "",
  };
}

function emptyValue(value: string | null | undefined, fallback: string): string {
  return value && value.trim() ? value : fallback;
}

function StatusPill(props: {
  children: React.ReactNode;
  tone?: "default" | "warning" | "success";
}): JSX.Element {
  const className =
    props.tone === "warning"
      ? "border-amber-300 bg-amber-50 text-amber-800"
      : props.tone === "success"
        ? "border-primary/20 bg-primary/10 text-primary"
        : "border-border/70 bg-secondary/70 text-foreground";

  return (
    <Badge className={cn("rounded-md px-2 py-0.5 text-xs", className)}>{props.children}</Badge>
  );
}

function DetailValue({ label, value }: DetailValueProps): JSX.Element {
  return (
    <div className="space-y-0.5">
      <p className="text-[0.68rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="text-sm leading-5 text-foreground">{value}</p>
    </div>
  );
}

function DetailSection({ children, title }: DetailSectionProps): JSX.Element {
  return (
    <section className="py-1">
      <div className="px-1">
        <h3 className="text-lg font-semibold tracking-[-0.02em] text-foreground">{title}</h3>
      </div>
      <div className="px-1 pt-4">{children}</div>
    </section>
  );
}

function DetailGrid(props: { values: DetailValueProps[] }): JSX.Element {
  return (
    <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {props.values.map((item) => (
        <DetailValue key={item.label} label={item.label} value={item.value} />
      ))}
    </div>
  );
}

function TimelineRows(props: { items: Array<{ label: string; value: string }> }): JSX.Element {
  return (
    <div className="space-y-0">
      {props.items.map((item, index) => (
        <div key={item.label}>
          {index > 0 ? <Separator /> : null}
          <div className="flex items-start justify-between gap-4 py-3">
            <p className="text-sm font-medium text-foreground">{item.label}</p>
            <p className="text-right font-mono text-xs leading-5 text-muted-foreground">
              {item.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function LoadingState(): JSX.Element {
  return (
    <div className="space-y-3">
      <div className="px-1 py-1">
        <Skeleton className="h-4 w-40 rounded-md" />
        <Skeleton className="mt-2 h-4 w-56 rounded-md" />
        <Skeleton className="mt-3 h-8 w-full rounded-md" />
      </div>

      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="px-1 py-1">
          <Skeleton className="h-4 w-24 rounded-md" />
          <Skeleton className="mt-4 h-10 w-full rounded-md" />
          <Skeleton className="mt-3 h-10 w-full rounded-md" />
        </div>
      ))}
    </div>
  );
}

function ErrorState(props: { error: { message: string }; onRetry: () => void }): JSX.Element {
  return (
    <Card className="rounded-xl border border-red-200 bg-red-50/90 py-0 text-red-700 shadow-none">
      <CardContent className="px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-white p-2 text-red-600 shadow-sm">
            <AlertCircleIcon className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium">Gerätedetails konnten nicht geladen werden.</p>
            <code className="mt-3 block overflow-x-auto rounded-md bg-white/85 p-3 font-mono text-xs text-red-700">
              {props.error.message}
            </code>
            <Button className="mt-4 h-9 rounded-md px-4" onClick={props.onRetry}>
              Erneut versuchen
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DeviceDetailContent(props: { device: DeviceListItem }): JSX.Element {
  const { device } = props;
  const onlineStatus = getDeviceOnlineStatus(device);
  const queryClient = useQueryClient();
  const [saveError, setSaveError] = useState<string | null>(null);
  const conflictFields = (Object.entries(device.conflicts) as Array<[string, boolean]>)
    .filter(([key, value]) => key !== "hasAny" && value)
    .map(([key]) => key as DeviceConflictField);

  const form = useForm<DeviceDetailFormValues>({
    defaultValues: toFormValues(device),
  });
  const saveLocalChangesMutation = useMutation(
    trpc.devices.updateLocalChanges.mutationOptions({
      onSuccess: async (savedDevice): Promise<void> => {
        setSaveError(null);
        form.reset(toFormValues(savedDevice));
        queryClient.setQueryData(trpc.devices.byId.queryKey({ id: device.id }), savedDevice);

        await Promise.all([
          queryClient.invalidateQueries(trpc.devices.byId.queryFilter({ id: device.id })),
          queryClient.invalidateQueries(trpc.devices.list.pathFilter()),
          queryClient.invalidateQueries(trpc.devices.kpis.pathFilter()),
        ]);
      },
      onError: (error): void => {
        setSaveError(error.message);
      },
    }),
  );

  useEffect(() => {
    form.reset(toFormValues(device));
    setSaveError(null);
  }, [device, form]);

  async function onSubmit(values: DeviceDetailFormValues): Promise<void> {
    setSaveError(null);

    await saveLocalChangesMutation.mutateAsync({
      id: device.id,
      lifecycle: values.lifecycle,
      serialNumber: values.serialNumber,
      macAddress: values.macAddress,
      notes: values.notes,
    });
  }

  const timelineItems = [
    { label: "Bestellt", value: formatDateTimeLabel(device.orderedAt, "Noch nicht gesetzt") },
    { label: "Verschickt", value: formatDateTimeLabel(device.shippedAt, "Noch nicht gesetzt") },
    { label: "Verbaut", value: formatDateTimeLabel(device.installedAt, "Noch nicht gesetzt") },
    { label: "Aktiviert", value: formatDateTimeLabel(device.activatedAt, "Noch nicht gesetzt") },
    { label: "Letztes Signal", value: formatDateTimeLabel(device.lastSeenAt, "Noch kein Signal") },
  ];

  return (
    <Form {...form}>
      <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="px-1 py-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-foreground">
                {emptyValue(device.customer.name, "Unbekannter Kunde")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {device.customer.state ?? "Unbekannter Ort"} · {device.deviceType}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StatusPill>{device.lifecycle}</StatusPill>
              <div className="flex items-center gap-1 rounded-md border border-border/70 bg-background px-2 py-0.5 text-xs text-foreground">
                <span
                  className={onlineIndicatorClassNameByTone[onlineStatus.tone]}
                  aria-hidden="true"
                />
                {onlineStatus.label}
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {device.trackingUrl ? (
              <a
                href={device.trackingUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-border/75 bg-background px-2 py-1 text-foreground transition-colors hover:border-primary/35 hover:text-primary"
              >
                Tracking öffnen
                <ArrowUpRightIcon className="size-3.5" />
              </a>
            ) : null}

            <span className="inline-flex items-center gap-1 rounded-md border border-border/75 bg-background px-2 py-1">
              <WifiIcon className="size-3.5" />
              Signal: {formatDateTimeLabel(device.lastSeenAt, "Keins")}
            </span>
          </div>
        </div>

        <Separator className="my-5" />

        <DetailSection title="Bearbeitung">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-foreground">Lokale Änderungen</p>
              {form.formState.isDirty ? (
                <StatusPill tone="warning">Ungespeichert</StatusPill>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="lifecycle"
                render={({ field }) => (
                  <FormItem className="gap-1.5">
                    <FormLabel>Lifecycle</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-10 w-full rounded-md border-border/80 bg-background px-3">
                          <SelectValue placeholder="Lifecycle wählen" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {lifecycleOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {device.conflicts.lifecycle ? (
                      <StatusPill tone="warning">Upstream-Konflikt</StatusPill>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="serialNumber"
                render={({ field }) => (
                  <FormItem className="gap-1.5">
                    <FormLabel>Seriennummer</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value}
                        placeholder="z. B. GW5-002931"
                        className="h-10 rounded-md border-border/80 bg-background px-3 font-mono"
                      />
                    </FormControl>
                    {device.conflicts.serialNumber ? (
                      <StatusPill tone="warning">Upstream-Konflikt</StatusPill>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="macAddress"
                render={({ field }) => (
                  <FormItem className="gap-1.5 sm:col-span-2">
                    <FormLabel>MAC-Adresse</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value}
                        placeholder="z. B. A4:CF:12:AB:CD:EF"
                        className="h-10 rounded-md border-border/80 bg-background px-3 font-mono uppercase"
                      />
                    </FormControl>
                    {device.conflicts.macAddress ? (
                      <StatusPill tone="warning">Upstream-Konflikt</StatusPill>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="gap-1.5 sm:col-span-2">
                    <FormLabel>Notiz</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value}
                        placeholder="Notiz"
                        className="min-h-28 rounded-md border-border/80 bg-background px-3 py-2.5"
                      />
                    </FormControl>
                    {device.conflicts.notes ? (
                      <StatusPill tone="warning">Upstream-Konflikt</StatusPill>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-md border-border/80 bg-background px-3"
                disabled={!form.formState.isDirty || saveLocalChangesMutation.isPending}
                onClick={() => {
                  setSaveError(null);
                  form.reset(toFormValues(device));
                }}
              >
                Zurücksetzen
              </Button>
              <Button
                type="submit"
                className="h-9 rounded-md px-4"
                disabled={!form.formState.isDirty || saveLocalChangesMutation.isPending}
              >
                {saveLocalChangesMutation.isPending ? "Speichert..." : "Änderungen speichern"}
              </Button>
            </div>

            {saveError ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                Änderungen konnten nicht gespeichert werden. {saveError}
              </div>
            ) : null}

            {device.conflicts.hasAny ? (
              <div className="space-y-2">
                <Separator />
                <p className="text-sm font-medium text-foreground">Konflikte</p>
                <div className="flex flex-wrap gap-2">
                  {conflictFields.map((field) => (
                    <StatusPill key={field} tone="warning">
                      {editableFieldLabels[field]}
                    </StatusPill>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </DetailSection>

        <Separator className="my-5" />

        <DetailSection title="Kunde">
          <DetailGrid
            values={[
              {
                label: "Name",
                value: emptyValue(device.customer.name, "Unbekannter Kunde"),
              },
              {
                label: "E-Mail",
                value: emptyValue(device.customer.email, "Keine E-Mail hinterlegt"),
              },
              {
                label: "Bundesland",
                value: emptyValue(device.customer.state, "Kein Ort hinterlegt"),
              },
            ]}
          />
        </DetailSection>

        <Separator className="my-5" />

        <DetailSection title="Installation">
          <DetailGrid
            values={[
              {
                label: "Anlagentyp",
                value: emptyValue(device.installation.type, "Kein Anlagentyp hinterlegt"),
              },
              {
                label: "Termin",
                value: formatDateLabel(device.installation.date, "Kein Installationsdatum"),
              },
            ]}
          />
        </DetailSection>

        <Separator className="my-5" />

        <DetailSection title="Identifikatoren">
          <DetailGrid
            values={[
              {
                label: "Aktuelle Seriennummer",
                value: emptyValue(device.serialNumber, "Keine Seriennummer"),
              },
              {
                label: "Aktuelle MAC-Adresse",
                value: emptyValue(device.macAddress, "Keine MAC-Adresse"),
              },
              {
                label: "Upstream ID",
                value: device.id,
              },
            ]}
          />
        </DetailSection>

        <Separator className="my-5" />

        <DetailSection title="Timeline">
          <TimelineRows items={timelineItems} />
        </DetailSection>
      </form>
    </Form>
  );
}

export function DeviceDetailSheet(props: DeviceDetailSheetProps): JSX.Element {
  return (
    <Sheet open={props.isOpen} onOpenChange={(open) => (!open ? props.onClose() : null)}>
      <SheetContent className="p-0">
        <div className="flex items-start justify-between gap-4 border-b border-border/80 px-6 py-5">
          <SheetHeader className="min-w-0">
            <SheetTitle>Gerätedetails</SheetTitle>
          </SheetHeader>
          <SheetDismissButton />
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {props.isLoading ? <LoadingState /> : null}
          {!props.isLoading && props.error ? (
            <ErrorState error={props.error} onRetry={props.onRetry} />
          ) : null}
          {!props.isLoading && !props.error && props.device ? (
            <DeviceDetailContent device={props.device} />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
