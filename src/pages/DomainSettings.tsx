import { useAuth } from "@/contexts/AuthContext";
import { DomainSetup } from "@/components/domain/DomainSetup";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function DomainSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold">Domain Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your domain for email services. Once verified, you can create email aliases and start receiving emails.
          </p>
        </div>

        <DomainSetup />
      </div>
    </div>
  );
}
