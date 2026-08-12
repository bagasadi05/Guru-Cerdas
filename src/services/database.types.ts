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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      academic_records: {
        Row: {
          assessment_name: string | null
          created_at: string
          deleted_at: string | null
          id: string
          notes: string
          score: number
          semester_id: string | null
          student_id: string
          subject: string
          user_id: string
          version: number | null
        }
        Insert: {
          assessment_name?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          notes: string
          score: number
          semester_id?: string | null
          student_id: string
          subject: string
          user_id: string
          version?: number | null
        }
        Update: {
          assessment_name?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          notes?: string
          score?: number
          semester_id?: string | null
          student_id?: string
          subject?: string
          user_id?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_records_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_years: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          end_date: string
          id: string
          is_active: boolean | null
          name: string
          start_date: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          name: string
          start_date: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          name?: string
          start_date?: string
          user_id?: string | null
        }
        Relationships: []
      }
      action_history: {
        Row: {
          action_type: string
          affected_ids: string[]
          can_undo: boolean | null
          created_at: string | null
          description: string | null
          entity_type: string
          expires_at: string
          id: string
          previous_state: Json | null
          user_id: string
        }
        Insert: {
          action_type: string
          affected_ids: string[]
          can_undo?: boolean | null
          created_at?: string | null
          description?: string | null
          entity_type: string
          expires_at: string
          id?: string
          previous_state?: Json | null
          user_id: string
        }
        Update: {
          action_type?: string
          affected_ids?: string[]
          can_undo?: boolean | null
          created_at?: string | null
          description?: string | null
          entity_type?: string
          expires_at?: string
          id?: string
          previous_state?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      ai_content_job_requests: {
        Row: {
          created_at: string
          id: string
          job_id: string
          request_fingerprint: string
          requested_by: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          request_fingerprint: string
          requested_by: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          request_fingerprint?: string
          requested_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_content_job_requests_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "ai_content_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_content_jobs: {
        Row: {
          attempt_count: number
          completed_at: string | null
          created_at: string
          error_code: string | null
          error_detail: string | null
          id: string
          input_json: Json
          locked_at: string | null
          locked_by: string | null
          max_attempts: number
          model: string | null
          next_retry_at: string | null
          provider: string | null
          request_fingerprint: string
          requested_by: string
          result_json: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          completed_at?: string | null
          created_at?: string
          error_code?: string | null
          error_detail?: string | null
          id?: string
          input_json: Json
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          model?: string | null
          next_retry_at?: string | null
          provider?: string | null
          request_fingerprint: string
          requested_by: string
          result_json?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          completed_at?: string | null
          created_at?: string
          error_code?: string | null
          error_detail?: string | null
          id?: string
          input_json?: Json
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          model?: string | null
          next_retry_at?: string | null
          provider?: string | null
          request_fingerprint?: string
          requested_by?: string
          result_json?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_generation_attempts: {
        Row: {
          attempt_number: number
          cached_tokens: number | null
          created_at: string
          error_category: string | null
          error_detail: string | null
          finished_at: string | null
          http_status: number | null
          id: string
          input_tokens: number | null
          job_id: string
          latency_ms: number | null
          model: string | null
          output_tokens: number | null
          provider: string
          provider_request_id: string | null
          started_at: string
        }
        Insert: {
          attempt_number: number
          cached_tokens?: number | null
          created_at?: string
          error_category?: string | null
          error_detail?: string | null
          finished_at?: string | null
          http_status?: number | null
          id?: string
          input_tokens?: number | null
          job_id: string
          latency_ms?: number | null
          model?: string | null
          output_tokens?: number | null
          provider: string
          provider_request_id?: string | null
          started_at?: string
        }
        Update: {
          attempt_number?: number
          cached_tokens?: number | null
          created_at?: string
          error_category?: string | null
          error_detail?: string | null
          finished_at?: string | null
          http_status?: number | null
          id?: string
          input_tokens?: number | null
          job_id?: string
          latency_ms?: number | null
          model?: string | null
          output_tokens?: number | null
          provider?: string
          provider_request_id?: string | null
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_generation_attempts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "ai_content_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_generation_queue: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          job_type: string
          result_content: string | null
          status: string
          updated_at: string
          user_id: string
          user_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          job_type: string
          result_content?: string | null
          status?: string
          updated_at?: string
          user_id: string
          user_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          job_type?: string
          result_content?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      ai_insights: {
        Row: {
          created_at: string
          date: string
          id: string
          insight_data: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          insight_data: Json
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          insight_data?: Json
          user_id?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          audience_type: string | null
          content: string
          created_at: string | null
          date: string | null
          deleted_at: string | null
          id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          audience_type?: string | null
          content: string
          created_at?: string | null
          date?: string | null
          deleted_at?: string | null
          id?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          audience_type?: string | null
          content?: string
          created_at?: string | null
          date?: string | null
          deleted_at?: string | null
          id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      attendance: {
        Row: {
          created_at: string
          date: string
          deleted_at: string | null
          id: string
          notes: string | null
          official_at: string | null
          official_by: string | null
          official_status:
            | Database["public"]["Enums"]["attendance_status"]
            | null
          semester_id: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          teacher_id: string | null
          teacher_status:
            | Database["public"]["Enums"]["attendance_status"]
            | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          deleted_at?: string | null
          id?: string
          notes?: string | null
          official_at?: string | null
          official_by?: string | null
          official_status?:
            | Database["public"]["Enums"]["attendance_status"]
            | null
          semester_id?: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          teacher_id?: string | null
          teacher_status?:
            | Database["public"]["Enums"]["attendance_status"]
            | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          deleted_at?: string | null
          id?: string
          notes?: string | null
          official_at?: string | null
          official_by?: string | null
          official_status?:
            | Database["public"]["Enums"]["attendance_status"]
            | null
          semester_id?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
          teacher_id?: string | null
          teacher_status?:
            | Database["public"]["Enums"]["attendance_status"]
            | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_archive: {
        Row: {
          archived_at: string | null
          created_at: string
          date: string
          deleted_at: string | null
          id: string
          notes: string | null
          original_semester_id: string | null
          semester_id: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          date: string
          deleted_at?: string | null
          id?: string
          notes?: string | null
          original_semester_id?: string | null
          semester_id?: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          date?: string
          deleted_at?: string | null
          id?: string
          notes?: string | null
          original_semester_id?: string | null
          semester_id?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
          user_id?: string
        }
        Relationships: []
      }
      attitude_records: {
        Row: {
          assessment_name: string
          created_at: string
          deleted_at: string | null
          id: string
          notes: string | null
          semester_id: string | null
          social_description: string | null
          social_predicate: string | null
          spiritual_description: string | null
          spiritual_predicate: string | null
          student_id: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assessment_name?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          notes?: string | null
          semester_id?: string | null
          social_description?: string | null
          social_predicate?: string | null
          spiritual_description?: string | null
          spiritual_predicate?: string | null
          student_id: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          assessment_name?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          notes?: string | null
          semester_id?: string | null
          social_description?: string | null
          social_predicate?: string | null
          spiritual_description?: string | null
          spiritual_predicate?: string | null
          student_id?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attitude_records_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attitude_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          record_id: string
          session_id: string | null
          table_name: string
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          session_id?: string | null
          table_name: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          session_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      backup_runs: {
        Row: {
          backup_key: string | null
          completed_at: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          size_bytes: number | null
          started_at: string | null
          status: string | null
          tables_count: number | null
          total_rows: number | null
        }
        Insert: {
          backup_key?: string | null
          completed_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          size_bytes?: number | null
          started_at?: string | null
          status?: string | null
          tables_count?: number | null
          total_rows?: number | null
        }
        Update: {
          backup_key?: string | null
          completed_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          size_bytes?: number | null
          started_at?: string | null
          status?: string | null
          tables_count?: number | null
          total_rows?: number | null
        }
        Relationships: []
      }
      bintang_daily_observations: {
        Row: {
          aspect: string
          created_at: string
          date: string
          id: string
          is_positive: boolean
          observation: string
          student_id: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          aspect: string
          created_at?: string
          date: string
          id?: string
          is_positive?: boolean
          observation: string
          student_id: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          aspect?: string
          created_at?: string
          date?: string
          id?: string
          is_positive?: boolean
          observation?: string
          student_id?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bintang_daily_observations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      bintang_mentoring_logs: {
        Row: {
          created_at: string
          date: string
          id: string
          mentor_id: string
          mentor_role: string
          notes: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          mentor_id: string
          mentor_role: string
          notes: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          mentor_id?: string
          mentor_role?: string
          notes?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bintang_mentoring_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      bintang_monthly_evaluations: {
        Row: {
          adab_notes: string | null
          adab_score: string | null
          catatan_wali: string | null
          created_at: string
          evaluator_id: string
          id: string
          is_published: boolean
          kedisiplinan_notes: string | null
          kedisiplinan_score: string | null
          kerapian_notes: string | null
          kerapian_score: string | null
          month: string
          student_id: string
          updated_at: string
        }
        Insert: {
          adab_notes?: string | null
          adab_score?: string | null
          catatan_wali?: string | null
          created_at?: string
          evaluator_id: string
          id?: string
          is_published?: boolean
          kedisiplinan_notes?: string | null
          kedisiplinan_score?: string | null
          kerapian_notes?: string | null
          kerapian_score?: string | null
          month: string
          student_id: string
          updated_at?: string
        }
        Update: {
          adab_notes?: string | null
          adab_score?: string | null
          catatan_wali?: string | null
          created_at?: string
          evaluator_id?: string
          id?: string
          is_published?: boolean
          kedisiplinan_notes?: string | null
          kedisiplinan_score?: string | null
          kerapian_notes?: string | null
          kerapian_score?: string | null
          month?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bintang_monthly_evaluations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          academic_year: string | null
          created_at: string
          deleted_at: string | null
          grade_level: number | null
          id: string
          is_archived: boolean
          name: string
          updated_at: string | null
          user_id: string
          wali_kelas_id: string | null
        }
        Insert: {
          academic_year?: string | null
          created_at?: string
          deleted_at?: string | null
          grade_level?: number | null
          id?: string
          is_archived?: boolean
          name: string
          updated_at?: string | null
          user_id: string
          wali_kelas_id?: string | null
        }
        Update: {
          academic_year?: string | null
          created_at?: string
          deleted_at?: string | null
          grade_level?: number | null
          id?: string
          is_archived?: boolean
          name?: string
          updated_at?: string | null
          user_id?: string
          wali_kelas_id?: string | null
        }
        Relationships: []
      }
      communications: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          created_at: string
          deleted_at: string | null
          id: string
          is_read: boolean
          message: string
          parent_id: string | null
          sender: string
          student_id: string
          teacher_id: string | null
          user_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_read?: boolean
          message: string
          parent_id?: string | null
          sender: string
          student_id: string
          teacher_id?: string | null
          user_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_read?: boolean
          message?: string
          parent_id?: string | null
          sender?: string
          student_id?: string
          teacher_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "communications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      deletion_audit: {
        Row: {
          created_at: string
          deleted_at: string
          deleted_by: string | null
          deletion_type: string
          id: string
          record_id: string
          restored_at: string | null
          row_snapshot: Json | null
          table_name: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string
          deleted_by?: string | null
          deletion_type?: string
          id?: string
          record_id: string
          restored_at?: string | null
          row_snapshot?: Json | null
          table_name: string
        }
        Update: {
          created_at?: string
          deleted_at?: string
          deleted_by?: string | null
          deletion_type?: string
          id?: string
          record_id?: string
          restored_at?: string | null
          row_snapshot?: Json | null
          table_name?: string
        }
        Relationships: []
      }
      daily_input_log: {
        Row: {
          class_name: string
          created_at: string
          details: Json
          id: string
          mode: string
          sent: boolean
          student_count: number
          teacher_id: string
          teacher_name: string
        }
        Insert: {
          class_name?: string
          created_at?: string
          details?: Json
          id?: string
          mode: string
          sent?: boolean
          student_count?: number
          teacher_id: string
          teacher_name: string
        }
        Update: {
          class_name?: string
          created_at?: string
          details?: Json
          id?: string
          mode?: string
          sent?: boolean
          student_count?: number
          teacher_id?: string
          teacher_name?: string
        }
        Relationships: []
      }
      export_templates: {
        Row: {
          config: Json
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          config: Json
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      extracurricular_attendance: {
        Row: {
          created_at: string | null
          date: string
          deleted_at: string | null
          extracurricular_id: string | null
          extracurricular_student_id: string | null
          id: string
          notes: string | null
          semester_id: string | null
          status: string
          student_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          deleted_at?: string | null
          extracurricular_id?: string | null
          extracurricular_student_id?: string | null
          id?: string
          notes?: string | null
          semester_id?: string | null
          status: string
          student_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          deleted_at?: string | null
          extracurricular_id?: string | null
          extracurricular_student_id?: string | null
          id?: string
          notes?: string | null
          semester_id?: string | null
          status?: string
          student_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extracurricular_attendance_extracurricular_id_fkey"
            columns: ["extracurricular_id"]
            isOneToOne: false
            referencedRelation: "extracurriculars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracurricular_attendance_extracurricular_student_id_fkey"
            columns: ["extracurricular_student_id"]
            isOneToOne: false
            referencedRelation: "extracurricular_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracurricular_attendance_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracurricular_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      extracurricular_grades: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          description: string | null
          extracurricular_id: string | null
          extracurricular_student_id: string | null
          grade: string | null
          id: string
          notes: string | null
          score: number | null
          semester_id: string | null
          student_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          extracurricular_id?: string | null
          extracurricular_student_id?: string | null
          grade?: string | null
          id?: string
          notes?: string | null
          score?: number | null
          semester_id?: string | null
          student_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          extracurricular_id?: string | null
          extracurricular_student_id?: string | null
          grade?: string | null
          id?: string
          notes?: string | null
          score?: number | null
          semester_id?: string | null
          student_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extracurricular_grades_extracurricular_id_fkey"
            columns: ["extracurricular_id"]
            isOneToOne: false
            referencedRelation: "extracurriculars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracurricular_grades_extracurricular_student_id_fkey"
            columns: ["extracurricular_student_id"]
            isOneToOne: false
            referencedRelation: "extracurricular_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracurricular_grades_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracurricular_grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      extracurricular_students: {
        Row: {
          class_name: string | null
          created_at: string | null
          deleted_at: string | null
          gender: Database["public"]["Enums"]["gender_enum"] | null
          id: string
          name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          class_name?: string | null
          created_at?: string | null
          deleted_at?: string | null
          gender?: Database["public"]["Enums"]["gender_enum"] | null
          id?: string
          name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          class_name?: string | null
          created_at?: string | null
          deleted_at?: string | null
          gender?: Database["public"]["Enums"]["gender_enum"] | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      extracurriculars: {
        Row: {
          category: string | null
          coach_name: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          max_participants: number | null
          name: string
          schedule_day: string | null
          schedule_time: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          category?: string | null
          coach_name?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_participants?: number | null
          name: string
          schedule_day?: string | null
          schedule_time?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          category?: string | null
          coach_name?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_participants?: number | null
          name?: string
          schedule_day?: string | null
          schedule_time?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      homework: {
        Row: {
          class_id: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          due_date: string | null
          id: string
          subject: string
          teacher_id: string | null
          title: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          subject: string
          teacher_id?: string | null
          title: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          subject?: string
          teacher_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_notifications: {
        Row: {
          action_url: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      lesson_plans: {
        Row: {
          components: Json
          created_at: string | null
          curriculum_approach: string
          deleted_at: string | null
          document_type: string
          generated_content: string | null
          generation_method: string | null
          id: string
          identity: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          components: Json
          created_at?: string | null
          curriculum_approach: string
          deleted_at?: string | null
          document_type: string
          generated_content?: string | null
          generation_method?: string | null
          id?: string
          identity: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          components?: Json
          created_at?: string | null
          curriculum_approach?: string
          deleted_at?: string | null
          document_type?: string
          generated_content?: string | null
          generation_method?: string | null
          id?: string
          identity?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          is_active: boolean
          last_seen_at: string
          p256dh: string
          student_id: string | null
          updated_at: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          is_active?: boolean
          last_seen_at?: string
          p256dh: string
          student_id?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          is_active?: boolean
          last_seen_at?: string
          p256dh?: string
          student_id?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_points: {
        Row: {
          category: string | null
          created_at: string
          deleted_at: string | null
          id: string
          is_used: boolean | null
          max_points: number
          points: number
          quiz_date: string
          quiz_name: string
          semester_id: string | null
          student_id: string
          subject: string | null
          used_at: string | null
          used_for_subject: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_used?: boolean | null
          max_points: number
          points: number
          quiz_date: string
          quiz_name: string
          semester_id?: string | null
          student_id: string
          subject?: string | null
          used_at?: string | null
          used_for_subject?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_used?: boolean | null
          max_points?: number
          points?: number
          quiz_date?: string
          quiz_name?: string
          semester_id?: string | null
          student_id?: string
          subject?: string | null
          used_at?: string | null
          used_for_subject?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_points_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_points_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          action_type: string
          id: string
          request_count: number | null
          user_id: string
          window_start: string
        }
        Insert: {
          action_type: string
          id?: string
          request_count?: number | null
          user_id: string
          window_start?: string
        }
        Update: {
          action_type?: string
          id?: string
          request_count?: number | null
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      ref_bank_tp_iktp: {
        Row: {
          cp_id: string | null
          created_at: string | null
          id: string
          iktp: Json
          is_verified: boolean | null
          tujuan_pembelajaran: string
          updated_at: string | null
        }
        Insert: {
          cp_id?: string | null
          created_at?: string | null
          id?: string
          iktp?: Json
          is_verified?: boolean | null
          tujuan_pembelajaran: string
          updated_at?: string | null
        }
        Update: {
          cp_id?: string | null
          created_at?: string | null
          id?: string
          iktp?: Json
          is_verified?: boolean | null
          tujuan_pembelajaran?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ref_bank_tp_iktp_cp_id_fkey"
            columns: ["cp_id"]
            isOneToOne: false
            referencedRelation: "ref_capaian_pembelajaran"
            referencedColumns: ["id"]
          },
        ]
      }
      ref_boilerplate_topik: {
        Row: {
          ai_dynamic_content: Json | null
          content_status: string | null
          content_version: number
          created_at: string | null
          daftar_pustaka: Json
          fase: string | null
          generated_by_model: string | null
          generated_by_provider: string | null
          generation_metadata: Json
          id: string
          is_verified: boolean | null
          konten_json: Json | null
          lkpd_tugas: string
          mata_pelajaran: string
          pemahaman_bermakna: Json
          pengayaan: Json
          pertanyaan_pemantik: Json
          prompt_version: string | null
          quality_score: number | null
          remedial: Json
          request_fingerprint: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          soal_evaluasi: string
          sumber_regulasi: string | null
          topik: string
          tujuan_pembelajaran: Json
          updated_at: string | null
        }
        Insert: {
          ai_dynamic_content?: Json | null
          content_status?: string | null
          content_version?: number
          created_at?: string | null
          daftar_pustaka?: Json
          fase?: string | null
          generated_by_model?: string | null
          generated_by_provider?: string | null
          generation_metadata?: Json
          id?: string
          is_verified?: boolean | null
          konten_json?: Json | null
          lkpd_tugas: string
          mata_pelajaran: string
          pemahaman_bermakna?: Json
          pengayaan?: Json
          pertanyaan_pemantik?: Json
          prompt_version?: string | null
          quality_score?: number | null
          remedial?: Json
          request_fingerprint?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          soal_evaluasi: string
          sumber_regulasi?: string | null
          topik: string
          tujuan_pembelajaran?: Json
          updated_at?: string | null
        }
        Update: {
          ai_dynamic_content?: Json | null
          content_status?: string | null
          content_version?: number
          created_at?: string | null
          daftar_pustaka?: Json
          fase?: string | null
          generated_by_model?: string | null
          generated_by_provider?: string | null
          generation_metadata?: Json
          id?: string
          is_verified?: boolean | null
          konten_json?: Json | null
          lkpd_tugas?: string
          mata_pelajaran?: string
          pemahaman_bermakna?: Json
          pengayaan?: Json
          pertanyaan_pemantik?: Json
          prompt_version?: string | null
          quality_score?: number | null
          remedial?: Json
          request_fingerprint?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          soal_evaluasi?: string
          sumber_regulasi?: string | null
          topik?: string
          tujuan_pembelajaran?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      ref_capaian_pembelajaran: {
        Row: {
          created_at: string | null
          deskripsi_cp: string
          elemen: string | null
          fase: string
          id: string
          mata_pelajaran: string
        }
        Insert: {
          created_at?: string | null
          deskripsi_cp: string
          elemen?: string | null
          fase: string
          id?: string
          mata_pelajaran: string
        }
        Update: {
          created_at?: string | null
          deskripsi_cp?: string
          elemen?: string | null
          fase?: string
          id?: string
          mata_pelajaran?: string
        }
        Relationships: []
      }
      ref_materi_insersi: {
        Row: {
          created_at: string | null
          frasa_tp: string
          id: string
          konteks_penggunaan: string
          konten: string
          tema_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          frasa_tp: string
          id?: string
          konteks_penggunaan: string
          konten: string
          tema_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          frasa_tp?: string
          id?: string
          konteks_penggunaan?: string
          konten?: string
          tema_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ref_materi_insersi_tema_id_fkey"
            columns: ["tema_id"]
            isOneToOne: false
            referencedRelation: "ref_tema_kbc"
            referencedColumns: ["id"]
          },
        ]
      }
      ref_model_pembelajaran: {
        Row: {
          created_at: string | null
          id: string
          nama_model: string
          sintaks_inti: Json
          sintaks_pendahuluan: Json
          sintaks_penutup: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          nama_model: string
          sintaks_inti?: Json
          sintaks_pendahuluan?: Json
          sintaks_penutup?: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          nama_model?: string
          sintaks_inti?: Json
          sintaks_pendahuluan?: Json
          sintaks_penutup?: Json
        }
        Relationships: []
      }
      ref_rubrik_template: {
        Row: {
          baik: string
          created_at: string | null
          cukup: string
          id: string
          kategori: string
          kriteria: string
          perlu_bimbingan: string
          sangat_baik: string
          updated_at: string | null
          urutan: number
        }
        Insert: {
          baik: string
          created_at?: string | null
          cukup: string
          id?: string
          kategori: string
          kriteria: string
          perlu_bimbingan: string
          sangat_baik: string
          updated_at?: string | null
          urutan: number
        }
        Update: {
          baik?: string
          created_at?: string | null
          cukup?: string
          id?: string
          kategori?: string
          kriteria?: string
          perlu_bimbingan?: string
          sangat_baik?: string
          updated_at?: string | null
          urutan?: number
        }
        Relationships: []
      }
      ref_sintaks_kegiatan: {
        Row: {
          created_at: string | null
          estimasi_menit_persen: number
          id: string
          kegiatan_guru: string
          kegiatan_siswa: string
          model_id: string | null
          nama_langkah: string
          updated_at: string | null
          urutan: number
        }
        Insert: {
          created_at?: string | null
          estimasi_menit_persen?: number
          id?: string
          kegiatan_guru: string
          kegiatan_siswa: string
          model_id?: string | null
          nama_langkah: string
          updated_at?: string | null
          urutan: number
        }
        Update: {
          created_at?: string | null
          estimasi_menit_persen?: number
          id?: string
          kegiatan_guru?: string
          kegiatan_siswa?: string
          model_id?: string | null
          nama_langkah?: string
          updated_at?: string | null
          urutan?: number
        }
        Relationships: [
          {
            foreignKeyName: "ref_sintaks_kegiatan_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "ref_model_pembelajaran"
            referencedColumns: ["id"]
          },
        ]
      }
      ref_subject_alias: {
        Row: {
          alias: string
          canonical: string
          created_at: string
        }
        Insert: {
          alias: string
          canonical: string
          created_at?: string
        }
        Update: {
          alias?: string
          canonical?: string
          created_at?: string
        }
        Relationships: []
      }
      ref_tema_kbc: {
        Row: {
          created_at: string | null
          deskripsi: string | null
          id: string
          nama_tema: string
          urutan: number
        }
        Insert: {
          created_at?: string | null
          deskripsi?: string | null
          id: string
          nama_tema: string
          urutan?: number
        }
        Update: {
          created_at?: string | null
          deskripsi?: string | null
          id?: string
          nama_tema?: string
          urutan?: number
        }
        Relationships: []
      }
      reports: {
        Row: {
          attachment_url: string | null
          category: string | null
          created_at: string
          date: string
          deleted_at: string | null
          id: string
          notes: string
          student_id: string
          tags: string[] | null
          title: string
          user_id: string
        }
        Insert: {
          attachment_url?: string | null
          category?: string | null
          created_at?: string
          date: string
          deleted_at?: string | null
          id?: string
          notes: string
          student_id: string
          tags?: string[] | null
          title: string
          user_id: string
        }
        Update: {
          attachment_url?: string | null
          category?: string | null
          created_at?: string
          date?: string
          deleted_at?: string | null
          id?: string
          notes?: string
          student_id?: string
          tags?: string[] | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          class_id: string
          created_at: string
          day: Database["public"]["Enums"]["day_of_week"]
          deleted_at: string | null
          end_time: string
          id: string
          reminded: boolean | null
          room: string | null
          start_time: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          day: Database["public"]["Enums"]["day_of_week"]
          deleted_at?: string | null
          end_time: string
          id?: string
          reminded?: boolean | null
          room?: string | null
          start_time: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          day?: Database["public"]["Enums"]["day_of_week"]
          deleted_at?: string | null
          end_time?: string
          id?: string
          reminded?: boolean | null
          room?: string | null
          start_time?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      school_info: {
        Row: {
          academic_year: string
          created_at: string | null
          deleted_at: string | null
          id: string
          logo_url: string | null
          principal_name: string | null
          principal_nip: string | null
          school_address: string | null
          school_email: string | null
          school_name: string
          school_phone: string | null
          semester: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          academic_year?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          logo_url?: string | null
          principal_name?: string | null
          principal_nip?: string | null
          school_address?: string | null
          school_email?: string | null
          school_name: string
          school_phone?: string | null
          semester?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          academic_year?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          logo_url?: string | null
          principal_name?: string | null
          principal_nip?: string | null
          school_address?: string | null
          school_email?: string | null
          school_name?: string
          school_phone?: string | null
          semester?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      semesters: {
        Row: {
          academic_year_id: string | null
          created_at: string | null
          deleted_at: string | null
          end_date: string
          id: string
          is_active: boolean | null
          is_locked: boolean | null
          name: string
          semester_number: number
          start_date: string
          user_id: string | null
        }
        Insert: {
          academic_year_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          is_locked?: boolean | null
          name: string
          semester_number: number
          start_date: string
          user_id?: string | null
        }
        Update: {
          academic_year_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          is_locked?: boolean | null
          name?: string
          semester_number?: number
          start_date?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "semesters_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_usage_snapshots: {
        Row: {
          created_at: string | null
          folder: string
          id: string
          object_count: number | null
          snapshot_date: string | null
          total_size_bytes: number | null
        }
        Insert: {
          created_at?: string | null
          folder: string
          id?: string
          object_count?: number | null
          snapshot_date?: string | null
          total_size_bytes?: number | null
        }
        Update: {
          created_at?: string | null
          folder?: string
          id?: string
          object_count?: number | null
          snapshot_date?: string | null
          total_size_bytes?: number | null
        }
        Relationships: []
      }
      student_achievements: {
        Row: {
          category: string
          certificate_name: string | null
          certificate_url: string | null
          created_at: string
          date: string
          deleted_at: string | null
          description: string | null
          id: string
          level: string
          organizer: string | null
          points: number | null
          rank: string | null
          semester_id: string | null
          student_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          certificate_name?: string | null
          certificate_url?: string | null
          created_at?: string
          date: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          level?: string
          organizer?: string | null
          points?: number | null
          rank?: string | null
          semester_id?: string | null
          student_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          certificate_name?: string | null
          certificate_url?: string | null
          created_at?: string
          date?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          level?: string
          organizer?: string | null
          points?: number | null
          rank?: string | null
          semester_id?: string | null
          student_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_achievements_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_achievements_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_development_analyses: {
        Row: {
          academic_year_id: string | null
          analysis_data: Json
          created_at: string
          deleted_at: string | null
          generated_by: string
          id: string
          semester_id: string | null
          student_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          academic_year_id?: string | null
          analysis_data: Json
          created_at?: string
          deleted_at?: string | null
          generated_by: string
          id?: string
          semester_id?: string | null
          student_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          academic_year_id?: string | null
          analysis_data?: Json
          created_at?: string
          deleted_at?: string | null
          generated_by?: string
          id?: string
          semester_id?: string | null
          student_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_development_analyses_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_development_analyses_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_development_analyses_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_extracurriculars: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          extracurricular_id: string | null
          extracurricular_student_id: string | null
          id: string
          joined_at: string | null
          semester_id: string | null
          status: string | null
          student_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          extracurricular_id?: string | null
          extracurricular_student_id?: string | null
          id?: string
          joined_at?: string | null
          semester_id?: string | null
          status?: string | null
          student_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          extracurricular_id?: string | null
          extracurricular_student_id?: string | null
          id?: string
          joined_at?: string | null
          semester_id?: string | null
          status?: string | null
          student_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_extracurriculars_extracurricular_id_fkey"
            columns: ["extracurricular_id"]
            isOneToOne: false
            referencedRelation: "extracurriculars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_extracurriculars_extracurricular_student_id_fkey"
            columns: ["extracurricular_student_id"]
            isOneToOne: false
            referencedRelation: "extracurricular_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_extracurriculars_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_extracurriculars_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          access_code: string | null
          avatar_url: string | null
          class_id: string
          created_at: string
          deleted_at: string | null
          gender: Database["public"]["Enums"]["gender_enum"]
          id: string
          name: string
          parent_name: string | null
          parent_phone: string | null
          user_id: string
        }
        Insert: {
          access_code?: string | null
          avatar_url?: string | null
          class_id: string
          created_at?: string
          deleted_at?: string | null
          gender?: Database["public"]["Enums"]["gender_enum"]
          id?: string
          name: string
          parent_name?: string | null
          parent_phone?: string | null
          user_id: string
        }
        Update: {
          access_code?: string | null
          avatar_url?: string | null
          class_id?: string
          created_at?: string
          deleted_at?: string | null
          gender?: Database["public"]["Enums"]["gender_enum"]
          id?: string
          name?: string
          parent_name?: string | null
          parent_phone?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          class_id: string | null
          completed: boolean
          created_at: string
          deleted_at: string | null
          description: string | null
          due_date: string | null
          id: string
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          class_id?: string | null
          completed?: boolean
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          class_id?: string | null
          completed?: boolean
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_class_assignments: {
        Row: {
          assignment_role: string
          class_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          notes: string | null
          semester_id: string
          subject_name: string | null
          teacher_user_id: string
          updated_at: string
        }
        Insert: {
          assignment_role: string
          class_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          notes?: string | null
          semester_id: string
          subject_name?: string | null
          teacher_user_id: string
          updated_at?: string
        }
        Update: {
          assignment_role?: string
          class_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          notes?: string | null
          semester_id?: string
          subject_name?: string | null
          teacher_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_class_assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_class_assignments_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      teaching_journals: {
        Row: {
          activities: string | null
          attachment_url: string | null
          class_id: string | null
          created_at: string
          date: string
          id: string
          meeting_number: number | null
          notes: string | null
          objectives: string | null
          schedule_id: string | null
          subject: string
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activities?: string | null
          attachment_url?: string | null
          class_id?: string | null
          created_at?: string
          date: string
          id?: string
          meeting_number?: number | null
          notes?: string | null
          objectives?: string | null
          schedule_id?: string | null
          subject: string
          topic: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activities?: string | null
          attachment_url?: string | null
          class_id?: string | null
          created_at?: string
          date?: string
          id?: string
          meeting_number?: number | null
          notes?: string | null
          objectives?: string | null
          schedule_id?: string | null
          subject?: string
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teaching_journals_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teaching_journals_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_approved: boolean
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_approved?: boolean
          role: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_approved?: boolean
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          fonnte_config: Json | null
          school_name: string | null
          semester_1_locked: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          fonnte_config?: Json | null
          school_name?: string | null
          semester_1_locked?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          fonnte_config?: Json | null
          school_name?: string | null
          semester_1_locked?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      violations: {
        Row: {
          context_notes: string | null
          created_at: string
          date: string
          deleted_at: string | null
          description: string
          evidence_url: string | null
          follow_up_notes: string | null
          follow_up_status: string | null
          id: string
          parent_notified: boolean | null
          parent_notified_at: string | null
          points: number
          semester_id: string | null
          severity: string | null
          student_id: string
          type: string | null
          user_id: string
        }
        Insert: {
          context_notes?: string | null
          created_at?: string
          date: string
          deleted_at?: string | null
          description: string
          evidence_url?: string | null
          follow_up_notes?: string | null
          follow_up_status?: string | null
          id?: string
          parent_notified?: boolean | null
          parent_notified_at?: string | null
          points: number
          semester_id?: string | null
          severity?: string | null
          student_id: string
          type?: string | null
          user_id: string
        }
        Update: {
          context_notes?: string | null
          created_at?: string
          date?: string
          deleted_at?: string | null
          description?: string
          evidence_url?: string | null
          follow_up_notes?: string | null
          follow_up_status?: string | null
          id?: string
          parent_notified?: boolean | null
          parent_notified_at?: string | null
          points?: number
          semester_id?: string | null
          severity?: string | null
          student_id?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "violations_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "violations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_semester: {
        Args: { p_semester_id: string; p_year_id: string }
        Returns: undefined
      }
      apply_quiz_points_to_grade: {
        Args: {
          student_id_param: string
          subject_param: string
          user_id_param: string
        }
        Returns: undefined
      }
      bulk_insert_grades: {
        Args: { p_grades: Json; p_teacher_id: string }
        Returns: Json
      }
      can_access_student_behavior_record: {
        Args: { p_semester_id: string; p_student_id: string; p_user_id: string }
        Returns: boolean
      }
      can_access_student_grade_record: {
        Args: {
          p_semester_id: string
          p_student_id: string
          p_subject?: string
          p_user_id: string
        }
        Returns: boolean
      }
      can_access_student_roster: {
        Args: { p_class_id: string; p_user_id: string }
        Returns: boolean
      }
      check_rate_limit: {
        Args: {
          p_action_type: string
          p_max_requests?: number
          p_user_id: string
          p_window_minutes?: number
        }
        Returns: boolean
      }
      cleanup_old_rate_limits: { Args: never; Returns: number }
      debug_student_verification: {
        Args: { access_code_param: string; student_id_param: string }
        Returns: {
          input_access_code: string
          input_student_id: string
          matched: boolean
          stored_access_code: string
          stored_id: string
        }[]
      }
      delete_parent_message: {
        Args: {
          access_code_param: string
          message_id_param: string
          student_id_param: string
        }
        Returns: undefined
      }
      delete_user_account: { Args: never; Returns: undefined }
      enqueue_modul_ajar_ai_job: {
        Args: { p_input_json: Json; p_request_fingerprint: string }
        Returns: {
          attempt_count: number
          completed_at: string | null
          created_at: string
          error_code: string | null
          error_detail: string | null
          id: string
          input_json: Json
          locked_at: string | null
          locked_by: string | null
          max_attempts: number
          model: string | null
          next_retry_at: string | null
          provider: string | null
          request_fingerprint: string
          requested_by: string
          result_json: Json | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "ai_content_jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_active_classes: {
        Args: never
        Returns: {
          id: string
          name: string
          user_id: string
        }[]
      }
      get_attendance_status: {
        Args: { p_date: string; p_student_id: string }
        Returns: Database["public"]["Enums"]["attendance_status"]
      }
      get_backup_runs: {
        Args: { p_limit?: number }
        Returns: {
          backup_key: string
          completed_at: string
          error_message: string
          id: string
          size_bytes: number
          started_at: string
          status: string
          tables_count: number
          total_rows: number
        }[]
      }
      get_daily_attendance_summary: {
        Args: { for_date: string }
        Returns: {
          absent_percentage: number
          permission_percentage: number
          present_percentage: number
          sick_percentage: number
        }[]
      }
      get_fonnte_config: { Args: never; Returns: Json }
      get_app_config: { Args: { p_key: string }; Returns: string }
      set_app_config: { Args: { p_key: string; p_value: string }; Returns: undefined }
      get_parent_subscription_status: {
        Args: {
          p_access_code: string
          p_endpoint: string
          p_student_id: string
        }
        Returns: Json
      }
      get_semester_id_for_date: {
        Args: { check_date: string }
        Returns: string
      }
      get_student_directory: {
        Args: never
        Returns: {
          class_id: string
          class_name: string
          id: string
          name: string
        }[]
      }
      get_student_portal_data: {
        Args: { access_code_param: string; student_id_param: string }
        Returns: {
          academicRecords: Json
          achievements: Json
          announcements: Json
          attendanceRecords: Json
          communications: Json
          quizPoints: Json
          reports: Json
          schedules: Json
          student: Json
          tasks: Json
          teacher: Json
          violations: Json
        }[]
      }
      get_student_portal_data_v1: {
        Args: { access_code_param: string; student_id_param: string }
        Returns: {
          academicRecords: Json[]
          attendanceRecords: Json[]
          communications: Json[]
          quizPoints: Json[]
          reports: Json[]
          student: Json
          teacher: Json
          violations: Json[]
        }[]
      }
      get_student_portal_data_v2:
        | {
            Args: { access_code_param: string; student_id_param: string }
            Returns: {
              academic_records: Json
              attendance_records: Json
              class_name: string
              class_rank: number
              class_total_students: number
              communications: Json
              quiz_points: Json
              reports: Json
              schedules: Json
              student_access_code: string
              student_avatar_url: string
              student_class_id: string
              student_created_at: string
              student_gender: string
              student_id: string
              student_name: string
              student_nis: string
              violations: Json
            }[]
          }
        | {
            Args: { access_code_param: string; student_id_param: string }
            Returns: {
              academicRecords: Json[]
              attendanceRecords: Json[]
              communications: Json[]
              quizPoints: Json[]
              reports: Json[]
              student: Json
              teacher: Json
              violations: Json[]
            }[]
          }
      get_student_portal_data_v3: {
        Args: { access_code_param: string; student_id_param: string }
        Returns: {
          academicRecords: Json[]
          attendanceRecords: Json[]
          communications: Json[]
          quizPoints: Json[]
          reports: Json[]
          student: Json
          teacher: Json
          violations: Json[]
        }[]
      }
      get_user_role: { Args: { p_user_id: string }; Returns: string }
      get_weekly_attendance_summary:
        | {
            Args: never
            Returns: {
              day: string
              present_percentage: number
            }[]
          }
        | {
            Args: {
              p_end_date: string
              p_start_date: string
              p_user_id: string
            }
            Returns: {
              student_id: string
              student_name: string
              total_absent: number
              total_classes: number
              total_late: number
              total_present: number
            }[]
          }
      global_search: {
        Args: { search_term: string }
        Returns: {
          description: string
          id: string
          path: string
          title: string
          type: string
        }[]
      }
      has_global_access: { Args: { p_user_id: string }; Returns: boolean }
      has_teacher_class_assignment: {
        Args: {
          p_class_id: string
          p_roles?: string[]
          p_semester_id?: string
          p_subject?: string
          p_user_id: string
        }
        Returns: boolean
      }
      invoke_dispatch_push_instant: {
        Args: { p_event_type: string; p_payload: Json; p_student_id: string }
        Returns: undefined
      }
      invoke_scheduled_backup: { Args: never; Returns: undefined }
      is_admin_user: { Args: { p_user_id: string }; Returns: boolean }
      is_leadership: { Args: { p_user_id: string }; Returns: boolean }
      mark_accessible_communications_read: {
        Args: { p_message_ids: string[] }
        Returns: number
      }
      portal_validate_access_code: {
        Args: { p_code: string }
        Returns: {
          access_code: string
          id: string
        }[]
      }
      send_parent_message: {
        Args: {
          access_code_param: string
          message_param: string
          student_id_param: string
          teacher_user_id_param: string
        }
        Returns: undefined
      }
      subscribe_parent: {
        Args: {
          p_access_code: string
          p_auth: string
          p_endpoint: string
          p_p256dh: string
          p_student_id: string
          p_user_agent: string
        }
        Returns: Json
      }
      sync_users_to_roles: { Args: never; Returns: undefined }
      unsubscribe_parent: {
        Args: {
          p_access_code: string
          p_endpoint: string
          p_student_id: string
        }
        Returns: Json
      }
      update_accessible_violation_follow_up: {
        Args: {
          p_notes?: string
          p_parent_notified?: boolean
          p_parent_notified_at?: string
          p_status?: string
          p_violation_id: string
        }
        Returns: boolean
      }
      update_grade_with_version: {
        Args: {
          p_expected_version: number
          p_notes: string
          p_record_id: string
          p_score: number
        }
        Returns: Json
      }
      update_parent_info: {
        Args: {
          access_code_param: string
          new_parent_name: string
          new_parent_phone: string
          student_id_param: string
        }
        Returns: boolean
      }
      update_parent_message: {
        Args: {
          access_code_param: string
          message_id_param: string
          new_message_param: string
          student_id_param: string
        }
        Returns: undefined
      }
      upsert_extracurricular_attendance: {
        Args: { p_items: Json; p_user_id: string }
        Returns: undefined
      }
      validate_grade_input: {
        Args: {
          p_assessment_name: string
          p_score: number
          p_student_id: string
          p_subject: string
        }
        Returns: Json
      }
      verify_access_code: {
        Args: { access_code_param: string }
        Returns: {
          access_code: string
          id: string
        }[]
      }
      verify_parent_portal_setup: { Args: never; Returns: string }
    }
    Enums: {
      attendance_status: "Hadir" | "Izin" | "Sakit" | "Alpha" | "Libur"
      day_of_week:
        | "Senin"
        | "Selasa"
        | "Rabu"
        | "Kamis"
        | "Jumat"
        | "Sabtu"
        | "Minggu"
      gender_enum: "Laki-laki" | "Perempuan"
      task_status: "todo" | "in_progress" | "done"
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
      attendance_status: ["Hadir", "Izin", "Sakit", "Alpha", "Libur"],
      day_of_week: [
        "Senin",
        "Selasa",
        "Rabu",
        "Kamis",
        "Jumat",
        "Sabtu",
        "Minggu",
      ],
      gender_enum: ["Laki-laki", "Perempuan"],
      task_status: ["todo", "in_progress", "done"],
    },
  },
} as const
