"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBimpePanel } from "@/lib/bimpePanelState";
import { trpc } from "@/lib/trpc";
import { ChatBubble, type ChatMessage } from "./ChatBubble";
import { buildDeepLinks } from "./deepLinks";

const EXAMPLE_PROMPTS = [
  "What's our steel stock at Site 4?",
  "Has the rebar for Block C arrived?",
  "How's today's pour going?",
  "Who's waiting on my approval?",
];

export function BimpePanel() {
  const { isOpen, close } = useBimpePanel();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const chat = trpc.bimpe.chat.useMutation();

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || chat.isPending) return;

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setDraft("");

    const result = await chat.mutateAsync({ message: trimmed, history });
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: result.reply, links: buildDeepLinks(result.toolResults) },
    ]);
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
      <SheetContent className="flex w-full flex-col p-0 sm:max-w-sm" side="right">
        <SheetHeader className="border-b">
          <SheetTitle>Bimpe</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4">
          <div className="flex flex-col gap-3 py-4">
            {messages.length === 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">Ask Bimpe about stock, deliveries, production or approvals.</p>
                {EXAMPLE_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => void send(prompt)}
                    className="rounded-md border px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
            {messages.map((message, i) => (
              <ChatBubble key={i} message={message} />
            ))}
            {chat.isPending && <ChatBubble message={{ role: "assistant", content: "Thinking…" }} />}
          </div>
        </ScrollArea>

        <form
          className="flex items-center gap-2 border-t p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void send(draft);
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask Bimpe…"
            className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <Button type="submit" size="icon" disabled={chat.isPending || !draft.trim()} aria-label="Send">
            <Send className="size-4" />
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
