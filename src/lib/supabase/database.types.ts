/**
 * Supabase Database types — generated from Drizzle schema.
 *
 * This provides type-safe access to all tables via the Supabase client.
 * When the Supabase CLI is available and linked, replace this with:
 *   supabase gen types typescript --project-id <ref> > src/lib/supabase/database.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          name: string;
          slug: string;
          domain: string | null;
          status: string;
          logo_url: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          name: string;
          slug: string;
          domain?: string | null;
          status?: string;
          logo_url?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          name?: string;
          slug?: string;
          domain?: string | null;
          status?: string;
          logo_url?: string | null;
        };
      };
      users: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          tenant_id: string;
          email: string;
          name: string;
          avatar_url: string | null;
          is_active: boolean;
          last_login_at: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          tenant_id: string;
          email: string;
          name: string;
          avatar_url?: string | null;
          is_active?: boolean;
          last_login_at?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          tenant_id?: string;
          email?: string;
          name?: string;
          avatar_url?: string | null;
          is_active?: boolean;
          last_login_at?: string | null;
        };
      };
      tenant_config: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          tenant_id: string;
          branding: Json | null;
          settings: Json;
          metadata: Json;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          tenant_id: string;
          branding?: Json | null;
          settings?: Json;
          metadata?: Json;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          tenant_id?: string;
          branding?: Json | null;
          settings?: Json;
          metadata?: Json;
        };
      };
      roles: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          name: string;
          slug: string;
          description: string | null;
          is_system: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          name: string;
          slug: string;
          description?: string | null;
          is_system?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          is_system?: boolean;
        };
      };
      permissions: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          name: string;
          slug: string;
          description: string | null;
          group: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          name: string;
          slug: string;
          description?: string | null;
          group: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          group?: string;
        };
      };
      role_permissions: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          role_id: string;
          permission_id: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          role_id: string;
          permission_id: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          role_id?: string;
          permission_id?: string;
        };
      };
      user_roles: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          user_id: string;
          role_id: string;
          tenant_id: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id: string;
          role_id: string;
          tenant_id: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
          role_id?: string;
          tenant_id?: string;
        };
      };
      user_permissions: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          user_id: string;
          permission_id: string;
          tenant_id: string;
          effect: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id: string;
          permission_id: string;
          tenant_id: string;
          effect?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
          permission_id?: string;
          tenant_id?: string;
          effect?: string;
        };
      };
      plans: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          name: string;
          slug: string;
          description: string | null;
          tier: string;
          price_monthly: number;
          price_yearly: number;
          currency: string;
          is_active: boolean;
          sort_order: number;
          stripe_price_id_monthly: string | null;
          stripe_price_id_yearly: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          name: string;
          slug: string;
          description?: string | null;
          tier: string;
          price_monthly?: number;
          price_yearly?: number;
          currency?: string;
          is_active?: boolean;
          sort_order?: number;
          stripe_price_id_monthly?: string | null;
          stripe_price_id_yearly?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          tier?: string;
          price_monthly?: number;
          price_yearly?: number;
          currency?: string;
          is_active?: boolean;
          sort_order?: number;
          stripe_price_id_monthly?: string | null;
          stripe_price_id_yearly?: string | null;
        };
      };
      plan_features: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          plan_id: string;
          feature_key: string;
          enabled: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          plan_id: string;
          feature_key: string;
          enabled?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          plan_id?: string;
          feature_key?: string;
          enabled?: boolean;
        };
      };
      plan_permissions: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          plan_id: string;
          permission_id: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          plan_id: string;
          permission_id: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          plan_id?: string;
          permission_id?: string;
        };
      };
      plan_quotas: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          plan_id: string;
          quota_key: string;
          value: number;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          plan_id: string;
          quota_key: string;
          value: number;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          plan_id?: string;
          quota_key?: string;
          value?: number;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          tenant_id: string;
          plan_id: string;
          status: string;
          trial_start_at: string | null;
          trial_end_at: string | null;
          current_period_start: string | null;
          current_period_end: string | null;
          canceled_at: string | null;
          stripe_subscription_id: string | null;
          stripe_customer_id: string | null;
          billing_interval: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          tenant_id: string;
          plan_id: string;
          status?: string;
          trial_start_at?: string | null;
          trial_end_at?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          canceled_at?: string | null;
          stripe_subscription_id?: string | null;
          stripe_customer_id?: string | null;
          billing_interval?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          tenant_id?: string;
          plan_id?: string;
          status?: string;
          trial_start_at?: string | null;
          trial_end_at?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          canceled_at?: string | null;
          stripe_subscription_id?: string | null;
          stripe_customer_id?: string | null;
          billing_interval?: string | null;
        };
      };
      subscription_events: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          subscription_id: string;
          tenant_id: string;
          event_type: string;
          previous_plan_id: string | null;
          new_plan_id: string | null;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          subscription_id: string;
          tenant_id: string;
          event_type: string;
          previous_plan_id?: string | null;
          new_plan_id?: string | null;
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          subscription_id?: string;
          tenant_id?: string;
          event_type?: string;
          previous_plan_id?: string | null;
          new_plan_id?: string | null;
          metadata?: Json | null;
        };
      };
      usage_quotas: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          tenant_id: string;
          quota_key: string;
          used: number;
          limit: number;
          reset_at: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          tenant_id: string;
          quota_key: string;
          used?: number;
          limit: number;
          reset_at?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          tenant_id?: string;
          quota_key?: string;
          used?: number;
          limit?: number;
          reset_at?: string | null;
        };
      };
      quota_usage_history: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          tenant_id: string;
          quota_key: string;
          delta: number;
          action: string;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          tenant_id: string;
          quota_key: string;
          delta: number;
          action: string;
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          tenant_id?: string;
          quota_key?: string;
          delta?: number;
          action?: string;
          metadata?: Json | null;
        };
      };
      feature_flags: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          key: string;
          name: string;
          description: string | null;
          enabled: boolean;
          is_public: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          key: string;
          name: string;
          description?: string | null;
          enabled?: boolean;
          is_public?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          key?: string;
          name?: string;
          description?: string | null;
          enabled?: boolean;
          is_public?: boolean;
        };
      };
      feature_flag_overrides: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          feature_flag_id: string;
          tenant_id: string;
          plan_id: string | null;
          enabled: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          feature_flag_id: string;
          tenant_id: string;
          plan_id?: string | null;
          enabled: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          feature_flag_id?: string;
          tenant_id?: string;
          plan_id?: string | null;
          enabled?: boolean;
        };
      };
      dashboards: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          tenant_id: string;
          user_id: string | null;
          name: string;
          description: string | null;
          visibility: string;
          layout: Json | null;
          is_default: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          tenant_id: string;
          user_id?: string | null;
          name: string;
          description?: string | null;
          visibility?: string;
          layout?: Json | null;
          is_default?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          tenant_id?: string;
          user_id?: string | null;
          name?: string;
          description?: string | null;
          visibility?: string;
          layout?: Json | null;
          is_default?: boolean;
        };
      };
      dashboard_widgets: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          dashboard_id: string;
          widget_type: string;
          title: string;
          config: Json;
          position: Json | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          dashboard_id: string;
          widget_type: string;
          title: string;
          config?: Json;
          position?: Json | null;
          sort_order?: number;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          dashboard_id?: string;
          widget_type?: string;
          title?: string;
          config?: Json;
          position?: Json | null;
          sort_order?: number;
        };
      };
      dashboard_shares: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          dashboard_id: string;
          tenant_id: string;
          shared_with_user_id: string | null;
          shared_with_role_id: string | null;
          share_type: string;
          token: string | null;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          dashboard_id: string;
          tenant_id: string;
          shared_with_user_id?: string | null;
          shared_with_role_id?: string | null;
          share_type: string;
          token?: string | null;
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          dashboard_id?: string;
          tenant_id?: string;
          shared_with_user_id?: string | null;
          shared_with_role_id?: string | null;
          share_type?: string;
          token?: string | null;
          expires_at?: string | null;
        };
      };
      reports: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          tenant_id: string;
          user_id: string | null;
          name: string;
          description: string | null;
          report_type: string;
          config: Json;
          is_scheduled: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          tenant_id: string;
          user_id?: string | null;
          name: string;
          description?: string | null;
          report_type: string;
          config?: Json;
          is_scheduled?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          tenant_id?: string;
          user_id?: string | null;
          name?: string;
          description?: string | null;
          report_type?: string;
          config?: Json;
          is_scheduled?: boolean;
        };
      };
      report_schedules: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          report_id: string;
          tenant_id: string;
          cron_expression: string;
          format: string;
          recipients: Json | null;
          is_active: boolean;
          last_run_at: string | null;
          next_run_at: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          report_id: string;
          tenant_id: string;
          cron_expression: string;
          format?: string;
          recipients?: Json | null;
          is_active?: boolean;
          last_run_at?: string | null;
          next_run_at?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          report_id?: string;
          tenant_id?: string;
          cron_expression?: string;
          format?: string;
          recipients?: Json | null;
          is_active?: boolean;
          last_run_at?: string | null;
          next_run_at?: string | null;
        };
      };
      wootric_responses: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          tenant_id: string;
          wootric_id: number;
          survey_id: number;
          end_user_id: number | null;
          email: string | null;
          score: number | null;
          text: string | null;
          origin_url: string | null;
          ip_address: string | null;
          wootric_created_at: string;
          wootric_updated_at: string | null;
          tags: string[] | null;
          end_user_properties: Json | null;
          synced_at: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          tenant_id: string;
          wootric_id: number;
          survey_id: number;
          end_user_id?: number | null;
          email?: string | null;
          score?: number | null;
          text?: string | null;
          origin_url?: string | null;
          ip_address?: string | null;
          wootric_created_at: string;
          wootric_updated_at?: string | null;
          tags?: string[] | null;
          end_user_properties?: Json | null;
          synced_at?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          tenant_id?: string;
          wootric_id?: number;
          survey_id?: number;
          end_user_id?: number | null;
          email?: string | null;
          score?: number | null;
          text?: string | null;
          origin_url?: string | null;
          ip_address?: string | null;
          wootric_created_at?: string;
          wootric_updated_at?: string | null;
          tags?: string[] | null;
          end_user_properties?: Json | null;
          synced_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          tenant_id: string;
          user_id: string | null;
          action: string;
          entity_type: string | null;
          entity_id: string | null;
          metadata: Json | null;
          ip_address: string | null;
          user_agent: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          tenant_id: string;
          user_id?: string | null;
          action: string;
          entity_type?: string | null;
          entity_id?: string | null;
          metadata?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          tenant_id?: string;
          user_id?: string | null;
          action?: string;
          entity_type?: string | null;
          entity_id?: string | null;
          metadata?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
        };
      };
      export_history: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          tenant_id: string;
          user_id: string | null;
          format: string;
          status: string;
          file_name: string | null;
          file_size: number | null;
          record_count: number | null;
          duration_ms: number | null;
          r2_key: string | null;
          error_message: string | null;
          filters: Json | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          tenant_id: string;
          user_id?: string | null;
          format: string;
          status?: string;
          file_name?: string | null;
          file_size?: number | null;
          record_count?: number | null;
          duration_ms?: number | null;
          r2_key?: string | null;
          error_message?: string | null;
          filters?: Json | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          tenant_id?: string;
          user_id?: string | null;
          format?: string;
          status?: string;
          file_name?: string | null;
          file_size?: number | null;
          record_count?: number | null;
          duration_ms?: number | null;
          r2_key?: string | null;
          error_message?: string | null;
          filters?: Json | null;
        };
      };
      report_downloads: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          tenant_id: string;
          user_id: string | null;
          export_history_id: string | null;
          report_id: string | null;
          format: string;
          ip_address: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          tenant_id: string;
          user_id?: string | null;
          export_history_id?: string | null;
          report_id?: string | null;
          format: string;
          ip_address?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          tenant_id?: string;
          user_id?: string | null;
          export_history_id?: string | null;
          report_id?: string | null;
          format?: string;
          ip_address?: string | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
