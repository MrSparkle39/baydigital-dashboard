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

  const downloadFile = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("ticket-attachments")
        .download(filePath);

      if (error) throw error;

      // Create a download link
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
              <Card key={ticket.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{ticket.title}</CardTitle>
                    <Badge>{ticket.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{ticket.description}</p>
                  
                  {ticket.file_urls && ticket.file_urls.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium mb-2">Attachments:</p>
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
                  
                  <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
                    <span>Priority: {ticket.priority}</span>
                    <span>
                      Submitted: {new Date(ticket.submitted_at!).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
