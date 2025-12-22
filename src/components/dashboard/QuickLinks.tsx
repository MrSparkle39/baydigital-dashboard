import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Mail, Image, Share2, Sparkles, Megaphone, Inbox } from "lucide-react";
import { Link } from "react-router-dom";

export const QuickLinks = () => {
  const links = [
    { icon: Sparkles, label: "Blog Maker", href: "/blogmaker", isLink: true },
    { icon: Megaphone, label: "Social Media Manager", href: "/social-media", isLink: true },
    { icon: Inbox, label: "Email Client", href: "/email", isLink: true },
    { icon: Image, label: "Stock Photos", href: "/stock-photos", isLink: true },
    { icon: BookOpen, label: "Help Center", href: "/help-center", isLink: true },
    { icon: Mail, label: "Contact Us", href: "/contact-us", isLink: true },
    { icon: Share2, label: "Share Your Site", href: "/share-your-site", isLink: true },
  ];

  return (
    <Card className="hover:shadow-md transition-all">
      <CardHeader>
        <CardTitle className="text-lg">Resources</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {links.map((link, index) => (
            link.isLink ? (
              <Link
                key={index}
                to={link.href}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <link.icon className="h-4 w-4 text-primary" />
                <span className="text-sm">{link.label}</span>
              </Link>
            ) : (
              <a
                key={index}
                href={link.href}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <link.icon className="h-4 w-4 text-primary" />
                <span className="text-sm">{link.label}</span>
              </a>
            )
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
