import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Sparkles, Image as ImageIcon, Eye, Send } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FreepikImage {
  id: string;
  url: string;
  thumbnail: string;
  title: string;
}

interface BlogPost {
  title: string;
  metaTitle: string;
  metaDescription: string;
  bodyHtml: string;
  slug: string;
  images: {
    main: string;
    secondary: string[];
  };
}

export default function BlogMaker() {
  // Step management
  const [currentStep, setCurrentStep] = useState<'input' | 'images' | 'preview'>('input');
  
  // Input mode
  const [inputMode, setInputMode] = useState<'quick' | 'detailed'>('quick');
  
  // Form data
  const [topic, setTopic] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [keyPoints, setKeyPoints] = useState("");
  const [angle, setAngle] = useState("");
  const [keywords, setKeywords] = useState("");
  const [cta, setCta] = useState("");
  const [tone, setTone] = useState("professional");
  const [language, setLanguage] = useState("English");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  
  // Image selection
  const [imageSearch, setImageSearch] = useState("");
  const [searchResults, setSearchResults] = useState<FreepikImage[]>([]);
  const [selectedImages, setSelectedImages] = useState<FreepikImage[]>([]);
  const [mainImageId, setMainImageId] = useState<string>("");
  const [loadingImages, setLoadingImages] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreResults, setHasMoreResults] = useState(false);
  
  // Preview & editing
  const [blogPost, setBlogPost] = useState<BlogPost | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  
  // Search Freepik images
  const searchImages = async (loadMore = false) => {
    if (!imageSearch.trim()) {
      toast.error("Please enter a search term");
      return;
    }

    const pageToFetch = loadMore ? currentPage + 1 : 1;
    
    setLoadingImages(true);
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
            action: 'search',
            query: imageSearch,
            page: pageToFetch,
            limit: 20
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to search images");
      }

      const data = await response.json();
      
      console.log('Freepik API full response structure:', JSON.stringify(data.data?.[0], null, 2)); // Full response
      
      // Normalize Freepik data into a common image shape
      const images = (data.data || []).map((item: any) => {
        console.log('Processing item:', item.id, 'Full item:', item); // Log each item
        
        // Freepik's img.b2bpic.net URLs have broken SSL certificates
        // We'll use Freepik CDN pattern instead: convert the source URL
        let thumbnailUrl = null;
        let mainUrl = null;
        
        // Get the source URL and try to construct a working Freepik CDN URL
        const sourceUrl = item.image?.source?.url;
        
        if (sourceUrl && sourceUrl.includes('img.b2bpic.net')) {
          // Replace broken domain with Freepik CDN
          thumbnailUrl = sourceUrl.replace('img.b2bpic.net', 'img.freepik.com');
          mainUrl = thumbnailUrl;
        } else if (sourceUrl) {
          thumbnailUrl = sourceUrl;
          mainUrl = sourceUrl;
        } else {
          // Fallback to webpage URL if no image source
          mainUrl = item.url;
          thumbnailUrl = item.url;
        }
        
        console.log('Final URLs:', { 
          id: item.id, 
          thumbnail: thumbnailUrl,
          main: mainUrl,
          originalSource: sourceUrl?.substring(0, 80)
        });
        
        return {
          id: String(item.id),
          url: mainUrl,
          thumbnail: thumbnailUrl,
          title: item.title || item.description || 'Untitled',
        } as FreepikImage;
      });
      
      // Append or replace results based on loadMore flag
      if (loadMore) {
        setSearchResults(prev => [...prev, ...images]);
        setCurrentPage(pageToFetch);
      } else {
        setSearchResults(images);
        setCurrentPage(1);
      }
      
      // Check if there are more results available
      setHasMoreResults(images.length === 20);
      
      if (images.length === 0 && !loadMore) {
        toast.info("No images found. Try a different search term.");
      }
    } catch (error) {
      console.error("Error searching images:", error);
      toast.error(error instanceof Error ? error.message : "Failed to search images");
    } finally {
      setLoadingImages(false);
    }
  };

  // Select/deselect image
  const toggleImageSelection = (image: FreepikImage) => {
    if (selectedImages.find(img => img.id === image.id)) {
      // Deselect
      setSelectedImages(selectedImages.filter(img => img.id !== image.id));
      if (mainImageId === image.id) {
        setMainImageId("");
      }
    } else {
      // Select (max 3)
      if (selectedImages.length >= 3) {
        toast.error("You can only select up to 3 images");
        return;
      }
      setSelectedImages([...selectedImages, image]);
      // Auto-set as main if it's the first one
      if (selectedImages.length === 0) {
        setMainImageId(image.id);
      }
    }
  };

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a PDF, Word document, or text file");
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setUploadedFile(file);
    
    // For text files, read directly
    if (file.type === 'text/plain') {
      const text = await file.text();
      setFileContent(text);
      toast.success("File uploaded successfully");
    } else {
      // For PDFs and Word docs, we'll send to API to extract content
      toast.success("File uploaded. Content will be extracted during generation.");
      setFileContent(""); // Clear any previous content
    }
  };

  // Remove uploaded file
  const removeFile = () => {
    setUploadedFile(null);
    setFileContent("");
  };

  // Generate blog post
  const generateBlogPost = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a blog topic");
      return;
    }

    if (selectedImages.length === 0) {
      toast.error("Please select at least one image");
      return;
    }

    if (!mainImageId) {
      toast.error("Please select a main image");
      return;
    }

    setIsGenerating(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      // Build enhanced prompt
      let enhancedPrompt = topic;
      if (inputMode === 'detailed') {
        const details = [];
        if (targetAudience) details.push(`Target audience: ${targetAudience}`);
        if (keyPoints) details.push(`Key points: ${keyPoints}`);
        if (angle) details.push(`Angle: ${angle}`);
        if (keywords) details.push(`Keywords: ${keywords}`);
        if (cta) details.push(`Call-to-action: ${cta}`);
        
        if (details.length > 0) {
          enhancedPrompt += "\n\nAdditional context:\n" + details.join("\n");
        }
        
        // Add file content if available
        if (fileContent) {
          enhancedPrompt += "\n\nReference Document Content:\n" + fileContent;
        }
      }

      // Prepare request body
      const requestBody: any = {
        topic: enhancedPrompt,
        tone,
        language,
        images: {
          main: selectedImages.find(img => img.id === mainImageId)?.url,
          secondary: selectedImages
            .filter(img => img.id !== mainImageId)
            .map(img => img.url),
        },
        preview: true, // Don't publish yet
      };

      // If there's a PDF or Word file, convert to base64 and include
      if (uploadedFile && uploadedFile.type !== 'text/plain') {
        const arrayBuffer = await uploadedFile.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        requestBody.documentFile = {
          data: base64,
          mimeType: uploadedFile.type,
          name: uploadedFile.name
        };
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-blog-post`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) throw new Error("Failed to generate blog post");

      const data = await response.json();
      setBlogPost(data);
      setCurrentStep('preview');
      toast.success("Blog post generated! Review and edit before publishing.");
    } catch (error) {
      console.error("Error generating blog post:", error);
      toast.error("Failed to generate blog post");
    } finally {
      setIsGenerating(false);
    }
  };

  // Publish blog post
  const publishBlogPost = async () => {
    if (!blogPost) return;

    setIsPublishing(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/publish-blog-post`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({
            blogPost,
            topic,
            tone,
            language,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to publish blog post");

      const data = await response.json();
      toast.success(
        <div>
          <p className="font-semibold">Blog post published!</p>
          <p className="text-sm text-gray-600">{data.message}</p>
        </div>
      );

      // Reset form
      setCurrentStep('input');
      setTopic("");
      setTargetAudience("");
      setKeyPoints("");
      setAngle("");
      setKeywords("");
      setCta("");
      setSelectedImages([]);
      setMainImageId("");
      setSearchResults([]);
      setBlogPost(null);
    } catch (error) {
      console.error("Error publishing blog post:", error);
      toast.error("Failed to publish blog post");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            BlogMaker 2.0
          </CardTitle>
          <CardDescription>
            Create professional blog posts with AI - enhanced with images and full preview
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Step Indicator */}
          <div className="flex items-center justify-center mb-8 gap-4">
            <div className={`flex items-center gap-2 ${currentStep === 'input' ? 'text-primary font-semibold' : 'text-gray-400'}`}>
              <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center">1</div>
              <span>Content</span>
            </div>
            <div className="w-16 h-0.5 bg-gray-300"></div>
            <div className={`flex items-center gap-2 ${currentStep === 'images' ? 'text-primary font-semibold' : 'text-gray-400'}`}>
              <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center">2</div>
              <span>Images</span>
            </div>
            <div className="w-16 h-0.5 bg-gray-300"></div>
            <div className={`flex items-center gap-2 ${currentStep === 'preview' ? 'text-primary font-semibold' : 'text-gray-400'}`}>
              <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center">3</div>
              <span>Preview & Publish</span>
            </div>
          </div>

          {/* Step 1: Content Input */}
          {currentStep === 'input' && (
            <div className="space-y-6">
              <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as 'quick' | 'detailed')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="quick">Quick Mode</TabsTrigger>
                  <TabsTrigger value="detailed">Detailed Mode</TabsTrigger>
                </TabsList>

                <TabsContent value="quick" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="topic">Blog Topic</Label>
                    <Input
                      id="topic"
                      placeholder="e.g., How to Prepare for Your First NDIS Planning Meeting"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tone">Tone</Label>
                      <select
                        id="tone"
                        value={tone}
                        onChange={(e) => setTone(e.target.value)}
                        className="w-full p-2 border rounded-md"
                      >
                        <option value="professional">Professional</option>
                        <option value="friendly">Friendly</option>
                        <option value="casual">Casual</option>
                        <option value="formal">Formal</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="language">Language</Label>
                      <select
                        id="language"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full p-2 border rounded-md"
                      >
                        <option value="English">English</option>
                        <option value="Spanish">Spanish</option>
                        <option value="French">French</option>
                      </select>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="detailed" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="topic-detailed">Blog Topic *</Label>
                    <Input
                      id="topic-detailed"
                      placeholder="e.g., How to Prepare for Your First NDIS Planning Meeting"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="audience">Target Audience</Label>
                    <Input
                      id="audience"
                      placeholder="e.g., NDIS participants and their families"
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="keypoints">Key Points to Cover</Label>
                    <Textarea
                      id="keypoints"
                      placeholder="e.g., Required documents, Common questions, What to expect"
                      value={keyPoints}
                      onChange={(e) => setKeyPoints(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="angle">Specific Angle/Perspective</Label>
                    <Input
                      id="angle"
                      placeholder="e.g., First-person perspective from support workers"
                      value={angle}
                      onChange={(e) => setAngle(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="keywords">SEO Keywords</Label>
                    <Input
                      id="keywords"
                      placeholder="e.g., NDIS planning, disability support, participant rights"
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cta">Call-to-Action</Label>
                    <Input
                      id="cta"
                      placeholder="e.g., Contact us for personalized NDIS support"
                      value={cta}
                      onChange={(e) => setCta(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="file-upload">Upload Reference Document (Optional)</Label>
                    <p className="text-sm text-gray-500">Upload a PDF, Word doc, or text file to provide context for the blog post</p>
                    <div className="flex items-center gap-2">
                      <Input
                        id="file-upload"
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        onChange={handleFileUpload}
                        className="cursor-pointer"
                      />
                      {uploadedFile && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={removeFile}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    {uploadedFile && (
                      <p className="text-sm text-green-600">
                        ✓ {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tone-detailed">Tone</Label>
                      <select
                        id="tone-detailed"
                        value={tone}
                        onChange={(e) => setTone(e.target.value)}
                        className="w-full p-2 border rounded-md"
                      >
                        <option value="professional">Professional</option>
                        <option value="friendly">Friendly</option>
                        <option value="casual">Casual</option>
                        <option value="formal">Formal</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="language-detailed">Language</Label>
                      <select
                        id="language-detailed"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full p-2 border rounded-md"
                      >
                        <option value="English">English</option>
                        <option value="Spanish">Spanish</option>
                        <option value="French">French</option>
                      </select>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end">
                <Button onClick={() => setCurrentStep('images')} size="lg">
                  Next: Select Images
                  <ImageIcon className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Image Selection */}
          {currentStep === 'images' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <Label>Search for Images (Select up to 3)</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., disability support, NDIS services"
                    value={imageSearch}
                    onChange={(e) => setImageSearch(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchImages()}
                  />
                  <Button onClick={() => searchImages()} disabled={loadingImages}>
                    {loadingImages ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      "Search"
                    )}
                  </Button>
                </div>
              </div>

              {/* Selected Images */}
              {selectedImages.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected Images ({selectedImages.length}/3)</Label>
                  <RadioGroup value={mainImageId} onValueChange={setMainImageId}>
                    <div className="grid grid-cols-3 gap-4">
                      {selectedImages.map((image) => (
                        <div
                          key={image.id}
                          className="relative border-2 border-primary rounded-lg p-2"
                        >
                          <img
                            src={image.thumbnail}
                            alt={image.title}
                            className="w-full h-40 object-cover rounded"
                            onError={(e) => {
                              // Fallback to main URL if thumbnail fails
                              const target = e.target as HTMLImageElement;
                              if (target.src !== image.url) {
                                target.src = image.url;
                              }
                            }}
                          />
                          <div className="mt-2 flex items-center gap-2">
                            <RadioGroupItem value={image.id} id={image.id} />
                            <Label htmlFor={image.id} className="text-sm cursor-pointer">
                              {mainImageId === image.id ? "Main Image" : "Set as Main"}
                            </Label>
                          </div>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="absolute top-1 right-1"
                            onClick={() => toggleImageSelection(image)}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                </div>
              )}

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-4">
                  <Label>Search Results (Click to select)</Label>
                  <div className="grid grid-cols-4 gap-4 max-h-[400px] overflow-y-auto">
                    {searchResults.map((image) => {
                      const isSelected = selectedImages.find(img => img.id === image.id);
                      return (
                        <div
                          key={image.id}
                          className={`cursor-pointer border-2 rounded-lg p-2 transition-all ${
                            isSelected ? 'border-primary' : 'border-gray-200 hover:border-gray-400'
                          }`}
                          onClick={() => toggleImageSelection(image)}
                        >
                          <img
                            src={image.thumbnail}
                            alt={image.title}
                            className="w-full h-32 object-cover rounded"
                            onError={(e) => {
                              // Fallback to main URL if thumbnail fails
                              const target = e.target as HTMLImageElement;
                              if (target.src !== image.url) {
                                target.src = image.url;
                              }
                            }}
                          />
                          {isSelected && (
                            <div className="mt-1 text-xs text-primary font-semibold text-center">
                              ✓ Selected
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {hasMoreResults && (
                    <div className="flex justify-center">
                      <Button 
                        onClick={() => searchImages(true)} 
                        disabled={loadingImages}
                        variant="outline"
                      >
                        {loadingImages ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading More...
                          </>
                        ) : (
                          "Load More Images"
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep('input')}>
                  Back
                </Button>
                <Button
                  onClick={generateBlogPost}
                  disabled={isGenerating || selectedImages.length === 0 || !mainImageId}
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      Generate Preview
                      <Eye className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Preview & Publish */}
          {currentStep === 'preview' && blogPost && (
            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Preview Mode:</strong> Review and edit your blog post below. Click "Publish" when you're happy with it!
                </p>
              </div>

              {/* Editable Preview */}
              <div className="border rounded-lg p-6 bg-white space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={blogPost.title}
                    onChange={(e) => setBlogPost({ ...blogPost, title: e.target.value })}
                    className="text-2xl font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Meta Description (for SEO)</Label>
                  <Textarea
                    value={blogPost.metaDescription}
                    onChange={(e) => setBlogPost({ ...blogPost, metaDescription: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Main Image</Label>
                  <img
                    src={blogPost.images.main}
                    alt="Main blog image"
                    className="w-full max-h-[400px] object-cover rounded-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Content (Click text to edit)</Label>
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    className="prose max-w-none p-4 border rounded-lg min-h-[400px] focus:outline-none focus:ring-2 focus:ring-primary"
                    dangerouslySetInnerHTML={{ __html: blogPost.bodyHtml }}
                    onBlur={(e) => setBlogPost({ ...blogPost, bodyHtml: e.currentTarget.innerHTML })}
                  />
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep('images')}>
                  Back to Images
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={generateBlogPost} disabled={isGenerating}>
                    Regenerate
                  </Button>
                  <Button onClick={publishBlogPost} disabled={isPublishing} size="lg">
                    {isPublishing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Publishing...
                      </>
                    ) : (
                      <>
                        Publish to Site
                        <Send className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
