import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface Submission {
  id: string;
  name: string;
  message: string;
  submitted_at: string;
  status: string;
}

interface FormSubmissionsCardProps {
  plan: string;
  submissions?: Submission[];
  newCount?: number;
}

export const FormSubmissionsCard = ({ 
  plan, 
  submissions = [],
  newCount = 0
}: FormSubmissionsCardProps) => {
  const navigate = useNavigate();
  const hasSubmissions = plan === "professional" || plan === "premium";

  if (!hasSubmissions) {
    return (
      <Card className="hover:shadow-md transition-all">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Form Submissions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-8 space-y-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Never miss a customer inquiry</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Form submission tracking available on Professional plan.
              </p>
              <p className="text-sm text-muted-foreground">
                See all contact form entries in one place.
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

  const recentSubmissions = submissions.slice(0, 2);

  return (
    <Card className="hover:shadow-md transition-all">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Form Submissions
          {newCount > 0 && (
            <Badge variant="destructive" className="ml-auto">
              {newCount} new
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          {submissions.length} submissions this month
        </div>

        {recentSubmissions.length > 0 ? (
          <div className="space-y-3">
            <div className="text-sm font-medium">Recent</div>
            {recentSubmissions.map((submission) => (
              <div
                key={submission.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                {submission.status === "new" && (
                  <Circle className="h-2 w-2 fill-destructive text-destructive mt-2 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{submission.name}</span>
                    <Badge variant={submission.status === "new" ? "default" : "secondary"} className="text-xs">
                      {submission.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate mt-1">
                    "{submission.message.substring(0, 40)}..."
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(submission.submitted_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No form submissions yet
          </div>
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate("/submissions")}
        >
          View All Submissions →
        </Button>
      </CardContent>
    </Card>
  );
};
