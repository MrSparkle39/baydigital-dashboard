import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Globe, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Copy, 
  RefreshCw,
  Mail
} from "lucide-react";

interface DnsRecord {
  record: string;
  name: string;
  type: string;
  value: string;
  ttl: string;
  status: string;
  priority?: number;
}

interface UserDomain {
  id: string;
  domain: string;
  status: string;
  receiving_enabled: boolean;
  dns_records: DnsRecord[];
  created_at: string;
  verified_at: string | null;
}

export function DomainSetup() {
  const { user } = useAuth();
  const [domain, setDomain] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [userDomains, setUserDomains] = useState<UserDomain[]>([]);
  const [loadingDomains, setLoadingDomains] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDomains();
    }
  }, [user]);

  const fetchDomains = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('provision-domain', {
        body: { action: 'list' },
      });

      if (error) throw error;
      setUserDomains(data.domains || []);
    } catch (error) {
      console.error('Error fetching domains:', error);
    } finally {
      setLoadingDomains(false);
    }
  };

  const handleAddDomain = async () => {
    if (!domain.trim()) {
      toast.error("Please enter a domain");
      return;
    }

    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain.trim())) {
      toast.error("Please enter a valid domain (e.g., example.com)");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('provision-domain', {
        body: { action: 'create', domain: domain.trim().toLowerCase() },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("Domain added! Please configure your DNS records.");
      setDomain("");
      fetchDomains();
    } catch (error: any) {
      toast.error(error.message || "Failed to add domain");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (domainId: string) => {
    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('provision-domain', {
        body: { action: 'verify', domainId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      if (data.status === 'verified') {
        toast.success("Domain verified successfully!");
      } else if (data.status === 'verifying') {
        toast.info("Verification in progress. DNS records may take up to 72 hours to propagate.");
      } else {
        toast.warning("DNS records not found yet. Please ensure they are configured correctly.");
      }

      fetchDomains();
    } catch (error: any) {
      toast.error(error.message || "Verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleEnableReceiving = async (domainId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('provision-domain', {
        body: { action: 'enable-receiving', domainId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("Email receiving enabled! Don't forget to add the MX record.");
      fetchDomains();
    } catch (error: any) {
      toast.error(error.message || "Failed to enable receiving");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-primary"><CheckCircle className="w-3 h-3 mr-1" /> Verified</Badge>;
      case 'verifying':
        return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Verifying</Badge>;
      case 'dns_required':
        return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" /> DNS Required</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loadingDomains) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add Domain Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Add Your Domain
          </CardTitle>
          <CardDescription>
            Add your domain to enable email services. We'll provide the DNS records you need to configure.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="domain" className="sr-only">Domain</Label>
              <Input
                id="domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="yourbusiness.com"
                disabled={isLoading}
              />
            </div>
            <Button onClick={handleAddDomain} disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Domain"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing Domains */}
      {userDomains.map((domainRecord) => (
        <Card key={domainRecord.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-muted-foreground" />
                <div>
                  <CardTitle className="text-lg">{domainRecord.domain}</CardTitle>
                  <CardDescription>
                    Added {new Date(domainRecord.created_at).toLocaleDateString()}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(domainRecord.status)}
                {domainRecord.receiving_enabled ? (
                  <Badge variant="secondary"><Mail className="w-3 h-3 mr-1" /> Receiving</Badge>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* DNS Records Table */}
            {domainRecord.dns_records && domainRecord.dns_records.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">DNS Records to Configure:</h4>
                <div className="bg-muted rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-2 font-medium">Type</th>
                        <th className="text-left p-2 font-medium">Name</th>
                        <th className="text-left p-2 font-medium">Value</th>
                        <th className="text-left p-2 font-medium">Status</th>
                        <th className="p-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {domainRecord.dns_records.map((record, idx) => (
                        <tr key={idx} className="border-b border-border last:border-0">
                          <td className="p-2">
                            <Badge variant="outline">{record.type}</Badge>
                          </td>
                          <td className="p-2 font-mono text-xs max-w-[150px] truncate" title={record.name}>
                            {record.name}
                          </td>
                          <td className="p-2 font-mono text-xs max-w-[200px] truncate" title={record.value}>
                            {record.priority !== undefined && `${record.priority} `}
                            {record.value}
                          </td>
                          <td className="p-2">
                            {record.status === 'verified' ? (
                              <CheckCircle className="w-4 h-4 text-primary" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-muted-foreground" />
                            )}
                          </td>
                          <td className="p-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(record.value)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* MX Record for receiving */}
                {domainRecord.status === 'verified' && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      To receive emails, also add this MX record:
                    </h5>
                    <div className="font-mono text-xs bg-background p-2 rounded flex items-center justify-between">
                      <span>MX @ inbound-smtp.resend.com (Priority: 10)</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard("inbound-smtp.resend.com")}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              {domainRecord.status !== 'verified' && (
                <Button 
                  onClick={() => handleVerify(domainRecord.id)} 
                  disabled={isVerifying}
                  variant="outline"
                >
                  {isVerifying ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Verify DNS
                </Button>
              )}
              {domainRecord.status === 'verified' && !domainRecord.receiving_enabled && (
                <Button onClick={() => handleEnableReceiving(domainRecord.id)}>
                  <Mail className="w-4 h-4 mr-2" />
                  Enable Email Receiving
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {userDomains.length === 0 && (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No domains configured yet.</p>
            <p className="text-sm">Add your domain above to get started with email services.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
