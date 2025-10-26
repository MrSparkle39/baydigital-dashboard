import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, Users, FileText } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface AnalyticsCardProps {
  plan: string;
  ga4PropertyId?: string | null;
  visitors?: number;
  visitorsGrowth?: number;
  pageViews?: number;
  topPages?: Array<{ name: string; views: number }>;
  trafficSources?: { google: number; direct: number; social: number };
}

export const AnalyticsCard = ({ 
  plan,
  ga4PropertyId,
  visitors = 0, 
  visitorsGrowth = 0,
  pageViews = 0,
  topPages = [],
  trafficSources = { google: 0, direct: 0, social: 0 }
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

  // Analytics configured - show setup in progress message
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
      </CardContent>
    </Card>
  );
};
