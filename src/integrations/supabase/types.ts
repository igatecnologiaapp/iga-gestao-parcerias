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
      candidate_evaluations: {
        Row: {
          candidate_id: string
          company_id: string
          created_at: string
          criteria: Json
          decision: string
          evaluated_at: string
          evaluator_id: string
          id: string
          notes: string | null
          stage: Database["public"]["Enums"]["candidate_status"]
        }
        Insert: {
          candidate_id: string
          company_id: string
          created_at?: string
          criteria?: Json
          decision: string
          evaluated_at?: string
          evaluator_id: string
          id?: string
          notes?: string | null
          stage: Database["public"]["Enums"]["candidate_status"]
        }
        Update: {
          candidate_id?: string
          company_id?: string
          created_at?: string
          criteria?: Json
          decision?: string
          evaluated_at?: string
          evaluator_id?: string
          id?: string
          notes?: string | null
          stage?: Database["public"]["Enums"]["candidate_status"]
        }
        Relationships: [
          {
            foreignKeyName: "candidate_evaluations_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_evaluations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_stage_events: {
        Row: {
          actor_id: string | null
          candidate_id: string
          company_id: string
          created_at: string
          from_status: Database["public"]["Enums"]["candidate_status"] | null
          id: string
          reason: string | null
          to_status: Database["public"]["Enums"]["candidate_status"]
        }
        Insert: {
          actor_id?: string | null
          candidate_id: string
          company_id: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["candidate_status"] | null
          id?: string
          reason?: string | null
          to_status: Database["public"]["Enums"]["candidate_status"]
        }
        Update: {
          actor_id?: string | null
          candidate_id?: string
          company_id?: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["candidate_status"] | null
          id?: string
          reason?: string | null
          to_status?: Database["public"]["Enums"]["candidate_status"]
        }
        Relationships: [
          {
            foreignKeyName: "candidate_stage_events_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_stage_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          applied_at: string
          approach: string | null
          approved_at: string | null
          campaign: string | null
          city: string | null
          closed_at: string | null
          code: string | null
          company_id: string
          created_at: string
          created_by: string | null
          document: string | null
          email: string | null
          experience: string | null
          full_name: string
          id: string
          metadata: Json
          notes: string | null
          owner_id: string | null
          phone: string | null
          referral: string | null
          source_channel: string | null
          state: string | null
          status: Database["public"]["Enums"]["candidate_status"]
          status_changed_at: string
          unit_id: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          applied_at?: string
          approach?: string | null
          approved_at?: string | null
          campaign?: string | null
          city?: string | null
          closed_at?: string | null
          code?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          document?: string | null
          email?: string | null
          experience?: string | null
          full_name: string
          id?: string
          metadata?: Json
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          referral?: string | null
          source_channel?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["candidate_status"]
          status_changed_at?: string
          unit_id?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          applied_at?: string
          approach?: string | null
          approved_at?: string | null
          campaign?: string | null
          city?: string | null
          closed_at?: string | null
          code?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          document?: string | null
          email?: string | null
          experience?: string | null
          full_name?: string
          id?: string
          metadata?: Json
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          referral?: string | null
          source_channel?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["candidate_status"]
          status_changed_at?: string
          unit_id?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
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
      onboarding_checklist_items: {
        Row: {
          category: string
          checklist_id: string
          code: string
          company_id: string
          created_at: string
          id: string
          label: string
          requires_evidence: boolean
          sort_order: number
        }
        Insert: {
          category?: string
          checklist_id: string
          code: string
          company_id: string
          created_at?: string
          id?: string
          label: string
          requires_evidence?: boolean
          sort_order?: number
        }
        Update: {
          category?: string
          checklist_id?: string
          code?: string
          company_id?: string
          created_at?: string
          id?: string
          label?: string
          requires_evidence?: boolean
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "onboarding_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_checklist_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_checklists: {
        Row: {
          code: string
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          version: number
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          version?: number
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_checklists_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_certifications: {
        Row: {
          company_id: string
          competency: string
          created_at: string
          id: string
          issued_at: string | null
          notes: string | null
          partner_id: string
          responsible_id: string | null
          result: string | null
          status: Database["public"]["Enums"]["certification_status"]
          supersedes_id: string | null
          type: string
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          company_id: string
          competency: string
          created_at?: string
          id?: string
          issued_at?: string | null
          notes?: string | null
          partner_id: string
          responsible_id?: string | null
          result?: string | null
          status?: Database["public"]["Enums"]["certification_status"]
          supersedes_id?: string | null
          type: string
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          company_id?: string
          competency?: string
          created_at?: string
          id?: string
          issued_at?: string | null
          notes?: string | null
          partner_id?: string
          responsible_id?: string | null
          result?: string | null
          status?: Database["public"]["Enums"]["certification_status"]
          supersedes_id?: string | null
          type?: string
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_certifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_certifications_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_certifications_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "partner_certifications"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_followups: {
        Row: {
          activities: string | null
          company_id: string
          created_at: string
          day_offset: number | null
          difficulties: string | null
          evolution: string | null
          id: string
          milestone: string
          notes: string | null
          occurred_at: string
          partner_id: string
          pending_trainings: string | null
          responsible_id: string | null
          support_needed: string | null
        }
        Insert: {
          activities?: string | null
          company_id: string
          created_at?: string
          day_offset?: number | null
          difficulties?: string | null
          evolution?: string | null
          id?: string
          milestone: string
          notes?: string | null
          occurred_at?: string
          partner_id: string
          pending_trainings?: string | null
          responsible_id?: string | null
          support_needed?: string | null
        }
        Update: {
          activities?: string | null
          company_id?: string
          created_at?: string
          day_offset?: number | null
          difficulties?: string | null
          evolution?: string | null
          id?: string
          milestone?: string
          notes?: string | null
          occurred_at?: string
          partner_id?: string
          pending_trainings?: string | null
          responsible_id?: string | null
          support_needed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_followups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_followups_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_onboarding_items: {
        Row: {
          category: string
          checklist_id: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          evidence_attachment_id: string | null
          id: string
          item_code: string
          label: string
          notes: string | null
          partner_id: string
          responsible_id: string | null
          status: Database["public"]["Enums"]["checklist_item_status"]
          updated_at: string
        }
        Insert: {
          category?: string
          checklist_id?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          evidence_attachment_id?: string | null
          id?: string
          item_code: string
          label: string
          notes?: string | null
          partner_id: string
          responsible_id?: string | null
          status?: Database["public"]["Enums"]["checklist_item_status"]
          updated_at?: string
        }
        Update: {
          category?: string
          checklist_id?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          evidence_attachment_id?: string | null
          id?: string
          item_code?: string
          label?: string
          notes?: string | null
          partner_id?: string
          responsible_id?: string | null
          status?: Database["public"]["Enums"]["checklist_item_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_onboarding_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "onboarding_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_onboarding_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_onboarding_items_evidence_attachment_id_fkey"
            columns: ["evidence_attachment_id"]
            isOneToOne: false
            referencedRelation: "attachments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_onboarding_items_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_policy_acceptances: {
        Row: {
          accepted_at: string
          accepted_by: string
          company_id: string
          context: Json
          created_at: string
          evidence_attachment_id: string | null
          id: string
          partner_id: string
          policy_id: string
          policy_version_id: string
        }
        Insert: {
          accepted_at?: string
          accepted_by: string
          company_id: string
          context?: Json
          created_at?: string
          evidence_attachment_id?: string | null
          id?: string
          partner_id: string
          policy_id: string
          policy_version_id: string
        }
        Update: {
          accepted_at?: string
          accepted_by?: string
          company_id?: string
          context?: Json
          created_at?: string
          evidence_attachment_id?: string | null
          id?: string
          partner_id?: string
          policy_id?: string
          policy_version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_policy_acceptances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_policy_acceptances_evidence_attachment_id_fkey"
            columns: ["evidence_attachment_id"]
            isOneToOne: false
            referencedRelation: "attachments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_policy_acceptances_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_policy_acceptances_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_policy_acceptances_policy_version_id_fkey"
            columns: ["policy_version_id"]
            isOneToOne: false
            referencedRelation: "policy_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_territories: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          mode: Database["public"]["Enums"]["territory_mode"]
          partner_id: string
          reason: string | null
          status: Database["public"]["Enums"]["partner_territory_status"]
          territory_id: string
          updated_at: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["territory_mode"]
          partner_id: string
          reason?: string | null
          status?: Database["public"]["Enums"]["partner_territory_status"]
          territory_id: string
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["territory_mode"]
          partner_id?: string
          reason?: string | null
          status?: Database["public"]["Enums"]["partner_territory_status"]
          territory_id?: string
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_territories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_territories_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_territories_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_trainings: {
        Row: {
          company_id: string
          completed_at: string | null
          created_at: string
          id: string
          module_id: string | null
          notes: string | null
          partner_id: string
          responsible_id: string | null
          result: string | null
          score: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["training_status"]
          track_id: string
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          module_id?: string | null
          notes?: string | null
          partner_id: string
          responsible_id?: string | null
          result?: string | null
          score?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["training_status"]
          track_id: string
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          module_id?: string | null
          notes?: string | null
          partner_id?: string
          responsible_id?: string | null
          result?: string | null
          score?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["training_status"]
          track_id?: string
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_trainings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_trainings_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_trainings_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_trainings_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "training_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          activated_at: string | null
          candidate_id: string | null
          city: string | null
          code: string
          company_id: string
          created_at: string
          created_by: string | null
          display_name: string
          document: string | null
          email: string | null
          exited_at: string | null
          id: string
          metadata: Json
          owner_id: string | null
          phone: string | null
          source_channel: string | null
          state: string | null
          status: Database["public"]["Enums"]["partner_status"]
          status_changed_at: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          activated_at?: string | null
          candidate_id?: string | null
          city?: string | null
          code: string
          company_id: string
          created_at?: string
          created_by?: string | null
          display_name: string
          document?: string | null
          email?: string | null
          exited_at?: string | null
          id?: string
          metadata?: Json
          owner_id?: string | null
          phone?: string | null
          source_channel?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["partner_status"]
          status_changed_at?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          activated_at?: string | null
          candidate_id?: string | null
          city?: string | null
          code?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          display_name?: string
          document?: string | null
          email?: string | null
          exited_at?: string | null
          id?: string
          metadata?: Json
          owner_id?: string | null
          phone?: string | null
          source_channel?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["partner_status"]
          status_changed_at?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partners_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: true
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partners_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payee_profile_events: {
        Row: {
          actor_id: string | null
          changed_fields: string[]
          company_id: string
          created_at: string
          event: string
          id: string
          partner_id: string
          payee_profile_id: string | null
        }
        Insert: {
          actor_id?: string | null
          changed_fields?: string[]
          company_id: string
          created_at?: string
          event: string
          id?: string
          partner_id: string
          payee_profile_id?: string | null
        }
        Update: {
          actor_id?: string | null
          changed_fields?: string[]
          company_id?: string
          created_at?: string
          event?: string
          id?: string
          partner_id?: string
          payee_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payee_profile_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payee_profile_events_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payee_profile_events_payee_profile_id_fkey"
            columns: ["payee_profile_id"]
            isOneToOne: false
            referencedRelation: "payee_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payee_profiles: {
        Row: {
          bank_account: string | null
          bank_branch: string | null
          bank_code: string | null
          company_id: string
          created_at: string
          created_by: string | null
          holder_document: string
          holder_name: string
          id: string
          ownership_validated: boolean
          partner_id: string
          payee_type: string
          pix_key: string | null
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          bank_account?: string | null
          bank_branch?: string | null
          bank_code?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          holder_document: string
          holder_name: string
          id?: string
          ownership_validated?: boolean
          partner_id: string
          payee_type?: string
          pix_key?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          bank_account?: string | null
          bank_branch?: string | null
          bank_code?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          holder_document?: string
          holder_name?: string
          id?: string
          ownership_validated?: boolean
          partner_id?: string
          payee_type?: string
          pix_key?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payee_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payee_profiles_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: true
            referencedRelation: "partners"
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
      territories: {
        Row: {
          code: string
          company_id: string
          coverage: Json
          created_at: string
          created_by: string | null
          default_mode: Database["public"]["Enums"]["territory_mode"]
          id: string
          name: string
          notes: string | null
          owner_id: string | null
          scope_type: Database["public"]["Enums"]["territory_scope_type"]
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          code: string
          company_id: string
          coverage?: Json
          created_at?: string
          created_by?: string | null
          default_mode?: Database["public"]["Enums"]["territory_mode"]
          id?: string
          name: string
          notes?: string | null
          owner_id?: string | null
          scope_type?: Database["public"]["Enums"]["territory_scope_type"]
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          code?: string
          company_id?: string
          coverage?: Json
          created_at?: string
          created_by?: string | null
          default_mode?: Database["public"]["Enums"]["territory_mode"]
          id?: string
          name?: string
          notes?: string | null
          owner_id?: string | null
          scope_type?: Database["public"]["Enums"]["territory_scope_type"]
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "territories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      training_modules: {
        Row: {
          code: string
          company_id: string
          content_url: string | null
          created_at: string
          id: string
          name: string
          sort_order: number
          track_id: string
        }
        Insert: {
          code: string
          company_id: string
          content_url?: string | null
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          track_id: string
        }
        Update: {
          code?: string
          company_id?: string
          content_url?: string | null
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_modules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_modules_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "training_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      training_tracks: {
        Row: {
          code: string
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_required: boolean
          name: string
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
          validity_months: number | null
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_required?: boolean
          name: string
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
          validity_months?: number | null
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_required?: boolean
          name?: string
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
          validity_months?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "training_tracks_company_id_fkey"
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
      accept_policy_version: {
        Args: {
          _context?: Json
          _idempotency_key?: string
          _partner_id: string
          _policy_version_id: string
        }
        Returns: Json
      }
      assign_partner_territory: {
        Args: {
          _idempotency_key: string
          _mode: Database["public"]["Enums"]["territory_mode"]
          _partner_id: string
          _reason: string
          _territory_id: string
          _valid_until: string
        }
        Returns: Json
      }
      candidate_transition_allowed: {
        Args: {
          _from: Database["public"]["Enums"]["candidate_status"]
          _to: Database["public"]["Enums"]["candidate_status"]
        }
        Returns: boolean
      }
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
      convert_candidate_to_partner: {
        Args: {
          _candidate_id: string
          _checklist_code?: string
          _idempotency_key: string
        }
        Returns: Json
      }
      get_payee_profile_masked: { Args: { _partner_id: string }; Returns: Json }
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
      log_payee_view: { Args: { _partner_id: string }; Returns: undefined }
      mask_tail: {
        Args: { _value: string; _visible?: number }
        Returns: string
      }
      my_company_ids: { Args: never; Returns: string[] }
      my_partner_ids: { Args: never; Returns: string[] }
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
      candidate_status:
        | "prospect"
        | "triage"
        | "prequalified"
        | "interview"
        | "approved"
        | "formalization"
        | "onboarding"
        | "training"
        | "certification"
        | "activation"
        | "rejected"
        | "withdrawn"
        | "suspended"
        | "archived"
      certification_status:
        | "pending"
        | "approved"
        | "failed"
        | "expired"
        | "revoked"
      checklist_item_status:
        | "pending"
        | "in_progress"
        | "done"
        | "waived"
        | "blocked"
      partner_status:
        | "onboarding"
        | "training"
        | "certification_pending"
        | "active"
        | "attention"
        | "suspended"
        | "inactive"
        | "exit"
      partner_territory_status: "pending" | "active" | "revoked" | "expired"
      record_status: "active" | "inactive" | "suspended"
      role_scope: "platform" | "company" | "unit"
      territory_mode: "open" | "recommended_base" | "preferred" | "protected"
      territory_scope_type: "country" | "state" | "city" | "region" | "custom"
      training_status:
        | "not_started"
        | "in_progress"
        | "completed"
        | "failed"
        | "expired"
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
      candidate_status: [
        "prospect",
        "triage",
        "prequalified",
        "interview",
        "approved",
        "formalization",
        "onboarding",
        "training",
        "certification",
        "activation",
        "rejected",
        "withdrawn",
        "suspended",
        "archived",
      ],
      certification_status: [
        "pending",
        "approved",
        "failed",
        "expired",
        "revoked",
      ],
      checklist_item_status: [
        "pending",
        "in_progress",
        "done",
        "waived",
        "blocked",
      ],
      partner_status: [
        "onboarding",
        "training",
        "certification_pending",
        "active",
        "attention",
        "suspended",
        "inactive",
        "exit",
      ],
      partner_territory_status: ["pending", "active", "revoked", "expired"],
      record_status: ["active", "inactive", "suspended"],
      role_scope: ["platform", "company", "unit"],
      territory_mode: ["open", "recommended_base", "preferred", "protected"],
      territory_scope_type: ["country", "state", "city", "region", "custom"],
      training_status: [
        "not_started",
        "in_progress",
        "completed",
        "failed",
        "expired",
      ],
    },
  },
} as const
