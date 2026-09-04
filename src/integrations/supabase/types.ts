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
            referencedRelation: "companies"
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
            referencedRelation: "companies"
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
      commercial_activities: {
        Row: {
          actor_id: string
          company_id: string
          created_at: string
          id: string
          lead_id: string | null
          metadata: Json
          next_action: string | null
          next_action_at: string | null
          notes: string | null
          occurred_at: string
          opportunity_id: string | null
          outcome: string | null
          partner_id: string | null
          subject: string | null
          type: Database["public"]["Enums"]["activity_type"]
        }
        Insert: {
          actor_id: string
          company_id: string
          created_at?: string
          id?: string
          lead_id?: string | null
          metadata?: Json
          next_action?: string | null
          next_action_at?: string | null
          notes?: string | null
          occurred_at?: string
          opportunity_id?: string | null
          outcome?: string | null
          partner_id?: string | null
          subject?: string | null
          type: Database["public"]["Enums"]["activity_type"]
        }
        Update: {
          actor_id?: string
          company_id?: string
          created_at?: string
          id?: string
          lead_id?: string | null
          metadata?: Json
          next_action?: string | null
          next_action_at?: string | null
          notes?: string | null
          occurred_at?: string
          opportunity_id?: string | null
          outcome?: string | null
          partner_id?: string | null
          subject?: string | null
          type?: Database["public"]["Enums"]["activity_type"]
        }
        Relationships: [
          {
            foreignKeyName: "commercial_activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_activities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_activities_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_proposals: {
        Row: {
          approval_request_id: string | null
          approved_at: string | null
          approved_by: string | null
          code: string | null
          company_id: string
          conditions: string | null
          created_at: string
          currency: string
          decision_reason: string | null
          id: string
          issued_at: string
          issued_by: string | null
          lead_id: string
          max_discount_percent: number
          metadata: Json
          opportunity_id: string
          partner_id: string | null
          requires_approval: boolean
          status: Database["public"]["Enums"]["proposal_status"]
          supersedes_id: string | null
          total_monthly_amount: number
          total_setup_amount: number
          updated_at: string
          valid_until: string | null
          version: number
        }
        Insert: {
          approval_request_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          code?: string | null
          company_id: string
          conditions?: string | null
          created_at?: string
          currency?: string
          decision_reason?: string | null
          id?: string
          issued_at?: string
          issued_by?: string | null
          lead_id: string
          max_discount_percent?: number
          metadata?: Json
          opportunity_id: string
          partner_id?: string | null
          requires_approval?: boolean
          status?: Database["public"]["Enums"]["proposal_status"]
          supersedes_id?: string | null
          total_monthly_amount?: number
          total_setup_amount?: number
          updated_at?: string
          valid_until?: string | null
          version?: number
        }
        Update: {
          approval_request_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          code?: string | null
          company_id?: string
          conditions?: string | null
          created_at?: string
          currency?: string
          decision_reason?: string | null
          id?: string
          issued_at?: string
          issued_by?: string | null
          lead_id?: string
          max_discount_percent?: number
          metadata?: Json
          opportunity_id?: string
          partner_id?: string | null
          requires_approval?: boolean
          status?: Database["public"]["Enums"]["proposal_status"]
          supersedes_id?: string | null
          total_monthly_amount?: number
          total_setup_amount?: number
          updated_at?: string
          valid_until?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "commercial_proposals_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_proposals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_proposals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_proposals_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_proposals_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_proposals_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "commercial_proposals"
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
      lead_conflicts: {
        Row: {
          approval_request_id: string | null
          awarded_partner_id: string | null
          claimant_partner_id: string
          company_id: string
          counterpart_partner_id: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          evidence: Json
          id: string
          lead_id: string
          opened_by: string | null
          protection_id: string | null
          resolution: string | null
          status: Database["public"]["Enums"]["lead_conflict_status"]
          territory_id: string | null
          updated_at: string
        }
        Insert: {
          approval_request_id?: string | null
          awarded_partner_id?: string | null
          claimant_partner_id: string
          company_id: string
          counterpart_partner_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          evidence?: Json
          id?: string
          lead_id: string
          opened_by?: string | null
          protection_id?: string | null
          resolution?: string | null
          status?: Database["public"]["Enums"]["lead_conflict_status"]
          territory_id?: string | null
          updated_at?: string
        }
        Update: {
          approval_request_id?: string | null
          awarded_partner_id?: string | null
          claimant_partner_id?: string
          company_id?: string
          counterpart_partner_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          evidence?: Json
          id?: string
          lead_id?: string
          opened_by?: string | null
          protection_id?: string | null
          resolution?: string | null
          status?: Database["public"]["Enums"]["lead_conflict_status"]
          territory_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_conflicts_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_conflicts_awarded_partner_id_fkey"
            columns: ["awarded_partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_conflicts_claimant_partner_id_fkey"
            columns: ["claimant_partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_conflicts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_conflicts_counterpart_partner_id_fkey"
            columns: ["counterpart_partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_conflicts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_conflicts_protection_id_fkey"
            columns: ["protection_id"]
            isOneToOne: false
            referencedRelation: "lead_protections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_conflicts_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_duplicate_flags: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          duplicate_of_lead_id: string
          id: string
          lead_id: string
          matched_on: string[]
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          score: number
          status: Database["public"]["Enums"]["lead_dup_status"]
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          duplicate_of_lead_id: string
          id?: string
          lead_id: string
          matched_on?: string[]
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          score?: number
          status?: Database["public"]["Enums"]["lead_dup_status"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          duplicate_of_lead_id?: string
          id?: string
          lead_id?: string
          matched_on?: string[]
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          score?: number
          status?: Database["public"]["Enums"]["lead_dup_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_duplicate_flags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_duplicate_flags_duplicate_of_lead_id_fkey"
            columns: ["duplicate_of_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_duplicate_flags_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_protection_events: {
        Row: {
          actor_id: string | null
          company_id: string
          context: Json
          created_at: string
          event: string
          from_status:
            | Database["public"]["Enums"]["lead_protection_status"]
            | null
          id: string
          lead_id: string
          partner_id: string | null
          protection_id: string | null
          reason: string | null
          to_status:
            | Database["public"]["Enums"]["lead_protection_status"]
            | null
        }
        Insert: {
          actor_id?: string | null
          company_id: string
          context?: Json
          created_at?: string
          event: string
          from_status?:
            | Database["public"]["Enums"]["lead_protection_status"]
            | null
          id?: string
          lead_id: string
          partner_id?: string | null
          protection_id?: string | null
          reason?: string | null
          to_status?:
            | Database["public"]["Enums"]["lead_protection_status"]
            | null
        }
        Update: {
          actor_id?: string | null
          company_id?: string
          context?: Json
          created_at?: string
          event?: string
          from_status?:
            | Database["public"]["Enums"]["lead_protection_status"]
            | null
          id?: string
          lead_id?: string
          partner_id?: string | null
          protection_id?: string | null
          reason?: string | null
          to_status?:
            | Database["public"]["Enums"]["lead_protection_status"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_protection_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_protection_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_protection_events_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_protection_events_protection_id_fkey"
            columns: ["protection_id"]
            isOneToOne: false
            referencedRelation: "lead_protections"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_protections: {
        Row: {
          company_id: string
          created_at: string
          granted_by: string | null
          id: string
          lead_id: string
          origin: string
          partner_id: string
          reason: string | null
          released_at: string | null
          status: Database["public"]["Enums"]["lead_protection_status"]
          transferred_to_partner_id: string | null
          updated_at: string
          valid_from: string
          valid_until: string
        }
        Insert: {
          company_id: string
          created_at?: string
          granted_by?: string | null
          id?: string
          lead_id: string
          origin?: string
          partner_id: string
          reason?: string | null
          released_at?: string | null
          status?: Database["public"]["Enums"]["lead_protection_status"]
          transferred_to_partner_id?: string | null
          updated_at?: string
          valid_from?: string
          valid_until: string
        }
        Update: {
          company_id?: string
          created_at?: string
          granted_by?: string | null
          id?: string
          lead_id?: string
          origin?: string
          partner_id?: string
          reason?: string | null
          released_at?: string | null
          status?: Database["public"]["Enums"]["lead_protection_status"]
          transferred_to_partner_id?: string | null
          updated_at?: string
          valid_from?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_protections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_protections_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_protections_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_protections_transferred_to_partner_id_fkey"
            columns: ["transferred_to_partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          address: string | null
          campaign: string | null
          channel: string | null
          city: string | null
          code: string | null
          company_id: string
          company_name: string
          contact_name: string | null
          converted_at: string | null
          created_at: string
          created_by: string | null
          district: string | null
          document: string | null
          email: string | null
          external_id: string | null
          id: string
          last_activity_at: string | null
          metadata: Json
          notes: string | null
          owner_id: string | null
          partner_id: string | null
          phone: string | null
          postal_code: string | null
          qualification: Json
          referral_code: string | null
          segment: string | null
          source: string | null
          state: string | null
          status: Database["public"]["Enums"]["lead_status"]
          status_changed_at: string
          territory_id: string | null
          trade_name: string | null
          unit_id: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          campaign?: string | null
          channel?: string | null
          city?: string | null
          code?: string | null
          company_id: string
          company_name: string
          contact_name?: string | null
          converted_at?: string | null
          created_at?: string
          created_by?: string | null
          district?: string | null
          document?: string | null
          email?: string | null
          external_id?: string | null
          id?: string
          last_activity_at?: string | null
          metadata?: Json
          notes?: string | null
          owner_id?: string | null
          partner_id?: string | null
          phone?: string | null
          postal_code?: string | null
          qualification?: Json
          referral_code?: string | null
          segment?: string | null
          source?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          status_changed_at?: string
          territory_id?: string | null
          trade_name?: string | null
          unit_id?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          campaign?: string | null
          channel?: string | null
          city?: string | null
          code?: string | null
          company_id?: string
          company_name?: string
          contact_name?: string | null
          converted_at?: string | null
          created_at?: string
          created_by?: string | null
          district?: string | null
          document?: string | null
          email?: string | null
          external_id?: string | null
          id?: string
          last_activity_at?: string | null
          metadata?: Json
          notes?: string | null
          owner_id?: string | null
          partner_id?: string | null
          phone?: string | null
          postal_code?: string | null
          qualification?: Json
          referral_code?: string | null
          segment?: string | null
          source?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          status_changed_at?: string
          territory_id?: string | null
          trade_name?: string | null
          unit_id?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
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
      opportunities: {
        Row: {
          campaign: string | null
          channel: string | null
          closed_at: string | null
          code: string | null
          company_id: string
          created_at: string
          created_by: string | null
          expected_close_date: string | null
          expected_monthly_amount: number | null
          expected_setup_amount: number | null
          id: string
          lead_id: string
          lost_competitor: string | null
          lost_notes: string | null
          lost_reason: Database["public"]["Enums"]["loss_reason"] | null
          metadata: Json
          name: string
          owner_id: string | null
          partner_id: string | null
          referral_code: string | null
          source: string | null
          stage: Database["public"]["Enums"]["opportunity_stage"]
          stage_changed_at: string
          territory_id: string | null
          updated_at: string
          won_monthly_amount: number | null
          won_plan_id: string | null
          won_price_policy_id: string | null
          won_product_id: string | null
          won_proposal_id: string | null
          won_setup_amount: number | null
        }
        Insert: {
          campaign?: string | null
          channel?: string | null
          closed_at?: string | null
          code?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          expected_close_date?: string | null
          expected_monthly_amount?: number | null
          expected_setup_amount?: number | null
          id?: string
          lead_id: string
          lost_competitor?: string | null
          lost_notes?: string | null
          lost_reason?: Database["public"]["Enums"]["loss_reason"] | null
          metadata?: Json
          name: string
          owner_id?: string | null
          partner_id?: string | null
          referral_code?: string | null
          source?: string | null
          stage?: Database["public"]["Enums"]["opportunity_stage"]
          stage_changed_at?: string
          territory_id?: string | null
          updated_at?: string
          won_monthly_amount?: number | null
          won_plan_id?: string | null
          won_price_policy_id?: string | null
          won_product_id?: string | null
          won_proposal_id?: string | null
          won_setup_amount?: number | null
        }
        Update: {
          campaign?: string | null
          channel?: string | null
          closed_at?: string | null
          code?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          expected_close_date?: string | null
          expected_monthly_amount?: number | null
          expected_setup_amount?: number | null
          id?: string
          lead_id?: string
          lost_competitor?: string | null
          lost_notes?: string | null
          lost_reason?: Database["public"]["Enums"]["loss_reason"] | null
          metadata?: Json
          name?: string
          owner_id?: string | null
          partner_id?: string | null
          referral_code?: string | null
          source?: string | null
          stage?: Database["public"]["Enums"]["opportunity_stage"]
          stage_changed_at?: string
          territory_id?: string | null
          updated_at?: string
          won_monthly_amount?: number | null
          won_plan_id?: string | null
          won_price_policy_id?: string | null
          won_product_id?: string | null
          won_proposal_id?: string | null
          won_setup_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_won_plan_id_fkey"
            columns: ["won_plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_won_price_policy_id_fkey"
            columns: ["won_price_policy_id"]
            isOneToOne: false
            referencedRelation: "price_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_won_product_id_fkey"
            columns: ["won_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_won_proposal_fkey"
            columns: ["won_proposal_id"]
            isOneToOne: false
            referencedRelation: "commercial_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_stage_events: {
        Row: {
          actor_id: string | null
          company_id: string
          created_at: string
          from_stage: Database["public"]["Enums"]["opportunity_stage"] | null
          id: string
          opportunity_id: string
          reason: string | null
          to_stage: Database["public"]["Enums"]["opportunity_stage"]
        }
        Insert: {
          actor_id?: string | null
          company_id: string
          created_at?: string
          from_stage?: Database["public"]["Enums"]["opportunity_stage"] | null
          id?: string
          opportunity_id: string
          reason?: string | null
          to_stage: Database["public"]["Enums"]["opportunity_stage"]
        }
        Update: {
          actor_id?: string | null
          company_id?: string
          created_at?: string
          from_stage?: Database["public"]["Enums"]["opportunity_stage"] | null
          id?: string
          opportunity_id?: string
          reason?: string | null
          to_stage?: Database["public"]["Enums"]["opportunity_stage"]
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_stage_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_stage_events_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
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
      partner_referral_links: {
        Row: {
          campaign: string | null
          channel: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          label: string | null
          partner_id: string
          public_token: string
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
        }
        Insert: {
          campaign?: string | null
          channel?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          partner_id: string
          public_token: string
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Update: {
          campaign?: string | null
          channel?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          partner_id?: string
          public_token?: string
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_referral_links_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_referral_links_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
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
      plans: {
        Row: {
          code: string
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          metadata: Json
          name: string
          product_id: string
          sort_order: number
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json
          name: string
          product_id: string
          sort_order?: number
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json
          name?: string
          product_id?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
      price_policies: {
        Row: {
          approval_threshold_percent: number
          billing_period: Database["public"]["Enums"]["billing_period"]
          company_id: string
          created_at: string
          created_by: string | null
          currency: string
          effective_from: string
          effective_to: string | null
          id: string
          max_discount_percent: number
          monthly_price: number
          name: string
          plan_id: string
          product_id: string
          setup_price: number
          status: Database["public"]["Enums"]["record_status"]
          terms: Json
          updated_at: string
          version: number
        }
        Insert: {
          approval_threshold_percent?: number
          billing_period?: Database["public"]["Enums"]["billing_period"]
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          max_discount_percent?: number
          monthly_price?: number
          name: string
          plan_id: string
          product_id: string
          setup_price?: number
          status?: Database["public"]["Enums"]["record_status"]
          terms?: Json
          updated_at?: string
          version?: number
        }
        Update: {
          approval_threshold_percent?: number
          billing_period?: Database["public"]["Enums"]["billing_period"]
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          max_discount_percent?: number
          monthly_price?: number
          name?: string
          plan_id?: string
          product_id?: string
          setup_price?: number
          status?: Database["public"]["Enums"]["record_status"]
          terms?: Json
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "price_policies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_policies_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_policies_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          code: string
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          metadata: Json
          name: string
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
        }
        Insert: {
          category?: string | null
          code: string
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json
          name: string
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Update: {
          category?: string | null
          code?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json
          name?: string
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
      proposal_items: {
        Row: {
          billing_period: Database["public"]["Enums"]["billing_period"]
          company_id: string
          created_at: string
          discount_percent: number
          final_monthly_price: number
          final_setup_price: number
          id: string
          list_monthly_price: number
          list_setup_price: number
          plan_id: string
          price_policy_id: string
          price_policy_version: number
          product_id: string
          proposal_id: string
          quantity: number
          snapshot: Json
          within_policy: boolean
        }
        Insert: {
          billing_period: Database["public"]["Enums"]["billing_period"]
          company_id: string
          created_at?: string
          discount_percent?: number
          final_monthly_price: number
          final_setup_price: number
          id?: string
          list_monthly_price: number
          list_setup_price: number
          plan_id: string
          price_policy_id: string
          price_policy_version: number
          product_id: string
          proposal_id: string
          quantity?: number
          snapshot?: Json
          within_policy?: boolean
        }
        Update: {
          billing_period?: Database["public"]["Enums"]["billing_period"]
          company_id?: string
          created_at?: string
          discount_percent?: number
          final_monthly_price?: number
          final_setup_price?: number
          id?: string
          list_monthly_price?: number
          list_setup_price?: number
          plan_id?: string
          price_policy_id?: string
          price_policy_version?: number
          product_id?: string
          proposal_id?: string
          quantity?: number
          snapshot?: Json
          within_policy?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "proposal_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_price_policy_id_fkey"
            columns: ["price_policy_id"]
            isOneToOne: false
            referencedRelation: "price_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "commercial_proposals"
            referencedColumns: ["id"]
          },
        ]
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
      advance_opportunity_stage: {
        Args: {
          _opportunity_id: string
          _reason?: string
          _stage: Database["public"]["Enums"]["opportunity_stage"]
        }
        Returns: Json
      }
      assign_lead: {
        Args: {
          _lead_id: string
          _owner_id?: string
          _partner_id?: string
          _reason?: string
        }
        Returns: Json
      }
      assign_partner_territory: {
        Args: {
          _idempotency_key?: string
          _mode: Database["public"]["Enums"]["territory_mode"]
          _partner_id: string
          _reason?: string
          _territory_id: string
          _valid_until?: string
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
      close_opportunity_lost: {
        Args: {
          _competitor?: string
          _notes?: string
          _opportunity_id: string
          _reason: Database["public"]["Enums"]["loss_reason"]
        }
        Returns: Json
      }
      close_opportunity_won: {
        Args: {
          _idempotency_key: string
          _opportunity_id: string
          _proposal_id: string
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
      convert_lead_to_opportunity: {
        Args: { _idempotency_key: string; _lead_id: string; _name?: string }
        Returns: Json
      }
      create_lead: {
        Args: { _company_id: string; _idempotency_key: string; _payload: Json }
        Returns: Json
      }
      decide_proposal_discount: {
        Args: { _approve: boolean; _proposal_id: string; _reason: string }
        Returns: Json
      }
      expire_lead_protections: {
        Args: { _company_id: string }
        Returns: number
      }
      find_lead_duplicates: {
        Args: {
          _city?: string
          _company_id: string
          _company_name?: string
          _document?: string
          _email?: string
          _phone?: string
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
      issue_proposal: {
        Args: {
          _conditions?: string
          _idempotency_key: string
          _items: Json
          _opportunity_id: string
          _valid_until?: string
        }
        Returns: Json
      }
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
      open_lead_conflict: {
        Args: {
          _claimant_partner_id: string
          _evidence?: Json
          _idempotency_key?: string
          _lead_id: string
        }
        Returns: Json
      }
      opportunity_transition_allowed: {
        Args: {
          _from: Database["public"]["Enums"]["opportunity_stage"]
          _to: Database["public"]["Enums"]["opportunity_stage"]
        }
        Returns: boolean
      }
      protect_lead: {
        Args: {
          _idempotency_key?: string
          _lead_id: string
          _origin?: string
          _partner_id: string
          _reason?: string
          _valid_until: string
        }
        Returns: Json
      }
      release_lead_protection: {
        Args: { _protection_id: string; _reason?: string }
        Returns: Json
      }
      resolve_lead_conflict: {
        Args: {
          _awarded_partner_id: string
          _conflict_id: string
          _resolution: string
        }
        Returns: Json
      }
      transfer_lead_protection: {
        Args: {
          _idempotency_key?: string
          _protection_id: string
          _reason: string
          _to_partner_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      activity_type:
        | "call"
        | "whatsapp"
        | "email"
        | "meeting"
        | "visit"
        | "demo"
        | "note"
      billing_period:
        | "one_time"
        | "monthly"
        | "quarterly"
        | "semiannual"
        | "annual"
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
      lead_conflict_status: "open" | "under_review" | "resolved" | "dismissed"
      lead_dup_status: "open" | "duplicate_confirmed" | "distinct_confirmed"
      lead_protection_status:
        | "protected"
        | "expired"
        | "released"
        | "transferred"
        | "disputed"
      lead_status:
        | "new"
        | "contacted"
        | "qualified"
        | "disqualified"
        | "converted"
        | "archived"
      loss_reason:
        | "price"
        | "timing"
        | "competitor"
        | "no_fit"
        | "no_budget"
        | "no_response"
        | "internal"
        | "other"
      opportunity_stage:
        | "new"
        | "qualified"
        | "contact"
        | "diagnosis"
        | "demo"
        | "proposal"
        | "negotiation"
        | "won"
        | "lost"
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
      proposal_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "rejected"
        | "sent"
        | "accepted"
        | "declined"
        | "expired"
        | "superseded"
        | "cancelled"
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
      activity_type: [
        "call",
        "whatsapp",
        "email",
        "meeting",
        "visit",
        "demo",
        "note",
      ],
      billing_period: [
        "one_time",
        "monthly",
        "quarterly",
        "semiannual",
        "annual",
      ],
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
      lead_conflict_status: ["open", "under_review", "resolved", "dismissed"],
      lead_dup_status: ["open", "duplicate_confirmed", "distinct_confirmed"],
      lead_protection_status: [
        "protected",
        "expired",
        "released",
        "transferred",
        "disputed",
      ],
      lead_status: [
        "new",
        "contacted",
        "qualified",
        "disqualified",
        "converted",
        "archived",
      ],
      loss_reason: [
        "price",
        "timing",
        "competitor",
        "no_fit",
        "no_budget",
        "no_response",
        "internal",
        "other",
      ],
      opportunity_stage: [
        "new",
        "qualified",
        "contact",
        "diagnosis",
        "demo",
        "proposal",
        "negotiation",
        "won",
        "lost",
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
      proposal_status: [
        "draft",
        "pending_approval",
        "approved",
        "rejected",
        "sent",
        "accepted",
        "declined",
        "expired",
        "superseded",
        "cancelled",
      ],
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
