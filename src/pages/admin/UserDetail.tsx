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
import JSZip from "jszip";

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
  const [ga4MeasurementId, setGa4MeasurementId] = useState("");
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
      setGa4MeasurementId(userResult.data.ga4_measurement_id || "");
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

  const saveGa4MeasurementId = async () => {
    const { error } = await supabase
      .from("users")
      .update({ ga4_measurement_id: ga4MeasurementId })
      .eq("id", userId!);

    if (error) {
      toast.error("Failed to update GA4 measurement ID");
    } else {
      toast.success("GA4 measurement ID updated successfully");
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
                  <Label>Full Name</Label>
                  <p className="mt-1">{user.full_name || "Not set"}</p>
                </div>
                <div>
                  <Label>Location</Label>
                  <p className="mt-1">{user.location || "Not set"}</p>
                </div>
                <div>
                  <Label>Business Phone</Label>
                  <p className="mt-1">{user.business_phone || "Not set"}</p>
                </div>
                <div>
                  <Label>Personal Phone</Label>
                  <p className="mt-1">{user.phone || "Not set"}</p>
                </div>
                <div>
                  <Label>Business Email</Label>
                  <p className="mt-1">{user.business_email || "Not set"}</p>
                </div>
                <div>
                  <Label>Business Address</Label>
                  <p className="mt-1">{user.business_address || "Not set"}</p>
                </div>
                <div className="col-span-2">
                  <Label>Business Description</Label>
                  <p className="mt-1 text-sm">{user.business_description || "Not set"}</p>
                </div>
                <div>
                  <Label>Business Hours</Label>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{user.business_hours || "Not set"}</p>
                </div>
                <div>
                  <Label>Service Area</Label>
                  <p className="mt-1">{user.service_area || "Not set"}</p>
                </div>
                <div>
                  <Label>Years in Business</Label>
                  <p className="mt-1">{user.years_in_business || "Not set"}</p>
                </div>
                <div>
                  <Label>Business Size</Label>
                  <p className="mt-1">{user.business_size || "Not set"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Services & Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Services Offered</Label>
                <p className="mt-1 text-sm whitespace-pre-wrap">{user.services || "Not set"}</p>
              </div>
              <div>
                <Label>Top Services</Label>
                <p className="mt-1 text-sm">{user.top_services || "Not set"}</p>
              </div>
              <div>
                <Label>Pricing Strategy</Label>
                <p className="mt-1 text-sm">{user.pricing_strategy || "Not set"}</p>
              </div>
              <div>
                <Label>Special Offers</Label>
                <p className="mt-1 text-sm">{user.special_offers || "Not set"}</p>
              </div>
              <div>
                <Label>Certifications</Label>
                <p className="mt-1 text-sm">{user.certifications || "Not set"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Branding & Design</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Logo</Label>
                  {user.logo_url ? (
                    <div className="space-y-2">
                      <img src={user.logo_url} alt="Business logo" className="mt-2 max-w-[200px] h-auto" />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            const marker = "/onboarding-files/";
                            const idx = user.logo_url!.indexOf(marker);
                            const path = idx !== -1 ? user.logo_url!.substring(idx + marker.length) : user.logo_url!;
                            const { data, error } = await supabase.storage.from("onboarding-files").download(path);
                            if (error) throw error;
                            const fileName = user.logo_url!.split("/").pop() || "logo";
                            const objectUrl = window.URL.createObjectURL(data);
                            const link = document.createElement("a");
                            link.href = objectUrl;
                            link.download = fileName;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            window.URL.revokeObjectURL(objectUrl);
                          } catch (err) {
                            console.error(err);
                            toast.error("Failed to download logo");
                          }
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" /> Download Logo
                      </Button>
                    </div>
                  ) : (
                    <p className="mt-1 text-muted-foreground">Not uploaded</p>
                  )}
                </div>
                <div>
                  <Label>Brand Style</Label>
                  <p className="mt-1">{user.brand_style || "Not set"}</p>
                </div>
                <div>
                  <Label>Tagline</Label>
                  <p className="mt-1">{user.tagline || "Not set"}</p>
                </div>
                <div>
                  <Label>Brand Colors</Label>
                  <p className="mt-1 text-sm">{user.brand_colors ? JSON.stringify(user.brand_colors) : "Not set"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Onboarding Files</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {user.signup_files && (user.signup_files as string[]).length > 0 ? (
                <>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">{(user.signup_files as string[]).length} file(s)</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          const zip = new JSZip();
                          for (const url of user.signup_files as string[]) {
                            const marker = "/onboarding-files/";
                            const idx = url.indexOf(marker);
                            const path = idx !== -1 ? url.substring(idx + marker.length) : url;
                            const { data, error } = await supabase.storage.from("onboarding-files").download(path);
                            if (error) throw error;
                            const fileName = url.split("/").pop() || "file";
                            zip.file(fileName, data);
                          }
                          const content = await zip.generateAsync({ type: "blob" });
                          const a = document.createElement("a");
                          a.href = URL.createObjectURL(content);
                          a.download = `${(user.business_name || user.email || 'user').toString().replace(/[^a-z0-9-_]/gi,'_')}-onboarding-files.zip`;
                          document.body.appendChild(a);
                          a.click();
                          a.remove();
                        } catch (e) {
                          console.error(e);
                          toast.error("Failed to download all files");
                        }
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" /> Download All
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {(user.signup_files as string[]).map((url, idx) => {
                      const fileName = url.split("/").pop() || `file-${idx + 1}`;
                      return (
                        <Button
                          key={idx}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                          onClick={async () => {
                            try {
                              const marker = "/onboarding-files/";
                              const i = url.indexOf(marker);
                              const path = i !== -1 ? url.substring(i + marker.length) : url;
                              const { data, error } = await supabase.storage.from("onboarding-files").download(path);
                              if (error) throw error;
                              const objectUrl = window.URL.createObjectURL(data);
                              const link = document.createElement("a");
                              link.href = objectUrl;
                              link.download = fileName;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              window.URL.revokeObjectURL(objectUrl);
                            } catch (err) {
                              console.error(err);
                              toast.error("Failed to download file");
                            }
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" /> {fileName}
                        </Button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No files uploaded</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Website Features & Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Content Pages</Label>
                  <p className="mt-1 text-sm">{user.content_pages ? JSON.stringify(user.content_pages) : "Not set"}</p>
                </div>
                <div>
                  <Label>Website Features</Label>
                  <p className="mt-1 text-sm">{user.website_features ? JSON.stringify(user.website_features) : "Not set"}</p>
                </div>
                <div>
                  <Label>Newsletter Signup</Label>
                  <Badge variant={user.newsletter_signup ? "default" : "secondary"}>
                    {user.newsletter_signup ? "Yes" : "No"}
                  </Badge>
                </div>
                <div>
                  <Label>Needs Email</Label>
                  <Badge variant={user.needs_email ? "default" : "secondary"}>
                    {user.needs_email ? `Yes (${user.email_count || 1})` : "No"}
                  </Badge>
                </div>
                <div>
                  <Label>Emergency Service</Label>
                  <Badge variant={user.emergency_service ? "default" : "secondary"}>
                    {user.emergency_service ? "Yes" : "No"}
                  </Badge>
                </div>
                <div>
                  <Label>Emergency Phone</Label>
                  <p className="mt-1">{user.emergency_phone || "Not set"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SEO & Marketing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Target Keywords</Label>
                <p className="mt-1 text-sm">{user.target_keywords || "Not set"}</p>
              </div>
              <div>
                <Label>Unique Selling Points</Label>
                <p className="mt-1 text-sm whitespace-pre-wrap">{user.unique_selling_points || "Not set"}</p>
              </div>
              <div>
                <Label>Monthly Goals</Label>
                <p className="mt-1 text-sm">{user.monthly_goals || "Not set"}</p>
              </div>
              <div>
                <Label>Competitor Websites</Label>
                <p className="mt-1 text-sm whitespace-pre-wrap">{user.competitor_websites || "Not set"}</p>
              </div>
              <div>
                <Label>Competitor Analysis</Label>
                <p className="mt-1 text-sm whitespace-pre-wrap">{user.competitor_analysis || "Not set"}</p>
              </div>
              <div>
                <Label>Example Websites</Label>
                <p className="mt-1 text-sm">{user.example_websites || "Not set"}</p>
              </div>
              <div>
                <Label>Social Media</Label>
                <p className="mt-1 text-sm">{user.social_media ? JSON.stringify(user.social_media) : "Not set"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Domain & Technical</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Existing Website</Label>
                  <p className="mt-1">{user.existing_website || "None"}</p>
                </div>
                <div>
                  <Label>Existing Domain</Label>
                  <p className="mt-1">{user.existing_domain || "None"}</p>
                </div>
                <div>
                  <Label>Preferred Domain</Label>
                  <p className="mt-1">{user.domain || "Not set"}</p>
                </div>
                <div>
                  <Label>Preferred Contact Method</Label>
                  <p className="mt-1">{user.preferred_contact_method || "Not set"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent>
              <Label>Additional Notes</Label>
              <p className="mt-1 text-sm whitespace-pre-wrap">{user.additional_info || "None provided"}</p>
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

              <div>
                <Label htmlFor="ga4MeasurementId">GA4 Measurement ID (for Blog Posts)</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="ga4MeasurementId"
                    value={ga4MeasurementId}
                    onChange={(e) => setGa4MeasurementId(e.target.value)}
                    placeholder="e.g., G-XXXXXXXXXX"
                  />
                  <Button onClick={saveGa4MeasurementId}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Enter the GA4 Measurement ID (starts with G-) to automatically add Google Analytics tracking code to published blog posts.
                </p>
              </div>
              {user.ga4_measurement_id && (
                <div className="p-4 bg-success/10 border border-success rounded-md">
                  <p className="text-sm text-success font-medium">
                    ✓ GA4 Measurement ID configured - Blog posts will include Google Analytics tracking
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
