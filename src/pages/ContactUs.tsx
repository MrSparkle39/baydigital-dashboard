import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Clock, Calendar, HelpCircle, Loader2, Send, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

export default function ContactUs() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    subject: "",
    category: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject || !formData.category || !formData.message) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Create a support ticket
      const { error } = await supabase
        .from('update_tickets')
        .insert({
          user_id: user?.id,
          title: formData.subject,
          description: formData.message,
          status: 'open',
          priority: 'normal',
        });

      if (error) throw error;

      setSubmitted(true);
      toast({
        title: "Support request submitted",
        description: "We've received your message and will get back to you as soon as possible.",
      });

      // Reset form
      setFormData({
        subject: "",
        category: "",
        message: "",
      });

    } catch (error: any) {
      console.error('Error submitting ticket:', error);
      toast({
        title: "Submission failed",
        description: error?.message || "Something went wrong. Please try again or email us directly.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (submitted) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-3xl">
        <Card className="text-center">
          <CardContent className="pt-12 pb-12">
            <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
            <h2 className="text-2xl font-bold mb-2">Message Sent Successfully!</h2>
            <p className="text-muted-foreground mb-6">
              We've received your support request and will get back to you as soon as possible.
              In the meantime, check out our Help Center for instant answers to common questions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={() => setSubmitted(false)}>
                Submit Another Request
              </Button>
              <Button variant="outline" asChild>
                <Link to="/dashboard">Back to Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Contact Us</h1>
        <p className="text-muted-foreground">
          Get in touch with our support team - we're here to help
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {/* Contact Info Cards */}
        <Card>
          <CardContent className="pt-6 text-center">
            <Mail className="h-8 w-8 mx-auto mb-3 text-primary" />
            <h3 className="font-semibold mb-2">Email Us</h3>
            <a 
              href="mailto:support@bay.digital" 
              className="text-sm text-primary hover:underline"
            >
              support@bay.digital
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <Clock className="h-8 w-8 mx-auto mb-3 text-primary" />
            <h3 className="font-semibold mb-2">Response Time</h3>
            <p className="text-sm text-muted-foreground">
              We'll get back to you<br />
              <span className="text-xs">as soon as possible</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <Calendar className="h-8 w-8 mx-auto mb-3 text-primary" />
            <h3 className="font-semibold mb-2">Business Hours</h3>
            <p className="text-sm text-muted-foreground">
              Monday - Friday<br />
              9:00 AM - 5:00 PM AEST
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Support Request Form */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Submit a Support Request</CardTitle>
            <CardDescription>
              Fill out the form below and we'll get back to you as soon as possible
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  placeholder="Brief description of your issue or question"
                  value={formData.subject}
                  onChange={(e) => handleChange('subject', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category} onValueChange={(value) => handleChange('category', value)}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="website_change">Website Change Request</SelectItem>
                    <SelectItem value="technical">Technical Issue</SelectItem>
                    <SelectItem value="billing">Billing Question</SelectItem>
                    <SelectItem value="general">General Inquiry</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  placeholder="Please provide as much detail as possible..."
                  value={formData.message}
                  onChange={(e) => handleChange('message', e.target.value)}
                  rows={6}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  For website changes, please describe exactly what you'd like updated
                </p>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Submit Request
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Help */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Quick Help
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-semibold text-sm mb-1">Before contacting us</h4>
                <p className="text-xs text-muted-foreground mb-2">
                  Check our Help Center for instant answers to common questions
                </p>
                <Button variant="outline" size="sm" asChild className="w-full">
                  <Link to="/help-center">Browse Help Center</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* What to Expect */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What to Expect</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>You'll receive a confirmation email with your ticket number</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>We'll get back to you as soon as possible</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Track your ticket status from your dashboard</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Browse our Help Center for instant answers while you wait</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Common Issues */}
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-lg">Common Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <Link to="/help-center" className="block text-primary hover:underline">
                  → How to request website changes
                </Link>
                <Link to="/help-center" className="block text-primary hover:underline">
                  → Understanding your subscription
                </Link>
                <Link to="/help-center" className="block text-primary hover:underline">
                  → Stock photo downloads
                </Link>
                <Link to="/help-center" className="block text-primary hover:underline">
                  → Viewing analytics
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
