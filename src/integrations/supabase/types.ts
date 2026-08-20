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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      approval_requests: {
        Row: {
          company_id: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_reason: string | null
          id: string
          object_id: string | null
          object_type: string
          payload: Json
          reference: string | null
          requested_by: string
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          id?: string
          object_id?: string | null
          object_type: string
          payload?: Json
          reference?: string | null
          requested_by: string
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          id?: string
          object_id?: string | null
          object_type?: string
          payload?: Json
          reference?: string | null
          requested_by?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          company_id: string
          created_at: string
          file_name: string
          id: string
          metadata: Json
          mime_type: string | null
          object_id: string | null
          object_type: string
          size_bytes: number | null
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          company_id: string
          created_at?: string
          file_name: string
          id?: string
          metadata?: Json
          mime_type?: string | null
          object_id?: string | null
          object_type: string
          size_bytes?: number | null
          storage_path: string
          uploaded_by: string
        }
        Update: {
          company_id?: string
          created_at?: string
          file_name?: string
          id?: string
          metadata?: Json
          mime_type?: string | null
          object_id?: string | null
          object_type?: string
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_id: string | null
          after_state: Json | null
          before_state: Json | null
          company_id: string | null
          context: Json
          correlation_id: string | null
          created_at: string
          id: string
          object_id: string | null
          object_type: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          company_id?: string | null
          context?: Json
          correlation_id?: string | null
          created_at?: string
          id?: string
          object_id?: string | null
          object_type: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          company_id?: string | null
          context?: Json
          correlation_id?: string | null
          created_at?: string
          id?: string
          object_id?: string | null
          object_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          id: string
          legal_name: string | null
          name: string
          status: Database["public"]["Enums"]["record_status"]
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          legal_name?: string | null
          name: string
          status?: Database["public"]["Enums"]["record_status"]
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          legal_name?: string | null
          name?: string
          status?: Database["public"]["Enums"]["record_status"]
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          company_id: string
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      idempotency_keys: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          key: string
          operation: string
          request_hash: string
          response: Json | null
          status: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          key: string
          operation: string
          request_hash: string
          response?: Json | null
          status?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          key?: string
          operation?: string
          request_hash?: string
          response?: Json | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "idempotency_keys_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          company_id: string
          created_at: string
          default_unit_id: string | null
          id: string
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          default_unit_id?: string | null
          id?: string
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          default_unit_id?: string | null
          id?: string
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_default_unit_id_fkey"
            columns: ["default_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          category: string
          company_id: string | null
          created_at: string
          id: string
          payload: Json
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          category?: string
          company_id?: string | null
          created_at?: string
          id?: string
          payload?: Json
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          category?: string
          company_id?: string | null
          created_at?: string
          id?: string
          payload?: Json
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          module: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          module: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          module?: string
        }
        Relationships: []
      }
      policies: {
        Row: {
          code: string
          company_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "policies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_versions: {
        Row: {
          company_id: string
          content: Json
          created_at: string
          created_by: string | null
          effective_from: string
          effective_to: string | null
          id: string
          policy_id: string
          version: number
        }
        Insert: {
          company_id: string
          content?: Json
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          policy_id: string
          version: number
        }
        Update: {
          company_id?: string
          content?: Json
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          policy_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "policy_versions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_versions_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      role_assignments: {
        Row: {
          company_id: string | null
          created_at: string
          granted_by: string | null
          id: string
          reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          role_id: string
          scope: Database["public"]["Enums"]["role_scope"]
          unit_id: string | null
          updated_at: string
          user_id: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          granted_by?: string | null
          id?: string
          reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          role_id: string
          scope: Database["public"]["Enums"]["role_scope"]
          unit_id?: string | null
          updated_at?: string
          user_id: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          granted_by?: string | null
          id?: string
          reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          role_id?: string
          scope?: Database["public"]["Enums"]["role_scope"]
          unit_id?: string | null
          updated_at?: string
          user_id?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_assignments_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_assignments_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          code: string
          created_at: string
          id: string
          is_system: boolean
          name: string
          scope: Database["public"]["Enums"]["role_scope"]
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_system?: boolean
          name: string
          scope: Database["public"]["Enums"]["role_scope"]
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_system?: boolean
          name?: string
          scope?: Database["public"]["Enums"]["role_scope"]
        }
        Relationships: []
      }
      sequence_counters: {
        Row: {
          company_id: string
          current_value: number
          id: string
          padding: number
          prefix: string
          scope_key: string
          updated_at: string
        }
        Insert: {
          company_id: string
          current_value?: number
          id?: string
          padding?: number
          prefix?: string
          scope_key: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          current_value?: number
          id?: string
          padding?: number
          prefix?: string
          scope_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequence_counters_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          code: string | null
          company_id: string
          created_at: string
          id: string
          name: string
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
        }
        Insert: {
          code?: string | null
          company_id: string
          created_at?: string
          id?: string
          name: string
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Update: {
          code?: string | null
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_idempotency_key: {
        Args: {
          _company_id: string
          _key: string
          _operation: string
          _request: Json
          _response?: Json
        }
        Returns: Json
      }
      has_permission: {
        Args: { _company_id: string; _permission: string; _user_id: string }
        Returns: boolean
      }
      is_company_member: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
      is_user_active: { Args: { _user_id: string }; Returns: boolean }
      log_audit_event: {
        Args: {
          _action: string
          _after?: Json
          _before?: Json
          _company_id: string
          _context?: Json
          _correlation_id?: string
          _object_id: string
          _object_type: string
        }
        Returns: string
      }
      my_company_ids: { Args: never; Returns: string[] }
      next_sequence_value: {
        Args: { _company_id: string; _prefix?: string; _scope_key: string }
        Returns: string
      }
      notify_user: {
        Args: {
          _body?: string
          _category?: string
          _company_id: string
          _payload?: Json
          _title: string
          _user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      record_status: "active" | "inactive" | "suspended"
      role_scope: "platform" | "company" | "unit"
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
      record_status: ["active", "inactive", "suspended"],
      role_scope: ["platform", "company", "unit"],
    },
  },
} as const
