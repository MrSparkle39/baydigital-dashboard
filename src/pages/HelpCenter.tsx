import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Search, BookOpen, HelpCircle, CreditCard, Image, Ticket, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Article {
  id: string;
  title: string;
  category: string;
  content: string;
  tags: string[];
}

const helpArticles: Article[] = [
  // Getting Started
  {
    id: "access-dashboard",
    title: "How to access your dashboard",
    category: "Getting Started",
    content: "After signing up, you'll receive a welcome email with your login credentials. Simply visit dashboard.bay.digital and enter your email and password. If you've forgotten your password, use the 'Forgot Password' link on the login page.",
    tags: ["login", "access", "password", "dashboard"]
  },
  {
    id: "subscription-plan",
    title: "Understanding your subscription plan",
    category: "Getting Started",
    content: "Bay Digital offers two plans: Basic ($29/month) includes website hosting, 5 stock photo downloads, and email support. Professional ($49/month) includes everything in Basic plus 20 stock photo downloads and priority support. You can upgrade or downgrade at any time from your account settings.",
    tags: ["plan", "subscription", "pricing", "basic", "professional"]
  },
  {
    id: "dashboard-tour",
    title: "Tour of dashboard features",
    category: "Getting Started",
    content: "Your dashboard includes: Website Card (shows your site status and link), Analytics (visitor stats and traffic data), Change Requests (track website update requests), Form Submissions (view contact form entries), and Quick Links (access Stock Photos, Help Center, and more). Navigate using the sidebar menu on the left.",
    tags: ["dashboard", "features", "navigation", "overview"]
  },
  {
    id: "update-account",
    title: "How to update account details",
    category: "Getting Started",
    content: "Click on your profile icon in the top right corner and select 'Account Settings'. Here you can update your email, password, business name, and contact information. Changes are saved automatically.",
    tags: ["account", "settings", "profile", "email", "password"]
  },

  // Website Management
  {
    id: "request-changes",
    title: "How to request website changes",
    category: "Website Management",
    content: "To request a website change, click 'Submit Change Request' on your dashboard. Describe the changes you want (e.g., 'Update homepage headline to...', 'Add new photo to About page'). You can attach screenshots or images. We'll review your request and send updates via the ticket system.",
    tags: ["changes", "requests", "updates", "modify", "edit"]
  },
  {
    id: "change-process",
    title: "How change requests work",
    category: "Website Management",
    content: "After submitting a change request: 1) We review within 24 hours, 2) We implement the changes (typically 2-3 business days), 3) We send you a preview link for approval, 4) Once approved, changes go live on your site. Professional plan customers receive priority processing.",
    tags: ["process", "timeline", "approval", "workflow"]
  },
  {
    id: "analytics",
    title: "Understanding your website analytics",
    category: "Website Management",
    content: "Your Analytics card shows: Total Visitors (unique people who visited), Page Views (total pages loaded), Bounce Rate (% who left after one page), and Session Duration (average time spent). Data updates every 24 hours. Click 'View Full Analytics' for detailed breakdowns by page and traffic source.",
    tags: ["analytics", "stats", "traffic", "visitors", "metrics"]
  },
  {
    id: "form-submissions",
    title: "How to view form submissions",
    category: "Website Management",
    content: "Click on 'Form Submissions' in your dashboard or sidebar. You'll see all contact form entries from your website including name, email, message, and submission date. You can export submissions to CSV or reply directly via email. New submissions trigger an email notification to your registered email address.",
    tags: ["forms", "contact", "submissions", "leads", "inquiries"]
  },

  // Stock Photos
  {
    id: "search-stock-photos",
    title: "How to search for stock photos",
    category: "Stock Photos",
    content: "Navigate to 'Stock Photos' from your dashboard. Enter search terms (e.g., 'office', 'team meeting', 'laptop'). Use filters to refine by Content Type (Photos, Vectors, Icons) and Orientation (Horizontal, Vertical, Square). Click 'Load More' to see additional results. All photos are professionally licensed through Freepik.",
    tags: ["stock photos", "search", "images", "pictures", "freepik"]
  },
  {
    id: "download-quota",
    title: "Understanding your download quota",
    category: "Stock Photos",
    content: "Basic plan: 5 downloads per month. Professional plan: 20 downloads per month. Your quota resets on the 1st of each month. Downloaded photos are stored in your website assets and can be used unlimited times in change requests. If you need more downloads, consider upgrading to Professional or wait for the monthly reset.",
    tags: ["quota", "limit", "downloads", "stock photos", "monthly"]
  },
  {
    id: "photo-storage",
    title: "How downloaded photos are stored",
    category: "Stock Photos",
    content: "When you download a stock photo, it's automatically saved to your Website Assets library. You can access these anytime from your dashboard. When requesting website changes, simply reference the photo name or attach it from your assets. Photos remain in your library even after your quota resets.",
    tags: ["storage", "assets", "library", "saved", "photos"]
  },
  {
    id: "use-stock-photos",
    title: "Using stock photos in change requests",
    category: "Stock Photos",
    content: "When submitting a change request, you can: 1) Attach a stock photo from your library, 2) Reference the photo by name in your request description, or 3) Tell us where on your site you want it placed. Example: 'Replace hero image with [photo-name.jpg] from my stock photo library'.",
    tags: ["using photos", "change requests", "attach", "images"]
  },

  // Support & Tickets
  {
    id: "create-ticket",
    title: "How to create a support ticket",
    category: "Support & Tickets",
    content: "Click 'Submit Change Request' or 'New Ticket' from your dashboard. Choose a category (Website Change, Technical Issue, Billing Question, General Inquiry). Provide a clear title and detailed description. Attach screenshots or files if helpful. Submit and you'll receive a ticket number for tracking.",
    tags: ["ticket", "support", "help", "create", "submit"]
  },
  {
    id: "track-ticket",
    title: "How to track ticket status",
    category: "Support & Tickets",
    content: "View all your tickets in the 'Change Requests' section of your dashboard. Ticket statuses include: Open (we're working on it), Pending (waiting for your input), In Progress (actively being worked on), and Closed (resolved). Click any ticket to view the full conversation and updates.",
    tags: ["status", "tracking", "tickets", "progress", "updates"]
  },
  {
    id: "response-time",
    title: "Response time expectations",
    category: "Support & Tickets",
    content: "Basic plan: Response within 24 business hours. Professional plan: Priority response within 12 business hours. Simple questions are answered same-day. Website changes typically take 2-3 business days depending on complexity. We work Monday-Friday, 9am-5pm AEST.",
    tags: ["response time", "sla", "turnaround", "speed", "priority"]
  },
  {
    id: "ticket-attachments",
    title: "How to add attachments to tickets",
    category: "Support & Tickets",
    content: "When creating or replying to a ticket, click the paperclip icon or 'Attach File' button. You can upload images (PNG, JPG), documents (PDF, DOC), or screenshots. Maximum file size: 10MB per file. Attachments help us understand your request better, especially for design changes.",
    tags: ["attachments", "files", "upload", "screenshots", "documents"]
  },

  // Billing & Subscription
  {
    id: "plans-explained",
    title: "Understanding your plan",
    category: "Billing & Subscription",
    content: "Basic Plan ($29/month): Website hosting, SSL certificate, 5 stock photo downloads, email support, website analytics, unlimited form submissions. Professional Plan ($49/month): Everything in Basic, plus 20 stock photo downloads, priority support, advanced analytics. All plans include unlimited bandwidth and storage.",
    tags: ["plans", "features", "pricing", "comparison", "included"]
  },
  {
    id: "upgrade-downgrade",
    title: "How to upgrade or downgrade",
    category: "Billing & Subscription",
    content: "Go to Account Settings > Subscription. Click 'Change Plan' and select your new plan. Upgrades take effect immediately and you'll be prorated. Downgrades take effect at the end of your current billing period. Your stock photo quota and support priority will adjust accordingly.",
    tags: ["upgrade", "downgrade", "change plan", "switch", "subscription"]
  },
  {
    id: "payment-method",
    title: "How to update payment method",
    category: "Billing & Subscription",
    content: "Navigate to Account Settings > Billing. Click 'Update Payment Method' and enter your new card details. Your next invoice will charge the new card. We accept Visa, Mastercard, American Express. All payments are processed securely through Stripe.",
    tags: ["payment", "credit card", "billing", "update", "card"]
  },
  {
    id: "payment-fails",
    title: "What happens if payment fails",
    category: "Billing & Subscription",
    content: "If your payment fails, we'll: 1) Send you an email notification, 2) Retry the payment automatically after 3 days, 3) If still failing after 7 days, your account is suspended (website stays live but no new changes), 4) After 30 days, services may be terminated. Update your payment method immediately to avoid service interruption.",
    tags: ["failed payment", "declined", "suspended", "account", "billing"]
  },

  // FAQ
  {
    id: "change-timeline",
    title: "How long do website changes take?",
    category: "FAQ",
    content: "Simple changes (text updates, color changes): 1-2 business days. Moderate changes (adding sections, photo swaps): 2-3 business days. Complex changes (new pages, major redesigns): 3-5 business days. Professional plan customers receive priority processing. Rush requests may be available - contact support.",
    tags: ["timeline", "turnaround", "how long", "wait time", "processing"]
  },
  {
    id: "photo-quota-runs-out",
    title: "What if I run out of stock photo downloads?",
    category: "FAQ",
    content: "If you've used all your monthly downloads: 1) Wait until the 1st of next month for your quota to reset, 2) Upgrade to Professional for 20 downloads/month instead of 5, or 3) Upload your own photos via change requests (no limits on personal photos). Your previously downloaded photos remain accessible.",
    tags: ["quota", "run out", "no downloads", "limit reached"]
  },
  {
    id: "visitor-stats",
    title: "Can I see my website's visitor stats?",
    category: "FAQ",
    content: "Yes! Your dashboard shows key metrics: total visitors, page views, bounce rate, and average session duration. Click 'View Full Analytics' for detailed breakdowns including: traffic sources, popular pages, visitor locations, and device types (mobile vs desktop). Analytics update every 24 hours.",
    tags: ["stats", "analytics", "visitors", "traffic", "data"]
  },
  {
    id: "cancel-subscription",
    title: "How do I cancel my subscription?",
    category: "FAQ",
    content: "Go to Account Settings > Subscription and click 'Cancel Subscription'. You'll have access until the end of your current billing period. Your website will remain live for 30 days after cancellation to allow time for migration. We'll provide a full website export upon request. No cancellation fees.",
    tags: ["cancel", "cancellation", "unsubscribe", "stop", "end"]
  },
  {
    id: "whats-included",
    title: "What's included in my plan?",
    category: "FAQ",
    content: "All plans include: professional website design, hosting on fast servers, SSL certificate (https), custom domain setup, contact form integration, website analytics, email notifications, regular backups, and ongoing support. Stock photo quotas and support priority vary by plan level.",
    tags: ["included", "features", "what do i get", "plan", "benefits"]
  },
];

