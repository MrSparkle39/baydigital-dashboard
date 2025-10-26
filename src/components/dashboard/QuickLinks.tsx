import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Mail, Image, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const QuickLinks = () => {
  const navigate = useNavigate();
  
  const links = [
    { icon: Globe, label: "Manage Sites", action: () => navigate("/manage-sites") },
    { icon: BookOpen, label: "Help Center", href: "#" },
    { icon: Mail, label: "Contact Us", href: "#" },
    { icon: Image, label: "View Examples", href: "#" },
  ];

  return (
    <Card className="hover:shadow-md transition-all">
      <CardHeader>
        <CardTitle className="text-lg">Resources</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {links.map((link, index) => (
            link.action ? (
              <button
                key={index}
                onClick={link.action}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left"
              >
                <link.icon className="h-4 w-4 text-primary" />
                <span className="text-sm">{link.label}</span>
              </button>
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
