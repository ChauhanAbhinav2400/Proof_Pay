import { Download, Paperclip, Send, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "../../../components/button";
import { EmptyState } from "../../../components/empty-state";
import { ErrorState } from "../../../components/error-state";
import { useSocket } from "../../../contexts/socket-context";
import {
  emitStopTyping,
  emitTyping,
  joinSocketRoom,
  leaveSocketRoom,
  onSocketMessageCreated,
  onSocketTypingStarted,
  onSocketTypingStopped,
  sendSocketMessage
} from "../../../services/socket.service";
import type { ChatMessage, ChatType } from "../../../types/domain";
import { getApiErrorMessage } from "../../../utils/api-error";
import { formatWalletAddress } from "../../../utils/wallet";
import { useAuth } from "../../../hooks/use-auth";
import { storageService } from "../../../services/storage.service";
import { chatKeys, useChatMessages, useSendChatMessage } from "../hooks/use-chat";

interface ChatPanelProps {
  chatType: ChatType;
  referenceId: string;
  readOnly?: boolean;
  readOnlyMessage?: string;
  readOnlyAction?: ReactNode;
}

export function ChatPanel({
  chatType,
  readOnly = false,
  readOnlyAction,
  readOnlyMessage,
  referenceId
}: ChatPanelProps): JSX.Element {
  const room = `${chatType.toLowerCase()}:${referenceId}`;
  const { isConnected } = useSocket();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const messages = useChatMessages(chatType, referenceId);
  const sendMessage = useSendChatMessage(chatType, referenceId);
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isConnected) return;
    joinSocketRoom(room);
    return () => leaveSocketRoom(room);
  }, [isConnected, room]);

  useEffect(() => {
    const offMessage = onSocketMessageCreated((event) => {
      if (event.room !== room) return;
      queryClient.setQueriesData<ChatMessage[]>({ queryKey: chatKeys.conversation(chatType, referenceId) }, (current) =>
        current?.some((item) => item.id === event.payload.id) ? current : [...(current ?? []), event.payload]
      );
    });
    const offTyping = onSocketTypingStarted((event) => {
      if (event.room === room) setIsTyping(true);
    });
    const offStopTyping = onSocketTypingStopped((event) => {
      if (event.room === room) setIsTyping(false);
    });
    return () => {
      offMessage();
      offTyping();
      offStopTyping();
    };
  }, [chatType, isConnected, queryClient, referenceId, room]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.data?.length]);

  const handleSend = async () => {
    const normalizedMessage = message.trim();
    if ((!normalizedMessage && files.length === 0) || !user || readOnly) return;
    try {
      setIsUploading(files.length > 0);
      const attachments = await Promise.all(
        files.map(async (file) => {
          const uploaded = await storageService.uploadFile(file, "chat");

          return {
            key: uploaded.key,
            fileName: file.name,
            fileUrl: uploaded.url,
            mimeType: uploaded.contentType,
            size: uploaded.size,
            uploadedBy: user.walletAddress
          };
        })
      );
      const messageToSend = normalizedMessage || "Attachment";

      setMessage("");
      setFiles([]);
      emitStopTyping(room);

      if (isConnected) {
        sendSocketMessage(room, { chatType, referenceId, message: messageToSend, attachments }, (response) => {
          if (response.success) void messages.refetch();
        });
        return;
      }

      await sendMessage.mutateAsync({ message: messageToSend, attachments });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-950">Chat</h2>
          <p className="text-xs text-slate-500">{isConnected ? "Realtime connected" : "Realtime offline, REST fallback enabled"}</p>
        </div>
      </div>
      <div className="mt-4 max-h-80 space-y-3 overflow-y-auto rounded-lg bg-slate-50 p-3">
        {messages.isLoading && <div className="h-24 animate-pulse rounded-lg bg-white" />}
        {messages.isError && <ErrorState message={getApiErrorMessage(messages.error, "Unable to load messages.")} />}
        {messages.data?.length === 0 && <EmptyState title="No messages" description="Start the conversation for this workspace." />}
        {messages.data?.map((item) => {
          const ownMessage = item.senderWallet.toLowerCase() === user?.walletAddress.toLowerCase();
          return (
            <div key={item.id} className={`flex ${ownMessage ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${ownMessage ? "bg-indigo-600 text-white" : "bg-white text-slate-800"}`}>
                <p className="text-xs opacity-75">{formatWalletAddress(item.senderWallet)}</p>
                <p className="mt-1 whitespace-pre-wrap">{item.message}</p>
                {item.attachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {item.attachments.map((attachment) => (
                      <AttachmentDownload key={attachment.key} attachment={attachment} />
                    ))}
                  </div>
                )}
                <p className="mt-1 text-[11px] opacity-70">{new Date(item.createdAt).toLocaleString()}</p>
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>
      {isTyping && <p className="mt-2 text-xs text-slate-500">Someone is typing...</p>}
      {readOnly && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-medium text-amber-900">{readOnlyMessage ?? "This conversation is read only."}</p>
          {readOnlyAction && <div className="mt-3">{readOnlyAction}</div>}
        </div>
      )}
      {!readOnly && files.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {files.map((file) => (
            <span key={`${file.name}-${file.size}`} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
              {file.name}
              <button type="button" onClick={() => setFiles((current) => current.filter((item) => item !== file))} aria-label={`Remove ${file.name}`}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      {!readOnly && (
        <div className="mt-4 flex gap-2">
          <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-300 px-3 py-2 text-slate-600 hover:bg-slate-50">
            <Paperclip size={16} />
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(event) => {
                setFiles((current) => [...current, ...Array.from(event.target.files ?? [])]);
                event.target.value = "";
              }}
            />
          </label>
          <input
            value={message}
            onChange={(event) => {
              setMessage(event.target.value);
              emitTyping(room);
            }}
            onBlur={() => emitStopTyping(room)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void handleSend();
            }}
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            placeholder="Write a message"
          />
          <Button disabled={sendMessage.isPending || isUploading || (!message.trim() && files.length === 0)} onClick={() => void handleSend()}>
            <Send size={16} />
          </Button>
        </div>
      )}
    </section>
  );
}

function AttachmentDownload({ attachment }: { attachment: ChatMessage["attachments"][number] }): JSX.Element {
  const handleDownload = async () => {
    const result = await storageService.getSignedDownloadUrl(attachment.key);
    window.open(result.url, "_blank", "noopener,noreferrer");
  };

  return (
    <button
      type="button"
      onClick={() => void handleDownload()}
      className="inline-flex items-center gap-1 rounded bg-black/10 px-2 py-1 text-xs underline-offset-2 hover:underline"
    >
      <Download size={12} />
      {attachment.fileName}
    </button>
  );
}
