import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Sparkles, Share2, Facebook, Instagram, Image as ImageIcon, RefreshCw, Search, X, Type } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FreepikImage {
  id: string;
  title: string;
  thumbnail: { url: string };
  preview: { url: string };
}

interface SocialConnection {
  platform: string;
  page_name?: string;
  instagram_username?: string;
}

export default function SocialMediaManager() {
  const [postText, setPostText] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  
  // Image search state
  const [imageSearchQuery, setImageSearchQuery] = useState("");
  const [isSearchingImages, setIsSearchingImages] = useState(false);
  const [searchResults, setSearchResults] = useState<FreepikImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<FreepikImage | null>(null);
  const [postType, setPostType] = useState<"text" | "image">("text");
  
  const [platforms, setPlatforms] = useState({
    facebook: false,
    instagram: false
  });
  
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [isLoadingConnections, setIsLoadingConnections] = useState(true);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load social media connections
  useEffect(() => {
    loadConnections();
    
    // Check for OAuth callback results
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    const pageName = urlParams.get('page');
    
    if (success === 'true') {
      toast.success(
        <div>
          <p className="font-semibold">Successfully connected!</p>
          <p className="text-sm">Connected to: {pageName}</p>
        </div>
      );
      // Clean up URL
      window.history.replaceState({}, '', '/social-media');
      // Reload connections
      loadConnections();
    } else if (error) {
      toast.error(`Connection failed: ${decodeURIComponent(error)}`);
      // Clean up URL
      window.history.replaceState({}, '', '/social-media');
    }
  }, []);

  const loadConnections = async () => {
    try {
      const { data, error } = await supabase
        .from('social_media_connections')
        .select('platform, page_name, instagram_username');
      
      if (error) throw error;
      
      setConnections(data || []);
      
      // Auto-select connected platforms
      if (data) {
        const hasFacebook = data.some(c => c.platform === 'facebook');
        const hasInstagram = data.some(c => c.platform === 'facebook' && c.instagram_username);
        setPlatforms({
          facebook: hasFacebook,
          instagram: hasInstagram
        });
      }
    } catch (error) {
      console.error('Error loading connections:', error);
    } finally {
      setIsLoadingConnections(false);
    }
  };

  // Search for images using Freepik API
  const searchImages = async () => {
    if (!imageSearchQuery.trim()) {
      toast.error("Please enter a search term");
      return;
    }

    setIsSearchingImages(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/freepik-api`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({
            action: "search",
            query: imageSearchQuery,
            page: 1,
            limit: 9,
            filters: { type: "photo" }
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to search images");

      const data = await response.json();
      const images = data.data || [];
      
      setSearchResults(images.map((img: any) => ({
        id: img.id || String(Math.random()),
        title: img.title || "Stock Image",
        thumbnail: { url: img.thumbnail?.url || img.image?.source?.url },
        preview: { url: img.preview?.url || img.image?.source?.url || img.thumbnail?.url }
      })));
      
      if (images.length === 0) {
        toast.info("No images found. Try a different search term.");
      }
    } catch (error) {
      console.error("Error searching images:", error);
      toast.error("Failed to search images");
    } finally {
      setIsSearchingImages(false);
    }
  };

  const postToSocialMedia = async () => {
    if (!postText.trim()) {
      toast.error("Please enter post text");
      return;
    }

    if (!platforms.facebook && !platforms.instagram) {
      toast.error("Please select at least one platform");
      return;
    }

    // Instagram requires an image
    if (platforms.instagram && postType === "text") {
      toast.error("Instagram requires an image. Please add an image or deselect Instagram.");
      return;
    }

    setIsPosting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      let imageUrl = null;
      
      // If posting with image, get the image URL
      if (postType === "image" && selectedImage) {
        toast.info("Preparing image...");
        imageUrl = selectedImage.preview.url;
      }

      // Post to social media
      toast.info("Posting to social media...");
      const selectedPlatforms = [];
      if (platforms.facebook) selectedPlatforms.push('facebook');
      if (platforms.instagram) selectedPlatforms.push('instagram');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/post-to-social-media`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({
            postText: postText,
            imageUrl: imageUrl,
            platforms: selectedPlatforms,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to post");
      }

      const data = await response.json();
      
      if (data.success) {
        toast.success(
          <div>
            <p className="font-semibold">Posted successfully!</p>
            {data.facebook?.success && <p className="text-sm">✓ Facebook</p>}
            {data.instagram?.success && <p className="text-sm">✓ Instagram</p>}
          </div>
        );
        
        // Reset form
        setPostText("");
        setSelectedImage(null);
        setSearchResults([]);
        setImageSearchQuery("");
      } else {
        const errors = [];
        if (data.facebook?.error) errors.push(`Facebook: ${data.facebook.error}`);
        if (data.instagram?.error) errors.push(`Instagram: ${data.instagram.error}`);
        toast.error(`Some posts failed: ${errors.join(', ')}`);
      }
    } catch (error) {
      console.error("Error posting:", error);
      toast.error(error instanceof Error ? error.message : "Failed to post to social media");
    } finally {
      setIsPosting(false);
    }
  };

  const connectFacebook = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in first");
        return;
      }

      // Build Facebook OAuth URL with all required permissions
      const fbAppId = "1101737005230579";
      const redirectUri = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/facebook-oauth-callback`;
      // Include Instagram permissions and business_management for Business Portfolio pages
      const scope = "pages_show_list,pages_manage_posts,pages_read_user_content,pages_read_engagement,business_management,instagram_basic,instagram_content_publish";
      const state = user.id;

      const oauthUrl = 
        `https://www.facebook.com/v18.0/dialog/oauth?` +
        `client_id=${fbAppId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scope)}&` +
        `state=${state}&` +
        `response_type=code`;

      // Redirect to Facebook
      window.location.href = oauthUrl;
    } catch (error) {
      console.error("Error initiating Facebook connection:", error);
      toast.error("Failed to connect to Facebook");
    }
  };

  const hasFacebookConnection = connections.some(c => c.platform === 'facebook');
  const hasInstagramConnection = connections.some(c => c.platform === 'facebook' && c.instagram_username);
  const facebookPageName = connections.find(c => c.platform === 'facebook')?.page_name;
  const instagramUsername = connections.find(c => c.platform === 'facebook')?.instagram_username;

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-6 w-6 text-primary" />
            Social Media Manager
          </CardTitle>
          <CardDescription>
            Create and post content to Facebook and Instagram
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Connection Status */}
          {!isLoadingConnections && (
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold">Connected Accounts</h3>
                    <div className="flex gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Facebook className={`h-5 w-5 ${hasFacebookConnection ? 'text-blue-600' : 'text-gray-400'}`} />
                        <span className="text-sm">
                          {hasFacebookConnection ? facebookPageName || 'Connected' : 'Not connected'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Instagram className={`h-5 w-5 ${hasInstagramConnection ? 'text-pink-600' : 'text-gray-400'}`} />
                        <span className="text-sm">
                          {hasInstagramConnection ? `@${instagramUsername}` : 'Not connected'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button onClick={connectFacebook} variant="outline">
                    <Facebook className="h-4 w-4 mr-2" />
                    {hasFacebookConnection ? 'Reconnect' : 'Connect Facebook & Instagram'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Post Type Selection */}
          <div className="space-y-2">
            <Label>Post Type</Label>
            <Tabs value={postType} onValueChange={(v) => setPostType(v as "text" | "image")} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="text" className="flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  Text Only
                </TabsTrigger>
                <TabsTrigger value="image" className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  With Image
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Post Text */}
          <div className="space-y-2">
            <Label htmlFor="postText">Post Text</Label>
            <Textarea
              id="postText"
              placeholder="What do you want to share?"
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">{postText.length} characters</p>
          </div>

          {/* Image Search Section - Only show if image type selected */}
          {postType === "image" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Search for Image</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search Freepik for images..."
                    value={imageSearchQuery}
                    onChange={(e) => setImageSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchImages()}
                  />
                  <Button 
                    onClick={searchImages} 
                    disabled={isSearchingImages || !imageSearchQuery.trim()}
                    variant="secondary"
                  >
                    {isSearchingImages ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Selected Image Preview */}
              {selectedImage && (
                <div className="space-y-2">
                  <Label>Selected Image</Label>
                  <div className="relative inline-block">
                    <img
                      src={selectedImage.preview.url}
                      alt={selectedImage.title}
                      className="max-h-48 rounded-lg border"
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={() => setSelectedImage(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Image Search Results */}
              {searchResults.length > 0 && !selectedImage && (
                <div className="space-y-2">
                  <Label>Select an Image</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {searchResults.map((image) => (
                      <div
                        key={image.id}
                        onClick={() => setSelectedImage(image)}
                        className="cursor-pointer rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-all"
                      >
                        <img
                          src={image.thumbnail.url}
                          alt={image.title}
                          className="w-full h-24 object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {postType === "image" && !selectedImage && searchResults.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Search for an image above, or switch to "Text Only" for a text-only post.
                </p>
              )}
            </div>
          )}

          {/* Platform Selection */}
          <div className="space-y-2">
            <Label>Post to:</Label>
            <div className="flex gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="facebook"
                  checked={platforms.facebook}
                  onCheckedChange={(checked) => setPlatforms({ ...platforms, facebook: !!checked })}
                  disabled={!hasFacebookConnection}
                />
                <Label htmlFor="facebook" className="flex items-center gap-2 cursor-pointer">
                  <Facebook className="h-4 w-4 text-blue-600" />
                  Facebook
                  {!hasFacebookConnection && <span className="text-xs text-muted-foreground">(not connected)</span>}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="instagram"
                  checked={platforms.instagram}
                  onCheckedChange={(checked) => setPlatforms({ ...platforms, instagram: !!checked })}
                  disabled={!hasInstagramConnection || postType === "text"}
                />
                <Label htmlFor="instagram" className="flex items-center gap-2 cursor-pointer">
                  <Instagram className="h-4 w-4 text-pink-600" />
                  Instagram
                  {!hasInstagramConnection && <span className="text-xs text-muted-foreground">(not connected)</span>}
                  {hasInstagramConnection && postType === "text" && <span className="text-xs text-muted-foreground">(requires image)</span>}
                </Label>
              </div>
            </div>
          </div>

          {/* Post Button */}
          <Button
            onClick={postToSocialMedia}
            disabled={
              isPosting || 
              !postText.trim() || 
              (!platforms.facebook && !platforms.instagram) ||
              (postType === "image" && !selectedImage)
            }
            className="w-full"
            size="lg"
          >
            {isPosting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Posting...
              </>
            ) : (
              <>
                <Share2 className="mr-2 h-5 w-5" />
                Post Now
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
