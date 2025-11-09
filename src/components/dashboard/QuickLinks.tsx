import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Mail, Image, Share2 } from "lucide-react";
import { Link } from "react-router-dom";

export const QuickLinks = () => {
  const links = [
    { icon: Image, label: "Stock Photos", href: "/stock-photos", isLink: true },
    { icon: BookOpen, label: "Help Center", href: "#", isLink: false },
    { icon: Mail, label: "Contact Us", href: "#", isLink: false },
    { icon: Share2, label: "Share Your Site", href: "#", isLink: false },
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
