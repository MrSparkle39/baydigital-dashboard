import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface WebsiteCardProps {
  siteUrl: string;
  status: string;
  launchedDate: string;
  lastUpdated: string;
}

export const WebsiteCard = ({ siteUrl, status, launchedDate, lastUpdated }: WebsiteCardProps) => {
  const statusIcons = {
    live: <CheckCircle className="h-4 w-4 text-success" />,
    building: <Clock className="h-4 w-4 text-warning" />,
    maintenance: <AlertCircle className="h-4 w-4 text-warning" />,
  };

  const statusColors = {
    live: "bg-success/10 text-success border-success/20",
    building: "bg-warning/10 text-warning border-warning/20",
    maintenance: "bg-warning/10 text-warning border-warning/20",
  };

  return (
    <Card className="hover:shadow-md transition-all">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Your Website
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">Status</div>
          <Badge variant="outline" className={statusColors[status as keyof typeof statusColors]}>
            {statusIcons[status as keyof typeof statusIcons]}
            <span className="ml-1">{status.charAt(0).toUpperCase() + status.slice(1)}</span>
          </Badge>
        </div>
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">Launched</div>
          <div className="font-medium">{launchedDate}</div>
        </div>
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">Last Updated</div>
          <div className="font-medium">{lastUpdated}</div>
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => window.open(`https://${siteUrl}`, "_blank")}
        >
          🔗 View Your Site →
        </Button>
      </CardContent>
    </Card>
  );
};
