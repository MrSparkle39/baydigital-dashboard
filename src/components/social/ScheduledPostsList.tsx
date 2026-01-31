import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { Calendar, Clock, Facebook, Instagram, Trash2, Loader2, RefreshCw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ScheduledPost {
  id: string;
  post_text: string;
  image_url: string | null;
  platforms: string[];
  scheduled_at: string;
  status: string;
  created_at: string;
}

export default function ScheduledPostsList() {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadScheduledPosts();
  }, []);

  const loadScheduledPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('social_media_posts')
        .select('id, post_text, image_url, platforms, scheduled_at, status, created_at')
        .in('status', ['scheduled', 'draft'])
        .not('scheduled_at', 'is', null)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error loading scheduled posts:', error);
      toast.error('Failed to load scheduled posts');
    } finally {
      setIsLoading(false);
    }
  };

  const deletePost = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('social_media_posts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setPosts(posts.filter(p => p.id !== id));
      toast.success('Scheduled post deleted');
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status: string, scheduledAt: string) => {
    const isOverdue = new Date(scheduledAt) < new Date() && status === 'scheduled';
    
    if (isOverdue) {
      return <Badge variant="destructive">Processing</Badge>;
    }
    
    switch (status) {
      case 'scheduled':
        return <Badge variant="secondary">Scheduled</Badge>;
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-2">Loading scheduled posts...</p>
        </CardContent>
      </Card>
    );
  }

  if (posts.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Calendar className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No scheduled posts yet</p>
          <p className="text-sm text-muted-foreground">Create a post above and schedule it for later</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Scheduled Posts ({posts.length})
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={loadScheduledPosts}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {posts.map((post) => (
          <div 
            key={post.id} 
            className="flex gap-4 p-4 border rounded-lg bg-muted/30"
          >
            {/* Image thumbnail */}
            {post.image_url && (
              <div className="flex-shrink-0">
                <img 
                  src={post.image_url} 
                  alt="Post image"
                  className="w-16 h-16 object-cover rounded"
                />
              </div>
            )}
            
            {/* Content */}
            <div className="flex-grow min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {getStatusBadge(post.status, post.scheduled_at)}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {format(new Date(post.scheduled_at), 'MMM d, yyyy h:mm a')}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {post.platforms.includes('facebook') && (
                    <Facebook className="h-4 w-4 text-blue-600" />
                  )}
                  {post.platforms.includes('instagram') && (
                    <Instagram className="h-4 w-4 text-pink-600" />
                  )}
                </div>
              </div>
              
              <p className="text-sm line-clamp-2">{post.post_text}</p>
            </div>

            {/* Delete button */}
            <div className="flex-shrink-0">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    disabled={deletingId === post.id}
                  >
                    {deletingId === post.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Scheduled Post</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this scheduled post? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deletePost(post.id)}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
