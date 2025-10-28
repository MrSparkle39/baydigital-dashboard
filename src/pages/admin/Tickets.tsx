import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Database } from "@/integrations/supabase/types";

type Ticket = Database["public"]["Tables"]["update_tickets"]["Row"] & {
  users: { business_name: string | null; email: string } | null;
  file_urls?: string[];
};

const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };

export default function AdminTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    const { data, error } = await supabase
      .from("update_tickets")
      .select("*, users(business_name, email)")
      .order("submitted_at", { ascending: false });

    if (!error && data) {
      // Sort by priority and status
      const sorted = data.sort((a, b) => {
        if (a.status === "open" && b.status !== "open") return -1;
        if (a.status !== "open" && b.status === "open") return 1;
        return (
          priorityOrder[a.priority as keyof typeof priorityOrder] -
          priorityOrder[b.priority as keyof typeof priorityOrder]
        );
      });
      setTickets(sorted as Ticket[]);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Support Tickets</h2>
        <div className="text-sm text-muted-foreground">
          {tickets.filter((t) => t.status === "open").length} open tickets
        </div>
      </div>

      <div className="grid gap-4">
        {tickets.map((ticket) => (
          <Card
            key={ticket.id}
            className={`hover:shadow-md transition-shadow ${
              ticket.status === "open" && ticket.priority === "urgent"
                ? "border-destructive"
                : ""
            }`}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{ticket.title}</CardTitle>
                <div className="flex gap-2">
                  <Badge
                    variant={
                      ticket.priority === "urgent" || ticket.priority === "high"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {ticket.priority}
                  </Badge>
                  <Badge variant={ticket.status === "open" ? "default" : "outline"}>
                    {ticket.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-4">{ticket.description}</p>
              
              {ticket.file_urls && ticket.file_urls.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium mb-2">Attachments:</p>
                  <div className="space-y-1">
                    {ticket.file_urls.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline block"
                      >
                        📎 Attachment {idx + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  <p>
                    From: {ticket.users?.business_name || ticket.users?.email}
                  </p>
                  <p>
                    Submitted: {new Date(ticket.submitted_at!).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/admin/users/${ticket.user_id}`)}
                >
                  View User
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
