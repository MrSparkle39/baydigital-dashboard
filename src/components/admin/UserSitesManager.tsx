import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Copy, Plus, ExternalLink, Trash2, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Site {
  id: string;
  site_name: string;
  site_url: string;
  status: string;
  created_at: string;
  submission_count?: number;
}

interface UserSitesManagerProps {
  userId: string;
}

export const UserSitesManager = ({ userId }: UserSitesManagerProps) => {
  const { toast } = useToast();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingDialogOpen, setIsAddingDialogOpen] = useState(false);

  // Form state
  const [siteName, setSiteName] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [status, setStatus] = useState<"building" | "live" | "maintenance">("building");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSites();
  }, [userId]);

  const fetchSites = async () => {
    try {
      const { data: sitesData, error } = await supabase
        .from('sites')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch submission counts for each site
      if (sitesData) {
        const sitesWithCounts = await Promise.all(
          sitesData.map(async (site) => {
            const { count } = await supabase
              .from('form_submissions')
              .select('*', { count: 'exact', head: true })
              .eq('site_id', site.id);
            
            return { ...site, submission_count: count || 0 };
          })
        );
        setSites(sitesWithCounts);
      }
    } catch (error) {
      console.error('Error fetching sites:', error);
      toast({
        title: "Error",
        description: "Failed to load sites",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('sites')
        .insert({
          user_id: userId,
          site_name: siteName,
          site_url: siteUrl,
          status: status,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Site added successfully",
      });

      // Reset form
      setSiteName("");
      setSiteUrl("");
      setStatus("building");
      setIsAddingDialogOpen(false);
      
      // Refresh sites
      fetchSites();
    } catch (error) {
      console.error('Error adding site:', error);
      toast({
        title: "Error",
        description: "Failed to add site",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSite = async (siteId: string) => {
    if (!confirm("Are you sure you want to delete this site? This cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('sites')
        .delete()
        .eq('id', siteId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Site deleted successfully",
      });

      fetchSites();
    } catch (error) {
      console.error('Error deleting site:', error);
      toast({
        title: "Error",
        description: "Failed to delete site",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live':
        return 'default';
      case 'building':
        return 'secondary';
      case 'maintenance':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Client Sites
          </CardTitle>
          
          <Dialog open={isAddingDialogOpen} onOpenChange={setIsAddingDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Site
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Site</DialogTitle>
                <DialogDescription>
                  Create a new site entry to track form submissions
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddSite} className="space-y-4">
                <div>
                  <Label htmlFor="siteName">Site Name</Label>
                  <Input
                    id="siteName"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    placeholder="Joe's Plumbing"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="siteUrl">Site URL</Label>
                  <Input
                    id="siteUrl"
                    value={siteUrl}
                    onChange={(e) => setSiteUrl(e.target.value)}
                    placeholder="joesplumbing.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="building">Building</SelectItem>
                      <SelectItem value="live">Live</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddingDialogOpen(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Adding..." : "Add Site"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-sm text-muted-foreground">Loading sites...</div>
        ) : sites.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground mb-4">No sites yet</p>
            <Button size="sm" onClick={() => setIsAddingDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Site
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {sites.map((site) => (
              <div key={site.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold">{site.site_name}</h4>
                      <Badge variant={getStatusColor(site.status)} className="text-xs">
                        {site.status}
                      </Badge>
                      {site.submission_count !== undefined && (
                        <Badge variant="outline" className="text-xs">
                          {site.submission_count} submission{site.submission_count !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ExternalLink className="h-3 w-3" />
                      <a 
                        href={`https://${site.site_url}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {site.site_url}
                      </a>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteSite(site.id)}
                    className="text-destructive hover:text-destructive h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground min-w-[60px]">Site ID:</Label>
                    <code className="flex-1 px-2 py-1 bg-muted rounded text-xs font-mono break-all">
                      {site.id}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(site.id, "Site ID")}
                      className="h-7"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>

                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      View form code
                    </summary>
                    <pre className="mt-2 p-2 bg-muted rounded overflow-x-auto text-xs">
{`fetch('https://ovhuafsxhdbhaqccfpmt.supabase.co/functions/v1/submit-contact-form', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    site_id: '${site.id}',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '555-1234',
    message: 'Message here'
  })
})`}
                    </pre>
                  </details>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
