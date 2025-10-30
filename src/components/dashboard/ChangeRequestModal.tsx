import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Paperclip, X } from "lucide-react";

interface ChangeRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTicketCreated?: () => void;
}

export const ChangeRequestModal = ({ open, onOpenChange, onTicketCreated }: ChangeRequestModalProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [ticketsRemaining, setTicketsRemaining] = useState<number | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB in bytes

  useEffect(() => {
    if (open && user) {
      fetchTicketsRemaining();
    }
    // Reset form when dialog closes
    if (!open) {
      setTitle("");
      setDescription("");
      setFiles([]);
    }
  }, [open, user]);

  const fetchTicketsRemaining = async () => {
    if (!user) return;

    const { data: userData, error } = await supabase
      .from("users")
      .select("plan, tickets_used_this_period")
      .eq("id", user.id)
      .single();

    if (error || !userData) {
      console.error("Error fetching ticket data:", error);
      return;
    }

    const ticketLimit = userData.plan === "professional" || userData.plan === "premium" ? 5 : 2;
    const remaining = ticketLimit - (userData.tickets_used_this_period || 0);
    setTicketsRemaining(remaining);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    // Check file sizes
    const oversizedFiles = selectedFiles.filter(file => file.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      toast({
        title: "File too large",
        description: `Some files exceed the 100MB limit: ${oversizedFiles.map(f => f.name).join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (ticketId: string): Promise<string[]> => {
    if (files.length === 0 || !user) return [];

    const uploadedPaths: string[] = [];
    setUploadProgress(true);

    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${ticketId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from('ticket-attachments')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          console.error("Error uploading file:", error);
          toast({
            title: "Upload Error",
            description: `Failed to upload ${file.name}`,
            variant: "destructive",
          });
          continue;
        }

        // Store just the path
        uploadedPaths.push(data.path);
      }
    } finally {
      setUploadProgress(false);
    }

    return uploadedPaths;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim()) {
      toast({
        title: "Error",
        description: "Please provide both a title and description for your update request.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to submit a request.",
        variant: "destructive",
      });
      return;
    }

    if (ticketsRemaining !== null && ticketsRemaining <= 0) {
      toast({
        title: "Ticket Limit Reached",
        description: "You've used all your update tickets for this billing period.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Check if user can create ticket (handles monthly reset)
      const { data: canCreate, error: checkError } = await supabase.rpc(
        "can_create_ticket",
        { user_id: user.id }
      );

      if (checkError) throw checkError;

      if (!canCreate) {
        toast({
          title: "Ticket Limit Reached",
          description: "You've used all your update tickets for this billing period.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Step 1: Create the ticket WITHOUT file_urls first
      const { data: newTicket, error: insertError } = await supabase
        .from("update_tickets")
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim(),
          status: "open",
          priority: "normal",
        })
        .select("id")
        .single();

      if (insertError || !newTicket) {
        throw insertError || new Error("Failed to create ticket");
      }

      console.log("Ticket created with ID:", newTicket.id);

      // Step 2: Upload files if any exist
      let fileUrls: string[] = [];
      if (files.length > 0) {
        console.log(`Uploading ${files.length} files...`);
        fileUrls = await uploadFiles(newTicket.id);
        console.log("Files uploaded, paths:", fileUrls);

        // Step 3: Update the ticket with file URLs
        if (fileUrls.length > 0) {
          const { error: updateError } = await supabase
            .from("update_tickets")
            .update({ file_urls: fileUrls })
            .eq("id", newTicket.id);

          if (updateError) {
            console.error("Error updating ticket with file URLs:", updateError);
            // Don't throw here - ticket was created successfully, just log the error
            toast({
              title: "Partial Success",
              description: "Ticket created but there was an issue saving file attachments. Please contact support.",
              variant: "destructive",
            });
          } else {
            console.log("Ticket updated with file URLs successfully");
          }
        }
      }

      // Step 4: Increment tickets used counter
      const { data: currentUser, error: fetchError } = await supabase
        .from("users")
        .select("tickets_used_this_period, email, business_name")
        .eq("id", user.id)
        .single();

      if (fetchError) throw fetchError;

      const { error: incrementError } = await supabase
        .from("users")
        .update({ tickets_used_this_period: (currentUser.tickets_used_this_period || 0) + 1 })
        .eq("id", user.id);

      if (incrementError) throw incrementError;

      // Step 5: Send email notifications
      try {
        // Send confirmation email to user
        await supabase.functions.invoke('send-email', {
          body: {
            type: 'ticket_confirmation',
            to: currentUser.email,
            data: {
              ticketTitle: title.trim(),
              ticketId: newTicket.id,
            },
          },
        });

        // Send notification email to admin
        await supabase.functions.invoke('send-email', {
          body: {
            type: 'admin_notification',
            to: 'support@bay.digital',
            data: {
              ticketTitle: title.trim(),
              ticketDescription: description.trim(),
              userName: currentUser.business_name || 'N/A',
              userEmail: currentUser.email,
              ticketId: newTicket.id,
              priority: 'normal',
            },
          },
        });

        console.log('Email notifications sent successfully');
      } catch (emailError) {
        console.error('Error sending email notifications:', emailError);
        // Don't fail the ticket creation if email fails
      }

      toast({
        title: "Success",
        description: `Your update request has been submitted successfully${fileUrls.length > 0 ? ` with ${fileUrls.length} file(s)` : ""}.`,
      });

      // Reset form
      setTitle("");
      setDescription("");
      setFiles([]);
      onOpenChange(false);
      onTicketCreated?.();
    } catch (error) {
      console.error("Error submitting update ticket:", error);
      toast({
        title: "Error",
        description: "Failed to submit your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Site Update</DialogTitle>
          <DialogDescription>
            Tell us what you'd like changed on your website
            {ticketsRemaining !== null && (
              <span className="block mt-2 font-medium text-foreground">
                {ticketsRemaining} {ticketsRemaining === 1 ? "ticket" : "tickets"} remaining this month
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Brief summary of the update..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">What would you like changed?</Label>
            <Textarea
              id="description"
              placeholder="Describe the changes you'd like to make..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="resize-none break-words"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="file-upload">Upload files (optional)</Label>
            <div className="space-y-2">
              <label htmlFor="file-upload" className="flex flex-col items-center justify-center border-2 border-dashed border-input rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                <Paperclip className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Drop files or click to upload
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Max 100MB per file
                </p>
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.txt"
                />
              </label>
              
              {files.length > 0 && (
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm truncate" title={file.name}>{file.name}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap">
                          ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="flex-shrink-0 h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-primary to-primary-dark"
              disabled={loading || uploadProgress || (ticketsRemaining !== null && ticketsRemaining <= 0)}
            >
              {uploadProgress ? "Uploading files..." : loading ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
