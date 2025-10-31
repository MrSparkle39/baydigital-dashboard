import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { NotificationBell } from "@/components/NotificationBell";

function AdminLayoutContent() {
  const { signOut } = useAuth();
  const { setOpenMobile } = useSidebar();
  const location = useLocation();
  const isMobile = useIsMobile();

  // Close sidebar on mobile after navigation
  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [location.pathname, isMobile, setOpenMobile]);

  return (
    <div className="min-h-screen flex w-full">
      <AdminSidebar />
      <div className="flex-1 flex flex-col">
        <header className="h-14 border-b flex items-center justify-between px-4 bg-background">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  return (
    <SidebarProvider defaultOpen={false}>
      <AdminLayoutContent />
    </SidebarProvider>
  );
}
