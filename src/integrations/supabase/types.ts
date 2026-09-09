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
      achievement_notifications: {
        Row: {
          achievement_id: string
          created_at: string
          id: string
          is_read: boolean | null
          user_id: string
        }
        Insert: {
          achievement_id: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          user_id: string
        }
        Update: {
          achievement_id?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievement_notifications_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      achievements: {
        Row: {
          category: string
          created_at: string
          description: string
          expires_at: string | null
          icon: string
          id: string
          is_seasonal: boolean | null
          max_progress: number | null
          name: string
          points: number | null
          season_name: string | null
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          expires_at?: string | null
          icon: string
          id?: string
          is_seasonal?: boolean | null
          max_progress?: number | null
          name: string
          points?: number | null
          season_name?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          expires_at?: string | null
          icon?: string
          id?: string
          is_seasonal?: boolean | null
          max_progress?: number | null
          name?: string
          points?: number | null
          season_name?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: unknown
          resource_id: string | null
          resource_type: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      cashback_usage: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          cashback_amount: number | null
          created_at: string
          discount_percentage: number
          estimated_value: number | null
          id: string
          notes: string | null
          partner_id: string | null
          partner_name: string
          proof_url: string | null
          purchase_amount: number | null
          status: Database["public"]["Enums"]["cashback_status"]
          updated_at: string
          usage_date: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          cashback_amount?: number | null
          created_at?: string
          discount_percentage?: number
          estimated_value?: number | null
          id?: string
          notes?: string | null
          partner_id?: string | null
          partner_name: string
          proof_url?: string | null
          purchase_amount?: number | null
          status?: Database["public"]["Enums"]["cashback_status"]
          updated_at?: string
          usage_date?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          cashback_amount?: number | null
          created_at?: string
          discount_percentage?: number
          estimated_value?: number | null
          id?: string
          notes?: string | null
          partner_id?: string | null
          partner_name?: string
          proof_url?: string | null
          purchase_amount?: number | null
          status?: Database["public"]["Enums"]["cashback_status"]
          updated_at?: string
          usage_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cashback_usage_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          certificate_number: string | null
          certificate_url: string | null
          completed_at: string
          created_at: string
          formation_id: string
          formation_title: string
          id: string
          user_id: string
          user_name: string
        }
        Insert: {
          certificate_number?: string | null
          certificate_url?: string | null
          completed_at: string
          created_at?: string
          formation_id: string
          formation_title: string
          id?: string
          user_id: string
          user_name: string
        }
        Update: {
          certificate_number?: string | null
          certificate_url?: string | null
          completed_at?: string
          created_at?: string
          formation_id?: string
          formation_title?: string
          id?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
        ]
      }
      churn_alert_logs: {
        Row: {
          alert_type: string
          id: string
          sent_at: string | null
          user_id: string
        }
        Insert: {
          alert_type: string
          id?: string
          sent_at?: string | null
          user_id: string
        }
        Update: {
          alert_type?: string
          id?: string
          sent_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      cloudflare_videos: {
        Row: {
          access_level: Database["public"]["Enums"]["video_access_level"]
          cloudflare_video_uid: string
          created_at: string
          created_by: string
          description: string | null
          duration: number | null
          id: string
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          access_level?: Database["public"]["Enums"]["video_access_level"]
          cloudflare_video_uid: string
          created_at?: string
          created_by: string
          description?: string | null
          duration?: number | null
          id?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          access_level?: Database["public"]["Enums"]["video_access_level"]
          cloudflare_video_uid?: string
          created_at?: string
          created_by?: string
          description?: string | null
          duration?: number | null
          id?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      community_posts: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          likes_count: number | null
          replies_count: number | null
          title: string
          user_id: string
          views_count: number | null
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          id?: string
          likes_count?: number | null
          replies_count?: number | null
          title: string
          user_id: string
          views_count?: number | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          likes_count?: number | null
          replies_count?: number | null
          title?: string
          user_id?: string
          views_count?: number | null
        }
        Relationships: []
      }
      conta_azul_customer_mapping: {
        Row: {
          asaas_customer_id: string | null
          conta_azul_customer_id: string
          created_at: string
          document: string | null
          email: string
          id: string
          last_verified_at: string | null
          updated_at: string
        }
        Insert: {
          asaas_customer_id?: string | null
          conta_azul_customer_id: string
          created_at?: string
          document?: string | null
          email: string
          id?: string
          last_verified_at?: string | null
          updated_at?: string
        }
        Update: {
          asaas_customer_id?: string | null
          conta_azul_customer_id?: string
          created_at?: string
          document?: string | null
          email?: string
          id?: string
          last_verified_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      conta_azul_tokens: {
        Row: {
          access_token: string
          expires_at: string | null
          id: string
          refresh_token: string
          updated_at: string
        }
        Insert: {
          access_token: string
          expires_at?: string | null
          id?: string
          refresh_token: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          expires_at?: string | null
          id?: string
          refresh_token?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_item_materials: {
        Row: {
          content_item_id: string
          created_at: string
          id: string
          name: string | null
          order_index: number
          url: string
        }
        Insert: {
          content_item_id: string
          created_at?: string
          id?: string
          name?: string | null
          order_index?: number
          url: string
        }
        Update: {
          content_item_id?: string
          created_at?: string
          id?: string
          name?: string | null
          order_index?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_item_materials_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_item_materials_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items_public"
            referencedColumns: ["id"]
          },
        ]
      }
      content_item_mentors: {
        Row: {
          content_item_id: string
          created_at: string
          id: string
          mentor_id: string
          order_index: number
        }
        Insert: {
          content_item_id: string
          created_at?: string
          id?: string
          mentor_id: string
          order_index?: number
        }
        Update: {
          content_item_id?: string
          created_at?: string
          id?: string
          mentor_id?: string
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_item_mentors_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_item_mentors_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_item_mentors_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_item_mentors_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      content_item_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string
          id: string
          item_id: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          id?: string
          item_id: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          id?: string
          item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_item_progress_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_item_progress_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "content_items_public"
            referencedColumns: ["id"]
          },
        ]
      }
      content_items: {
        Row: {
          category: string | null
          cloudflare_video_uid: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          order_index: number
          presenter_avatar: string | null
          presenter_bio: string | null
          presenter_name: string | null
          speaker: string | null
          thumbnail_url: string | null
          title: string
          track_id: string
          video_url: string | null
        }
        Insert: {
          category?: string | null
          cloudflare_video_uid?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          order_index?: number
          presenter_avatar?: string | null
          presenter_bio?: string | null
          presenter_name?: string | null
          speaker?: string | null
          thumbnail_url?: string | null
          title: string
          track_id: string
          video_url?: string | null
        }
        Update: {
          category?: string | null
          cloudflare_video_uid?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          order_index?: number
          presenter_avatar?: string | null
          presenter_bio?: string | null
          presenter_name?: string | null
          speaker?: string | null
          thumbnail_url?: string | null
          title?: string
          track_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_items_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "content_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      content_tracks: {
        Row: {
          category: string
          created_at: string
          description: string | null
          event_date: string | null
          event_name: string | null
          id: string
          is_active: boolean
          is_coming_soon: boolean
          order_index: number
          presenter_avatar: string | null
          presenter_bio: string | null
          presenter_name: string | null
          slug: string | null
          thumbnail_url: string | null
          title: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          event_date?: string | null
          event_name?: string | null
          id?: string
          is_active?: boolean
          is_coming_soon?: boolean
          order_index?: number
          presenter_avatar?: string | null
          presenter_bio?: string | null
          presenter_name?: string | null
          slug?: string | null
          thumbnail_url?: string | null
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          event_date?: string | null
          event_name?: string | null
          id?: string
          is_active?: boolean
          is_coming_soon?: boolean
          order_index?: number
          presenter_avatar?: string | null
          presenter_bio?: string | null
          presenter_name?: string | null
          slug?: string | null
          thumbnail_url?: string | null
          title?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          category: string
          created_at: string
          description: string | null
          duration: string | null
          id: string
          instructor: string
          lessons_count: number | null
          level: string
          students_count: number | null
          thumbnail: string | null
          title: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          instructor: string
          lessons_count?: number | null
          level: string
          students_count?: number | null
          thumbnail?: string | null
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          instructor?: string
          lessons_count?: number | null
          level?: string
          students_count?: number | null
          thumbnail?: string | null
          title?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          completed_at: string | null
          course_id: string
          id: string
          progress: number | null
          started_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          id?: string
          progress?: number | null
          started_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          id?: string
          progress?: number | null
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      extra_benefits: {
        Row: {
          benefit_type: Database["public"]["Enums"]["extra_benefit_type"]
          created_at: string
          description: string | null
          expires_at: string | null
          granted_at: string
          granted_by: string | null
          id: string
          member_id: string
          notes: string | null
          quantity_granted: number
          quantity_used: number
          source: string | null
          status: Database["public"]["Enums"]["extra_benefit_status"]
          title: string
          updated_at: string
        }
        Insert: {
          benefit_type?: Database["public"]["Enums"]["extra_benefit_type"]
          created_at?: string
          description?: string | null
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          member_id: string
          notes?: string | null
          quantity_granted?: number
          quantity_used?: number
          source?: string | null
          status?: Database["public"]["Enums"]["extra_benefit_status"]
          title: string
          updated_at?: string
        }
        Update: {
          benefit_type?: Database["public"]["Enums"]["extra_benefit_type"]
          created_at?: string
          description?: string | null
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          member_id?: string
          notes?: string | null
          quantity_granted?: number
          quantity_used?: number
          source?: string | null
          status?: Database["public"]["Enums"]["extra_benefit_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "extra_benefits_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "extra_benefits_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles_admin"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "extra_benefits_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "extra_benefits_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      feature_toggles: {
        Row: {
          feature_key: string
          id: string
          is_enabled: boolean
          label: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          feature_key: string
          id?: string
          is_enabled?: boolean
          label: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          feature_key?: string
          id?: string
          is_enabled?: boolean
          label?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      formation_lesson_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string
          id: string
          lesson_id: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "formation_lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "formation_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      formation_lessons: {
        Row: {
          cloudflare_video_uid: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          module_id: string
          order_index: number
          presenter_avatar: string | null
          presenter_bio: string | null
          presenter_name: string | null
          title: string
          video_url: string | null
        }
        Insert: {
          cloudflare_video_uid?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          module_id: string
          order_index?: number
          presenter_avatar?: string | null
          presenter_bio?: string | null
          presenter_name?: string | null
          title: string
          video_url?: string | null
        }
        Update: {
          cloudflare_video_uid?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          module_id?: string
          order_index?: number
          presenter_avatar?: string | null
          presenter_bio?: string | null
          presenter_name?: string | null
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "formation_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "formation_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      formation_modules: {
        Row: {
          created_at: string
          description: string | null
          formation_id: string
          id: string
          order_index: number
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          formation_id: string
          id?: string
          order_index?: number
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          formation_id?: string
          id?: string
          order_index?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "formation_modules_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
        ]
      }
      formations: {
        Row: {
          created_at: string
          description: string | null
          duration_hours: number | null
          id: string
          is_coming_soon: boolean
          is_published: boolean
          level: string
          order_index: number
          presenter_avatar: string | null
          presenter_bio: string | null
          presenter_name: string | null
          thumbnail_url: string | null
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_hours?: number | null
          id?: string
          is_coming_soon?: boolean
          is_published?: boolean
          level?: string
          order_index?: number
          presenter_avatar?: string | null
          presenter_bio?: string | null
          presenter_name?: string | null
          thumbnail_url?: string | null
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_hours?: number | null
          id?: string
          is_coming_soon?: boolean
          is_published?: boolean
          level?: string
          order_index?: number
          presenter_avatar?: string | null
          presenter_bio?: string | null
          presenter_name?: string | null
          thumbnail_url?: string | null
          title?: string
        }
        Relationships: []
      }
      growth_track_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string
          id: string
          module_id: string
          phase: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          id?: string
          module_id: string
          phase: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          id?: string
          module_id?: string
          phase?: string
          user_id?: string
        }
        Relationships: []
      }
      image_consent: {
        Row: {
          accepted_at: string
          consent_version: string
          id: string
          ip_address: string | null
          session_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string
          consent_version?: string
          id?: string
          ip_address?: string | null
          session_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          consent_version?: string
          id?: string
          ip_address?: string | null
          session_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "image_consent_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mentoring_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_consent_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mentoring_sessions_public"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_tokens: {
        Row: {
          created_at: string
          name: string
          token: string
        }
        Insert: {
          created_at?: string
          name: string
          token?: string
        }
        Update: {
          created_at?: string
          name?: string
          token?: string
        }
        Relationships: []
      }
      lesson_materials: {
        Row: {
          created_at: string
          file_type: string
          file_url: string
          id: string
          lesson_id: string
          title: string
        }
        Insert: {
          created_at?: string
          file_type: string
          file_url: string
          id?: string
          lesson_id: string
          title: string
        }
        Update: {
          created_at?: string
          file_type?: string
          file_url?: string
          id?: string
          lesson_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_materials_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string
          id: string
          lesson_id: string
          user_id: string
          watched_seconds: number | null
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id: string
          user_id: string
          watched_seconds?: number | null
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id?: string
          user_id?: string
          watched_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          duration: string | null
          id: string
          lesson_order: number
          module_name: string
          module_order: number
          title: string
          video_url: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          lesson_order?: number
          module_name: string
          module_order?: number
          title: string
          video_url?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          lesson_order?: number
          module_name?: string
          module_order?: number
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      mapinha_interactions: {
        Row: {
          answer: string | null
          answered_at: string | null
          context_message_count: number
          conversation_id: string
          created_at: string
          error_message: string | null
          id: string
          latency_ms: number | null
          question: string
          rated_at: string | null
          rating: number | null
          search_queries: string[]
          status: string
          topic: string
          user_id: string
          web_search_count: number
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          context_message_count?: number
          conversation_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          question: string
          rated_at?: string | null
          rating?: number | null
          search_queries?: string[]
          status?: string
          topic?: string
          user_id: string
          web_search_count?: number
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          context_message_count?: number
          conversation_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          question?: string
          rated_at?: string | null
          rating?: number | null
          search_queries?: string[]
          status?: string
          topic?: string
          user_id?: string
          web_search_count?: number
        }
        Relationships: []
      }
      member_analytics: {
        Row: {
          created_at: string
          duration_seconds: number | null
          event_data: Json | null
          event_type: string
          id: string
          page_path: string | null
          session_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          event_data?: Json | null
          event_type: string
          id?: string
          page_path?: string | null
          session_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          event_data?: Json | null
          event_type?: string
          id?: string
          page_path?: string | null
          session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      member_attribution: {
        Row: {
          created_at: string
          fbclid: string | null
          first_touch_at: string | null
          gclid: string | null
          landing_page: string | null
          last_touch_at: string | null
          origin: string | null
          referrer: string | null
          source_type: string | null
          updated_at: string
          user_id: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          created_at?: string
          fbclid?: string | null
          first_touch_at?: string | null
          gclid?: string | null
          landing_page?: string | null
          last_touch_at?: string | null
          origin?: string | null
          referrer?: string | null
          source_type?: string | null
          updated_at?: string
          user_id: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          created_at?: string
          fbclid?: string | null
          first_touch_at?: string | null
          gclid?: string | null
          landing_page?: string | null
          last_touch_at?: string | null
          origin?: string | null
          referrer?: string | null
          source_type?: string | null
          updated_at?: string
          user_id?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      member_connections: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      member_deletions: {
        Row: {
          created_at: string
          deleted_at: string
          email: string | null
          id: string
          name: string | null
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string
          email?: string | null
          id?: string
          name?: string | null
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string
          email?: string | null
          id?: string
          name?: string | null
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      member_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      mentoring_checkins: {
        Row: {
          checked_in_at: string
          email_sent: boolean | null
          id: string
          session_id: string
          user_id: string
        }
        Insert: {
          checked_in_at?: string
          email_sent?: boolean | null
          id?: string
          session_id: string
          user_id: string
        }
        Update: {
          checked_in_at?: string
          email_sent?: boolean | null
          id?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentoring_checkins_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mentoring_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentoring_checkins_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mentoring_sessions_public"
            referencedColumns: ["id"]
          },
        ]
      }
      mentoring_email_reminders: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          reminder_type: string
          send_at: string
          sent: boolean | null
          sent_at: string | null
          session_id: string
          user_email: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          reminder_type: string
          send_at: string
          sent?: boolean | null
          sent_at?: string | null
          session_id: string
          user_email: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          reminder_type?: string
          send_at?: string
          sent?: boolean | null
          sent_at?: string | null
          session_id?: string
          user_email?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentoring_email_reminders_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mentoring_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentoring_email_reminders_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mentoring_sessions_public"
            referencedColumns: ["id"]
          },
        ]
      }
      mentoring_sessions: {
        Row: {
          cohost_email: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          is_active: boolean | null
          max_attendees: number | null
          meeting_url: string | null
          mentor_email: string
          mentor_id: string | null
          mentor_name: string
          scheduled_at: string
          session_type: string | null
          title: string
        }
        Insert: {
          cohost_email?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          max_attendees?: number | null
          meeting_url?: string | null
          mentor_email?: string
          mentor_id?: string | null
          mentor_name?: string
          scheduled_at: string
          session_type?: string | null
          title?: string
        }
        Update: {
          cohost_email?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          max_attendees?: number | null
          meeting_url?: string | null
          mentor_email?: string
          mentor_id?: string | null
          mentor_name?: string
          scheduled_at?: string
          session_type?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentoring_sessions_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentoring_sessions_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      mentors: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string | null
          id: string
          is_listed: boolean
          name: string
          specialty: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_listed?: boolean
          name: string
          specialty?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_listed?: boolean
          name?: string
          specialty?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          notification_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          notification_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          notification_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          reference_id: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          reference_id?: string | null
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          reference_id?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      partner_clicks: {
        Row: {
          benefit_type: string | null
          cashback_applied: boolean | null
          cashback_value: number | null
          clicked_at: string | null
          id: string
          partner_name: string
          purchase_value: number | null
          status: string | null
          user_email: string | null
          user_id: string
          user_name: string | null
          user_plan: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          benefit_type?: string | null
          cashback_applied?: boolean | null
          cashback_value?: number | null
          clicked_at?: string | null
          id?: string
          partner_name: string
          purchase_value?: number | null
          status?: string | null
          user_email?: string | null
          user_id: string
          user_name?: string | null
          user_plan?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          benefit_type?: string | null
          cashback_applied?: boolean | null
          cashback_value?: number | null
          clicked_at?: string | null
          id?: string
          partner_name?: string
          purchase_value?: number | null
          status?: string | null
          user_email?: string | null
          user_id?: string
          user_name?: string | null
          user_plan?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      partners: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          discount_code: string | null
          discount_description: string | null
          discount_percentage: number | null
          display_order: number | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          discount_code?: string | null
          discount_description?: string | null
          discount_percentage?: number | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          discount_code?: string | null
          discount_description?: string | null
          discount_percentage?: number | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      password_reset_attempts: {
        Row: {
          attempted_at: string
          email: string
          id: string
          ip_address: string | null
        }
        Insert: {
          attempted_at?: string
          email: string
          id?: string
          ip_address?: string | null
        }
        Update: {
          attempted_at?: string
          email?: string
          id?: string
          ip_address?: string | null
        }
        Relationships: []
      }
      payment_events: {
        Row: {
          amount: number | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          event_type: string
          id: string
          payment_id: string | null
          plan: string | null
          raw_payload: Json | null
          status: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          event_type: string
          id?: string
          payment_id?: string | null
          plan?: string | null
          raw_payload?: Json | null
          status?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          event_type?: string
          id?: string
          payment_id?: string | null
          plan?: string | null
          raw_payload?: Json | null
          status?: string | null
        }
        Relationships: []
      }
      payment_identifiers: {
        Row: {
          asaas_customer_id: string | null
          asaas_subscription_id: string | null
          created_at: string
          id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          created_at?: string
          id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          created_at?: string
          id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pending_payments: {
        Row: {
          amount: number | null
          asaas_payment_id: string | null
          created_at: string
          customer_email: string
          customer_name: string | null
          id: string
          plan: string | null
          processed: boolean | null
        }
        Insert: {
          amount?: number | null
          asaas_payment_id?: string | null
          created_at?: string
          customer_email: string
          customer_name?: string | null
          id?: string
          plan?: string | null
          processed?: boolean | null
        }
        Update: {
          amount?: number | null
          asaas_payment_id?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string | null
          id?: string
          plan?: string | null
          processed?: boolean | null
        }
        Relationships: []
      }
      permissions: {
        Row: {
          action: string
          created_at: string
          description: string | null
          id: string
          name: string
          resource: string
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          resource: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          resource?: string
        }
        Relationships: []
      }
      plan_benefit_checklist: {
        Row: {
          benefit_key: string
          completed: boolean
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          member_id: string
          updated_at: string
        }
        Insert: {
          benefit_key: string
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          member_id: string
          updated_at?: string
        }
        Update: {
          benefit_key?: string
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          member_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      plan_upgrades: {
        Row: {
          amount_already_paid: number
          asaas_payment_id: string | null
          cancelled_at: string | null
          created_at: string
          current_plan: string
          current_plan_value: number
          external_reference: string | null
          failed_at: string | null
          id: string
          installments: number
          invoice_url: string | null
          new_plan: string
          new_plan_value: number
          paid_at: string | null
          status: string
          updated_at: string
          upgrade_amount: number
          user_id: string
          webhook_received_at: string | null
        }
        Insert: {
          amount_already_paid: number
          asaas_payment_id?: string | null
          cancelled_at?: string | null
          created_at?: string
          current_plan: string
          current_plan_value: number
          external_reference?: string | null
          failed_at?: string | null
          id?: string
          installments?: number
          invoice_url?: string | null
          new_plan: string
          new_plan_value: number
          paid_at?: string | null
          status?: string
          updated_at?: string
          upgrade_amount: number
          user_id: string
          webhook_received_at?: string | null
        }
        Update: {
          amount_already_paid?: number
          asaas_payment_id?: string | null
          cancelled_at?: string | null
          created_at?: string
          current_plan?: string
          current_plan_value?: number
          external_reference?: string | null
          failed_at?: string | null
          id?: string
          installments?: number
          invoice_url?: string | null
          new_plan?: string
          new_plan_value?: number
          paid_at?: string | null
          status?: string
          updated_at?: string
          upgrade_amount?: number
          user_id?: string
          webhook_received_at?: string | null
        }
        Relationships: []
      }
      platform_updates: {
        Row: {
          created_at: string
          description: string
          id: string
          is_active: boolean
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          is_active?: boolean
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          title?: string
          type?: string
        }
        Relationships: []
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_replies: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          cancel_reason: string | null
          cancel_reason_detail: string | null
          cancel_source: string | null
          company: string | null
          created_at: string
          experience_level: string | null
          id: string
          industry: string | null
          instagram_url: string | null
          is_public: boolean | null
          job_title: string | null
          linkedin_url: string | null
          location: string | null
          location_city: string | null
          location_state: string | null
          name: string
          niche: string | null
          pending_plan: string | null
          plan_locked: boolean
          seen_mentorias_migration_notice: boolean
          social_links: Json | null
          specialties: string[] | null
          streak: number | null
          subscription_end_date: string | null
          subscription_plan: string | null
          subscription_start_date: string | null
          subscription_status: string | null
          total_points: number | null
          updated_at: string
          updated_by: string | null
          upgrade_requested_at: string | null
          upgrade_status: string | null
          user_id: string
          website_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          cancel_reason?: string | null
          cancel_reason_detail?: string | null
          cancel_source?: string | null
          company?: string | null
          created_at?: string
          experience_level?: string | null
          id?: string
          industry?: string | null
          instagram_url?: string | null
          is_public?: boolean | null
          job_title?: string | null
          linkedin_url?: string | null
          location?: string | null
          location_city?: string | null
          location_state?: string | null
          name: string
          niche?: string | null
          pending_plan?: string | null
          plan_locked?: boolean
          seen_mentorias_migration_notice?: boolean
          social_links?: Json | null
          specialties?: string[] | null
          streak?: number | null
          subscription_end_date?: string | null
          subscription_plan?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          total_points?: number | null
          updated_at?: string
          updated_by?: string | null
          upgrade_requested_at?: string | null
          upgrade_status?: string | null
          user_id: string
          website_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          cancel_reason?: string | null
          cancel_reason_detail?: string | null
          cancel_source?: string | null
          company?: string | null
          created_at?: string
          experience_level?: string | null
          id?: string
          industry?: string | null
          instagram_url?: string | null
          is_public?: boolean | null
          job_title?: string | null
          linkedin_url?: string | null
          location?: string | null
          location_city?: string | null
          location_state?: string | null
          name?: string
          niche?: string | null
          pending_plan?: string | null
          plan_locked?: boolean
          seen_mentorias_migration_notice?: boolean
          social_links?: Json | null
          specialties?: string[] | null
          streak?: number | null
          subscription_end_date?: string | null
          subscription_plan?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          total_points?: number | null
          updated_at?: string
          updated_by?: string | null
          upgrade_requested_at?: string | null
          upgrade_status?: string | null
          user_id?: string
          website_url?: string | null
        }
        Relationships: []
      }
      profiles_private: {
        Row: {
          created_at: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          category: string
          created_at: string
          description: string | null
          downloads_count: number | null
          external_url: string | null
          file_url: string | null
          id: string
          is_active: boolean
          is_premium: boolean | null
          thumbnail: string | null
          title: string
          type: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          downloads_count?: number | null
          external_url?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean
          is_premium?: boolean | null
          thumbnail?: string | null
          title: string
          type: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          downloads_count?: number | null
          external_url?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean
          is_premium?: boolean | null
          thumbnail?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          permission_id: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          id?: string
          permission_id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      secondary_login_requests: {
        Row: {
          created_at: string
          id: string
          justification: string | null
          rejection_reason: string | null
          relationship: string
          reviewed_at: string | null
          reviewed_by: string | null
          secondary_email: string
          secondary_name: string
          status: Database["public"]["Enums"]["secondary_login_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          justification?: string | null
          rejection_reason?: string | null
          relationship: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          secondary_email: string
          secondary_name: string
          status?: Database["public"]["Enums"]["secondary_login_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          justification?: string | null
          rejection_reason?: string | null
          relationship?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          secondary_email?: string
          secondary_name?: string
          status?: Database["public"]["Enums"]["secondary_login_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      secondary_logins: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          primary_user_id: string
          relationship: string
          request_id: string | null
          secondary_email: string
          secondary_name: string
          secondary_user_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          primary_user_id: string
          relationship: string
          request_id?: string | null
          secondary_email: string
          secondary_name: string
          secondary_user_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          primary_user_id?: string
          relationship?: string
          request_id?: string | null
          secondary_email?: string
          secondary_name?: string
          secondary_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "secondary_logins_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "secondary_login_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number | null
          cancel_reason: string | null
          cancel_reason_detail: string | null
          cancel_source: string | null
          cancelled_at: string | null
          created_at: string
          currency: string | null
          expires_at: string | null
          external_subscription_id: string | null
          id: string
          payment_provider: string | null
          plan_name: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          cancel_reason?: string | null
          cancel_reason_detail?: string | null
          cancel_source?: string | null
          cancelled_at?: string | null
          created_at?: string
          currency?: string | null
          expires_at?: string | null
          external_subscription_id?: string | null
          id?: string
          payment_provider?: string | null
          plan_name?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number | null
          cancel_reason?: string | null
          cancel_reason_detail?: string | null
          cancel_source?: string | null
          cancelled_at?: string | null
          created_at?: string
          currency?: string | null
          expires_at?: string | null
          external_subscription_id?: string | null
          id?: string
          payment_provider?: string | null
          plan_name?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suggestion_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          suggestion_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          suggestion_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          suggestion_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggestion_comments_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      suggestion_votes: {
        Row: {
          created_at: string
          id: string
          suggestion_id: string
          user_id: string
          vote_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          suggestion_id: string
          user_id: string
          vote_type?: string
        }
        Update: {
          created_at?: string
          id?: string
          suggestion_id?: string
          user_id?: string
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggestion_votes_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      suggestions: {
        Row: {
          category: string
          comments_count: number
          created_at: string
          description: string
          id: string
          status: string
          title: string
          updated_at: string
          user_id: string
          votes_count: number
        }
        Insert: {
          category: string
          comments_count?: number
          created_at?: string
          description: string
          id?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
          votes_count?: number
        }
        Update: {
          category?: string
          comments_count?: number
          created_at?: string
          description?: string
          id?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          votes_count?: number
        }
        Relationships: []
      }
      terms_acceptance: {
        Row: {
          accepted_at: string
          id: string
          ip_address: string | null
          terms_version: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string
          id?: string
          ip_address?: string | null
          terms_version?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          id?: string
          ip_address?: string | null
          terms_version?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          created_at: string
          id: string
          progress: number | null
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          achievement_id: string
          created_at?: string
          id?: string
          progress?: number | null
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          achievement_id?: string
          created_at?: string
          id?: string
          progress?: number | null
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_content_favorites: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_content_notes: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          id: string
          note: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          note?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          note?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_onboarding: {
        Row: {
          accounting_confirmed_at: string | null
          accounting_service: string | null
          ai_tools: string | null
          average_ticket: string | null
          business_models: string[] | null
          business_niche: string | null
          business_niche_other: string | null
          city_state: string | null
          cnpj: string | null
          company: string | null
          completed_at: string | null
          created_at: string
          current_step: number | null
          ecommerce_platform: string | null
          employee_range: string | null
          erp_other: string | null
          erp_tools: string[] | null
          experience_level: string | null
          full_name: string | null
          has_supplier_difficulty: boolean | null
          id: string
          job_title: string | null
          main_goal: string | null
          revenue_goal: string | null
          sales_channel_other: string | null
          sales_channels: string[] | null
          supplier_needs: string | null
          terms_accepted_at: string | null
          terms_version: string | null
          updated_at: string
          user_id: string
          uses_accounting: boolean | null
          uses_ai: boolean | null
          uses_erp: boolean | null
          weekly_hours: string | null
          whatsapp: string | null
        }
        Insert: {
          accounting_confirmed_at?: string | null
          accounting_service?: string | null
          ai_tools?: string | null
          average_ticket?: string | null
          business_models?: string[] | null
          business_niche?: string | null
          business_niche_other?: string | null
          city_state?: string | null
          cnpj?: string | null
          company?: string | null
          completed_at?: string | null
          created_at?: string
          current_step?: number | null
          ecommerce_platform?: string | null
          employee_range?: string | null
          erp_other?: string | null
          erp_tools?: string[] | null
          experience_level?: string | null
          full_name?: string | null
          has_supplier_difficulty?: boolean | null
          id?: string
          job_title?: string | null
          main_goal?: string | null
          revenue_goal?: string | null
          sales_channel_other?: string | null
          sales_channels?: string[] | null
          supplier_needs?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string
          user_id: string
          uses_accounting?: boolean | null
          uses_ai?: boolean | null
          uses_erp?: boolean | null
          weekly_hours?: string | null
          whatsapp?: string | null
        }
        Update: {
          accounting_confirmed_at?: string | null
          accounting_service?: string | null
          ai_tools?: string | null
          average_ticket?: string | null
          business_models?: string[] | null
          business_niche?: string | null
          business_niche_other?: string | null
          city_state?: string | null
          cnpj?: string | null
          company?: string | null
          completed_at?: string | null
          created_at?: string
          current_step?: number | null
          ecommerce_platform?: string | null
          employee_range?: string | null
          erp_other?: string | null
          erp_tools?: string[] | null
          experience_level?: string | null
          full_name?: string | null
          has_supplier_difficulty?: boolean | null
          id?: string
          job_title?: string | null
          main_goal?: string | null
          revenue_goal?: string | null
          sales_channel_other?: string | null
          sales_channels?: string[] | null
          supplier_needs?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string
          user_id?: string
          uses_accounting?: boolean | null
          uses_ai?: boolean | null
          uses_erp?: boolean | null
          weekly_hours?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      user_recommendations: {
        Row: {
          created_at: string
          generated_at: string
          id: string
          next_step: Json | null
          recommendations: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          generated_at?: string
          id?: string
          next_step?: Json | null
          recommendations?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          generated_at?: string
          id?: string
          next_step?: Json | null
          recommendations?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vendas: {
        Row: {
          cliente_email: string | null
          comissao_valor: number
          created_at: string
          id: string
          price_id: string | null
          produto: string | null
          status: string
          stripe_session_id: string | null
          valor: number
          vendedor_id: string
        }
        Insert: {
          cliente_email?: string | null
          comissao_valor?: number
          created_at?: string
          id?: string
          price_id?: string | null
          produto?: string | null
          status?: string
          stripe_session_id?: string | null
          valor?: number
          vendedor_id: string
        }
        Update: {
          cliente_email?: string | null
          comissao_valor?: number
          created_at?: string
          id?: string
          price_id?: string | null
          produto?: string | null
          status?: string
          stripe_session_id?: string | null
          valor?: number
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendas_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "vendedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "vendedores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      vendedores: {
        Row: {
          comissao_percent: number
          created_at: string
          email: string
          id: string
          nome: string
          pix_chave: string | null
          slug: string
          status: string
        }
        Insert: {
          comissao_percent?: number
          created_at?: string
          email: string
          id?: string
          nome: string
          pix_chave?: string | null
          slug: string
          status?: string
        }
        Update: {
          comissao_percent?: number
          created_at?: string
          email?: string
          id?: string
          nome?: string
          pix_chave?: string | null
          slug?: string
          status?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string
          customer_name: string | null
          error_message: string | null
          event_type: string | null
          id: string
          payload: Json | null
          payment_id: string | null
          processed_at: string | null
          provider: string
          status: string | null
          user_created_id: string | null
        }
        Insert: {
          created_at?: string
          customer_name?: string | null
          error_message?: string | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          payment_id?: string | null
          processed_at?: string | null
          provider: string
          status?: string | null
          user_created_id?: string | null
        }
        Update: {
          created_at?: string
          customer_name?: string | null
          error_message?: string | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          payment_id?: string | null
          processed_at?: string | null
          provider?: string
          status?: string | null
          user_created_id?: string | null
        }
        Relationships: []
      }
      webinar_checkins: {
        Row: {
          checked_in_at: string
          email_sent: boolean | null
          id: string
          user_id: string
          webinar_id: string
        }
        Insert: {
          checked_in_at?: string
          email_sent?: boolean | null
          id?: string
          user_id: string
          webinar_id: string
        }
        Update: {
          checked_in_at?: string
          email_sent?: boolean | null
          id?: string
          user_id?: string
          webinar_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_webinar_checkins_webinar"
            columns: ["webinar_id"]
            isOneToOne: false
            referencedRelation: "webinars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webinar_checkins_webinar_id_fkey"
            columns: ["webinar_id"]
            isOneToOne: false
            referencedRelation: "webinars"
            referencedColumns: ["id"]
          },
        ]
      }
      webinar_email_reminders: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          reminder_type: string
          send_at: string
          sent: boolean | null
          sent_at: string | null
          user_email: string
          user_id: string
          user_name: string | null
          webinar_id: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          reminder_type: string
          send_at: string
          sent?: boolean | null
          sent_at?: string | null
          user_email: string
          user_id: string
          user_name?: string | null
          webinar_id: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          reminder_type?: string
          send_at?: string
          sent?: boolean | null
          sent_at?: string | null
          user_email?: string
          user_id?: string
          user_name?: string | null
          webinar_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webinar_email_reminders_webinar_id_fkey"
            columns: ["webinar_id"]
            isOneToOne: false
            referencedRelation: "webinars"
            referencedColumns: ["id"]
          },
        ]
      }
      webinar_scarcity_config: {
        Row: {
          base_fake_registrations: number
          created_at: string
          id: string
          is_active: boolean
          min_checkins_to_show: number
          show_live_counter: boolean
          show_notifications: boolean
          updated_at: string
          webinar_id: string
        }
        Insert: {
          base_fake_registrations?: number
          created_at?: string
          id?: string
          is_active?: boolean
          min_checkins_to_show?: number
          show_live_counter?: boolean
          show_notifications?: boolean
          updated_at?: string
          webinar_id: string
        }
        Update: {
          base_fake_registrations?: number
          created_at?: string
          id?: string
          is_active?: boolean
          min_checkins_to_show?: number
          show_live_counter?: boolean
          show_notifications?: boolean
          updated_at?: string
          webinar_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webinar_scarcity_config_webinar_id_fkey"
            columns: ["webinar_id"]
            isOneToOne: true
            referencedRelation: "webinars"
            referencedColumns: ["id"]
          },
        ]
      }
      webinars: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          is_active: boolean | null
          max_attendees: number | null
          meeting_url: string | null
          partner_name: string | null
          presenter_avatar: string | null
          presenter_bio: string | null
          presenter_name: string | null
          scheduled_at: string
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          max_attendees?: number | null
          meeting_url?: string | null
          partner_name?: string | null
          presenter_avatar?: string | null
          presenter_bio?: string | null
          presenter_name?: string | null
          scheduled_at: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          max_attendees?: number | null
          meeting_url?: string | null
          partner_name?: string | null
          presenter_avatar?: string | null
          presenter_bio?: string | null
          presenter_name?: string | null
          scheduled_at?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      content_items_public: {
        Row: {
          category: string | null
          cloudflare_video_uid: string | null
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string | null
          order_index: number | null
          presenter_avatar: string | null
          presenter_bio: string | null
          presenter_name: string | null
          speaker: string | null
          thumbnail_url: string | null
          title: string | null
          track_id: string | null
        }
        Insert: {
          category?: string | null
          cloudflare_video_uid?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string | null
          order_index?: number | null
          presenter_avatar?: string | null
          presenter_bio?: string | null
          presenter_name?: string | null
          speaker?: string | null
          thumbnail_url?: string | null
          title?: string | null
          track_id?: string | null
        }
        Update: {
          category?: string | null
          cloudflare_video_uid?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string | null
          order_index?: number | null
          presenter_avatar?: string | null
          presenter_bio?: string | null
          presenter_name?: string | null
          speaker?: string | null
          thumbnail_url?: string | null
          title?: string | null
          track_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_items_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "content_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      mentoring_sessions_public: {
        Row: {
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string | null
          is_active: boolean | null
          max_attendees: number | null
          mentor_id: string | null
          mentor_name: string | null
          scheduled_at: string | null
          session_type: string | null
          title: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string | null
          is_active?: boolean | null
          max_attendees?: number | null
          mentor_id?: string | null
          mentor_name?: string | null
          scheduled_at?: string | null
          session_type?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string | null
          is_active?: boolean | null
          max_attendees?: number | null
          mentor_id?: string | null
          mentor_name?: string | null
          scheduled_at?: string | null
          session_type?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentoring_sessions_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentoring_sessions_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      mentors_public: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          id: string | null
          is_listed: boolean | null
          name: string | null
          specialty: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          id?: string | null
          is_listed?: boolean | null
          name?: string | null
          specialty?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          id?: string | null
          is_listed?: boolean | null
          name?: string | null
          specialty?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles_admin: {
        Row: {
          avatar_url: string | null
          bio: string | null
          cancel_reason: string | null
          cancel_reason_detail: string | null
          cancel_source: string | null
          company: string | null
          created_at: string | null
          experience_level: string | null
          id: string | null
          industry: string | null
          instagram_url: string | null
          is_public: boolean | null
          job_title: string | null
          linkedin_url: string | null
          location: string | null
          location_city: string | null
          location_state: string | null
          name: string | null
          niche: string | null
          pending_plan: string | null
          social_links: Json | null
          specialties: string[] | null
          streak: number | null
          subscription_end_date: string | null
          subscription_plan: string | null
          subscription_start_date: string | null
          subscription_status: string | null
          total_points: number | null
          updated_at: string | null
          upgrade_requested_at: string | null
          upgrade_status: string | null
          user_id: string | null
          website_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          cancel_reason?: string | null
          cancel_reason_detail?: string | null
          cancel_source?: string | null
          company?: string | null
          created_at?: string | null
          experience_level?: string | null
          id?: string | null
          industry?: string | null
          instagram_url?: string | null
          is_public?: boolean | null
          job_title?: string | null
          linkedin_url?: string | null
          location?: string | null
          location_city?: string | null
          location_state?: string | null
          name?: string | null
          niche?: string | null
          pending_plan?: string | null
          social_links?: Json | null
          specialties?: string[] | null
          streak?: number | null
          subscription_end_date?: string | null
          subscription_plan?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          total_points?: number | null
          updated_at?: string | null
          upgrade_requested_at?: string | null
          upgrade_status?: string | null
          user_id?: string | null
          website_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          cancel_reason?: string | null
          cancel_reason_detail?: string | null
          cancel_source?: string | null
          company?: string | null
          created_at?: string | null
          experience_level?: string | null
          id?: string | null
          industry?: string | null
          instagram_url?: string | null
          is_public?: boolean | null
          job_title?: string | null
          linkedin_url?: string | null
          location?: string | null
          location_city?: string | null
          location_state?: string | null
          name?: string | null
          niche?: string | null
          pending_plan?: string | null
          social_links?: Json | null
          specialties?: string[] | null
          streak?: number | null
          subscription_end_date?: string | null
          subscription_plan?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          total_points?: number | null
          updated_at?: string | null
          upgrade_requested_at?: string | null
          upgrade_status?: string | null
          user_id?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      profiles_public: {
        Row: {
          avatar_url: string | null
          bio: string | null
          company: string | null
          created_at: string | null
          experience_level: string | null
          id: string | null
          industry: string | null
          instagram_url: string | null
          is_public: boolean | null
          job_title: string | null
          linkedin_url: string | null
          location: string | null
          location_city: string | null
          location_state: string | null
          name: string | null
          niche: string | null
          social_links: Json | null
          specialties: string[] | null
          streak: number | null
          total_points: number | null
          updated_at: string | null
          user_id: string | null
          website_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string | null
          experience_level?: string | null
          id?: string | null
          industry?: string | null
          instagram_url?: string | null
          is_public?: boolean | null
          job_title?: string | null
          linkedin_url?: string | null
          location?: string | null
          location_city?: string | null
          location_state?: string | null
          name?: string | null
          niche?: string | null
          social_links?: Json | null
          specialties?: string[] | null
          streak?: number | null
          total_points?: number | null
          updated_at?: string | null
          user_id?: string | null
          website_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string | null
          experience_level?: string | null
          id?: string | null
          industry?: string | null
          instagram_url?: string | null
          is_public?: boolean | null
          job_title?: string | null
          linkedin_url?: string | null
          location?: string | null
          location_city?: string | null
          location_state?: string | null
          name?: string | null
          niche?: string | null
          social_links?: Json | null
          specialties?: string[] | null
          streak?: number | null
          total_points?: number | null
          updated_at?: string | null
          user_id?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          experience_level: string | null
          is_public: boolean | null
          name: string | null
          streak: number | null
          total_points: number | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          experience_level?: string | null
          is_public?: boolean | null
          name?: string | null
          streak?: number | null
          total_points?: number | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          experience_level?: string | null
          is_public?: boolean | null
          name?: string | null
          streak?: number | null
          total_points?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_onboarding_public: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_step: number | null
          id: string | null
          terms_accepted_at: string | null
          terms_version: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_step?: number | null
          id?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_step?: number | null
          id?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      vendedores_public: {
        Row: {
          created_at: string | null
          id: string | null
          nome: string | null
          slug: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          nome?: string | null
          slug?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          nome?: string | null
          slug?: string | null
          status?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _get_internal_token: { Args: { _name: string }; Returns: string }
      accept_terms: {
        Args: { user_agent_text?: string; version_text: string }
        Returns: undefined
      }
      can_access_cloudflare_video: {
        Args: {
          _access_level: Database["public"]["Enums"]["video_access_level"]
        }
        Returns: boolean
      }
      ensure_weekly_thursday_mentorings: {
        Args: { _weeks_ahead?: number }
        Returns: {
          action: string
          scheduled_at: string
        }[]
      }
      get_access_by_hour: {
        Args: { _days_ago?: number }
        Returns: {
          hour_of_day: number
          page_views: number
          unique_users: number
        }[]
      }
      get_access_by_weekday: {
        Args: { _days_ago?: number }
        Returns: {
          avg_daily_views: number
          day_name: string
          day_of_week: number
          page_views: number
          unique_users: number
        }[]
      }
      get_access_heatmap: {
        Args: { _days_ago?: number }
        Returns: {
          day_name: string
          day_of_week: number
          hour_of_day: number
          page_views: number
          unique_users: number
        }[]
      }
      get_analytics_kpis: {
        Args: { _days_ago?: number }
        Returns: {
          peak_day_name: string
          peak_day_views: number
          peak_hour: number
          peak_hour_views: number
          prev_page_views: number
          prev_total_events: number
          prev_unique_users: number
          top_page: string
          top_page_views: number
          total_events: number
          total_page_views: number
          total_sessions: number
          unique_users: number
        }[]
      }
      get_cashback_dashboard_stats: { Args: never; Returns: Json }
      get_cashback_partner_performance: {
        Args: never
        Returns: {
          cashback: number
          cliques: number
          confirmadas: number
          partner_name: string
          taxa_conversao: number
          vendas: number
        }[]
      }
      get_cashback_saldo_planos: {
        Args: never
        Returns: {
          cashback_gerado: number
          cliente: string
          email: string
          plano: string
          saldo_a_pagar: number
          valor_plano: number
        }[]
      }
      get_clicks_by_page: {
        Args: { _days_ago?: number }
        Returns: {
          click_count: number
          page_path: string
          unique_users: number
        }[]
      }
      get_clicks_over_time: {
        Args: { _days_ago?: number }
        Returns: {
          click_count: number
          day: string
          unique_users: number
        }[]
      }
      get_contact_cadence: {
        Args: { p_end: string; p_start: string }
        Returns: {
          avg_days_12: number
          avg_days_23: number
          avg_days_34: number
          avg_days_45: number
          distinct_leads: number
          full_name: string
          leads_c1: number
          leads_c2: number
          leads_c3: number
          leads_c4: number
          leads_c5: number
          leads_max1: number
          leads_max2: number
          leads_max3: number
          leads_max4: number
          leads_max5: number
          role: string
          total_contatos: number
          user_id: string
          won_max1: number
          won_max2: number
          won_max3: number
          won_max4: number
          won_max5: number
        }[]
      }
      get_content_item_completion_stats: {
        Args: { p_track_id?: string }
        Returns: {
          duration_minutes: number
          item_id: string
          item_title: string
          presenter_name: string
          track_id: string
          track_slug: string
          track_title: string
          users_completed: number
        }[]
      }
      get_content_track_completion_rates: {
        Args: never
        Returns: {
          completion_rate: number
          total_items: number
          track_id: string
          track_slug: string
          track_title: string
          users_completed: number
          users_started: number
        }[]
      }
      get_daily_access_calendar: {
        Args: { _days_ago?: number }
        Returns: {
          access_date: string
          page_views: number
          unique_users: number
        }[]
      }
      get_engagement_stats: { Args: never; Returns: Json }
      get_formation_completion_rates: {
        Args: never
        Returns: {
          completion_rate: number
          formation_id: string
          formation_title: string
          total_lessons: number
          users_completed: number
          users_started: number
        }[]
      }
      get_inactive_members: {
        Args: { inactive_days?: number; limit_count?: number }
        Returns: {
          avatar_url: string
          days_inactive: number
          email: string
          last_activity: string
          name: string
          subscription_plan: string
          user_id: string
        }[]
      }
      get_leaderboard_with_achievements: {
        Args: never
        Returns: {
          achievements_count: number
          avatar_url: string
          name: string
          total_points: number
          user_id: string
        }[]
      }
      get_mapinha_analytics: { Args: { days_back?: number }; Returns: Json }
      get_marketing_acquisition: { Args: { _days?: number }; Returns: Json }
      get_marketing_cohorts: {
        Args: never
        Returns: {
          active_7d: number
          cohort_month: string
          members: number
          paying_members: number
          revenue: number
          still_active: number
        }[]
      }
      get_marketing_content_interest: {
        Args: { _days?: number }
        Returns: Json
      }
      get_marketing_events_conversion: {
        Args: { _days?: number }
        Returns: {
          checkins: number
          event_id: string
          event_kind: string
          fill_rate: number
          max_attendees: number
          scheduled_at: string
          title: string
        }[]
      }
      get_marketing_funnel: { Args: { _days?: number }; Returns: Json }
      get_marketing_geo: {
        Args: never
        Returns: {
          city_state: string
          members: number
          paying_members: number
          revenue: number
        }[]
      }
      get_marketing_overview: { Args: { _days?: number }; Returns: Json }
      get_marketing_partners: {
        Args: { _days?: number }
        Returns: {
          benefit_type: string
          cashback_value: number
          clicks: number
          partner_name: string
          purchase_value: number
          purchases: number
          unique_users: number
          utm_sources: string
        }[]
      }
      get_marketing_plans: { Args: never; Returns: Json }
      get_marketing_revenue_timeseries: {
        Args: { _days?: number; _granularity?: string }
        Returns: {
          bucket: string
          new_payers: number
          payments: number
          revenue: number
          unique_payers: number
        }[]
      }
      get_marketing_sellers: {
        Args: { _days?: number }
        Returns: {
          commission_value: number
          gross_value: number
          sales: number
          seller_name: string
          seller_slug: string
          seller_status: string
        }[]
      }
      get_mentoring_meeting_url: {
        Args: { _session_id: string }
        Returns: string
      }
      get_my_seller_id: { Args: never; Returns: string }
      get_my_seller_profile: {
        Args: never
        Returns: {
          created_at: string
          id: string
          nome: string
          slug: string
          status: string
        }[]
      }
      get_my_subscription: {
        Args: never
        Returns: {
          pending_plan: string
          subscription_end_date: string
          subscription_plan: string
          subscription_start_date: string
          subscription_status: string
          upgrade_requested_at: string
          upgrade_status: string
        }[]
      }
      get_onboarding_icp_distribution: { Args: never; Returns: Json }
      get_onboarding_responses: {
        Args: never
        Returns: {
          accounting_service: string
          ai_tools: string
          avatar_url: string
          average_ticket: string
          business_models: string[]
          business_niche: string
          business_niche_other: string
          city_state: string
          company: string
          completed_at: string
          created_at: string
          current_step: number
          email: string
          employee_range: string
          erp_other: string
          erp_tools: string[]
          experience_level: string
          has_supplier_difficulty: boolean
          job_title: string
          main_goal: string
          name: string
          revenue_goal: string
          sales_channels: string[]
          subscription_plan: string
          supplier_needs: string
          user_id: string
          uses_accounting: boolean
          uses_ai: boolean
          uses_erp: boolean
          weekly_hours: string
        }[]
      }
      get_page_click_details: {
        Args: { _days_ago?: number; _page_paths: string[] }
        Returns: {
          category: string
          click_count: number
          element_type: string
          label: string
        }[]
      }
      get_page_views_over_time: {
        Args: { _days_ago?: number }
        Returns: {
          day: string
          page_views: number
          unique_users: number
        }[]
      }
      get_primary_user_id_for_secondary: {
        Args: { _secondary_user_id: string }
        Returns: string
      }
      get_reports_cac: {
        Args: { p_end?: string; p_start?: string }
        Returns: {
          cac: number
          canal: string
          clientes: number
          custo_estimado: number
          custo_mensagens: number
          custo_total: number
          dias_desde_criacao_mediano: number
          investimento_midia: number
          leads: number
          mensagens: number
          mensagens_sem_preco: number
        }[]
      }
      get_top_clicked_elements: {
        Args: { _days_ago?: number; _limit?: number }
        Returns: {
          click_count: number
          element_type: string
          label: string
          page_path: string
        }[]
      }
      get_top_pages: {
        Args: { days_back?: number; limit_count?: number }
        Returns: {
          page_path: string
          unique_users: number
          view_count: number
        }[]
      }
      get_top_pages_by_views: {
        Args: { _days_ago?: number; _limit?: number }
        Returns: {
          avg_duration_seconds: number
          page_path: string
          page_views: number
          unique_users: number
        }[]
      }
      get_user_highest_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_weekday_access_summary: {
        Args: { _days_ago?: number }
        Returns: {
          day_name: string
          day_of_week: number
          page_views: number
          unique_users: number
        }[]
      }
      has_permission: {
        Args: { _permission_name: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active_member: { Args: never; Returns: boolean }
      mentoring_checkin: {
        Args: { _session_id: string; _user_id: string }
        Returns: Json
      }
      mkt_guard: { Args: never; Returns: undefined }
      mkt_is_internal: { Args: { _user_id: string }; Returns: boolean }
      mkt_member_emails: {
        Args: never
        Returns: {
          email: string
          user_id: string
        }[]
      }
      mkt_payments: {
        Args: never
        Returns: {
          amount: number
          email: string
          paid_at: string
          plan: string
          user_id: string
        }[]
      }
      next_conta_azul_sale_number: { Args: never; Returns: number }
      notify_new_content_webhook:
        | { Args: { _tipo: string; _titulo: string }; Returns: undefined }
        | {
            Args: { _presenter?: string; _tipo: string; _titulo: string }
            Returns: undefined
          }
        | {
            Args: {
              _link?: string
              _presenter?: string
              _tipo: string
              _titulo: string
            }
            Returns: undefined
          }
      peek_conta_azul_sale_number: { Args: never; Returns: number }
      rate_mapinha_interaction: {
        Args: { interaction_id: string; new_rating: number }
        Returns: undefined
      }
      search_profiles_with_email: {
        Args: { search_query: string }
        Returns: {
          avatar_url: string
          bio: string
          email: string
          name: string
          user_id: string
        }[]
      }
      set_push_trigger_secret: { Args: { _value: string }; Returns: string }
      verify_internal_token: {
        Args: { _name: string; _token: string }
        Returns: boolean
      }
      webinar_checkin: {
        Args: { _user_id: string; _webinar_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "admin_geral"
        | "admin"
        | "admin_financeiro"
        | "admin_conteudo"
        | "starter"
        | "pro"
        | "enterprise"
        | "automacao"
        | "cx"
        | "comercial"
        | "marketing"
        | "basic"
        | "business"
      cashback_status:
        | "pending"
        | "confirmed"
        | "expired"
        | "approved"
        | "paid"
        | "rejected"
      extra_benefit_status:
        | "concedido"
        | "pendente"
        | "em_uso"
        | "entregue"
        | "expirado"
        | "cancelado"
      extra_benefit_type:
        | "mentoria_individual"
        | "vip_extra_map_xp"
        | "acesso_bonus"
        | "extensao"
        | "consultoria_extra"
        | "outro"
        | "mentoria_individual_pedro"
        | "mentoria_individual_valenca"
      secondary_login_status: "pending" | "approved" | "rejected"
      video_access_level: "public" | "members" | "pro" | "enterprise"
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
      app_role: [
        "admin_geral",
        "admin",
        "admin_financeiro",
        "admin_conteudo",
        "starter",
        "pro",
        "enterprise",
        "automacao",
        "cx",
        "comercial",
        "marketing",
        "basic",
        "business",
      ],
      cashback_status: [
        "pending",
        "confirmed",
        "expired",
        "approved",
        "paid",
        "rejected",
      ],
      extra_benefit_status: [
        "concedido",
        "pendente",
        "em_uso",
        "entregue",
        "expirado",
        "cancelado",
      ],
      extra_benefit_type: [
        "mentoria_individual",
        "vip_extra_map_xp",
        "acesso_bonus",
        "extensao",
        "consultoria_extra",
        "outro",
        "mentoria_individual_pedro",
        "mentoria_individual_valenca",
      ],
      secondary_login_status: ["pending", "approved", "rejected"],
      video_access_level: ["public", "members", "pro", "enterprise"],
    },
  },
} as const
