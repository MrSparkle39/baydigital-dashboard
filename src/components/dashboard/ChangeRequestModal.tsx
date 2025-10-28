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
import { Paperclip } from "lucide-react";

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
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (open && user) {
      fetchTicketsRemaining();
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

    const ticketLimit = userData.plan === "premium" ? 5 : 2;
    const remaining = ticketLimit - (userData.tickets_used_this_period || 0);
    setTicketsRemaining(remaining);
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

      // Create the ticket
      const { error: insertError } = await supabase.from("update_tickets").insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim(),
        status: "open",
        priority: "normal",
      });

      if (insertError) throw insertError;

      // Increment tickets used
      const { data: currentUser, error: fetchError } = await supabase
        .from("users")
        .select("tickets_used_this_period")
        .eq("id", user.id)
        .single();

      if (fetchError) throw fetchError;

      const { error: incrementError } = await supabase
        .from("users")
        .update({ tickets_used_this_period: (currentUser.tickets_used_this_period || 0) + 1 })
        .eq("id", user.id);

      if (incrementError) throw incrementError;

      toast({
        title: "Success",
        description: "Your update request has been submitted successfully.",
      });

      setTitle("");
      setDescription("");
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
      <DialogContent className="sm:max-w-[500px]">
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
              className="resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label>Upload files (optional)</Label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
              <Paperclip className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Drop files or click to upload
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Coming soon
              </p>
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
              disabled={loading || (ticketsRemaining !== null && ticketsRemaining <= 0)}
            >
              {loading ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
