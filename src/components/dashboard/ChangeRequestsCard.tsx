import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Clock, CheckCircle, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { ChangeRequestModal } from "./ChangeRequestModal";
import { TicketDetailDialog } from "./TicketDetailDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface UpdateTicket {
  id: string;
  title: string;
  description: string;
  status: string;
  submitted_at: string;
  priority?: string;
  file_urls?: string[];
}

export const ChangeRequestsCard = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<UpdateTicket | null>(null);
  const [tickets, setTickets] = useState<UpdateTicket[]>([]);
  const [ticketsRemaining, setTicketsRemaining] = useState<number | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchTickets();
      fetchTicketsRemaining();
    }
  }, [user]);

  const fetchTickets = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("update_tickets")
      .select("id, title, description, status, submitted_at, priority, file_urls")
      .eq("user_id", user.id)
      .order("submitted_at", { ascending: false })
      .limit(2);

    if (!error && data) {
      setTickets(data);
    }
  };

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
              <div className="text-sm font-medium">Recent Requests</div>
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => setSelectedTicket(ticket)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate flex items-center gap-1">
                      {ticket.title.substring(0, 30)}...
                      <ExternalLink className="h-3 w-3" />
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(ticket.submitted_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge
                    variant={ticket.status === "completed" || ticket.status === "closed" ? "default" : "secondary"}
                    className="ml-2 flex items-center gap-1"
                  >
                    {statusIcons[ticket.status as keyof typeof statusIcons]}
                    {ticket.status === "in_progress" ? "In Progress" : 
                     ticket.status === "completed" ? "Completed" :
                     ticket.status === "closed" ? "Closed" : "Open"}
                  </Badge>
                </div>
              ))}
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
      />
    </>
  );
};
