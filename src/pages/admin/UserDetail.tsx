import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Save, Download } from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import { AnalyticsViewer } from "@/components/admin/AnalyticsViewer";
import { UserSitesManager } from "@/components/admin/UserSitesManager";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

type User = Database["public"]["Tables"]["users"]["Row"];
type Ticket = Database["public"]["Tables"]["update_tickets"]["Row"] & {
  file_urls?: string[];
};

export default function AdminUserDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [ga4PropertyId, setGa4PropertyId] = useState("");
  const [websiteStatus, setWebsiteStatus] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  useEffect(() => {
    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  const fetchUserData = async () => {
    const [userResult, ticketsResult] = await Promise.all([
      supabase.from("users").select("*").eq("id", userId!).single(),
      supabase.from("update_tickets").select("*").eq("user_id", userId!).order("submitted_at", { ascending: false }),
    ]);

    if (userResult.data) {
      setUser(userResult.data);
      setGa4PropertyId(userResult.data.ga4_property_id || "");
      setWebsiteStatus(userResult.data.website_status || "pending");
      setWebsiteUrl(userResult.data.website_url || "");
    }
    if (ticketsResult.data) setTickets(ticketsResult.data);
    setLoading(false);
  };

  const saveGa4PropertyId = async () => {
    const { error } = await supabase
      .from("users")
      .update({ ga4_property_id: ga4PropertyId })
      .eq("id", userId!);

    if (error) {
      toast.error("Failed to update GA4 property ID");
    } else {
      toast.success("GA4 property ID updated successfully");
      fetchUserData();
    }
  };

  const saveWebsiteDetails = async () => {
    const { error } = await supabase
      .from("users")
      .update({ 
        website_status: websiteStatus,
        website_url: websiteUrl 
      })
      .eq("id", userId!);

    if (error) {
      console.error("Website update error:", error);
      toast.error(`Failed to update website details: ${error.message}`);
    } else {
      toast.success("Website details updated successfully");
      fetchUserData();
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

  const updateTicketStatus = async (ticketId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("update_tickets")
        .update({ status, admin_notes: adminNotes })
        .eq("id", ticketId);

      if (error) throw error;

      toast.success(`Ticket marked as ${status}`);
      setSelectedTicket(null);
      setAdminNotes("");
      fetchUserData();
    } catch (error) {
      console.error("Error updating ticket:", error);
      toast.error("Failed to update ticket");
    }
  };

  const openTicketDetails = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setAdminNotes(ticket.admin_notes || "");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <div>User not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/users")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold">
            {user.business_name || user.full_name || user.email}
          </h2>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sites">Sites</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="tickets">Tickets ({tickets.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Plan</Label>
                  <Badge className="mt-1">{user.plan}</Badge>
                </div>
                <div>
                  <Label>Subscription Status</Label>
                  <Badge variant={user.subscription_status === "active" ? "default" : "outline"} className="mt-1">
                    {user.subscription_status || "pending"}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <Label>Website Status</Label>
                  <div className="flex gap-2 mt-1">
                    <Select value={websiteStatus} onValueChange={setWebsiteStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="building">Building</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="live">Live</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Stripe Customer ID</Label>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {user.stripe_customer_id || "Not set"}
                  </p>
                </div>
              </div>

              <div>
                <Label>Website URL</Label>
                <div className="flex gap-2 mt-1">
                  <Input 
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="e.g., https://yoursite.com or https://yoursite.bay.digital"
                  />
                  {websiteUrl && (
                    <Button
                      variant="outline"
                      onClick={() => window.open(websiteUrl, "_blank")}
                    >
                      Visit
                    </Button>
                  )}
                </div>
              </div>

              <Button onClick={saveWebsiteDetails} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Save Website Details
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Business Name</Label>
                  <p className="mt-1">{user.business_name || "Not set"}</p>
                </div>
                <div>
                  <Label>Industry</Label>
                  <p className="mt-1">{user.industry || "Not set"}</p>
                </div>
                <div>
                  <Label>Location</Label>
                  <p className="mt-1">{user.location || "Not set"}</p>
                </div>
                <div>
                  <Label>Phone</Label>
                  <p className="mt-1">{user.business_phone || "Not set"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sites" className="space-y-4">
          <UserSitesManager userId={userId!} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Google Analytics 4 Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="ga4PropertyId">GA4 Property ID</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="ga4PropertyId"
                    value={ga4PropertyId}
                    onChange={(e) => setGa4PropertyId(e.target.value)}
                    placeholder="e.g., 123456789"
                  />
                  <Button onClick={saveGa4PropertyId}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Enter the GA4 property ID for this user's website. Once set, analytics will automatically appear in their dashboard.
                </p>
              </div>
              {user.ga4_property_id && (
                <div className="p-4 bg-success/10 border border-success rounded-md">
                  <p className="text-sm text-success font-medium">
                    ✓ GA4 configured - Analytics will be visible in user's dashboard
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {user.ga4_property_id && (user.plan === 'professional' || user.plan === 'premium') && (
            <AnalyticsViewer 
              propertyId={user.ga4_property_id} 
              userName={user.business_name || user.full_name || 'this user'}
            />
          )}
        </TabsContent>

        <TabsContent value="tickets" className="space-y-4">
          {tickets.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No tickets found
              </CardContent>
            </Card>
          ) : (
            tickets.map((ticket) => (
              <Card
                key={ticket.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => openTicketDetails(ticket)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{ticket.title}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={ticket.priority === "urgent" || ticket.priority === "high" ? "destructive" : "secondary"}>
                        {ticket.priority}
                      </Badge>
                      <Badge variant={ticket.status === "open" ? "default" : "outline"}>{ticket.status}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{ticket.description}</p>

                  {ticket.file_urls && ticket.file_urls.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {ticket.file_urls.map((url, idx) => {
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
                            className="justify-start"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            {fileName}
                          </Button>
                        );
                      })}
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                    <span>Submitted: {format(new Date(ticket.submitted_at!), "dd/MM/yyyy HH:mm")}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}

          {/* Ticket Details Dialog */}
          <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedTicket?.title}
                  <Badge variant={selectedTicket?.priority === "urgent" || selectedTicket?.priority === "high" ? "destructive" : "secondary"}>
                    {selectedTicket?.priority}
                  </Badge>
                  <Badge variant={selectedTicket?.status === "open" ? "default" : "outline"}>
                    {selectedTicket?.status}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  Submitted: {selectedTicket?.submitted_at && format(new Date(selectedTicket.submitted_at), "dd/MM/yyyy HH:mm")}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">Description</h4>
                  <p className="text-sm whitespace-pre-wrap">{selectedTicket?.description}</p>
                </div>

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

                <div>
                  <h4 className="font-semibold mb-2">Admin Notes</h4>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add internal notes about this ticket..."
                    rows={4}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  {selectedTicket?.status === "open" && (
                    <Button variant="secondary" onClick={() => updateTicketStatus(selectedTicket.id, "in_progress")}>
                      Mark In Progress
                    </Button>
                  )}
                  {selectedTicket?.status !== "resolved" && (
                    <Button onClick={() => updateTicketStatus(selectedTicket!.id, "resolved")}>
                      Mark Resolved
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
