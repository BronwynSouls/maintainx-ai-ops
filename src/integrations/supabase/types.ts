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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assets: {
        Row: {
          asset_tag: string | null
          category_id: string | null
          created_at: string
          hotel_id: string
          id: string
          location_id: string | null
          name: string
        }
        Insert: {
          asset_tag?: string | null
          category_id?: string | null
          created_at?: string
          hotel_id: string
          id?: string
          location_id?: string | null
          name: string
        }
        Update: {
          asset_tag?: string | null
          category_id?: string | null
          created_at?: string
          hotel_id?: string
          id?: string
          location_id?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "maintenance_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "hotel_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_locations: {
        Row: {
          created_at: string
          floor: string | null
          hotel_id: string
          id: string
          name: string
          qr_code: string | null
          room_number: string | null
        }
        Insert: {
          created_at?: string
          floor?: string | null
          hotel_id: string
          id?: string
          name: string
          qr_code?: string | null
          room_number?: string | null
        }
        Update: {
          created_at?: string
          floor?: string | null
          hotel_id?: string
          id?: string
          name?: string
          qr_code?: string | null
          room_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_locations_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      hotels: {
        Row: {
          address: string | null
          city: string | null
          contact_email: string | null
          country: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          org_type: Database["public"]["Enums"]["org_type"]
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          org_type?: Database["public"]["Enums"]["org_type"]
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          org_type?: Database["public"]["Enums"]["org_type"]
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      maintenance_categories: {
        Row: {
          default_service_slug: string | null
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          default_service_slug?: string | null
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          default_service_slug?: string | null
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      maintenance_companies: {
        Row: {
          address: string | null
          city: string | null
          contact_email: string | null
          country: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      maintenance_services: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string
          email: string | null
          full_name: string
          hotel_id: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          hotel_id?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          hotel_id?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "maintenance_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_targets: {
        Row: {
          assign_minutes: number
          created_at: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          resolve_minutes: number
          updated_at: string
        }
        Insert: {
          assign_minutes: number
          created_at?: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          resolve_minutes: number
          updated_at?: string
        }
        Update: {
          assign_minutes?: number
          created_at?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolve_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      technician_services: {
        Row: {
          created_at: string
          id: string
          service_id: string
          technician_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          service_id: string
          technician_id: string
        }
        Update: {
          created_at?: string
          id?: string
          service_id?: string
          technician_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "technician_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "maintenance_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technician_services_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      technicians: {
        Row: {
          company_id: string | null
          created_at: string
          full_name: string
          hotel_id: string | null
          id: string
          is_active: boolean
          is_available: boolean
          profile_id: string | null
          specialty: string | null
          technician_type: Database["public"]["Enums"]["technician_type"]
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          full_name: string
          hotel_id?: string | null
          id?: string
          is_active?: boolean
          is_available?: boolean
          profile_id?: string | null
          specialty?: string | null
          technician_type?: Database["public"]["Enums"]["technician_type"]
        }
        Update: {
          company_id?: string | null
          created_at?: string
          full_name?: string
          hotel_id?: string | null
          id?: string
          is_active?: boolean
          is_available?: boolean
          profile_id?: string | null
          specialty?: string | null
          technician_type?: Database["public"]["Enums"]["technician_type"]
        }
        Relationships: [
          {
            foreignKeyName: "technicians_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "maintenance_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technicians_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technicians_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_activity: {
        Row: {
          actor_label: string | null
          actor_user_id: string | null
          created_at: string
          event_type: string
          id: string
          message: string | null
          metadata: Json
          ticket_id: string
        }
        Insert: {
          actor_label?: string | null
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          message?: string | null
          metadata?: Json
          ticket_id: string
        }
        Update: {
          actor_label?: string | null
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          message?: string | null
          metadata?: Json
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_activity_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          company_id: string | null
          id: string
          technician_id: string | null
          ticket_id: string
          unassigned_at: string | null
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          company_id?: string | null
          id?: string
          technician_id?: string | null
          ticket_id: string
          unassigned_at?: string | null
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          company_id?: string | null
          id?: string
          technician_id?: string | null
          ticket_id?: string
          unassigned_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "maintenance_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_assignments_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_assignments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_status_history: {
        Row: {
          changed_by: string | null
          changed_by_label: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["ticket_status"] | null
          id: string
          ticket_id: string
          to_status: Database["public"]["Enums"]["ticket_status"]
        }
        Insert: {
          changed_by?: string | null
          changed_by_label?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["ticket_status"] | null
          id?: string
          ticket_id: string
          to_status: Database["public"]["Enums"]["ticket_status"]
        }
        Update: {
          changed_by?: string | null
          changed_by_label?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["ticket_status"] | null
          id?: string
          ticket_id?: string
          to_status?: Database["public"]["Enums"]["ticket_status"]
        }
        Relationships: [
          {
            foreignKeyName: "ticket_status_history_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          ai_category_slug: string | null
          ai_confidence: number | null
          ai_model: string | null
          ai_priority: Database["public"]["Enums"]["ticket_priority"] | null
          ai_reason: string | null
          ai_response_at: string | null
          ai_status: string
          ai_suggested_response: string | null
          asset_id: string | null
          assign_due_at: string | null
          assigned_at: string | null
          assigned_technician_id: string | null
          audio_url: string | null
          category_id: string | null
          created_at: string
          description: string
          escalated_at: string | null
          escalation_count: number
          escalation_reason: string | null
          external_eta_at: string | null
          hotel_id: string
          id: string
          image_url: string | null
          input_method: string
          is_escalated: boolean
          language: string
          location_id: string | null
          location_text: string | null
          needs_manual_classification: boolean
          notify_reporter: boolean
          priority: Database["public"]["Enums"]["ticket_priority"]
          reporter_email: string | null
          reporter_type: Database["public"]["Enums"]["reporter_type"]
          reporter_user_id: string | null
          resolve_due_at: string | null
          resolved_at: string | null
          sla_tracked: boolean
          started_at: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          ticket_number: string
          title: string | null
          transcription: string | null
          updated_at: string
        }
        Insert: {
          ai_category_slug?: string | null
          ai_confidence?: number | null
          ai_model?: string | null
          ai_priority?: Database["public"]["Enums"]["ticket_priority"] | null
          ai_reason?: string | null
          ai_response_at?: string | null
          ai_status?: string
          ai_suggested_response?: string | null
          asset_id?: string | null
          assign_due_at?: string | null
          assigned_at?: string | null
          assigned_technician_id?: string | null
          audio_url?: string | null
          category_id?: string | null
          created_at?: string
          description: string
          escalated_at?: string | null
          escalation_count?: number
          escalation_reason?: string | null
          external_eta_at?: string | null
          hotel_id: string
          id?: string
          image_url?: string | null
          input_method?: string
          is_escalated?: boolean
          language?: string
          location_id?: string | null
          location_text?: string | null
          needs_manual_classification?: boolean
          notify_reporter?: boolean
          priority?: Database["public"]["Enums"]["ticket_priority"]
          reporter_email?: string | null
          reporter_type?: Database["public"]["Enums"]["reporter_type"]
          reporter_user_id?: string | null
          resolve_due_at?: string | null
          resolved_at?: string | null
          sla_tracked?: boolean
          started_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_number: string
          title?: string | null
          transcription?: string | null
          updated_at?: string
        }
        Update: {
          ai_category_slug?: string | null
          ai_confidence?: number | null
          ai_model?: string | null
          ai_priority?: Database["public"]["Enums"]["ticket_priority"] | null
          ai_reason?: string | null
          ai_response_at?: string | null
          ai_status?: string
          ai_suggested_response?: string | null
          asset_id?: string | null
          assign_due_at?: string | null
          assigned_at?: string | null
          assigned_technician_id?: string | null
          audio_url?: string | null
          category_id?: string | null
          created_at?: string
          description?: string
          escalated_at?: string | null
          escalation_count?: number
          escalation_reason?: string | null
          external_eta_at?: string | null
          hotel_id?: string
          id?: string
          image_url?: string | null
          input_method?: string
          is_escalated?: boolean
          language?: string
          location_id?: string | null
          location_text?: string | null
          needs_manual_classification?: boolean
          notify_reporter?: boolean
          priority?: Database["public"]["Enums"]["ticket_priority"]
          reporter_email?: string | null
          reporter_type?: Database["public"]["Enums"]["reporter_type"]
          reporter_user_id?: string | null
          resolve_due_at?: string | null
          resolved_at?: string | null
          sla_tracked?: boolean
          started_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_number?: string
          title?: string | null
          transcription?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_assigned_technician_id_fkey"
            columns: ["assigned_technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "maintenance_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "hotel_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "hotel_manager" | "receptionist" | "technician" | "admin"
      org_type: "hotel" | "apartment" | "property_management" | "business"
      reporter_type:
        | "guest"
        | "receptionist"
        | "hotel_manager"
        | "technician"
        | "system"
      technician_type: "in_house" | "external"
      ticket_priority: "critical" | "medium" | "low"
      ticket_status:
        | "new"
        | "assigned"
        | "in_progress"
        | "pending"
        | "scheduled"
        | "resolved"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["hotel_manager", "receptionist", "technician", "admin"],
      org_type: ["hotel", "apartment", "property_management", "business"],
      reporter_type: [
        "guest",
        "receptionist",
        "hotel_manager",
        "technician",
        "system",
      ],
      technician_type: ["in_house", "external"],
      ticket_priority: ["critical", "medium", "low"],
      ticket_status: [
        "new",
        "assigned",
        "in_progress",
        "pending",
        "scheduled",
        "resolved",
      ],
    },
  },
} as const
