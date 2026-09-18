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
      access_requests: {
        Row: {
          company: string | null
          consent_at: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          email: string
          full_name: string
          id: string
          internal_note: string | null
          lang: string
          message: string | null
          source_slug: string | null
          status: Database["public"]["Enums"]["access_status"]
          updated_at: string
        }
        Insert: {
          company?: string | null
          consent_at: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          email: string
          full_name: string
          id?: string
          internal_note?: string | null
          lang?: string
          message?: string | null
          source_slug?: string | null
          status?: Database["public"]["Enums"]["access_status"]
          updated_at?: string
        }
        Update: {
          company?: string | null
          consent_at?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          email?: string
          full_name?: string
          id?: string
          internal_note?: string | null
          lang?: string
          message?: string | null
          source_slug?: string | null
          status?: Database["public"]["Enums"]["access_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      application_notes: {
        Row: {
          application_id: string
          author_person_id: string | null
          body: string
          created_at: string
          id: string
        }
        Insert: {
          application_id: string
          author_person_id?: string | null
          body: string
          created_at?: string
          id?: string
        }
        Update: {
          application_id?: string
          author_person_id?: string | null
          body?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_notes_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_notes_author_person_id_fkey"
            columns: ["author_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          cases: string | null
          consent_at: string
          craft: string | null
          created_at: string
          decided_at: string | null
          domain_id: string | null
          email: string
          full_name: string
          id: string
          internal_note: string | null
          lang: string
          linkedin_url: string | null
          message: string | null
          phone: string | null
          reference_note: string | null
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
          years_in_craft: number | null
        }
        Insert: {
          cases?: string | null
          consent_at: string
          craft?: string | null
          created_at?: string
          decided_at?: string | null
          domain_id?: string | null
          email: string
          full_name: string
          id?: string
          internal_note?: string | null
          lang?: string
          linkedin_url?: string | null
          message?: string | null
          phone?: string | null
          reference_note?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
          years_in_craft?: number | null
        }
        Update: {
          cases?: string | null
          consent_at?: string
          craft?: string | null
          created_at?: string
          decided_at?: string | null
          domain_id?: string | null
          email?: string
          full_name?: string
          id?: string
          internal_note?: string | null
          lang?: string
          linkedin_url?: string | null
          message?: string | null
          phone?: string | null
          reference_note?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
          years_in_craft?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domain_staffing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_person_id: string | null
          actor_user_id: string | null
          at: string
          id: number
          new_data: Json | null
          old_data: Json | null
          row_id: string
          table_name: string
        }
        Insert: {
          action: string
          actor_person_id?: string | null
          actor_user_id?: string | null
          at?: string
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          row_id: string
          table_name: string
        }
        Update: {
          action?: string
          actor_person_id?: string | null
          actor_user_id?: string | null
          at?: string
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          row_id?: string
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_person_fk"
            columns: ["actor_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_events: {
        Row: {
          actor: string
          actor_person_id: string | null
          at: string
          id: string
          message: string | null
          request_id: string
          time_id: string | null
          type: string
        }
        Insert: {
          actor: string
          actor_person_id?: string | null
          at?: string
          id?: string
          message?: string | null
          request_id: string
          time_id?: string | null
          type: string
        }
        Update: {
          actor?: string
          actor_person_id?: string | null
          at?: string
          id?: string
          message?: string | null
          request_id?: string
          time_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_events_actor_person_id_fkey"
            columns: ["actor_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "booking_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_events_time_id_fkey"
            columns: ["time_id"]
            isOneToOne: false
            referencedRelation: "proposed_times"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_requests: {
        Row: {
          accepted_time_id: string | null
          brief: string
          client_person_id: string | null
          client_token: string
          company: string | null
          consent_at: string
          created_at: string
          duration_minutes: number
          email: string
          first_reply_at: string | null
          full_name: string
          id: string
          lang: string
          profile_id: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        Insert: {
          accepted_time_id?: string | null
          brief: string
          client_person_id?: string | null
          client_token?: string
          company?: string | null
          consent_at: string
          created_at?: string
          duration_minutes?: number
          email: string
          first_reply_at?: string | null
          full_name: string
          id?: string
          lang?: string
          profile_id: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Update: {
          accepted_time_id?: string | null
          brief?: string
          client_person_id?: string | null
          client_token?: string
          company?: string | null
          consent_at?: string
          created_at?: string
          duration_minutes?: number
          email?: string
          first_reply_at?: string | null
          full_name?: string
          id?: string
          lang?: string
          profile_id?: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_requests_accepted_time_fk"
            columns: ["accepted_time_id"]
            isOneToOne: false
            referencedRelation: "proposed_times"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_requests_client_person_id_fkey"
            columns: ["client_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "specialist_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "specialist_teasers"
            referencedColumns: ["id"]
          },
        ]
      }
      certifications: {
        Row: {
          created_at: string
          id: string
          issuer: string | null
          name: string
          profile_id: string
          sort_order: number
          year: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          issuer?: string | null
          name: string
          profile_id: string
          sort_order?: number
          year?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          issuer?: string | null
          name?: string
          profile_id?: string
          sort_order?: number
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "certifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "specialist_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "specialist_teasers"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          company: string | null
          consent_at: string
          created_at: string
          domain_id: string | null
          email: string
          full_name: string
          handled_at: string | null
          id: string
          internal_note: string | null
          lang: string
          message: string
        }
        Insert: {
          company?: string | null
          consent_at: string
          created_at?: string
          domain_id?: string | null
          email: string
          full_name: string
          handled_at?: string | null
          id?: string
          internal_note?: string | null
          lang?: string
          message: string
        }
        Update: {
          company?: string | null
          consent_at?: string
          created_at?: string
          domain_id?: string | null
          email?: string
          full_name?: string
          handled_at?: string | null
          id?: string
          internal_note?: string | null
          lang?: string
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_messages_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domain_staffing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_messages_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
        ]
      }
      domain_relationships: {
        Row: {
          domain_a: string
          domain_b: string
        }
        Insert: {
          domain_a: string
          domain_b: string
        }
        Update: {
          domain_a?: string
          domain_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "domain_relationships_domain_a_fkey"
            columns: ["domain_a"]
            isOneToOne: false
            referencedRelation: "domain_staffing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "domain_relationships_domain_a_fkey"
            columns: ["domain_a"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "domain_relationships_domain_b_fkey"
            columns: ["domain_b"]
            isOneToOne: false
            referencedRelation: "domain_staffing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "domain_relationships_domain_b_fkey"
            columns: ["domain_b"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
        ]
      }
      domains: {
        Row: {
          blurb: Json | null
          created_at: string
          description: Json | null
          house_description: Json | null
          id: string
          is_published: boolean
          name: Json
          skills: Json
          slug: string
          sort_order: number
          status_override: Database["public"]["Enums"]["domain_status"] | null
          tagline: Json | null
          target_seats: number
          typical_tasks: Json
          updated_at: string
        }
        Insert: {
          blurb?: Json | null
          created_at?: string
          description?: Json | null
          house_description?: Json | null
          id: string
          is_published?: boolean
          name: Json
          skills?: Json
          slug: string
          sort_order: number
          status_override?: Database["public"]["Enums"]["domain_status"] | null
          tagline?: Json | null
          target_seats?: number
          typical_tasks?: Json
          updated_at?: string
        }
        Update: {
          blurb?: Json | null
          created_at?: string
          description?: Json | null
          house_description?: Json | null
          id?: string
          is_published?: boolean
          name?: Json
          skills?: Json
          slug?: string
          sort_order?: number
          status_override?: Database["public"]["Enums"]["domain_status"] | null
          tagline?: Json | null
          target_seats?: number
          typical_tasks?: Json
          updated_at?: string
        }
        Relationships: []
      }
      education: {
        Row: {
          created_at: string
          degree: Json
          end_year: number | null
          id: string
          institution: string
          profile_id: string
          sort_order: number
          start_year: number | null
        }
        Insert: {
          created_at?: string
          degree: Json
          end_year?: number | null
          id?: string
          institution: string
          profile_id: string
          sort_order?: number
          start_year?: number | null
        }
        Update: {
          created_at?: string
          degree?: Json
          end_year?: number | null
          id?: string
          institution?: string
          profile_id?: string
          sort_order?: number
          start_year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "education_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "specialist_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "education_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "specialist_teasers"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          domain_id: string | null
          id: number
          lang: string | null
          occurred_at: string
          path: string
          referrer_host: string | null
          type: string
          visitor_day: string | null
        }
        Insert: {
          domain_id?: string | null
          id?: never
          lang?: string | null
          occurred_at?: string
          path: string
          referrer_host?: string | null
          type: string
          visitor_day?: string | null
        }
        Update: {
          domain_id?: string | null
          id?: never
          lang?: string | null
          occurred_at?: string
          path?: string
          referrer_host?: string | null
          type?: string
          visitor_day?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domain_staffing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
        ]
      }
      experience: {
        Row: {
          created_at: string
          description: Json | null
          end_date: string | null
          id: string
          organisation: string
          profile_id: string
          sort_order: number
          start_date: string | null
          title: Json
        }
        Insert: {
          created_at?: string
          description?: Json | null
          end_date?: string | null
          id?: string
          organisation: string
          profile_id: string
          sort_order?: number
          start_date?: string | null
          title: Json
        }
        Update: {
          created_at?: string
          description?: Json | null
          end_date?: string | null
          id?: string
          organisation?: string
          profile_id?: string
          sort_order?: number
          start_date?: string | null
          title?: Json
        }
        Relationships: [
          {
            foreignKeyName: "experience_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "specialist_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experience_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "specialist_teasers"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          domain_id: string | null
          granted_by: string | null
          id: string
          organisation_id: string | null
          person_id: string
          role: Database["public"]["Enums"]["member_role"]
          status: Database["public"]["Enums"]["membership_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          domain_id?: string | null
          granted_by?: string | null
          id?: string
          organisation_id?: string | null
          person_id: string
          role: Database["public"]["Enums"]["member_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          domain_id?: string | null
          granted_by?: string | null
          id?: string
          organisation_id?: string | null
          person_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domain_staffing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      organisations: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      people: {
        Row: {
          created_at: string
          display_name: string
          email: string
          id: string
          lang: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          display_name: string
          email: string
          id?: string
          lang?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          lang?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      proposed_times: {
        Row: {
          created_at: string
          id: string
          proposed_by: string
          request_id: string
          starts_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          proposed_by: string
          request_id: string
          starts_at: string
        }
        Update: {
          created_at?: string
          id?: string
          proposed_by?: string
          request_id?: string
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposed_times_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "booking_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_events: {
        Row: {
          at: string
          id: number
          key: string
          scope: string
        }
        Insert: {
          at?: string
          id?: number
          key: string
          scope: string
        }
        Update: {
          at?: string
          id?: number
          key?: string
          scope?: string
        }
        Relationships: []
      }
      seats: {
        Row: {
          buy_in_paid_at: string | null
          created_at: string
          domain_id: string
          ends_at: string | null
          holder_person_id: string | null
          id: string
          note: Json | null
          notice_given_at: string | null
          position: number
          status: Database["public"]["Enums"]["seat_status"]
          updated_at: string
        }
        Insert: {
          buy_in_paid_at?: string | null
          created_at?: string
          domain_id: string
          ends_at?: string | null
          holder_person_id?: string | null
          id?: string
          note?: Json | null
          notice_given_at?: string | null
          position: number
          status?: Database["public"]["Enums"]["seat_status"]
          updated_at?: string
        }
        Update: {
          buy_in_paid_at?: string | null
          created_at?: string
          domain_id?: string
          ends_at?: string | null
          holder_person_id?: string | null
          id?: string
          note?: Json | null
          notice_given_at?: string | null
          position?: number
          status?: Database["public"]["Enums"]["seat_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seats_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domain_staffing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seats_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seats_holder_person_fk"
            columns: ["holder_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      specialist_profiles: {
        Row: {
          available_from: string | null
          booked_until: string | null
          city: string | null
          created_at: string
          cv_path: string | null
          domain_id: string
          id: string
          is_published: boolean
          languages: string[]
          linkedin_url: string | null
          person_id: string
          portrait_path: string | null
          rate_text: string | null
          skills: Json
          slug: string
          summary: Json | null
          tagline: Json | null
          title: Json | null
          updated_at: string
          website_url: string | null
          weekly_hours: number | null
          years_in_craft: number | null
        }
        Insert: {
          available_from?: string | null
          booked_until?: string | null
          city?: string | null
          created_at?: string
          cv_path?: string | null
          domain_id: string
          id?: string
          is_published?: boolean
          languages?: string[]
          linkedin_url?: string | null
          person_id: string
          portrait_path?: string | null
          rate_text?: string | null
          skills?: Json
          slug: string
          summary?: Json | null
          tagline?: Json | null
          title?: Json | null
          updated_at?: string
          website_url?: string | null
          weekly_hours?: number | null
          years_in_craft?: number | null
        }
        Update: {
          available_from?: string | null
          booked_until?: string | null
          city?: string | null
          created_at?: string
          cv_path?: string | null
          domain_id?: string
          id?: string
          is_published?: boolean
          languages?: string[]
          linkedin_url?: string | null
          person_id?: string
          portrait_path?: string | null
          rate_text?: string | null
          skills?: Json
          slug?: string
          summary?: Json | null
          tagline?: Json | null
          title?: Json | null
          updated_at?: string
          website_url?: string | null
          weekly_hours?: number | null
          years_in_craft?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "specialist_profiles_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domain_staffing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specialist_profiles_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specialist_profiles_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: true
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      daily_domain_metrics: {
        Row: {
          applications: number | null
          contacts: number | null
          day: string | null
          domain_id: string | null
          domain_views: number | null
          visitors: number | null
          window_hovers: number | null
        }
        Relationships: [
          {
            foreignKeyName: "events_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domain_staffing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
        ]
      }
      domain_staffing: {
        Row: {
          active_seats: number | null
          id: string | null
          name: Json | null
          open_seats: number | null
          slug: string | null
          sort_order: number | null
          status: Database["public"]["Enums"]["domain_status"] | null
          target_seats: number | null
        }
        Relationships: []
      }
      specialist_teasers: {
        Row: {
          available_from: string | null
          booked_until: string | null
          city: string | null
          display_name: string | null
          domain_id: string | null
          id: string | null
          languages: string[] | null
          portrait_path: string | null
          seat_position: number | null
          skills: Json | null
          slug: string | null
          tagline: Json | null
          title: Json | null
          years_in_craft: number | null
        }
        Relationships: [
          {
            foreignKeyName: "specialist_profiles_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domain_staffing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specialist_profiles_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      booking_is_in_my_domain: { Args: { target: string }; Returns: boolean }
      booking_is_mine: { Args: { target: string }; Returns: boolean }
      current_person_id: { Args: never; Returns: string }
      current_roles: {
        Args: never
        Returns: Database["public"]["Enums"]["member_role"][]
      }
      has_domain_role: {
        Args: {
          roles: Database["public"]["Enums"]["member_role"][]
          target_domain: string
        }
        Returns: boolean
      }
      has_role: {
        Args: { roles: Database["public"]["Enums"]["member_role"][] }
        Returns: boolean
      }
      owns_profile: { Args: { target: string }; Returns: boolean }
      profile_is_live: { Args: { target: string }; Returns: boolean }
      rate_limit_hit: {
        Args: {
          p_key: string
          p_max: number
          p_scope: string
          p_window_seconds: number
        }
        Returns: boolean
      }
    }
    Enums: {
      access_status: "received" | "approved" | "declined"
      application_status:
        | "received"
        | "interview"
        | "accepted"
        | "declined"
        | "on_hold"
      booking_status:
        | "requested"
        | "accepted"
        | "proposed"
        | "declined"
        | "cancelled"
      domain_status: "healthy" | "needs" | "full"
      member_role:
        | "visitor"
        | "client"
        | "specialist"
        | "domain_lead"
        | "board"
        | "admin"
      membership_status: "invited" | "active" | "revoked"
      seat_status: "open" | "reserved" | "active" | "notice" | "closed"
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
      access_status: ["received", "approved", "declined"],
      application_status: [
        "received",
        "interview",
        "accepted",
        "declined",
        "on_hold",
      ],
      booking_status: [
        "requested",
        "accepted",
        "proposed",
        "declined",
        "cancelled",
      ],
      domain_status: ["healthy", "needs", "full"],
      member_role: [
        "visitor",
        "client",
        "specialist",
        "domain_lead",
        "board",
        "admin",
      ],
      membership_status: ["invited", "active", "revoked"],
      seat_status: ["open", "reserved", "active", "notice", "closed"],
    },
  },
} as const
