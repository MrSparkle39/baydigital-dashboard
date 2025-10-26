import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Mail, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type SubmissionStatus = Database["public"]["Enums"]["submission_status"] | "contacted";

interface Submission {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: SubmissionStatus;
  submitted_at: string;
}

const Submissions = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's sites first
      const { data: sites } = await supabase
        .from('sites')
        .select('id')
        .eq('user_id', user.id);

      if (!sites || sites.length === 0) {
        setSubmissions([]);
        setLoading(false);
        return;
      }

      const siteIds = sites.map(s => s.id);

      // Fetch submissions for user's sites
      const { data, error } = await supabase
        .from('form_submissions')
        .select('*')
        .in('site_id', siteIds)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast({
        title: "Error",
        description: "Failed to load submissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: SubmissionStatus) => {
    try {
      const { error } = await supabase
        .from('form_submissions')
        .update({ status: newStatus as any })
        .eq('id', id);

      if (error) throw error;

      setSubmissions(prev => 
        prev.map(sub => sub.id === id ? { ...sub, status: newStatus } : sub)
      );

      toast({
        title: "Success",
        description: "Status updated successfully",
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold">Form Submissions</h2>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading submissions...</div>
        ) : submissions.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No form submissions yet</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {submissions.map((sub) => (
              <Card key={sub.id} className="p-6 hover:shadow-md transition-all">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-semibold text-lg">{sub.name}</span>
                        <Badge variant={sub.status === "new" ? "default" : sub.status === "read" ? "secondary" : "outline"}>
                          {sub.status}
                        </Badge>
                      </div>
                      
                      <div className="flex flex-col gap-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <a href={`mailto:${sub.email}`} className="hover:underline">{sub.email}</a>
                        </div>
                        {sub.phone && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            <a href={`tel:${sub.phone}`} className="hover:underline">{sub.phone}</a>
                          </div>
                        )}
                      </div>

                      <p className="text-sm mt-3 p-3 bg-muted rounded-md">{sub.message}</p>
                      
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(sub.submitted_at), 'MMM dd, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {sub.status === "new" && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(sub.id, "read")}>
                        Mark as Read
                      </Button>
                    )}
                    {sub.status === "read" && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(sub.id, "contacted")}>
                        Mark as Contacted
                      </Button>
                    )}
                    {sub.status === "contacted" && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(sub.id, "new")}>
                        Mark as New
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Submissions;
