import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Clock, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { ChangeRequestModal } from "./ChangeRequestModal";

interface ChangeRequest {
  id: string;
  description: string;
  status: string;
  created_at: string;
  completed_at?: string;
}

interface ChangeRequestsCardProps {
  requests?: ChangeRequest[];
}

export const ChangeRequestsCard = ({ requests = [] }: ChangeRequestsCardProps) => {
  const [modalOpen, setModalOpen] = useState(false);
  const recentRequests = requests.slice(0, 2);

  const statusIcons = {
    pending: <Clock className="h-3 w-3" />,
    in_progress: <Clock className="h-3 w-3" />,
    completed: <CheckCircle className="h-3 w-3" />,
  };

  return (
    <>
      <Card className="hover:shadow-md transition-all">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Request Changes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Need to update your site?
          </div>

          <Button
            className="w-full bg-gradient-to-r from-primary to-primary-dark"
            onClick={() => setModalOpen(true)}
          >
            Request Site Update →
          </Button>

          {recentRequests.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="text-sm font-medium">Recent Requests</div>
              {recentRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{request.description.substring(0, 30)}...</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(request.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge
                    variant={request.status === "completed" ? "default" : "secondary"}
                    className="ml-2 flex items-center gap-1"
                  >
                    {statusIcons[request.status as keyof typeof statusIcons]}
                    {request.status === "in_progress" ? "In Progress" : 
                     request.status === "completed" ? "Completed" : "Pending"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ChangeRequestModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
};
