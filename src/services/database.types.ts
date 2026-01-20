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
          created_at: string
          end_date: string
          id: string
          is_active: boolean
          name: string
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          is_active?: boolean
          name: string
          start_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          is_active?: boolean
          name?: string
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          audience_type: string | null
          content: string
          created_at: string
          date: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          audience_type?: string | null
          content: string
          created_at?: string
          date?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          audience_type?: string | null
          content?: string
          created_at?: string
          date?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          created_at: string
          date: string
          id: string
          notes: string | null
          semester_id: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          semester_id?: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          semester_id?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_student_id_fkey"
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
          ip_address: string | null
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
          ip_address?: string | null
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
          ip_address?: string | null
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
      schedules: {
        Row: {
          class_id: string | null
          created_at: string
          day: string
          end_time: string
          id: string
          room: string | null
          start_time: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          day: string
          end_time: string
          id?: string
          room?: string | null
          start_time: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          day?: string
          end_time?: string
          id?: string
          room?: string | null
          start_time?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_schedules_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          academic_year: string
          created_at: string
          grade_level: number
          id: string
          name: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          academic_year: string
          created_at?: string
          grade_level: number
          id?: string
          name: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          academic_year?: string
          created_at?: string
          grade_level?: number
          id?: string
          name?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      extracurriculars: {
        Row: {
          category: string | null
          coach_name: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          max_participants: number
          name: string
          schedule_day: string | null
          schedule_time: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          coach_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_participants?: number
          name: string
          schedule_day?: string | null
          schedule_time?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          coach_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_participants?: number
          name?: string
          schedule_day?: string | null
          schedule_time?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      student_extracurriculars: {
        Row: {
          created_at: string
          extracurricular_id: string
          extracurricular_student_id: string | null
          id: string
          joined_at: string
          semester_id: string
          status: string
          student_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          extracurricular_id: string
          extracurricular_student_id?: string | null
          id?: string
          joined_at?: string
          semester_id: string
          status?: string
          student_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          extracurricular_id?: string
          extracurricular_student_id?: string | null
          id?: string
          joined_at?: string
          semester_id?: string
          status?: string
          student_id?: string | null
          user_id?: string
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
      extracurricular_attendance: {
        Row: {
          created_at: string
          date: string
          extracurricular_id: string
          extracurricular_student_id: string | null
          id: string
          notes: string | null
          semester_id: string | null
          status: string
          student_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          extracurricular_id: string
          extracurricular_student_id?: string | null
          id?: string
          notes?: string | null
          semester_id?: string | null
          status: string
          student_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          extracurricular_id?: string
          extracurricular_student_id?: string | null
          id?: string
          notes?: string | null
          semester_id?: string | null
          status?: string
          student_id?: string | null
          user_id?: string
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
          created_at: string
          description: string | null
          extracurricular_id: string
          extracurricular_student_id: string | null
          grade: string
          id: string
          semester_id: string
          student_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          extracurricular_id: string
          extracurricular_student_id?: string | null
          grade: string
          id?: string
          semester_id: string
          student_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          extracurricular_id?: string
          extracurricular_student_id?: string | null
          grade?: string
          id?: string
          semester_id?: string
          student_id?: string | null
          updated_at?: string
          user_id?: string
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
          created_at: string
          gender: Database["public"]["Enums"]["gender_enum"]
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          class_name?: string | null
          created_at?: string
          gender?: Database["public"]["Enums"]["gender_enum"]
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          class_name?: string | null
          created_at?: string
          gender?: Database["public"]["Enums"]["gender_enum"]
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      parent_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          parent_id: string
          sender: string
          student_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          parent_id: string
          sender: string
          student_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          parent_id?: string
          sender?: string
          student_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_messages_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_students: {
        Row: {
          access_code: string
          created_at: string | null
          id: string
          parent_email: string
          parent_name: string
          parent_phone: string
          student_id: string
          user_id: string
        }
        Insert: {
          access_code: string
          created_at?: string | null
          id?: string
          parent_email: string
          parent_name: string
          parent_phone: string
          student_id: string
          user_id: string
        }
        Update: {
          access_code?: string
          created_at?: string | null
          id?: string
          parent_email?: string
          parent_name?: string
          parent_phone?: string
          student_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_students_student_id_fkey"
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
          id: string
          is_used: boolean | null
          max_points: number
          points: number
          quiz_date: string
          quiz_name: string
          semester_id: string | null
          student_id: string
          subject: string
          used_at: string | null
          used_for_subject: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          is_used?: boolean | null
          max_points?: number
          points: number
          quiz_date: string
          quiz_name: string
          semester_id?: string | null
          student_id: string
          subject: string
          used_at?: string | null
          used_for_subject?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          is_used?: boolean | null
          max_points?: number
          points?: number
          quiz_date?: string
          quiz_name?: string
          semester_id?: string | null
          student_id?: string
          subject?: string
          used_at?: string | null
          used_for_subject?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_points_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_scores: {
        Row: {
          created_at: string
          id: string
          quiz_title: string
          score: number
          student_id: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          quiz_title: string
          score: number
          student_id: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          quiz_title?: string
          score?: number
          student_id?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_scores_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          attachment_url: string | null
          category: string | null
          created_at: string
          date: string
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
      semesters: {
        Row: {
          academic_year_id: string
          created_at: string
          end_date: string
          id: string
          is_active: boolean
          is_locked: boolean
          name: string
          semester_number: number
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          academic_year_id: string
          created_at?: string
          end_date: string
          id?: string
          is_active?: boolean
          is_locked?: boolean
          name: string
          semester_number: number
          start_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          academic_year_id?: string
          created_at?: string
          end_date?: string
          id?: string
          is_active?: boolean
          is_locked?: boolean
          name?: string
          semester_number?: number
          start_date?: string
          updated_at?: string
          user_id?: string
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
      storage_files: {
        Row: {
          bucket_id: string
          created_at: string | null
          file_name: string
          id: string
          owner_id: string
          public_url: string
          size: number
          type: string
        }
        Insert: {
          bucket_id: string
          created_at?: string | null
          file_name: string
          id?: string
          owner_id: string
          public_url: string
          size: number
          type: string
        }
        Update: {
          bucket_id?: string
          created_at?: string | null
          file_name?: string
          id?: string
          owner_id?: string
          public_url?: string
          size?: number
          type?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          address: string
          class: string
          class_id: string | null
          contact: string
          created_at: string | null
          date_of_birth: string
          email: string
          gender: Database["public"]["Enums"]["gender_enum"]
          guardian_name: string
          id: string
          name: string
          nis: string
          nisn: string
          photo_url: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address: string
          class: string
          class_id?: string | null
          contact: string
          created_at?: string | null
          date_of_birth: string
          email: string
          gender: Database["public"]["Enums"]["gender_enum"]
          guardian_name: string
          id?: string
          name: string
          nis: string
          nisn: string
          photo_url: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string
          class?: string
          class_id?: string | null
          contact?: string
          created_at?: string | null
          date_of_birth?: string
          email?: string
          gender?: Database["public"]["Enums"]["gender_enum"]
          guardian_name?: string
          id?: string
          name?: string
          nis?: string
          nisn?: string
          photo_url?: string
          status?: string
          updated_at?: string | null
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
          completed: boolean
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          school_name: string | null
          semester_1_locked: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          school_name?: string | null
          semester_1_locked?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          school_name?: string | null
          semester_1_locked?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      violations: {
        Row: {
          created_at: string
          date: string
          description: string
          id: string
          points: number
          student_id: string
          teacher_id: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          date?: string
          description: string
          id?: string
          points: number
          student_id: string
          teacher_id: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          description?: string
          id?: string
          points?: number
          student_id?: string
          teacher_id?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
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
        Args: {
          p_semester_id: string
          p_year_id: string
        }
        Returns: undefined
      }
      bulk_insert_grades: {
        Args: {
          p_grades: Json
          p_teacher_id: string
        }
        Returns: Json
      }
      check_rate_limit: {
        Args: {
          p_user_id: string
          p_action_type: string
          p_max_requests?: number
          p_window_minutes?: number
        }
        Returns: boolean
      }
      check_student_access: {
        Args: {
          p_email: string
          p_access_code: string
        }
        Returns: {
          valid: boolean
          student_id: string | null
          student_name: string | null
        }[]
      }
      cleanup_old_rate_limits: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      delete_parent_message: {
        Args: {
          message_id: string
          parent_email: string
          access_code: string
        }
        Returns: boolean
      }
      get_student_portal_data: {
        Args: {
          p_student_id: string
        }
        Returns: Json
      }
      handle_updated_at: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      log_audit_event: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      send_parent_message: {
        Args: {
          p_student_id: string
          p_parent_email: string
          p_access_code: string
          p_content: string
        }
        Returns: string
      }
      update_grade_with_version: {
        Args: {
          p_record_id: string
          p_score: number
          p_notes: string
          p_expected_version: number
        }
        Returns: Json
      }
      update_parent_info: {
        Args: {
          p_student_id: string
          p_old_email: string
          p_access_code: string
          p_new_email: string
          p_new_phone: string
        }
        Returns: boolean
      }
      update_parent_message: {
        Args: {
          message_id: string
          p_content: string
          parent_email: string
          access_code: string
        }
        Returns: boolean
      }
      upsert_extracurricular_attendance: {
        Args: {
          p_items: Json
          p_user_id: string
        }
        Returns: undefined
      }
      validate_grade_input: {
        Args: {
          p_student_id: string
          p_subject: string
          p_score: number
          p_assessment_name: string
        }
        Returns: Json
      }
      verify_access_code: {
        Args: {
          p_email: string
          p_access_code: string
        }
        Returns: boolean
      }
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
  | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof (Database[PublicTableNameOrOptions["schema"]] extends { Tables: infer T; Views: infer V } ? T & V : never)
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]] extends { Tables: infer T; Views: infer V } ? T & V : never)[TableName] extends {
    Row: infer R
  }
  ? R
  : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
    PublicSchema["Views"])
  ? (PublicSchema["Tables"] &
    PublicSchema["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
  | keyof PublicSchema["Tables"]
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof (Database[PublicTableNameOrOptions["schema"]] extends { Tables: infer T } ? T : never)
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]] extends { Tables: infer T } ? T : never)[TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
  | keyof PublicSchema["Tables"]
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof (Database[PublicTableNameOrOptions["schema"]] extends { Tables: infer T } ? T : never)
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]] extends { Tables: infer T } ? T : never)[TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
  | keyof PublicSchema["Enums"]
  | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
  ? keyof (Database[DefaultSchemaEnumNameOrOptions["schema"]] extends { Enums: infer E } ? E : never)
  : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaEnumNameOrOptions["schema"]] extends { Enums: infer E } ? E : never)[EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof PublicSchema["Enums"]
  ? PublicSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof PublicSchema["CompositeTypes"]
  | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
  ? keyof (Database[PublicCompositeTypeNameOrOptions["schema"]] extends { CompositeTypes: infer C } ? C : never)
  : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicCompositeTypeNameOrOptions["schema"]] extends { CompositeTypes: infer C } ? C : never)[CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
  ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
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
