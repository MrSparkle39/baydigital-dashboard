import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import { AnalyticsViewer } from "@/components/admin/AnalyticsViewer";

type User = Database["public"]["Tables"]["users"]["Row"];
type Ticket = Database["public"]["Tables"]["update_tickets"]["Row"];
type ChangeRequest = Database["public"]["Tables"]["change_requests"]["Row"];

export default function AdminUserDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [ga4PropertyId, setGa4PropertyId] = useState("");

  useEffect(() => {
    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  const fetchUserData = async () => {
    const [userResult, ticketsResult, changeRequestsResult] = await Promise.all([
      supabase.from("users").select("*").eq("id", userId!).single(),
      supabase.from("update_tickets").select("*").eq("user_id", userId!).order("submitted_at", { ascending: false }),
      supabase.from("change_requests").select("*").eq("user_id", userId!).order("created_at", { ascending: false }),
    ]);

    if (userResult.data) {
      setUser(userResult.data);
      setGa4PropertyId(userResult.data.ga4_property_id || "");
    }
    if (ticketsResult.data) setTickets(ticketsResult.data);
    if (changeRequestsResult.data) setChangeRequests(changeRequestsResult.data);
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
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="tickets">Tickets ({tickets.length})</TabsTrigger>
          <TabsTrigger value="requests">Change Requests ({changeRequests.length})</TabsTrigger>
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
                <div>
                  <Label>Website Status</Label>
                  <p className="mt-1">{user.website_status || "pending"}</p>
                </div>
                <div>
                  <Label>Stripe Customer ID</Label>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {user.stripe_customer_id || "Not set"}
                  </p>
                </div>
              </div>

              {user.website_url && (
                <div>
                  <Label>Website URL</Label>
                  <div className="flex gap-2 mt-1">
                    <Input value={user.website_url} readOnly />
                    <Button
                      variant="outline"
                      onClick={() => window.open(user.website_url!, "_blank")}
                    >
                      Visit
                    </Button>
                  </div>
                </div>
              )}
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

        <TabsContent value="requests" className="space-y-4">
          {changeRequests.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No change requests found
              </CardContent>
            </Card>
          ) : (
            changeRequests.map((request) => (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Change Request</CardTitle>
                    <Badge>{request.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{request.description}</p>
                  <div className="mt-4 text-sm text-muted-foreground">
                    Submitted: {new Date(request.created_at!).toLocaleDateString()}
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
