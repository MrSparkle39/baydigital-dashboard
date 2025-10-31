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
  ticketTitle: string;
  ticketUserEmail?: string;
  isAdmin?: boolean;
}

export const TicketMessaging = ({ ticketId, ticketTitle, ticketUserEmail, isAdmin = false }: TicketMessagingProps) => {
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
      // Save message to database - trigger will handle email notification
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

  // Mark messages as read when component loads or messages change
  useEffect(() => {
    const markAsRead = async () => {
      if (!user || messages.length === 0) return;

      try {
        await supabase
          .from("ticket_message_reads")
          .upsert({
            ticket_id: ticketId,
            user_id: user.id,
            last_read_at: new Date().toISOString(),
          }, {
            onConflict: 'ticket_id,user_id'
          });
      } catch (error) {
        console.error("Error marking messages as read:", error);
      }
    };

    markAsRead();
  }, [ticketId, user, messages.length]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">Messages</h4>
        <span className="text-xs text-muted-foreground">
          {messages.length} {messages.length === 1 ? 'message' : 'messages'}
        </span>
      </div>
      
      {/* Messages Thread */}
      <div className="border rounded-lg p-4 space-y-3 max-h-[400px] overflow-y-auto bg-muted/20">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground mb-2">
              💬 No messages yet
            </p>
            <p className="text-xs text-muted-foreground">
              {isAdmin ? "Send a message to the user below" : "Ask questions or provide additional details below"}
            </p>
          </div>
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
      <div className="space-y-2">
        <Textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isAdmin ? "Reply to the user..." : "Ask a question or provide more details..."}
          rows={3}
          className="w-full"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Press Enter to send, Shift+Enter for new line
          </span>
          <Button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            size="sm"
          >
            <Send className="h-4 w-4 mr-2" />
            {sending ? "Sending..." : "Send Message"}
          </Button>
        </div>
      </div>
    </div>
  );
};