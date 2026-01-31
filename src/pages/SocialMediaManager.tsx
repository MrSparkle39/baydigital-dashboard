import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Sparkles, Share2, Facebook, Instagram, Image as ImageIcon, Search, X, Type, Upload, ChevronDown, Calendar } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PostScheduler from "@/components/social/PostScheduler";
import ScheduledPostsList from "@/components/social/ScheduledPostsList";

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
  const [isScheduling, setIsScheduling] = useState(false);
  
  // Image search state
  const [imageSearchQuery, setImageSearchQuery] = useState("");
  const [isSearchingImages, setIsSearchingImages] = useState(false);
  const [searchResults, setSearchResults] = useState<FreepikImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<FreepikImage | null>(null);
  const [postType, setPostType] = useState<"text" | "image">("text");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreImages, setHasMoreImages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Custom image upload state
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // AI caption state
  const [captionMode, setCaptionMode] = useState<"manual" | "ai">("manual");
  const [aiTopic, setAiTopic] = useState("");
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  
  // Post mode: immediate or schedule
  const [postMode, setPostMode] = useState<"now" | "schedule">("now");
  const [scheduledPostsKey, setScheduledPostsKey] = useState(0);
  
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
  const searchImages = async (page = 1, append = false) => {
    if (!imageSearchQuery.trim()) {
      toast.error("Please enter a search term");
      return;
    }

    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsSearchingImages(true);
      setSearchResults([]);
    }
    
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
            page: page,
            limit: 12,
            filters: { type: "photo" }
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to search images");

      const data = await response.json();
      const images = data.data || [];
      
      const mappedImages = images.map((img: any) => ({
        id: img.id || String(Math.random()),
        title: img.title || "Stock Image",
        thumbnail: { url: img.thumbnail?.url || img.image?.source?.url },
        preview: { url: img.preview?.url || img.image?.source?.url || img.thumbnail?.url }
      }));
      
      if (append) {
        setSearchResults(prev => [...prev, ...mappedImages]);
      } else {
        setSearchResults(mappedImages);
      }
      
      setCurrentPage(page);
      // Check if there are more images (Freepik typically returns metadata about total)
      setHasMoreImages(images.length === 12);
      
      if (images.length === 0 && !append) {
        toast.info("No images found. Try a different search term.");
      }
    } catch (error) {
      console.error("Error searching images:", error);
      toast.error("Failed to search images");
    } finally {
      setIsSearchingImages(false);
      setIsLoadingMore(false);
    }
  };

  const loadMoreImages = () => {
    searchImages(currentPage + 1, true);
  };

  // Handle custom image upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be less than 10MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setUploadedImage(result);
      setSelectedImage(null); // Clear any selected stock image
    };
    reader.readAsDataURL(file);
  };

  // Generate AI caption
  const generateAICaption = async () => {
    setIsGeneratingCaption(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-social-caption`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({
            topic: aiTopic,
            platform: platforms.instagram ? 'Instagram' : 'Facebook',
            tone: 'professional and friendly'
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate caption");
      }

      const data = await response.json();
      setPostText(data.caption);
      toast.success("Caption generated!");
    } catch (error) {
      console.error("Error generating caption:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate caption");
    } finally {
      setIsGeneratingCaption(false);
    }
  };

  const resetForm = () => {
    setPostText("");
    setSelectedImage(null);
    setUploadedImage(null);
    setSearchResults([]);
    setImageSearchQuery("");
    setAiTopic("");
    setPostMode("now");
    // Refresh scheduled posts list
    setScheduledPostsKey(prev => prev + 1);
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
      if (postType === "image") {
        if (uploadedImage) {
          toast.info("Preparing image...");
          imageUrl = uploadedImage;
        } else if (selectedImage) {
          toast.info("Preparing image...");
          imageUrl = selectedImage.preview.url;
        }
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
        
        resetForm();
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

  const schedulePost = async (scheduledAt: Date) => {
    if (!postText.trim()) {
      toast.error("Please enter post text");
      return;
    }

    if (!platforms.facebook && !platforms.instagram) {
      toast.error("Please select at least one platform");
      return;
    }

    if (platforms.instagram && postType === "text") {
      toast.error("Instagram requires an image. Please add an image or deselect Instagram.");
      return;
    }

    setIsScheduling(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let imageUrl = null;
      if (postType === "image") {
        if (uploadedImage) {
          imageUrl = uploadedImage;
        } else if (selectedImage) {
          imageUrl = selectedImage.preview.url;
        }
      }

      const selectedPlatforms = [];
      if (platforms.facebook) selectedPlatforms.push('facebook');
      if (platforms.instagram) selectedPlatforms.push('instagram');

      console.log('Scheduling post with data:', {
        user_id: user.id,
        post_text: postText.substring(0, 50) + '...',
        image_url: imageUrl ? 'has image' : null,
        platforms: selectedPlatforms,
        scheduled_at: scheduledAt.toISOString(),
        status: 'scheduled'
      });

      const { data, error } = await supabase
        .from('social_media_posts')
        .insert({
          user_id: user.id,
          post_text: postText,
          image_url: imageUrl,
          platforms: selectedPlatforms,
          scheduled_at: scheduledAt.toISOString(),
          status: 'scheduled'
        })
        .select();

      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }

      console.log('Post scheduled successfully:', data);
      toast.success(`Post scheduled for ${scheduledAt.toLocaleString()}`);
      resetForm();
    } catch (error) {
      console.error("Error scheduling post:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to schedule post";
      toast.error(errorMessage);
    } finally {
      setIsScheduling(false);
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

  const clearSelectedImage = () => {
    setSelectedImage(null);
    setUploadedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const hasFacebookConnection = connections.some(c => c.platform === 'facebook');
  const hasInstagramConnection = connections.some(c => c.platform === 'facebook' && c.instagram_username);
  const facebookPageName = connections.find(c => c.platform === 'facebook')?.page_name;
  const instagramUsername = connections.find(c => c.platform === 'facebook')?.instagram_username;
  const hasImage = selectedImage || uploadedImage;

  const canPost = postText.trim() && 
    (platforms.facebook || platforms.instagram) && 
    !(postType === "image" && !hasImage);

  return (
    <div className="container mx-auto py-8 max-w-4xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-6 w-6 text-primary" />
            Social Media Manager
          </CardTitle>
          <CardDescription>
            Create and schedule content for Facebook and Instagram
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
                        <Facebook className={`h-5 w-5 ${hasFacebookConnection ? 'text-[hsl(221,44%,41%)]' : 'text-muted-foreground'}`} />
                        <span className="text-sm">
                          {hasFacebookConnection ? facebookPageName || 'Connected' : 'Not connected'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Instagram className={`h-5 w-5 ${hasInstagramConnection ? 'text-[hsl(340,82%,52%)]' : 'text-muted-foreground'}`} />
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

          {/* Caption Mode Selection */}
          <div className="space-y-2">
            <Label>Caption</Label>
            <Tabs value={captionMode} onValueChange={(v) => setCaptionMode(v as "manual" | "ai")} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual" className="flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  Write Your Own
                </TabsTrigger>
                <TabsTrigger value="ai" className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  AI Generated
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* AI Caption Generator */}
          {captionMode === "ai" && (
            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
              <div className="space-y-2">
                <Label htmlFor="aiTopic">What is your post about? (optional)</Label>
                <Input
                  id="aiTopic"
                  placeholder="e.g., New product launch, Holiday sale, Team update..."
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                />
              </div>
              <Button 
                onClick={generateAICaption} 
                disabled={isGeneratingCaption}
                variant="secondary"
                className="w-full"
              >
                {isGeneratingCaption ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Caption
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Post Text */}
          <div className="space-y-2">
            <Label htmlFor="postText">
              {captionMode === "ai" ? "Generated Caption (edit if needed)" : "Post Text"}
            </Label>
            <Textarea
              id="postText"
              placeholder="What do you want to share?"
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">{postText.length} characters</p>
          </div>

          {/* Image Section - Only show if image type selected */}
          {postType === "image" && (
            <div className="space-y-4">
              {/* Upload Your Own */}
              <div className="space-y-2">
                <Label>Upload Your Own Image</Label>
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choose Image
                  </Button>
                </div>
              </div>

              {/* OR Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or search stock photos</span>
                </div>
              </div>

              {/* Stock Photo Search */}
              <div className="space-y-2">
                <Label>Search Stock Photos</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search for stock photos..."
                    value={imageSearchQuery}
                    onChange={(e) => setImageSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchImages(1, false)}
                  />
                  <Button 
                    onClick={() => searchImages(1, false)} 
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

              {/* Selected/Uploaded Image Preview */}
              {hasImage && (
                <div className="space-y-2">
                  <Label>Selected Image</Label>
                  <div className="relative inline-block">
                    <img
                      src={uploadedImage || selectedImage?.preview.url}
                      alt={selectedImage?.title || "Uploaded image"}
                      className="max-h-48 rounded-lg border"
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={clearSelectedImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Image Search Results */}
              {searchResults.length > 0 && !hasImage && (
                <div className="space-y-3">
                  <Label>Select an Image</Label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {searchResults.map((image) => (
                      <div
                        key={image.id}
                        onClick={() => {
                          setSelectedImage(image);
                          setUploadedImage(null);
                        }}
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
                  
                  {/* Load More Button */}
                  {hasMoreImages && (
                    <Button 
                      variant="outline" 
                      onClick={loadMoreImages}
                      disabled={isLoadingMore}
                      className="w-full"
                    >
                      {isLoadingMore ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-2" />
                          Load More Photos
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}

              {postType === "image" && !hasImage && searchResults.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Upload your own image or search for stock photos above.
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
                  <Facebook className="h-4 w-4 text-[hsl(221,44%,41%)]" />
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
                  <Instagram className="h-4 w-4 text-[hsl(340,82%,52%)]" />
                  Instagram
                  {!hasInstagramConnection && <span className="text-xs text-muted-foreground">(not connected)</span>}
                  {hasInstagramConnection && postType === "text" && <span className="text-xs text-muted-foreground">(requires image)</span>}
                </Label>
              </div>
            </div>
          </div>

          {/* Post Mode Selection */}
          <div className="space-y-2">
            <Label>When to post</Label>
            <Tabs value={postMode} onValueChange={(v) => setPostMode(v as "now" | "schedule")} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="now" className="flex items-center gap-2">
                  <Share2 className="h-4 w-4" />
                  Post Now
                </TabsTrigger>
                <TabsTrigger value="schedule" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Schedule
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Post Now Button or Scheduler */}
          {postMode === "now" ? (
            <Button
              onClick={postToSocialMedia}
              disabled={isPosting || !canPost}
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
          ) : (
            <PostScheduler 
              onSchedule={schedulePost} 
              isLoading={isScheduling}
              disabled={!canPost}
            />
          )}
        </CardContent>
      </Card>

      {/* Scheduled Posts List */}
      <ScheduledPostsList key={scheduledPostsKey} />

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
