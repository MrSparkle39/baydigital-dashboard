import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Users, FileText, TrendingUp, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface AnalyticsViewerProps {
  propertyId: string;
  userName: string;
}

export function AnalyticsViewer({ propertyId, userName }: AnalyticsViewerProps) {
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-ga4-analytics', {
        body: { 
          propertyId,
          startDate: '30daysAgo',
          endDate: 'today'
        }
      });

      if (error) {
        console.error('Error fetching analytics:', error);
        toast.error("Failed to load analytics data");
      } else {
        setAnalyticsData(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (propertyId) {
      fetchAnalytics();
    }
  }, [propertyId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analyticsData || (analyticsData.visitors === 0 && analyticsData.pageViews === 0)) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Analytics Data
            </CardTitle>
            <Button variant="outline" size="sm" onClick={fetchAnalytics}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">No Analytics Data Yet</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Analytics are configured but no data has been collected yet.
              </p>
              <p className="text-sm text-muted-foreground">
                Data will appear here once {userName}'s website starts receiving traffic.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Analytics Data (Last 30 Days)</h3>
        <Button variant="outline" size="sm" onClick={fetchAnalytics} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Visitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.visitors.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Unique visitors in the last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Page Views</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.pageViews.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total page views in the last 30 days</p>
          </CardContent>
        </Card>
      </div>

      {analyticsData.topPages && analyticsData.topPages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Top Pages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analyticsData.topPages.slice(0, 10).map((page: any, index: number) => (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="truncate font-medium">{page.page}</span>
                    <span className="font-semibold">{page.views.toLocaleString()} views</span>
                  </div>
                  <Progress 
                    value={(page.views / (analyticsData.topPages[0]?.views || 1)) * 100} 
                    className="h-2"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {analyticsData.trafficSources && analyticsData.trafficSources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Traffic Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analyticsData.trafficSources.slice(0, 10).map((source: any, index: number) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="capitalize font-medium">{source.source}</span>
                  <span className="font-semibold">{source.visitors.toLocaleString()} visitors</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
