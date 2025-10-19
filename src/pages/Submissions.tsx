import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Submissions = () => {
  const navigate = useNavigate();

  const mockSubmissions = [
    { id: "1", date: "Oct 18", name: "John Doe", email: "john@example.com", message: "Need a quote for bathroom remodeling. Can you call me?", status: "new" },
    { id: "2", date: "Oct 17", name: "Jane Smith", email: "jane@example.com", message: "Love your work! Just wanted to leave a compliment.", status: "read" },
  ];

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
          <Button variant="outline">Export CSV ↓</Button>
        </div>

        <div className="space-y-4">
          {mockSubmissions.map((sub) => (
            <Card key={sub.id} className="p-4 hover:shadow-md transition-all">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{sub.name}</span>
                    <span className="text-sm text-muted-foreground">{sub.email}</span>
                    <Badge variant={sub.status === "new" ? "default" : "secondary"}>
                      {sub.status}
                    </Badge>
                  </div>
                  <p className="text-sm">{sub.message}</p>
                  <p className="text-xs text-muted-foreground">{sub.date}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Submissions;
