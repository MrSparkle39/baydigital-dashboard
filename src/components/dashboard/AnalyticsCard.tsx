import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, Users, FileText } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface AnalyticsCardProps {
  plan: string;
  ga4PropertyId?: string | null;
  visitors?: number;
  pageViews?: number;
  topPages?: Array<{ page: string; views: number }>;
  trafficSources?: Array<{ source: string; visitors: number }>;
  loading?: boolean;
}

export const AnalyticsCard = ({ 
  plan,
  ga4PropertyId,
  visitors = 0,
  pageViews = 0,
  topPages = [],
  trafficSources = [],
  loading = false
}: AnalyticsCardProps) => {
  const hasAnalyticsPlan = plan === "professional" || plan === "premium";
  const isConfigured = hasAnalyticsPlan && ga4PropertyId;

  // Not on analytics plan
  if (!hasAnalyticsPlan) {
    return (
      <Card className="hover:shadow-md transition-all">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Site Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-8 space-y-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Get insights about your visitors</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Analytics are available on the Professional plan.
              </p>
              <p className="text-sm text-muted-foreground">
                Track visitors, page views, and traffic sources.
              </p>
            </div>
            <Button className="bg-gradient-to-r from-primary to-primary-dark">
              Upgrade to Professional →
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // On analytics plan but not configured yet
  if (!isConfigured) {
    return (
      <Card className="hover:shadow-md transition-all">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Site Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-8 space-y-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-amber-500/10 flex items-center justify-center">
              <BarChart3 className="h-8 w-8 text-amber-500" />
            </div>
            <div>
              <h3 className="font-semibold">Analytics Setup Required</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Your analytics are currently being set up by our team.
              </p>
              <p className="text-sm text-muted-foreground">
                You'll receive an email once tracking is live and data starts flowing.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Analytics configured - show data
  return (
    <Card className="hover:shadow-md transition-all">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Site Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : visitors === 0 && pageViews === 0 ? (
          <div className="text-center py-8 space-y-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <BarChart3 className="h-8 w-8 text-green-500" />
            </div>
            <div>
              <h3 className="font-semibold">Analytics Configured</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Google Analytics is set up for your website.
              </p>
              <p className="text-sm text-muted-foreground">
                Data collection is active and analytics will appear here once sufficient data is gathered.
              </p>
              <p className="text-xs text-muted-foreground mt-3">
                Property ID: {ga4PropertyId}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-secondary/20 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Visitors</p>
                <p className="text-2xl font-bold">{visitors.toLocaleString()}</p>
              </div>
              <div className="bg-secondary/20 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Page Views</p>
                <p className="text-2xl font-bold">{pageViews.toLocaleString()}</p>
              </div>
            </div>

            {topPages.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Top Pages (Last 30 Days)
                </h4>
                <div className="space-y-2">
                  {topPages.slice(0, 5).map((page, index) => (
                    <div key={index} className="text-sm">
                      <div className="flex justify-between mb-1">
                        <span className="truncate">{page.page}</span>
                        <span className="font-semibold">{page.views.toLocaleString()}</span>
                      </div>
                      <Progress 
                        value={(page.views / (topPages[0]?.views || 1)) * 100} 
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {trafficSources.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Traffic Sources
                </h4>
                <div className="space-y-2">
                  {trafficSources.slice(0, 5).map((source, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="capitalize">{source.source}</span>
                      <span className="font-semibold">{source.visitors.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
