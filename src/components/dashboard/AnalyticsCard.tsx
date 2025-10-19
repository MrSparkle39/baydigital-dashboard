import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, Users, FileText } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface AnalyticsCardProps {
  plan: string;
  visitors?: number;
  visitorsGrowth?: number;
  pageViews?: number;
  topPages?: Array<{ name: string; views: number }>;
  trafficSources?: { google: number; direct: number; social: number };
}

export const AnalyticsCard = ({ 
  plan, 
  visitors = 0, 
  visitorsGrowth = 0,
  pageViews = 0,
  topPages = [],
  trafficSources = { google: 0, direct: 0, social: 0 }
}: AnalyticsCardProps) => {
  const hasAnalytics = plan === "professional" || plan === "premium";

  if (!hasAnalytics) {
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

  return (
    <Card className="hover:shadow-md transition-all">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Site Analytics (Last {plan === "premium" ? "90" : "30"} Days)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              Visitors
            </div>
            <div className="text-2xl font-bold">{visitors.toLocaleString()}</div>
            <div className="flex items-center gap-1 text-xs text-success">
              <TrendingUp className="h-3 w-3" />
              +{visitorsGrowth}% from last month
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              Page Views
            </div>
            <div className="text-2xl font-bold">{pageViews.toLocaleString()}</div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-sm font-medium">Top Pages</div>
          {topPages.map((page, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {index + 1}. {page.name}
              </span>
              <span className="font-medium">{page.views} views</span>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div className="text-sm font-medium">Traffic Sources</div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                🔍 Google
              </span>
              <span className="font-medium">{trafficSources.google}%</span>
            </div>
            <Progress value={trafficSources.google} className="h-2" />
            
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                🔗 Direct
              </span>
              <span className="font-medium">{trafficSources.direct}%</span>
            </div>
            <Progress value={trafficSources.direct} className="h-2" />
            
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                📱 Social
              </span>
              <span className="font-medium">{trafficSources.social}%</span>
            </div>
            <Progress value={trafficSources.social} className="h-2" />
          </div>
        </div>

        <Button variant="outline" className="w-full">
          View Detailed Analytics →
        </Button>
      </CardContent>
    </Card>
  );
};
