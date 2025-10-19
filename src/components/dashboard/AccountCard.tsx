import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AccountCardProps {
  plan: string;
  nextBilling: string;
  amount: string;
}

export const AccountCard = ({ plan, nextBilling, amount }: AccountCardProps) => {
  const planDisplay = plan.charAt(0).toUpperCase() + plan.slice(1);
  const isPremium = plan === "premium";

  return (
    <Card className="hover:shadow-md transition-all">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Account Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">Current Plan</div>
          <div className="flex items-center gap-2">
            <Badge className="bg-gradient-to-r from-primary to-primary-dark text-primary-foreground">
              {planDisplay}
            </Badge>
            {isPremium && <Crown className="h-4 w-4 text-warning" />}
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">Next Billing</div>
          <div className="font-medium">{nextBilling}</div>
        </div>
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">Amount</div>
          <div className="font-medium">{amount}/month</div>
        </div>
        <Button variant="outline" className="w-full">
          Manage Billing →
        </Button>
      </CardContent>
    </Card>
  );
};
