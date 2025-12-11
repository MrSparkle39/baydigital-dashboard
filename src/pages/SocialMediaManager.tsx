import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Sparkles, Share2, Facebook, Instagram, Image as ImageIcon, RefreshCw } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

interface GeneratedPost {
  post_text: string;
  headline: string;
  images: Array<{
    id: string;
    url: string;
    thumbnail: string;
  }>;
}

interface SocialConnection {
  platform: string;
  page_name?: string;
  instagram_username?: string;
}

export default function SocialMediaManager() {
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("professional");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  
  const [generatedPost, setGeneratedPost] = useState<GeneratedPost | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string>("");
  const [editedPostText, setEditedPostText] = useState("");
  const [editedHeadline, setEditedHeadline] = useState("");
  
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

  const generatePost = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    setIsGenerating(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-social-post`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({
            topic,
            tone,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to generate post");

      const data = await response.json();
      setGeneratedPost(data);
      setEditedPostText(data.post_text);
      setEditedHeadline(data.headline);
      
      if (data.images && data.images.length > 0) {
        setSelectedImageId(data.images[0].id);
      }
      
      toast.success("Post generated successfully!");
    } catch (error) {
      console.error("Error generating post:", error);
      toast.error("Failed to generate post");
    } finally {
      setIsGenerating(false);
    }
  };

  const createBrandedImage = async (): Promise<string> => {
    if (!generatedPost || !selectedImageId) {
      throw new Error("No image selected");
    }

    const selectedImage = generatedPost.images.find(img => img.id === selectedImageId);
    if (!selectedImage) {
      throw new Error("Selected image not found");
    }

    // Get brand color from user settings (default to TIC teal)
    const brandColor = "#00bcd4"; // TODO: Get from user settings
    
    const canvas = canvasRef.current;
    if (!canvas) throw new Error("Canvas not available");
    
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Canvas context not available");

    // Set canvas size for Instagram square
    canvas.width = 1080;
    canvas.height = 1080;

    // Load and draw image
    await new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        // Draw image (cover fit)
        const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
        const x = (canvas.width / 2) - (img.width / 2) * scale;
        const y = (canvas.height / 2) - (img.height / 2) * scale;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        
        // Add brand color overlay
        ctx.fillStyle = brandColor + '40'; // 25% opacity
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add headline text
        ctx.font = 'bold 80px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;
        
        // Word wrap headline
        const words = editedHeadline.split(' ');
        const lines: string[] = [];
        let currentLine = words[0];
        
        for (let i = 1; i < words.length; i++) {
          const testLine = currentLine + ' ' + words[i];
          const metrics = ctx.measureText(testLine);
          if (metrics.width > canvas.width - 100) {
            lines.push(currentLine);
            currentLine = words[i];
          } else {
            currentLine = testLine;
          }
        }
        lines.push(currentLine);
        
        // Draw lines
        const lineHeight = 90;
        const startY = (canvas.height / 2) - ((lines.length - 1) * lineHeight / 2);
        lines.forEach((line, index) => {
          ctx.fillText(line, canvas.width / 2, startY + (index * lineHeight));
        });
        
        resolve(true);
      };
      img.onerror = reject;
      img.src = selectedImage.url;
    });

    // Convert canvas to blob
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.95);
    });

    // Upload to Supabase Storage
    const fileName = `social-post-${Date.now()}.jpg`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('social-media-images')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('social-media-images')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const postToSocialMedia = async () => {
    if (!editedPostText.trim()) {
      toast.error("Please enter post text");
      return;
    }

    if (!platforms.facebook && !platforms.instagram) {
      toast.error("Please select at least one platform");
      return;
    }

    setIsPosting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      // Create branded image
      toast.info("Creating branded image...");
      const imageUrl = await createBrandedImage();

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
            postText: editedPostText,
            imageUrl,
            headline: editedHeadline,
            platforms: selectedPlatforms,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to post");

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
        setTopic("");
        setGeneratedPost(null);
        setEditedPostText("");
        setEditedHeadline("");
        setSelectedImageId("");
      } else {
        toast.error("Some posts failed. Check the results.");
      }
    } catch (error) {
      console.error("Error posting:", error);
      toast.error("Failed to post to social media");
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

      // Build Facebook OAuth URL - using only permissions available without app review
      const fbAppId = "1101737005230579";
      const redirectUri = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/facebook-oauth-callback`;
      // Need pages_read_user_content to see the list of pages via /me/accounts
      const scope = "pages_show_list,pages_manage_posts,pages_read_user_content";
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

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-6 w-6 text-primary" />
            Social Media Manager
          </CardTitle>
          <CardDescription>
            Generate and post engaging content to Facebook and Instagram in seconds
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Connection Status */}
          {!isLoadingConnections && (
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <h3 className="font-semibold">Connected Accounts</h3>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2">
                        <Facebook className={`h-5 w-5 ${hasFacebookConnection ? 'text-blue-600' : 'text-gray-400'}`} />
                        <span className="text-sm">
                          {hasFacebookConnection ? 'Connected' : 'Not connected'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Instagram className={`h-5 w-5 ${hasInstagramConnection ? 'text-pink-600' : 'text-gray-400'}`} />
                        <span className="text-sm">
                          {hasInstagramConnection ? 'Connected' : 'Not connected'}
                        </span>
                      </div>
                    </div>
                  </div>
                  {!hasFacebookConnection && (
                    <Button onClick={connectFacebook} variant="outline">
                      <Facebook className="h-4 w-4 mr-2" />
                      Connect Facebook
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 1: Generate Post */}
          {!generatedPost && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="topic">What do you want to post about?</Label>
                <Textarea
                  id="topic"
                  placeholder="E.g., We're hiring support workers in Sydney"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  rows={3}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Tone</Label>
                <RadioGroup value={tone} onValueChange={setTone} className="flex gap-4 mt-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="professional" id="professional" />
                    <Label htmlFor="professional">Professional</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="friendly" id="friendly" />
                    <Label htmlFor="friendly">Friendly</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="casual" id="casual" />
                    <Label htmlFor="casual">Casual</Label>
                  </div>
                </RadioGroup>
              </div>

              <Button 
                onClick={generatePost} 
                disabled={isGenerating || !topic.trim()}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Generate Post
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Step 2: Preview & Edit */}
          {generatedPost && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Preview & Edit</h3>
                <Button
                  onClick={() => {
                    setGeneratedPost(null);
                    setEditedPostText("");
                    setEditedHeadline("");
                    setSelectedImageId("");
                  }}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Start Over
                </Button>
              </div>

              {/* Image Selection */}
              {generatedPost.images.length > 0 && (
                <div>
                  <Label>Select Image</Label>
                  <div className="grid grid-cols-3 gap-4 mt-2">
                    {generatedPost.images.map((image) => (
                      <div
                        key={image.id}
                        onClick={() => setSelectedImageId(image.id)}
                        className={`cursor-pointer rounded-lg overflow-hidden border-4 transition-all ${
                          selectedImageId === image.id
                            ? 'border-primary shadow-lg'
                            : 'border-transparent hover:border-gray-300'
                        }`}
                      >
                        <img
                          src={image.thumbnail}
                          alt="Post image option"
                          className="w-full h-40 object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Headline */}
              <div>
                <Label htmlFor="headline">Image Headline</Label>
                <Input
                  id="headline"
                  value={editedHeadline}
                  onChange={(e) => setEditedHeadline(e.target.value)}
                  placeholder="Short, punchy headline"
                  className="mt-2"
                />
              </div>

              {/* Post Text */}
              <div>
                <Label htmlFor="postText">Post Text</Label>
                <Textarea
                  id="postText"
                  value={editedPostText}
                  onChange={(e) => setEditedPostText(e.target.value)}
                  rows={6}
                  className="mt-2"
                />
              </div>

              {/* Platform Selection */}
              <div>
                <Label>Post to:</Label>
                <div className="flex gap-4 mt-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="facebook"
                      checked={platforms.facebook}
                      onCheckedChange={(checked) => setPlatforms({ ...platforms, facebook: !!checked })}
                      disabled={!hasFacebookConnection}
                    />
                    <Label htmlFor="facebook" className="flex items-center gap-2">
                      <Facebook className="h-4 w-4 text-blue-600" />
                      Facebook
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="instagram"
                      checked={platforms.instagram}
                      onCheckedChange={(checked) => setPlatforms({ ...platforms, instagram: !!checked })}
                      disabled={!hasInstagramConnection}
                    />
                    <Label htmlFor="instagram" className="flex items-center gap-2">
                      <Instagram className="h-4 w-4 text-pink-600" />
                      Instagram
                    </Label>
                  </div>
                </div>
              </div>

              {/* Post Button */}
              <Button
                onClick={postToSocialMedia}
                disabled={isPosting || (!platforms.facebook && !platforms.instagram)}
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
