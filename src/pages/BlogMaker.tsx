import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, ExternalLink, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const BlogMaker = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("professional");
  const [language, setLanguage] = useState("English");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState("");
  const [publishedUrl, setPublishedUrl] = useState("");

  // Fetch user's blog posts
  const { data: blogPosts, isLoading: postsLoading, refetch } = useQuery({
    queryKey: ['blogmaker-posts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blogmaker_posts')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast({
        title: "Topic Required",
        description: "Please enter a blog post topic or keyword",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setGenerationStatus("Generating blog post with AI...");
    setPublishedUrl("");

    try {
      // Call the generation API
      const { data, error } = await supabase.functions.invoke('generate-blog-post', {
        body: {
          topic,
          tone,
          language,
        },
      });

      if (error) throw error;

      if (data.success) {
        setPublishedUrl(data.published_url);
        setGenerationStatus("");
        toast({
          title: "Blog Post Published! 🎉",
          description: `Your blog post is now live at ${data.published_url}`,
        });
        
        // Reset form
        setTopic("");
        setTone("professional");
        setLanguage("English");
        
        // Refetch blog posts
        refetch();
      } else {
        throw new Error(data.error || "Failed to generate blog post");
      }
    } catch (error: any) {
      console.error('Error generating blog post:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate blog post. Please try again.",
        variant: "destructive",
      });
      setGenerationStatus("");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-purple-600" />
            Blog Maker
          </h2>
          <p className="text-muted-foreground">
            Generate SEO-optimized blog posts with AI and publish directly to your website.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Generation Form */}
          <Card>
            <CardHeader>
              <CardTitle>Generate New Blog Post</CardTitle>
              <CardDescription>
                Enter a topic and we'll create a professional blog post for your website
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="topic">Topic or Keyword</Label>
                <Input
                  id="topic"
                  placeholder="e.g., Best NDIS Providers Sydney"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  disabled={isGenerating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tone">Writing Tone</Label>
                <Select value={tone} onValueChange={setTone} disabled={isGenerating}>
                  <SelectTrigger id="tone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="authoritative">Authoritative</SelectItem>
                    <SelectItem value="conversational">Conversational</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select value={language} onValueChange={setLanguage} disabled={isGenerating}>
                  <SelectTrigger id="language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="Spanish">Spanish</SelectItem>
                    <SelectItem value="French">French</SelectItem>
                    <SelectItem value="German">German</SelectItem>
                    <SelectItem value="Italian">Italian</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !topic.trim()}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate & Publish to Website
                  </>
                )}
              </Button>

              {generationStatus && (
                <div className="text-sm text-muted-foreground text-center animate-pulse">
                  {generationStatus}
                </div>
              )}

              {publishedUrl && (
                <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
                    ✅ Blog post published successfully!
                  </p>
                  <a
                    href={publishedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-green-700 dark:text-green-300 hover:underline flex items-center gap-1"
                  >
                    {publishedUrl}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Blog Post History */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Blog Posts</CardTitle>
              <CardDescription>
                View your published blog posts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {postsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : blogPosts && blogPosts.length > 0 ? (
                <div className="space-y-3">
                  {blogPosts.slice(0, 10).map((post) => (
                    <div
                      key={post.id}
                      className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{post.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {new Date(post.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {post.published_url && (
                        <a
                          href={post.published_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-600 hover:text-purple-700"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No blog posts yet</p>
                  <p className="text-xs">Generate your first blog post to get started!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default BlogMaker;
