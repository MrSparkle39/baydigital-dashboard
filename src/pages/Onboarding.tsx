import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Upload, CheckCircle } from "lucide-react";

// This onboarding flow appears after user completes payment
// Collects all the information needed to build their website

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 6;

  // Form state - organized by category
  const [formData, setFormData] = useState({
    // Step 1: Business Basics
    businessName: "",
    industry: "",
    businessSize: "",
    location: "",
    serviceArea: "",
    yearsInBusiness: "",
    
    // Step 2: Services & Pricing
    services: "",
    topServices: "", // Top 3 services to highlight
    pricingStrategy: "contact", // show, hide, starting_from, contact
    emergencyService: false,
    certifications: "",
    
    // Step 3: Branding & Design
    tagline: "",
    aboutUs: "",
    brandStyle: "modern", // modern, classic, bold, minimal
    primaryColor: "#667eea",
    secondaryColor: "#764ba2",
    exampleWebsites: "",
    competitorWebsites: "",
    
    // Step 4: Contact & Social
    phone: "",
    emergencyPhone: "",
    businessEmail: "",
    businessHours: "",
    facebookUrl: "",
    instagramUrl: "",
    linkedinUrl: "",
    googleBusinessUrl: "",
    preferredContact: "phone", // phone, email, form
    
    // Step 5: Website Features
    needsBooking: false,
    needsQuoteForm: true,
    needsGallery: true,
    needsTestimonials: true,
    needsServiceAreaMap: true,
    needsFaq: false,
    needsBlog: false,
    
    // Step 6: SEO & Marketing
    targetKeywords: "",
    uniqueSellingPoints: "",
    specialOffers: "",
    monthlyGoals: "",
    
    // Technical
    existingDomain: "",
    existingWebsite: "",
    needsEmail: false,
    emailCount: 1,
    
    // Professional plan specifics
    businessObjectives: [],
    competitorAnalysis: "",
    newsletterSignup: false,
  });

  const [uploadedFiles, setUploadedFiles] = useState({
    logo: null,
    workPhotos: [],
    teamPhotos: [],
    beforeAfterPhotos: [],
  });

  const progress = (currentStep / totalSteps) * 100;

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (field: string, files: FileList) => {
    const userId = user?.id;
    if (!userId) return;

    try {
      const uploadedUrls = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${field}/${Date.now()}-${i}.${fileExt}`;
        
        const { data, error } = await supabase.storage
          .from('onboarding-files')
          .upload(fileName, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('onboarding-files')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      setUploadedFiles(prev => ({
        ...prev,
        [field]: field === 'logo' ? uploadedUrls[0] : [...(prev[field] || []), ...uploadedUrls]
      }));

      toast.success(`${files.length} file(s) uploaded successfully`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files');
    }
  };

  const saveProgress = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({
          // Business basics
          business_name: formData.businessName,
          industry: formData.industry,
          business_size: formData.businessSize,
          location: formData.location,
          
          // New fields from comprehensive onboarding
          service_area: formData.serviceArea,
          years_in_business: formData.yearsInBusiness,
          services: formData.services,
          top_services: formData.topServices,
          pricing_strategy: formData.pricingStrategy,
          emergency_service: formData.emergencyService,
          certifications: formData.certifications,
          
          // Branding
          tagline: formData.tagline,
          business_description: formData.aboutUs,
          brand_style: formData.brandStyle,
          brand_colors: {
            primary: formData.primaryColor,
            secondary: formData.secondaryColor
          },
          example_websites: formData.exampleWebsites,
          competitor_websites: formData.competitorWebsites,
          
          // Contact
          phone: formData.phone,
          emergency_phone: formData.emergencyPhone,
          business_email: formData.businessEmail,
          business_hours: formData.businessHours,
          
          // Social
          social_media: {
            facebook: formData.facebookUrl,
            instagram: formData.instagramUrl,
            linkedin: formData.linkedinUrl,
            googleBusiness: formData.googleBusinessUrl
          },
          preferred_contact_method: formData.preferredContact,
          
          // Features
          website_features: {
            booking: formData.needsBooking,
            quoteForm: formData.needsQuoteForm,
            gallery: formData.needsGallery,
            testimonials: formData.needsTestimonials,
            serviceMap: formData.needsServiceAreaMap,
            faq: formData.needsFaq,
            blog: formData.needsBlog
          },
          
          // SEO & Marketing
          target_keywords: formData.targetKeywords,
          unique_selling_points: formData.uniqueSellingPoints,
          special_offers: formData.specialOffers,
          monthly_goals: formData.monthlyGoals,
          
          // Technical
          website_url: formData.existingDomain,
          existing_website: formData.existingWebsite,
          needs_email: formData.needsEmail,
          email_count: formData.emailCount,
          
          // Professional plan
          business_objectives: formData.businessObjectives,
          competitor_analysis: formData.competitorAnalysis,
          newsletter_signup: formData.newsletterSignup,
          
          // Files
          logo_url: uploadedFiles.logo,
          signup_files: [
            ...(uploadedFiles.workPhotos || []),
            ...(uploadedFiles.teamPhotos || []),
            ...(uploadedFiles.beforeAfterPhotos || [])
          ],
          
          onboarding_complete: currentStep === totalSteps,
          onboarding_step: currentStep
        })
        .eq('id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Save error:', error);
      throw error;
    }
  };

  const nextStep = async () => {
    try {
      await saveProgress();
      if (currentStep < totalSteps) {
        setCurrentStep(prev => prev + 1);
      } else {
        // Onboarding complete!
        toast.success("Onboarding complete! We'll start building your website now.");
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error("Failed to save progress");
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const skipStep = async () => {
    toast.info("You can complete this later from your dashboard");
    await saveProgress();
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-6">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Welcome! Let's Build Your Website</CardTitle>
            <CardDescription>
              Tell us about your business so we can create the perfect website for you
            </CardDescription>
            <div className="mt-4">
              <div className="flex justify-between text-sm text-muted-foreground mb-2">
                <span>Step {currentStep} of {totalSteps}</span>
                <span>{Math.round(progress)}% complete</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardContent className="p-6">
            {/* Step 1: Business Basics */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold mb-4">Business Basics</h3>
                  <p className="text-muted-foreground mb-6">
                    Let's start with the fundamentals of your business
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="businessName">Business Name *</Label>
                    <Input
                      id="businessName"
                      value={formData.businessName}
                      onChange={(e) => updateField('businessName', e.target.value)}
                      placeholder="ABC Plumbing Services"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="industry">Industry *</Label>
                    <Input
                      id="industry"
                      value={formData.industry}
                      onChange={(e) => updateField('industry', e.target.value)}
                      placeholder="Plumbing"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="location">Location (City, State) *</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => updateField('location', e.target.value)}
                      placeholder="San Francisco, CA"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="serviceArea">Service Area Radius</Label>
                    <Input
                      id="serviceArea"
                      value={formData.serviceArea}
                      onChange={(e) => updateField('serviceArea', e.target.value)}
                      placeholder="30 miles / Entire Bay Area"
                    />
                  </div>

                  <div>
                    <Label htmlFor="yearsInBusiness">Years in Business</Label>
                    <Input
                      id="yearsInBusiness"
                      type="number"
                      value={formData.yearsInBusiness}
                      onChange={(e) => updateField('yearsInBusiness', e.target.value)}
                      placeholder="10"
                    />
                  </div>

                  <div>
                    <Label htmlFor="businessSize">Business Size</Label>
                    <select
                      id="businessSize"
                      className="w-full h-10 px-3 rounded-md border border-input bg-background"
                      value={formData.businessSize}
                      onChange={(e) => updateField('businessSize', e.target.value)}
                    >
                      <option value="">Select size</option>
                      <option value="solo">Solo (Just me)</option>
                      <option value="small">Small (2-10 employees)</option>
                      <option value="medium">Medium (11-50 employees)</option>
                      <option value="large">Large (50+ employees)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Services & Pricing */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold mb-4">Services & Pricing</h3>
                  <p className="text-muted-foreground mb-6">
                    What services do you offer?
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="services">List All Services *</Label>
                    <Textarea
                      id="services"
                      value={formData.services}
                      onChange={(e) => updateField('services', e.target.value)}
                      placeholder="Residential plumbing, Commercial plumbing, Emergency repairs, Drain cleaning, Water heater installation..."
                      rows={4}
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      List all services you offer, separated by commas
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="topServices">Top 3 Services to Highlight</Label>
                    <Input
                      id="topServices"
                      value={formData.topServices}
                      onChange={(e) => updateField('topServices', e.target.value)}
                      placeholder="Emergency Repairs, Water Heaters, Drain Cleaning"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      What are your most popular or profitable services?
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="certifications">Certifications & Licenses</Label>
                    <Input
                      id="certifications"
                      value={formData.certifications}
                      onChange={(e) => updateField('certifications', e.target.value)}
                      placeholder="Licensed & Insured, EPA Certified, Master Plumber"
                    />
                  </div>

                  <div>
                    <Label>Pricing Display Strategy</Label>
                    <div className="space-y-2 mt-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="pricingStrategy"
                          value="hide"
                          checked={formData.pricingStrategy === 'hide'}
                          onChange={(e) => updateField('pricingStrategy', e.target.value)}
                        />
                        <span>Hide prices (Contact for quote)</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="pricingStrategy"
                          value="starting_from"
                          checked={formData.pricingStrategy === 'starting_from'}
                          onChange={(e) => updateField('pricingStrategy', e.target.value)}
                        />
                        <span>Show "Starting from" prices</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="pricingStrategy"
                          value="show"
                          checked={formData.pricingStrategy === 'show'}
                          onChange={(e) => updateField('pricingStrategy', e.target.value)}
                        />
                        <span>Show exact prices</span>
                      </label>
                    </div>
                  </div>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.emergencyService}
                      onChange={(e) => updateField('emergencyService', e.target.checked)}
                      className="rounded"
                    />
                    <span>We offer 24/7 emergency service</span>
                  </label>
                </div>
              </div>
            )}

            {/* Step 3: Branding & Design */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold mb-4">Branding & Design</h3>
                  <p className="text-muted-foreground mb-6">
                    Help us capture your brand's personality
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="tagline">Tagline / Main Headline</Label>
                    <Input
                      id="tagline"
                      value={formData.tagline}
                      onChange={(e) => updateField('tagline', e.target.value)}
                      placeholder="Professional Plumbing Services You Can Trust"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      What's the first thing you want visitors to see?
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="aboutUs">About Your Business</Label>
                    <Textarea
                      id="aboutUs"
                      value={formData.aboutUs}
                      onChange={(e) => updateField('aboutUs', e.target.value)}
                      placeholder="Tell us your story... When did you start? What makes you different? Why should customers choose you?"
                      rows={5}
                    />
                  </div>

                  <div>
                    <Label htmlFor="logo">Upload Your Logo</Label>
                    <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <Input
                        id="logo"
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files && handleFileUpload('logo', e.target.files)}
                        className="mt-2"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        PNG, JPG, or SVG. Don't have one? We can use text or create one for you.
                      </p>
                      {uploadedFiles.logo && (
                        <p className="text-sm text-green-600 mt-2 flex items-center justify-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Logo uploaded
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="primaryColor">Primary Brand Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="primaryColor"
                          type="color"
                          value={formData.primaryColor}
                          onChange={(e) => updateField('primaryColor', e.target.value)}
                          className="w-20 h-10"
                        />
                        <Input
                          value={formData.primaryColor}
                          onChange={(e) => updateField('primaryColor', e.target.value)}
                          placeholder="#667eea"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="secondaryColor">Secondary Brand Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="secondaryColor"
                          type="color"
                          value={formData.secondaryColor}
                          onChange={(e) => updateField('secondaryColor', e.target.value)}
                          className="w-20 h-10"
                        />
                        <Input
                          value={formData.secondaryColor}
                          onChange={(e) => updateField('secondaryColor', e.target.value)}
                          placeholder="#764ba2"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Brand Style Preference</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                      {['modern', 'classic', 'bold', 'minimal'].map(style => (
                        <button
                          key={style}
                          type="button"
                          onClick={() => updateField('brandStyle', style)}
                          className={`p-4 rounded-lg border-2 transition-all capitalize ${
                            formData.brandStyle === style
                              ? 'border-primary bg-primary/10'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="exampleWebsites">Example Websites You Like</Label>
                    <Textarea
                      id="exampleWebsites"
                      value={formData.exampleWebsites}
                      onChange={(e) => updateField('exampleWebsites', e.target.value)}
                      placeholder="https://example1.com, https://example2.com"
                      rows={2}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Share 2-3 websites you like the look/feel of
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="competitorWebsites">Competitor Websites</Label>
                    <Textarea
                      id="competitorWebsites"
                      value={formData.competitorWebsites}
                      onChange={(e) => updateField('competitorWebsites', e.target.value)}
                      placeholder="https://competitor1.com, https://competitor2.com"
                      rows={2}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Help us understand your competition (so we can make yours better!)
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Contact & Social */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold mb-4">Contact & Social Media</h3>
                  <p className="text-muted-foreground mb-6">
                    How can customers reach you?
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Main Phone Number *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => updateField('phone', e.target.value)}
                        placeholder="(555) 123-4567"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="emergencyPhone">Emergency/After Hours Phone</Label>
                      <Input
                        id="emergencyPhone"
                        type="tel"
                        value={formData.emergencyPhone}
                        onChange={(e) => updateField('emergencyPhone', e.target.value)}
                        placeholder="(555) 987-6543"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="businessEmail">Business Email *</Label>
                    <Input
                      id="businessEmail"
                      type="email"
                      value={formData.businessEmail}
                      onChange={(e) => updateField('businessEmail', e.target.value)}
                      placeholder="info@yourbusiness.com"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="businessHours">Business Hours</Label>
                    <Textarea
                      id="businessHours"
                      value={formData.businessHours}
                      onChange={(e) => updateField('businessHours', e.target.value)}
                      placeholder="Mon-Fri: 8am-6pm&#10;Sat: 9am-3pm&#10;Sun: Closed"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>Preferred Contact Method</Label>
                    <div className="space-y-2 mt-2">
                      {['phone', 'email', 'form'].map(method => (
                        <label key={method} className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="preferredContact"
                            value={method}
                            checked={formData.preferredContact === method}
                            onChange={(e) => updateField('preferredContact', e.target.value)}
                          />
                          <span className="capitalize">{method === 'form' ? 'Contact Form' : method}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3">Social Media Links (Optional)</h4>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="facebookUrl">Facebook</Label>
                        <Input
                          id="facebookUrl"
                          value={formData.facebookUrl}
                          onChange={(e) => updateField('facebookUrl', e.target.value)}
                          placeholder="https://facebook.com/yourbusiness"
                        />
                      </div>

                      <div>
                        <Label htmlFor="instagramUrl">Instagram</Label>
                        <Input
                          id="instagramUrl"
                          value={formData.instagramUrl}
                          onChange={(e) => updateField('instagramUrl', e.target.value)}
                          placeholder="https://instagram.com/yourbusiness"
                        />
                      </div>

                      <div>
                        <Label htmlFor="linkedinUrl">LinkedIn</Label>
                        <Input
                          id="linkedinUrl"
                          value={formData.linkedinUrl}
                          onChange={(e) => updateField('linkedinUrl', e.target.value)}
                          placeholder="https://linkedin.com/company/yourbusiness"
                        />
                      </div>

                      <div>
                        <Label htmlFor="googleBusinessUrl">Google Business Profile</Label>
                        <Input
                          id="googleBusinessUrl"
                          value={formData.googleBusinessUrl}
                          onChange={(e) => updateField('googleBusinessUrl', e.target.value)}
                          placeholder="https://g.page/yourbusiness"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Website Features & Photos */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold mb-4">Website Features & Photos</h3>
                  <p className="text-muted-foreground mb-6">
                    What features do you want on your website?
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-3">Select Features You Want:</h4>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.needsQuoteForm}
                          onChange={(e) => updateField('needsQuoteForm', e.target.checked)}
                          className="rounded"
                        />
                        <span>Quote/Estimate Request Form</span>
                      </label>

                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.needsBooking}
                          onChange={(e) => updateField('needsBooking', e.target.checked)}
                          className="rounded"
                        />
                        <span>Online Booking/Scheduling</span>
                      </label>

                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.needsGallery}
                          onChange={(e) => updateField('needsGallery', e.target.checked)}
                          className="rounded"
                        />
                        <span>Photo Gallery</span>
                      </label>

                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.needsTestimonials}
                          onChange={(e) => updateField('needsTestimonials', e.target.checked)}
                          className="rounded"
                        />
                        <span>Customer Testimonials Section</span>
                      </label>

                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.needsServiceAreaMap}
                          onChange={(e) => updateField('needsServiceAreaMap', e.target.checked)}
                          className="rounded"
                        />
                        <span>Service Area Map</span>
                      </label>

                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.needsFaq}
                          onChange={(e) => updateField('needsFaq', e.target.checked)}
                          className="rounded"
                        />
                        <span>FAQ Section</span>
                      </label>

                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.needsBlog}
                          onChange={(e) => updateField('needsBlog', e.target.checked)}
                          className="rounded"
                        />
                        <span>Blog/News Section</span>
                      </label>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3">Upload Photos</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Upload photos of your work, team, or business. These help build trust with potential customers.
                    </p>

                    <div className="space-y-4">
                      <div>
                        <Label>Work Photos / Portfolio</Label>
                        <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary transition-colors">
                          <Input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => e.target.files && handleFileUpload('workPhotos', e.target.files)}
                          />
                          <p className="text-xs text-muted-foreground mt-2">
                            Upload up to 20 photos of your work
                          </p>
                          {uploadedFiles.workPhotos && uploadedFiles.workPhotos.length > 0 && (
                            <p className="text-sm text-green-600 mt-2">
                              {uploadedFiles.workPhotos.length} photos uploaded
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label>Team Photos</Label>
                        <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary transition-colors">
                          <Input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => e.target.files && handleFileUpload('teamPhotos', e.target.files)}
                          />
                          <p className="text-xs text-muted-foreground mt-2">
                            Photos of you and your team
                          </p>
                          {uploadedFiles.teamPhotos && uploadedFiles.teamPhotos.length > 0 && (
                            <p className="text-sm text-green-600 mt-2">
                              {uploadedFiles.teamPhotos.length} photos uploaded
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label>Before/After Photos</Label>
                        <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary transition-colors">
                          <Input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => e.target.files && handleFileUpload('beforeAfterPhotos', e.target.files)}
                          />
                          <p className="text-xs text-muted-foreground mt-2">
                            Show the transformation your work creates
                          </p>
                          {uploadedFiles.beforeAfterPhotos && uploadedFiles.beforeAfterPhotos.length > 0 && (
                            <p className="text-sm text-green-600 mt-2">
                              {uploadedFiles.beforeAfterPhotos.length} photos uploaded
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground mt-4">
                      Don't have photos yet? No problem! We can use professional stock photos and you can add your own later.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: SEO & Technical */}
            {currentStep === 6 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold mb-4">SEO & Technical Details</h3>
                  <p className="text-muted-foreground mb-6">
                    Help customers find you online
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="targetKeywords">Target Keywords</Label>
                    <Textarea
                      id="targetKeywords"
                      value={formData.targetKeywords}
                      onChange={(e) => updateField('targetKeywords', e.target.value)}
                      placeholder="emergency plumber san francisco, 24 hour plumbing, water heater repair"
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      What do customers search for when looking for your services?
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="uniqueSellingPoints">What Makes You Different?</Label>
                    <Textarea
                      id="uniqueSellingPoints"
                      value={formData.uniqueSellingPoints}
                      onChange={(e) => updateField('uniqueSellingPoints', e.target.value)}
                      placeholder="24/7 service, Family-owned for 20 years, Upfront pricing, Licensed & insured"
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Your unique selling propositions
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="specialOffers">Special Offers/Promotions</Label>
                    <Textarea
                      id="specialOffers"
                      value={formData.specialOffers}
                      onChange={(e) => updateField('specialOffers', e.target.value)}
                      placeholder="$50 off first service, Free estimates, Senior discount"
                      rows={2}
                    />
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3">Domain & Email</h4>
                    
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="existingDomain">Do you have a domain name?</Label>
                        <Input
                          id="existingDomain"
                          value={formData.existingDomain}
                          onChange={(e) => updateField('existingDomain', e.target.value)}
                          placeholder="yourbusiness.com"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Leave blank if you need us to help you get one
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="existingWebsite">Current Website (if any)</Label>
                        <Input
                          id="existingWebsite"
                          value={formData.existingWebsite}
                          onChange={(e) => updateField('existingWebsite', e.target.value)}
                          placeholder="https://oldwebsite.com"
                        />
                      </div>

                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.needsEmail}
                          onChange={(e) => updateField('needsEmail', e.target.checked)}
                          className="rounded"
                        />
                        <span>I need professional email addresses</span>
                      </label>

                      {formData.needsEmail && (
                        <div>
                          <Label htmlFor="emailCount">How many email addresses?</Label>
                          <Input
                            id="emailCount"
                            type="number"
                            min="1"
                            value={formData.emailCount}
                            onChange={(e) => updateField('emailCount', parseInt(e.target.value))}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3">Monthly Goals</h4>
                    <Textarea
                      id="monthlyGoals"
                      value={formData.monthlyGoals}
                      onChange={(e) => updateField('monthlyGoals', e.target.value)}
                      placeholder="20 qualified leads per month, 5 booked jobs per week, increase calls by 50%"
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      What are you hoping to achieve with your website?
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t">
              <div>
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                  >
                    ← Back
                  </Button>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={skipStep}
                >
                  Skip for Now
                </Button>
                <Button
                  type="button"
                  onClick={nextStep}
                >
                  {currentStep === totalSteps ? 'Complete' : 'Next'} →
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-sm text-muted-foreground">
          <p>Don't worry, you can always update this information later from your dashboard</p>
        </div>
      </div>
    </div>
  );
}
