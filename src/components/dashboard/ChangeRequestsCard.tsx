import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Clock, CheckCircle, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { ChangeRequestModal } from "./ChangeRequestModal";
import { TicketDetailDialog } from "./TicketDetailDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";

interface UpdateTicket {
  id: string;
  title: string;
  description: string;
  status: string;
  submitted_at: string;
  priority?: string;
  file_urls?: string[];
  last_message_at?: string;
}

export const ChangeRequestsCard = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<UpdateTicket | null>(null);
  const [tickets, setTickets] = useState<UpdateTicket[]>([]);
  const [ticketsRemaining, setTicketsRemaining] = useState<number | null>(null);
  const [messageCounts, setMessageCounts] = useState<Record<string, number>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchTickets();
      fetchTicketsRemaining();
    }
  }, [user]);

  // Subscribe to realtime updates for new messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('ticket-messages-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_messages',
        },
        (payload) => {
          // Refetch tickets to get updated counts
          fetchTickets();
          
          // Show toast notification if message is for one of user's tickets
          const ticketIds = tickets.map(t => t.id);
          if (ticketIds.includes(payload.new.ticket_id)) {
            toast.info("💬 New message received on your ticket!");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, tickets]);

  const fetchTickets = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("update_tickets")
      .select("id, title, description, status, submitted_at, priority, file_urls, last_message_at")
      .eq("user_id", user.id)
      .order("submitted_at", { ascending: false })
      .limit(5);

    if (!error && data) {
      setTickets(data);
      // Fetch message counts and unread counts for each ticket
      data.forEach(ticket => {
        fetchMessageCount(ticket.id);
        fetchUnreadCount(ticket.id);
      });
    }
  };

  const fetchMessageCount = async (ticketId: string) => {
    const { count, error } = await supabase
      .from("ticket_messages")
      .select("*", { count: 'exact', head: true })
      .eq("ticket_id", ticketId);

    if (!error && count !== null) {
      setMessageCounts(prev => ({ ...prev, [ticketId]: count }));
    }
  };

  const fetchUnreadCount = async (ticketId: string) => {
    if (!user) return;

    // Get last read time for this ticket
    const { data: readData } = await supabase
      .from("ticket_message_reads")
      .select("last_read_at")
      .eq("ticket_id", ticketId)
      .eq("user_id", user.id)
      .single();

    // CRITICAL FIX: Only count messages from OTHER people (not current user)
    // This prevents users from seeing notifications for their own messages
    const { count } = await supabase
      .from("ticket_messages")
      .select("*", { count: 'exact', head: true })
      .eq("ticket_id", ticketId)
      .neq("user_id", user.id)  // ⬅️ KEY FIX: Exclude own messages
      .gt("created_at", readData?.last_read_at || "1970-01-01");

    if (count !== null) {
      setUnreadCounts(prev => ({ ...prev, [ticketId]: count }));
    }
  };

  // Optimistically clear unread and persist read state
  const markTicketAsRead = async (ticketId: string) => {
    if (!user) return;
    setUnreadCounts(prev => ({ ...prev, [ticketId]: 0 }));
    try {
      await supabase
        .from('ticket_message_reads')
        .upsert(
          { ticket_id: ticketId, user_id: user.id, last_read_at: new Date().toISOString() },
          { onConflict: 'ticket_id,user_id' }
        );
    } catch (e) {
      console.error('Failed to mark ticket as read', e);
    }
  };

  // Allow deep-linking to a ticket via ?ticket=<id>
  const openTicketById = async (ticketId: string) => {
    const existing = tickets.find(t => t.id === ticketId);
    if (existing) {
      await markTicketAsRead(ticketId);
      setSelectedTicket(existing);
      return;
    }
    const { data } = await supabase
      .from('update_tickets')
      .select('id, title, description, status, submitted_at, priority, file_urls, last_message_at')
      .eq('user_id', user?.id || '')
      .eq('id', ticketId)
      .maybeSingle();
    if (data) {
      await markTicketAsRead(ticketId);
      setSelectedTicket(data as UpdateTicket);
      setTickets(prev => [data as UpdateTicket, ...prev.filter(t => t.id !== ticketId)]);
    }
  };

  // Handle ticket param and clear it after opening
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ticketParam = params.get('ticket');
    if (user && ticketParam) {
      openTicketById(ticketParam);
      const url = new URL(window.location.href);
      url.searchParams.delete('ticket');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  }, [user, tickets.length]);

  const fetchTicketsRemaining = async () => {
    if (!user) return;

    const { data: userData, error } = await supabase
      .from("users")
      .select("plan, tickets_used_this_period")
      .eq("id", user.id)
      .single();

    if (error || !userData) return;

    const ticketLimit = userData.plan === "professional" || userData.plan === "premium" ? 5 : 2;
    const remaining = ticketLimit - (userData.tickets_used_this_period || 0);
    setTicketsRemaining(remaining);
  };

  const handleTicketCreated = () => {
    fetchTickets();
    fetchTicketsRemaining();
  };

  const statusIcons = {
    open: <Clock className="h-3 w-3" />,
    in_progress: <Clock className="h-3 w-3" />,
    completed: <CheckCircle className="h-3 w-3" />,
    closed: <CheckCircle className="h-3 w-3" />,
  };

  const statusLabels = {
    open: "Open",
    in_progress: "In Progress",
    completed: "Completed",
    closed: "Closed",
  };

  return (
    <>
      <Card className="hover:shadow-md transition-all">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Request Changes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Need to update your site?
            {ticketsRemaining !== null && (
              <span className="block mt-1 font-medium text-foreground">
                {ticketsRemaining} {ticketsRemaining === 1 ? "ticket" : "tickets"} remaining this month
              </span>
            )}
          </div>

          <Button
            className="w-full bg-gradient-to-r from-primary to-primary-dark"
            onClick={() => setModalOpen(true)}
            disabled={ticketsRemaining !== null && ticketsRemaining <= 0}
          >
            Request Site Update →
          </Button>

          {tickets.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Your Requests</div>
                <div className="text-xs text-muted-foreground">
                  Click to view & message
                </div>
              </div>
              {tickets.map((ticket) => {
                const messageCount = messageCounts[ticket.id] || 0;
                const unreadCount = unreadCounts[ticket.id] || 0;
                const isActive = ticket.status === "open" || ticket.status === "in_progress";
                const hasUnread = unreadCount > 0;
                
                return (
                  <div
                    key={ticket.id}
                    className={`
                      flex items-center justify-between p-3 rounded-lg 
                      cursor-pointer transition-all
                      ${isActive 
                        ? 'bg-primary/10 hover:bg-primary/20 border border-primary/30' 
                        : 'bg-muted/50 hover:bg-muted border border-transparent'}
                      ${hasUnread ? 'ring-2 ring-destructive/50' : ''}
                    `}
                    onClick={() => { markTicketAsRead(ticket.id); setSelectedTicket(ticket); }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate">
                          {ticket.title.length > 35 ? ticket.title.substring(0, 35) + '...' : ticket.title}
                        </p>
                        {hasUnread && (
                          <div className="flex items-center gap-1 text-xs bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full animate-pulse">
                            <MessageCircle className="h-3 w-3" />
                            {unreadCount} new
                          </div>
                        )}
                        {messageCount > 0 && !hasUnread && (
                          <div className="flex items-center gap-1 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                            <MessageCircle className="h-3 w-3" />
                            {messageCount}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(ticket.submitted_at), "dd/MM/yyyy")}
                        {hasUnread && <span className="ml-2 text-destructive font-semibold">• New Message!</span>}
                      </p>
                    </div>
                    <Badge
                      variant={isActive ? "default" : "secondary"}
                      className="ml-2 flex items-center gap-1"
                    >
                      {statusIcons[ticket.status as keyof typeof statusIcons]}
                      {statusLabels[ticket.status as keyof typeof statusLabels]}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}

          {tickets.length === 0 && (
            <div className="text-center py-6 text-sm text-muted-foreground">
              No requests yet. Click above to submit your first update request!
            </div>
          )}
        </CardContent>
      </Card>

      <ChangeRequestModal 
        open={modalOpen} 
        onOpenChange={setModalOpen}
        onTicketCreated={handleTicketCreated}
      />

      <TicketDetailDialog
        ticket={selectedTicket}
        open={!!selectedTicket}
        onOpenChange={(open) => !open && setSelectedTicket(null)}
        onClose={() => {
          // Refetch unread counts when dialog closes
          if (selectedTicket) {
            fetchUnreadCount(selectedTicket.id);
          }
        }}
      />
    </>
  );
};