import Link from "next/link";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DeepLink } from "./deepLinks";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  links?: DeepLink[];
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
        <p className="whitespace-pre-wrap">{message.content}</p>
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
