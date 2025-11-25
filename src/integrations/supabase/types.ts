export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      analytics: {
        Row: {
          created_at: string | null
          date: string
          id: string
          page_views: number | null
          site_id: string
          top_pages: Json | null
          traffic_sources: Json | null
          visitors: number | null
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          page_views?: number | null
          site_id: string
          top_pages?: Json | null
          traffic_sources?: Json | null
          visitors?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          page_views?: number | null
          site_id?: string
          top_pages?: Json | null
          traffic_sources?: Json | null
          visitors?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      blogmaker_posts: {
        Row: {
          body_html: string
          created_at: string | null
          id: string
          keywords: string[] | null
          language: string
          main_image_url: string | null
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          published_url: string | null
          secondary_image_urls: string[] | null
          site_id: string
          slug: string
          status: Database["public"]["Enums"]["blog_post_status"] | null
          title: string
          tone: string
          topic: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          body_html: string
          created_at?: string | null
          id?: string
          keywords?: string[] | null
          language?: string
          main_image_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          published_url?: string | null
          secondary_image_urls?: string[] | null
          site_id: string
          slug: string
          status?: Database["public"]["Enums"]["blog_post_status"] | null
          title: string
          tone?: string
          topic: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          body_html?: string
          created_at?: string | null
          id?: string
          keywords?: string[] | null
          language?: string
          main_image_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          published_url?: string | null
          secondary_image_urls?: string[] | null
          site_id?: string
          slug?: string
          status?: Database["public"]["Enums"]["blog_post_status"] | null
          title?: string
          tone?: string
          topic?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blogmaker_posts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blogmaker_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      change_requests: {
        Row: {
          completed_at: string | null
          created_at: string | null
          description: string
          file_urls: string[] | null
          id: string
          status: Database["public"]["Enums"]["request_status"] | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          description: string
          file_urls?: string[] | null
          id?: string
          status?: Database["public"]["Enums"]["request_status"] | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          description?: string
          file_urls?: string[] | null
          id?: string
          status?: Database["public"]["Enums"]["request_status"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          site_id: string
          status: Database["public"]["Enums"]["submission_status"] | null
          submitted_at: string | null
        }
        Insert: {
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          site_id: string
          status?: Database["public"]["Enums"]["submission_status"] | null
          submitted_at?: string | null
        }
        Update: {
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          site_id?: string
          status?: Database["public"]["Enums"]["submission_status"] | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          link: string | null
          message: string | null
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          created_at: string | null
          github_repo: string | null
          id: string
          last_updated: string | null
          launched_date: string | null
          netlify_site_id: string | null
          site_name: string
          site_url: string
          status: Database["public"]["Enums"]["site_status"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          github_repo?: string | null
          id?: string
          last_updated?: string | null
          launched_date?: string | null
          netlify_site_id?: string | null
          site_name: string
          site_url: string
          status?: Database["public"]["Enums"]["site_status"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          github_repo?: string | null
          id?: string
          last_updated?: string | null
          launched_date?: string | null
          netlify_site_id?: string | null
          site_name?: string
          site_url?: string
          status?: Database["public"]["Enums"]["site_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_message_reads: {
        Row: {
          id: string
          last_read_at: string
          last_read_message_id: string | null
          ticket_id: string
          user_id: string
        }
        Insert: {
          id?: string
          last_read_at?: string
          last_read_message_id?: string | null
          ticket_id: string
          user_id: string
        }
        Update: {
          id?: string
          last_read_at?: string
          last_read_message_id?: string | null
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_message_reads_last_read_message_id_fkey"
            columns: ["last_read_message_id"]
            isOneToOne: false
            referencedRelation: "ticket_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_message_reads_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "update_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          created_at: string
          id: string
          is_admin: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_admin?: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_admin?: boolean
          message?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "update_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      update_tickets: {
        Row: {
          admin_notes: string | null
          assigned_to: string | null
          completed_at: string | null
          description: string
          file_urls: string[] | null
          id: string
          last_message_at: string | null
          priority: string | null
          status: string | null
          submitted_at: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          description: string
          file_urls?: string[] | null
          id?: string
          last_message_at?: string | null
          priority?: string | null
          status?: string | null
          submitted_at?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          description?: string
          file_urls?: string[] | null
          id?: string
          last_message_at?: string | null
          priority?: string | null
          status?: string | null
          submitted_at?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "update_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          additional_info: string | null
          billing_period_start: string | null
          brand_colors: Json | null
          brand_style: string | null
          business_address: string | null
          business_description: string | null
          business_email: string | null
          business_hours: string | null
          business_name: string | null
          business_objectives: string[] | null
          business_phone: string | null
          business_size: string | null
          certifications: string | null
          competitor_analysis: string | null
          competitor_websites: string | null
          content_pages: Json | null
          created_at: string | null
          desired_emails: string[] | null
          domain: string | null
          email: string
          email_count: number | null
          emergency_phone: string | null
          emergency_service: boolean | null
          example_websites: string | null
          existing_domain: string | null
          existing_website: string | null
          freepik_downloads_used: number | null
          freepik_period_start: string | null
          full_name: string | null
          ga4_property_id: string | null
          id: string
          industry: string | null
          location: string | null
          logo_url: string | null
          monthly_goals: string | null
          needs_email: boolean | null
          newsletter_signup: boolean | null
          onboarding_complete: boolean | null
          onboarding_step: number | null
          phone: string | null
          plan: Database["public"]["Enums"]["user_plan"]
          preferred_contact_method: string | null
          preview_url: string | null
          pricing_strategy: string | null
          service_area: string | null
          services: string | null
          signup_files: string[] | null
          social_media: Json | null
          special_offers: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_end_date: string | null
          subscription_start_date: string | null
          subscription_status: string | null
          tagline: string | null
          target_keywords: string | null
          tickets_used_this_period: number | null
          top_services: string | null
          unique_selling_points: string | null
          updated_at: string | null
          website_features: Json | null
          website_status: string | null
          website_url: string | null
          years_in_business: string | null
        }
        Insert: {
          additional_info?: string | null
          billing_period_start?: string | null
          brand_colors?: Json | null
          brand_style?: string | null
          business_address?: string | null
          business_description?: string | null
          business_email?: string | null
          business_hours?: string | null
          business_name?: string | null
          business_objectives?: string[] | null
          business_phone?: string | null
          business_size?: string | null
          certifications?: string | null
          competitor_analysis?: string | null
          competitor_websites?: string | null
          content_pages?: Json | null
          created_at?: string | null
          desired_emails?: string[] | null
          domain?: string | null
          email: string
          email_count?: number | null
          emergency_phone?: string | null
          emergency_service?: boolean | null
          example_websites?: string | null
          existing_domain?: string | null
          existing_website?: string | null
          freepik_downloads_used?: number | null
          freepik_period_start?: string | null
          full_name?: string | null
          ga4_property_id?: string | null
          id: string
          industry?: string | null
          location?: string | null
          logo_url?: string | null
          monthly_goals?: string | null
          needs_email?: boolean | null
          newsletter_signup?: boolean | null
          onboarding_complete?: boolean | null
          onboarding_step?: number | null
          phone?: string | null
          plan?: Database["public"]["Enums"]["user_plan"]
          preferred_contact_method?: string | null
          preview_url?: string | null
          pricing_strategy?: string | null
          service_area?: string | null
          services?: string | null
          signup_files?: string[] | null
          social_media?: Json | null
          special_offers?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          tagline?: string | null
          target_keywords?: string | null
          tickets_used_this_period?: number | null
          top_services?: string | null
          unique_selling_points?: string | null
          updated_at?: string | null
          website_features?: Json | null
          website_status?: string | null
          website_url?: string | null
          years_in_business?: string | null
        }
        Update: {
          additional_info?: string | null
          billing_period_start?: string | null
          brand_colors?: Json | null
          brand_style?: string | null
          business_address?: string | null
          business_description?: string | null
          business_email?: string | null
          business_hours?: string | null
          business_name?: string | null
          business_objectives?: string[] | null
          business_phone?: string | null
          business_size?: string | null
          certifications?: string | null
          competitor_analysis?: string | null
          competitor_websites?: string | null
          content_pages?: Json | null
          created_at?: string | null
          desired_emails?: string[] | null
          domain?: string | null
          email?: string
          email_count?: number | null
          emergency_phone?: string | null
          emergency_service?: boolean | null
          example_websites?: string | null
          existing_domain?: string | null
          existing_website?: string | null
          freepik_downloads_used?: number | null
          freepik_period_start?: string | null
          full_name?: string | null
          ga4_property_id?: string | null
          id?: string
          industry?: string | null
          location?: string | null
          logo_url?: string | null
          monthly_goals?: string | null
          needs_email?: boolean | null
          newsletter_signup?: boolean | null
          onboarding_complete?: boolean | null
          onboarding_step?: number | null
          phone?: string | null
          plan?: Database["public"]["Enums"]["user_plan"]
          preferred_contact_method?: string | null
          preview_url?: string | null
          pricing_strategy?: string | null
          service_area?: string | null
          services?: string | null
          signup_files?: string[] | null
          social_media?: Json | null
          special_offers?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          tagline?: string | null
          target_keywords?: string | null
          tickets_used_this_period?: number | null
          top_services?: string | null
          unique_selling_points?: string | null
          updated_at?: string | null
          website_features?: Json | null
          website_status?: string | null
          website_url?: string | null
          years_in_business?: string | null
        }
        Relationships: []
      }
      website_assets: {
        Row: {
          asset_type: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          is_active: boolean | null
          mime_type: string | null
          uploaded_at: string | null
          user_id: string | null
        }
        Insert: {
          asset_type: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          is_active?: boolean | null
          mime_type?: string | null
          uploaded_at?: string | null
          user_id?: string | null
        }
        Update: {
          asset_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          is_active?: boolean | null
          mime_type?: string | null
          uploaded_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "website_assets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_create_ticket: { Args: { user_id: string }; Returns: boolean }
      can_download_freepik: { Args: { user_id: string }; Returns: boolean }
      check_and_reset_freepik_downloads: {
        Args: { user_id: string }
        Returns: undefined
      }
      check_and_reset_tickets: { Args: { user_id: string }; Returns: undefined }
      get_freepik_limit: {
        Args: { user_plan: Database["public"]["Enums"]["user_plan"] }
        Returns: number
      }
      get_ticket_limit: {
        Args: { user_plan: Database["public"]["Enums"]["user_plan"] }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      notify_admins: {
        Args: {
          notification_link: string
          notification_message: string
          notification_title: string
          notification_type: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
      blog_post_status: "draft" | "published" | "failed"
      request_status: "pending" | "in_progress" | "completed"
      site_status: "live" | "building" | "maintenance"
      submission_status: "new" | "read" | "contacted"
      user_plan: "starter" | "professional" | "premium"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      blog_post_status: ["draft", "published", "failed"],
      request_status: ["pending", "in_progress", "completed"],
      site_status: ["live", "building", "maintenance"],
      submission_status: ["new", "read", "contacted"],
      user_plan: ["starter", "professional", "premium"],
    },
  },
} as const
