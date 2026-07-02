import { useEffect, useState, type JSX, type MouseEvent } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";

type CopyValueButtonProps = {
  copiedLabel?: string;
  copyLabel: string;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  value: string | null | undefined;
};

export function CopyValueButton(props: CopyValueButtonProps): JSX.Element | null {
  const trimmedValue = props.value?.trim();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  useEffect(() => {
    if (copyState !== "copied") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCopyState("idle");
    }, 1600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [copyState]);

  if (!trimmedValue) {
    return null;
  }

  const value = trimmedValue;

  async function handleCopy(event: MouseEvent<HTMLButtonElement>): Promise<void> {
    props.onClick?.(event);

    try {
      await navigator.clipboard.writeText(value);
      setCopyState("copied");
    } catch {
      setCopyState("error");
      window.setTimeout(() => {
        setCopyState("idle");
      }, 1800);
    }
  }

  const tooltipLabel =
    copyState === "copied"
      ? (props.copiedLabel ?? "Kopiert")
      : copyState === "error"
        ? "Kopieren fehlgeschlagen"
        : props.copyLabel;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-xs"
          className="border-border/75 bg-background text-muted-foreground hover:text-foreground"
          onClick={(event) => {
            void handleCopy(event);
          }}
          aria-label={props.copyLabel}
        >
          {copyState === "copied" ? (
            <CheckIcon className="size-3.5 text-primary" aria-hidden="true" />
          ) : (
            <CopyIcon className="size-3.5" aria-hidden="true" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{tooltipLabel}</TooltipContent>
    </Tooltip>
  );
}
