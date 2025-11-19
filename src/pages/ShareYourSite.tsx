import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Facebook, Linkedin, Twitter, Mail, MessageCircle, Download, Share2, ExternalLink, QrCode as QrCodeIcon } from "lucide-react";
import QRCode from "qrcode";

export default function ShareYourSite() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(true);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");

  useEffect(() => {
    fetchUserWebsite();
  }, [user]);

  const fetchUserWebsite = async () => {
    if (!user) return;

    try {
      // Fetch user's website information
      const { data: sites, error } = await supabase
        .from('sites')
        .select('site_url, site_name')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (sites && sites.length > 0) {
        const url = sites[0].site_url;
        const name = sites[0].site_name || "My Website";
        
        setWebsiteUrl(url);
        setBusinessName(name);
        
        // Generate QR code
        generateQRCode(url);
      }
    } catch (error) {
      console.error('Error fetching website:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = async (url: string) => {
    try {
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrCodeDataUrl(qrDataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(websiteUrl);
      toast({
        title: "Copied!",
        description: "Website URL copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy the URL manually",
        variant: "destructive",
      });
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeDataUrl) return;

    const link = document.createElement('a');
    link.download = `${businessName.replace(/\s+/g, '-')}-qr-code.png`;
    link.href = qrCodeDataUrl;
    link.click();

    toast({
      title: "QR Code Downloaded",
      description: "Use this on business cards, flyers, or print materials",
    });
  };

  const shareMessage = `Check out ${businessName}! ${websiteUrl}`;
  const emailSubject = `Visit ${businessName} Online`;
  const emailBody = `Hi,\n\nI wanted to share my business website with you:\n\n${websiteUrl}\n\nBest regards`;

  const shareLinks = [
    {
      name: "Facebook",
      icon: Facebook,
      color: "bg-[#1877F2] hover:bg-[#1877F2]/90",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(websiteUrl)}`,
      description: "Share on your timeline"
    },
    {
      name: "LinkedIn",
      icon: Linkedin,
      color: "bg-[#0A66C2] hover:bg-[#0A66C2]/90",
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(websiteUrl)}`,
      description: "Share with your network"
    },
    {
      name: "Twitter",
      icon: Twitter,
      color: "bg-[#1DA1F2] hover:bg-[#1DA1F2]/90",
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}`,
      description: "Tweet to your followers"
    },
    {
      name: "WhatsApp",
      icon: MessageCircle,
      color: "bg-[#25D366] hover:bg-[#25D366]/90",
      url: `https://wa.me/?text=${encodeURIComponent(shareMessage)}`,
      description: "Send to contacts"
    },
    {
      name: "Email",
      icon: Mail,
      color: "bg-gray-600 hover:bg-gray-700",
      url: `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`,
      description: "Send via email"
    },
  ];

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading your website information...</p>
        </div>
      </div>
    );
  }

  if (!websiteUrl) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Card>
          <CardContent className="py-12 text-center">
            <Share2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">No Website Found</h3>
            <p className="text-sm text-muted-foreground">
              Your website is being set up. Check back soon!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Share Your Website</h1>
        <p className="text-muted-foreground">
          Spread the word and drive traffic to your website
        </p>
      </div>

      {/* Website URL Card */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Your Website URL</CardTitle>
          <CardDescription>
            Copy your website link and share it anywhere
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={websiteUrl}
              readOnly
              className="font-mono text-sm"
            />
            <Button onClick={copyToClipboard} variant="outline">
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
            <Button asChild variant="outline">
              <a href={websiteUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Visit
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Social Media Share Buttons */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Share on Social Media</CardTitle>
          <CardDescription>
            One-click sharing to your favorite platforms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {shareLinks.map((platform) => (
              <Button
                key={platform.name}
                asChild
                className={`${platform.color} text-white justify-start h-auto py-4`}
              >
                <a
                  href={platform.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div className="flex items-start gap-3 w-full">
                    <platform.icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div className="text-left">
                      <div className="font-semibold">{platform.name}</div>
                      <div className="text-xs opacity-90">{platform.description}</div>
                    </div>
                  </div>
                </a>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* QR Code Section */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCodeIcon className="h-5 w-5" />
              QR Code
            </CardTitle>
            <CardDescription>
              Download and use on physical materials
            </CardDescription>
          </CardHeader>
          <CardContent>
            {qrCodeDataUrl ? (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg inline-block">
                  <img
                    src={qrCodeDataUrl}
                    alt="Website QR Code"
                    className="w-full max-w-[300px] mx-auto"
                  />
                </div>
                <Button onClick={downloadQRCode} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download QR Code
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Generating QR code...</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>QR Code Use Cases</CardTitle>
            <CardDescription>
              Ways to use your QR code
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span><strong>Business Cards:</strong> Add to the back of your cards for easy access</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span><strong>Store Windows:</strong> Let passers-by scan and visit your site</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span><strong>Flyers & Brochures:</strong> Include on all print marketing materials</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span><strong>Table Tents:</strong> Perfect for restaurants or cafes</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span><strong>Invoices & Receipts:</strong> Make it easy for customers to find you online</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span><strong>Signage:</strong> Add to posters, banners, and yard signs</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Tips Section */}
      <Card className="mt-6 bg-muted/50">
        <CardHeader>
          <CardTitle>Sharing Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Maximize Your Reach</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Share on all your social media profiles</li>
                <li>• Add to your email signature</li>
                <li>• Include in your Google My Business profile</li>
                <li>• Print QR codes on receipts and invoices</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Best Practices</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Share regularly to stay top-of-mind</li>
                <li>• Personalize your message when sharing</li>
                <li>• Ask satisfied customers to share</li>
                <li>• Track your visitor stats in Analytics</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