const categories = [
  { name: "Getting Started", icon: BookOpen, color: "text-blue-500" },
  { name: "Website Management", icon: Settings, color: "text-purple-500" },
  { name: "Stock Photos", icon: Image, color: "text-green-500" },
  { name: "Support & Tickets", icon: Ticket, color: "text-orange-500" },
  { name: "Billing & Subscription", icon: CreditCard, color: "text-red-500" },
  { name: "FAQ", icon: HelpCircle, color: "text-gray-500" },
];

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Filter articles based on search query and selected category
  const filteredArticles = helpArticles.filter((article) => {
    const matchesSearch = 
      searchQuery === "" ||
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = !selectedCategory || article.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Group filtered articles by category
  const groupedArticles = filteredArticles.reduce((acc, article) => {
    if (!acc[article.category]) {
      acc[article.category] = [];
    }
    acc[article.category].push(article);
    return acc;
  }, {} as Record<string, Article[]>);

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Help Center</h1>
        <p className="text-muted-foreground">
          Find answers to common questions and learn how to make the most of your Bay Digital website
        </p>
      </div>

      {/* Search */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search for help articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Category Filters */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {categories.map((category) => (
          <Card
            key={category.name}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedCategory === category.name ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => setSelectedCategory(selectedCategory === category.name ? null : category.name)}
          >
            <CardContent className="p-4 flex flex-col items-center text-center space-y-2">
              <category.icon className={`h-6 w-6 ${category.color}`} />
              <span className="text-xs font-medium">{category.name}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active Filter Badge */}
      {selectedCategory && (
        <div className="mb-6">
          <Badge variant="secondary" className="cursor-pointer" onClick={() => setSelectedCategory(null)}>
            {selectedCategory} ✕
          </Badge>
        </div>
      )}

      {/* Results Count */}
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">
          {filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Articles */}
      {Object.keys(groupedArticles).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <HelpCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">No articles found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Try adjusting your search or browse by category
            </p>
            <Button variant="outline" onClick={() => { setSearchQuery(""); setSelectedCategory(null); }}>
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedArticles).map(([category, articles]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {categories.find(c => c.name === category)?.icon && (
                    <span className={categories.find(c => c.name === category)?.color}>
                      {(() => {
                        const Icon = categories.find(c => c.name === category)!.icon;
                        return <Icon className="h-5 w-5" />;
                      })()}
                    </span>
                  )}
                  {category}
                </CardTitle>
                <CardDescription>
                  {articles.length} article{articles.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {articles.map((article) => (
                    <AccordionItem key={article.id} value={article.id}>
                      <AccordionTrigger className="text-left">
                        {article.title}
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="text-sm text-muted-foreground mb-3">{article.content}</p>
                        <div className="flex flex-wrap gap-2">
                          {article.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Still Need Help */}
      <Card className="mt-8 bg-muted/50">
        <CardHeader>
          <CardTitle>Still need help?</CardTitle>
          <CardDescription>
            Can't find what you're looking for? Our support team is here to help.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild>
              <Link to="/dashboard">Submit a Support Ticket</Link>
            </Button>
            <Button variant="outline" asChild>
              <a href="mailto:support@bay.digital">Email Support</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
