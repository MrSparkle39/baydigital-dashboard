import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, Download, Image as ImageIcon, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FreepikImage {
  id: string;
  title: string;
  thumbnail: { url: string };
  preview: { url: string };
  image: { source: { url: string } };
  license: string;
  author: { name: string };
}

export default function StockPhotos() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<FreepikImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [usage, setUsage] = useState({ used: 0, limit: 0, remaining: 0 });
  const [filters, setFilters] = useState({
    type: "",
    orientation: "",
    license: "",
  });

  useEffect(() => {
    fetchUsage();
  }, []);

  const fetchUsage = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('freepik-api', {
        body: { action: 'usage' },
      });

      if (error) throw error;
      setUsage(data);
    } catch (error) {
      console.error('Error fetching usage:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('freepik-api', {
        body: {
          action: 'search',
          query: searchQuery,
          filters,
        },
      });

      if (error) throw error;
      setResults(data.data || []);
    } catch (error) {
      toast({
        title: "Search failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (image: FreepikImage) => {
    if (usage.remaining <= 0) {
      toast({
        title: "Download limit reached",
        description: `You've used all ${usage.limit} downloads for this month.`,
        variant: "destructive",
      });
      return;
    }

    setDownloading(image.id);
    try {
      const { data, error } = await supabase.functions.invoke('freepik-api', {
        body: {
          action: 'download',
          resourceId: image.id,
          imageUrl: image.preview.url,
        },
      });

      if (error) throw error;

      toast({
        title: "Download successful",
        description: `${image.title} has been added to your website assets.`,
      });

      await fetchUsage();
    } catch (error) {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Stock Photo Library</h1>
        <p className="text-muted-foreground">
          Search and download professional stock photos powered by Freepik
        </p>
        <div className="mt-4 flex items-center gap-4">
          <Badge variant="secondary">
            {usage.remaining} of {usage.limit} downloads remaining this month
          </Badge>
        </div>
      </div>

      <Card className="p-6 mb-8">
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search for photos, vectors, icons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select value={filters.type} onValueChange={(value) => setFilters({ ...filters, type: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Content Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="photo">Photos</SelectItem>
                <SelectItem value="vector">Vectors</SelectItem>
                <SelectItem value="icon">Icons</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.orientation} onValueChange={(value) => setFilters({ ...filters, orientation: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Orientation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any</SelectItem>
                <SelectItem value="horizontal">Horizontal</SelectItem>
                <SelectItem value="vertical">Vertical</SelectItem>
                <SelectItem value="square">Square</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.license} onValueChange={(value) => setFilters({ ...filters, license: value })}>
              <SelectTrigger>
                <SelectValue placeholder="License" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Licenses</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {results.length === 0 && !loading ? (
        <div className="text-center py-12">
          <ImageIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            Search for stock photos to get started
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {results.map((image) => (
            <Card key={image.id} className="overflow-hidden group">
              <div className="aspect-square relative overflow-hidden bg-muted">
                <img
                  src={image.thumbnail.url}
                  alt={image.title}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    onClick={() => handleDownload(image)}
                    disabled={downloading === image.id || usage.remaining <= 0}
                    size="sm"
                  >
                    {downloading === image.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Download
                  </Button>
                </div>
              </div>
              <div className="p-3">
                <p className="text-sm font-medium truncate">{image.title}</p>
                <p className="text-xs text-muted-foreground">by {image.author.name}</p>
                <Badge variant="outline" className="mt-2">
                  {image.license}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
