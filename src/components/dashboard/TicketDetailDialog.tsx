import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TicketMessaging } from "@/components/tickets/TicketMessaging";

interface UpdateTicket {
  id: string;
  title: string;
  description: string;
  status: string;
  submitted_at: string;
  priority?: string;
  file_urls?: string[];
}

interface TicketDetailDialogProps {
  ticket: UpdateTicket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TicketDetailDialog = ({ ticket, open, onOpenChange }: TicketDetailDialogProps) => {
  if (!ticket) return null;

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
      const path = getStoragePath(filePath);
      const { data, error } = await supabase.storage
        .from("ticket-attachments")
        .download(path);

      if (error) throw error;

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {ticket.title}
            {ticket.priority && (
              <Badge
                variant={
                  ticket.priority === "urgent" || ticket.priority === "high"
                    ? "destructive"
                    : "secondary"
                }
              >
                {ticket.priority}
              </Badge>
            )}
            <Badge variant={ticket.status === "open" ? "default" : "outline"}>
              {ticket.status === "in_progress" ? "In Progress" :
               ticket.status === "completed" ? "Completed" :
               ticket.status === "closed" ? "Closed" : "Open"}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Submitted: {new Date(ticket.submitted_at).toLocaleString()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Description */}
          <div>
            <h4 className="font-semibold mb-2">Description</h4>
            <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
          </div>

          {/* Attachments */}
          {ticket.file_urls && ticket.file_urls.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Attachments ({ticket.file_urls.length})</h4>
              <div className="space-y-2">
                {ticket.file_urls.map((url, idx) => {
                  const fileName = url.split("/").pop() || `attachment-${idx + 1}`;
                  return (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      onClick={() => downloadFile(url, fileName)}
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
          <TicketMessaging 
            ticketId={ticket.id}
            ticketTitle={ticket.title}
            isAdmin={false}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
