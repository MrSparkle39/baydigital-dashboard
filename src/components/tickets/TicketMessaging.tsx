import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Database } from "@/integrations/supabase/types";

type TicketMessage = Database["public"]["Tables"]["ticket_messages"]["Row"] & {
  users: { business_name: string | null; full_name: string | null; email: string } | null;
};

interface TicketMessagingProps {
  ticketId: string;
  isAdmin?: boolean;
}

export const TicketMessaging = ({ ticketId, isAdmin = false }: TicketMessagingProps) => {
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`ticket-messages-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ticket_messages',
          filter: `ticket_id=eq.${ticketId}`
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from("ticket_messages")
      .select("*, users(business_name, full_name, email)")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setMessages(data as TicketMessage[]);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from("ticket_messages")
        .insert({
          ticket_id: ticketId,
          user_id: user.id,
          message: newMessage.trim(),
          is_admin: isAdmin,
        });

      if (error) throw error;

      setNewMessage("");
      toast.success("Message sent");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="font-semibold">Conversation</h4>
      
      {/* Messages Thread */}
      <div className="border rounded-lg p-4 space-y-3 max-h-[400px] overflow-y-auto bg-muted/20">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No messages yet. Start the conversation!
          </p>
        ) : (
          messages.map((message) => {
            const isAdminMessage = message.is_admin;
            const senderName = message.users?.business_name || 
                             message.users?.full_name || 
                             message.users?.email || 
                             "Unknown";
            
            return (
              <div
                key={message.id}
                className={`flex ${isAdminMessage ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    isAdminMessage
                      ? "bg-primary text-primary-foreground ml-4"
                      : "bg-background border mr-4"
                  }`}
                >
                  <div className={`text-xs font-semibold mb-1 ${
                    isAdminMessage ? "text-primary-foreground/80" : "text-muted-foreground"
                  }`}>
                    {isAdminMessage ? "Bay Digital Team" : senderName}
                  </div>
                  <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
                  <div className={`text-xs mt-1 ${
                    isAdminMessage ? "text-primary-foreground/60" : "text-muted-foreground"
                  }`}>
                    {new Date(message.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="flex gap-2">
        <Textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
          rows={3}
          className="flex-1"
        />
        <Button
          onClick={sendMessage}
          disabled={!newMessage.trim() || sending}
          className="self-end"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
