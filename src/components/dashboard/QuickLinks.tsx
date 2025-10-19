import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Mail, Image, Share2 } from "lucide-react";

export const QuickLinks = () => {
  const links = [
    { icon: BookOpen, label: "Help Center", href: "#" },
    { icon: Mail, label: "Contact Us", href: "#" },
    { icon: Image, label: "View Examples", href: "#" },
    { icon: Share2, label: "Share Your Site", href: "#" },
  ];

  return (
    <Card className="hover:shadow-md transition-all">
      <CardHeader>
        <CardTitle className="text-lg">Resources</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {links.map((link, index) => (
            <a
              key={index}
              href={link.href}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <link.icon className="h-4 w-4 text-primary" />
              <span className="text-sm">{link.label}</span>
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
