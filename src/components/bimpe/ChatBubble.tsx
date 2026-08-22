import Link from "next/link";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DeepLink } from "./deepLinks";
import type { ExecutionReceipt } from "./executionReceipt";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  links?: DeepLink[];
  /** Confirmations for writes this turn performed — rendered above the reply. */
  receipts?: ExecutionReceipt[];
  /** Data URL of a photo attached to this (user-sent) message — current session only, not persisted from history. */
  image?: string;
}

/** Bimpe left + avatar, user right (UI spec §8) — matches the marketing site's bubble treatment. */
export function ChatBubble({ message }: { message: ChatMessage }) {
  const isAssistant = message.role === "assistant";

  return (
    <div className={cn("flex items-end gap-2", isAssistant ? "justify-start" : "justify-end")}>
      {isAssistant && (
        <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
          <Sparkles className="size-3.5" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-3 py-2 text-sm",
          isAssistant ? "bg-muted text-foreground" : "bg-primary text-primary-foreground",
        )}
      >
        {message.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={message.image} alt="Attached receipt" className="mb-2 h-24 w-24 rounded-md object-cover" />
        )}
        {message.receipts?.map((receipt, i) => (
          <div key={i} className="mb-2 border-l-2 border-primary bg-background/60 px-2.5 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {receipt.outcome === "recorded" ? "Executed" : "Awaiting approval"}
            </p>
            <p className="mt-0.5 text-xs font-medium">{receipt.action}</p>
            <p className="font-heading text-sm font-semibold">{receipt.subject}</p>
            <dl className="mt-1 space-y-0.5">
              {receipt.details.map((d) => (
                <div key={d.label} className="flex justify-between gap-3 text-[11px]">
                  <dt className="text-muted-foreground">{d.label}</dt>
                  <dd className="text-right">{d.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
        {message.content && <p className="whitespace-pre-wrap">{message.content}</p>}
        {message.links && message.links.length > 0 && (
          <div className="mt-2 flex flex-col gap-1">
            {message.links.map((link) => (
              <Link key={link.href} href={link.href} className="text-xs font-medium underline underline-offset-2">
                {link.label} →
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
