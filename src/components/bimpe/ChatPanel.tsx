"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Send, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBimpePanel } from "@/lib/bimpePanelState";
import { trpc } from "@/lib/trpc";
import { compressImage, dataUrlToBase64 } from "@/lib/imageCompress";
import { ChatBubble, type ChatMessage } from "./ChatBubble";
import { buildDeepLinks } from "./deepLinks";
import { buildExecutionReceipts } from "./executionReceipt";

const EXAMPLE_PROMPTS = [
  "What's our steel stock at Site 4?",
  "Has the rebar for Block C arrived?",
  "How's today's pour going?",
  "Who's waiting on my approval?",
];

interface PendingImage {
  dataUrl: string;
  fileName: string;
}

export function BimpePanel() {
  const { isOpen, close, consumePendingPrompt } = useBimpePanel();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chat = trpc.bimpe.chat.useMutation();

  // A command typed into the Overview bar opens the panel and runs immediately,
  // so the bar behaves like an execution surface rather than a text box.
  useEffect(() => {
    if (!isOpen) return;
    const seeded = consumePendingPrompt();
    if (seeded) void send(seeded);
    // send is stable enough for this one-shot handoff; re-running on every
    // render would resend the command.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  async function handleAttach(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const { dataUrl } = await compressImage(file);
    setPendingImage({ dataUrl, fileName: file.name });
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if ((!trimmed && !pendingImage) || chat.isPending) return;

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    const image = pendingImage;
    setMessages((prev) => [...prev, { role: "user", content: trimmed, image: image?.dataUrl }]);
    setDraft("");
    setPendingImage(null);

    const result = await chat.mutateAsync({
      message: trimmed,
      history,
      image: image ? { mediaType: "image/jpeg", base64Data: dataUrlToBase64(image.dataUrl), fileName: image.fileName } : undefined,
    });
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: result.reply,
        links: buildDeepLinks(result.toolResults),
        receipts: buildExecutionReceipts(result.toolResults),
      },
    ]);
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
      <SheetContent className="flex w-full flex-col p-0 sm:max-w-sm" side="right">
        <SheetHeader className="border-b">
          <SheetTitle>Baymax AI</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4">
          <div className="flex flex-col gap-3 py-4">
            {messages.length === 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">Your operations guide is here to help you understand the work, spot what needs attention, and prepare the next step.</p>
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
          className="flex flex-col gap-2 border-t p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void send(draft);
          }}
        >
          {pendingImage && (
            <div className="relative w-fit">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pendingImage.dataUrl} alt="Attached receipt" className="h-16 w-16 rounded-md border object-cover" />
              <button
                type="button"
                onClick={() => setPendingImage(null)}
                className="absolute -right-2 -top-2 rounded-full bg-foreground p-1 text-background"
                aria-label="Remove attached photo"
              >
                <X className="size-3" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => void handleAttach(e)}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach a photo"
            >
              <Camera className="size-4" />
            </Button>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask Baymax AI about your operations…"
              className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <Button type="submit" size="icon" disabled={chat.isPending || (!draft.trim() && !pendingImage)} aria-label="Send">
              <Send className="size-4" />
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
