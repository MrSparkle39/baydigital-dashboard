import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { Database } from "@/integrations/supabase/types";
import { Download, ExternalLink, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { TicketMessaging } from "@/components/tickets/TicketMessaging";
import { format } from "date-fns";

type Ticket = Database["public"]["Tables"]["update_tickets"]["Row"] & {
  users: { business_name: string | null; email: string } | null;
  file_urls?: string[];
};

const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };

export default function AdminTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const [filesDialogOpen, setFilesDialogOpen] = useState(false);
  const [ticketFiles, setTicketFiles] = useState<string[]>([]);
  const [fileCountMap, setFileCountMap] = useState<Record<string, number>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [adminUserId, setAdminUserId] = useState<string | null>(null);

  // Get current admin user ID and fetch tickets
  useEffect(() => {
    const initialize = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setAdminUserId(user.id);
        // Fetch tickets after we have the user ID
        await fetchTickets(user.id);
      }
    };
    initialize();
  }, []);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!adminUserId) return;

    const channel = supabase
      .channel('tickets-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'update_tickets'
        },
        () => {
          fetchTickets(adminUserId);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_messages'
        },
        (payload) => {
          console.log('New message received:', payload.new);
          // Show notification if user replied to a ticket
          if (!payload.new.is_admin) {
            toast.info("💬 New reply from user!");
            fetchTickets(adminUserId);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ticket_message_reads',
          filter: `user_id=eq.${adminUserId}`,
        },
        (payload) => {
          // When read status changes, refetch unread count for that specific ticket
          if (payload.new && 'ticket_id' in payload.new && payload.new.ticket_id) {
            fetchUnreadCount(payload.new.ticket_id as string, adminUserId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [adminUserId]);

  const fetchTickets = async (userId: string) => {
    console.log('Fetching tickets for admin:', userId);
    const { data, error } = await supabase
      .from("update_tickets")
      .select("*, users(business_name, email)")
      .order("submitted_at", { ascending: false });

    if (!error && data) {
      console.log('Tickets fetched:', data.length);
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
      
      // Fetch unread counts for each ticket
      for (const ticket of sorted) {
        await fetchUnreadCount(ticket.id, userId);
      }
    }
    setLoading(false);
  };

  const fetchUnreadCount = async (ticketId: string, userId: string) => {
    console.log('Fetching unread count for ticket:', ticketId, 'admin:', userId);
    
    // Get last read time for this ticket by admin
    const { data: readData, error: readError } = await supabase
      .from("ticket_message_reads")
      .select("last_read_at")
      .eq("ticket_id", ticketId)
      .eq("user_id", userId)
      .maybeSingle();

    console.log('Read data:', readData, 'error:', readError);

    // Count user messages (is_admin = false) created after last read time
    const { count, error: countError } = await supabase
      .from("ticket_messages")
      .select("*", { count: 'exact', head: true })
      .eq("ticket_id", ticketId)
      .eq("is_admin", false)
      .gt("created_at", readData?.last_read_at || "1970-01-01");

    console.log('Unread count for ticket', ticketId, ':', count, 'error:', countError);

    if (count !== null && count > 0) {
      setUnreadCounts(prev => ({ ...prev, [ticketId]: count }));
    }
  };

  const getStoragePath = (filePath: string) => {
    if (!filePath) return filePath;
    if (filePath.startsWith("http")) {
      const marker = "/ticket-attachments/";
      const idx = filePath.indexOf(marker);
      if (idx !== -1) return filePath.substring(idx + marker.length);
    }
    if (filePath.startsWith("ticket-attachments/")) {
      return filePath.slice("ticket-attachments/".length);
    }
    return filePath;
  };

  const downloadFile = async (filePath: string, fileName: string) => {
    try {
      console.log("Attempting download for path:", filePath);
      const path = getStoragePath(filePath);
      console.log("Normalized path:", path);
      const { data, error } = await supabase.storage
        .from("ticket-attachments")
        .download(path);

      if (error) {
        console.error("Download error:", error);
        throw error;
      }

      const url = window.URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error("Failed to download file");
    }
};

  const loadTicketFiles = async (ticket: Ticket) => {
    try {
      if (ticket.file_urls && ticket.file_urls.length > 0) {
        setTicketFiles(ticket.file_urls);
        setFileCountMap(prev => ({ ...prev, [ticket.id]: ticket.file_urls!.length }));
        return;
      }
      if (!ticket.user_id) {
        setTicketFiles([]);
        setFileCountMap(prev => ({ ...prev, [ticket.id]: 0 }));
        return;
      }
      const prefix = `${ticket.user_id}/${ticket.id}`;
      const { data, error } = await supabase.storage
        .from('ticket-attachments')
        .list(prefix, { limit: 100 });
      if (error) {
        console.error('Error listing files:', error);
        setTicketFiles([]);
        setFileCountMap(prev => ({ ...prev, [ticket.id]: 0 }));
        return;
      }
      const paths = (data || []).map((f) => `${prefix}/${f.name}`);
      setTicketFiles(paths);
      setFileCountMap(prev => ({ ...prev, [ticket.id]: paths.length }));
    } catch (err) {
      console.error('Failed loading ticket files', err);
      setTicketFiles([]);
      setFileCountMap(prev => ({ ...prev, [ticket.id]: 0 }));
    }
  };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("update_tickets")
        .update({ status, admin_notes: adminNotes })
        .eq("id", ticketId);

      if (error) throw error;

      // Send email notification to user when status changes
      if (selectedTicket?.users?.email && (status === 'in_progress' || status === 'completed')) {
        try {
          await supabase.functions.invoke('send-email', {
            body: {
              type: 'ticket_update',
              to: selectedTicket.users.email,
              data: {
                ticketTitle: selectedTicket.title,
                status,
                adminNotes: adminNotes,
              },
            },
          });
          console.log('Email notification sent to user');
        } catch (emailError) {
          console.error('Error sending email notification:', emailError);
          // Don't fail the status update if email fails
        }
      }

      toast.success(`Ticket marked as ${status}`);
      setSelectedTicket(null);
      setAdminNotes("");
      if (adminUserId) fetchTickets(adminUserId);
    } catch (error) {
      console.error("Error updating ticket:", error);
      toast.error("Failed to update ticket");
    }
  };

  const openTicketDetails = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setAdminNotes(ticket.admin_notes || "");
    
    // Mark messages as read when admin opens ticket
    if (adminUserId) {
      try {
        await supabase
          .from("ticket_message_reads")
          .upsert({
            ticket_id: ticket.id,
            user_id: adminUserId,
            last_read_at: new Date().toISOString(),
          }, {
            onConflict: 'ticket_id,user_id'
          });
        
        // Reset unread count for this ticket
        setUnreadCounts(prev => ({ ...prev, [ticket.id]: 0 }));
      } catch (error) {
        console.error("Error marking messages as read:", error);
      }
    }
  };

  // Deep-link: open ticket by ID from query param
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ticketId = params.get('ticket');
    if (ticketId && tickets.length) {
      const ticket = tickets.find(t => t.id === ticketId);
      if (ticket) {
        openTicketDetails(ticket);
      }
    }
  }, [location.search, tickets]);

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

      {/* Files Dialog */}
      <Dialog open={filesDialogOpen} onOpenChange={(open) => { setFilesDialogOpen(open); if (!open) setTicketFiles([]); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Uploaded Files</DialogTitle>
            <DialogDescription>
              Files attached to: {selectedTicket?.title}
            </DialogDescription>
          </DialogHeader>
          {ticketFiles.length > 0 ? (
            <div className="space-y-2">
              {ticketFiles.map((url, idx) => {
                const fileName = url.split("/").pop() || `attachment-${idx + 1}`;
                return (
                  <Button
                    key={idx}
                    variant="outline"
                    onClick={() => downloadFile(url, fileName)}
                    className="w-full justify-start"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {fileName}
                  </Button>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground">No files uploaded for this ticket.</p>
          )}
        </DialogContent>
      </Dialog>

      <div className="grid gap-4">
        {tickets.map((ticket) => {
          const unreadCount = unreadCounts[ticket.id] || 0;
          const hasUnread = unreadCount > 0;
          
          return (
            <Card
              key={ticket.id}
              className={`hover:shadow-md transition-shadow cursor-pointer ${
                ticket.status === "open" && ticket.priority === "urgent"
                  ? "border-destructive"
                  : ""
              } ${hasUnread ? "ring-2 ring-destructive/50" : ""}`}
              onClick={() => openTicketDetails(ticket)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {ticket.title}
                    <ExternalLink className="h-4 w-4" />
                    {hasUnread && (
                      <Badge variant="destructive" className="animate-pulse">
                        <MessageCircle className="h-3 w-3 mr-1" />
                        {unreadCount} new
                      </Badge>
                    )}
                  </CardTitle>
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
                <p className="text-sm text-muted-foreground">{ticket.description}</p>

                <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
                  <div>
                    <p>From: {ticket.users?.business_name || ticket.users?.email}</p>
                    <p>Submitted: {format(new Date(ticket.submitted_at!), "dd/MM/yyyy HH:mm")}</p>
                    {hasUnread && (
                      <p className="text-destructive font-semibold mt-1">• New replies from user!</p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                      onClick={async (e) => {
                        e.stopPropagation();
                        setSelectedTicket(ticket);
                        await loadTicketFiles(ticket);
                        setFilesDialogOpen(true);
                      }}
                  >
                    Uploaded Files ({fileCountMap[ticket.id] ?? ticket.file_urls?.length ?? 0})
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Ticket Details Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTicket?.title}
              <Badge
                variant={
                  selectedTicket?.priority === "urgent" || selectedTicket?.priority === "high"
                    ? "destructive"
                    : "secondary"
                }
              >
                {selectedTicket?.priority}
              </Badge>
              <Badge variant={selectedTicket?.status === "open" ? "default" : "outline"}>
                {selectedTicket?.status}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              From: {selectedTicket?.users?.business_name || selectedTicket?.users?.email} | 
              Submitted: {selectedTicket?.submitted_at && format(new Date(selectedTicket.submitted_at), "dd/MM/yyyy HH:mm")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Description */}
            <div>
              <h4 className="font-semibold mb-2">Description</h4>
              <p className="text-sm whitespace-pre-wrap">{selectedTicket?.description}</p>
            </div>

            {/* Attachments */}
            {selectedTicket?.file_urls && selectedTicket.file_urls.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Attachments ({selectedTicket.file_urls.length})</h4>
                <div className="space-y-2">
                  {selectedTicket.file_urls.map((url, idx) => {
                    const fileName = url.split("/").pop() || `attachment-${idx + 1}`;
                    return (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadFile(url, fileName);
                        }}
                        className="w-full justify-start"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {fileName}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Messaging Thread */}
            {selectedTicket && (
              <TicketMessaging 
                ticketId={selectedTicket.id}
                ticketTitle={selectedTicket.title}
                ticketUserEmail={selectedTicket.users?.email}
                isAdmin={true}
              />
            )}

            {/* Files Button */}
            <div>
              <Button
                variant="outline"
                onClick={async () => { if (selectedTicket) { await loadTicketFiles(selectedTicket); } setFilesDialogOpen(true); }}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                View Uploaded Files ({selectedTicket ? (fileCountMap[selectedTicket.id] ?? selectedTicket.file_urls?.length ?? 0) : 0})
              </Button>
            </div>

            {/* Admin Notes */}
            <div>
              <h4 className="font-semibold mb-2">Admin Notes (Internal)</h4>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add internal notes about this ticket (not visible to users)..."
                rows={4}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-between">
              <Button
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/admin/users/${selectedTicket?.user_id}`);
                }}
              >
                View User Profile
              </Button>
              <div className="flex gap-2">
                {selectedTicket?.status === "open" && (
                  <Button
                    variant="secondary"
                    onClick={() => updateTicketStatus(selectedTicket.id, "in_progress")}
                  >
                    Mark In Progress
                  </Button>
                )}
                {selectedTicket?.status !== "completed" && (
                  <Button
                    onClick={() => updateTicketStatus(selectedTicket!.id, "completed")}
                  >
                    Mark Completed
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
