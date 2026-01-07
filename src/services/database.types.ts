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
          semester_id: string | null
          score: number
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
          semester_id?: string | null
          score: number
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
          semester_id?: string | null
          score?: number
          student_id?: string
          subject?: string
          user_id?: string
          version?: number | null
        }
        Relationships: [
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
          is_active: boolean | null
          name: string
          start_date: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          is_active?: boolean | null
          name: string
          start_date: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
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
          entity_type: string
          expires_at: string
          id: string
          previous_state: Json | null
          user_id: string
        }
        Insert: {
          action_type: string
          affected_ids: string[]
          can_undo: boolean | null
          created_at?: string | null
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
          entity_type?: string
          expires_at?: string
          id?: string
          previous_state?: Json | null
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
          id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          audience_type?: string | null
          content: string
          created_at?: string | null
          date?: string | null
          id?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          audience_type?: string | null
          content?: string
          created_at?: string | null
          date?: string | null
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
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      communications: {
        Row: {
          content: string
          created_at: string
          id: string
          is_from_teacher: boolean
          is_read: boolean
          student_id: string
          teacher_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_from_teacher?: boolean
          is_read?: boolean
          student_id: string
          teacher_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_from_teacher?: boolean
          is_read?: boolean
          student_id?: string
          teacher_id?: string
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
      quiz_points: {
        Row: {
          category: string | null
          created_at: string
          id: string
          is_used: boolean | null
          max_points: number | null
          points: number
          quiz_date: string | null
          quiz_name: string | null
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
          id?: string
          is_used?: boolean | null
          max_points?: number | null
          points: number
          quiz_date?: string | null
          quiz_name?: string | null
          semester_id?: string | null
          student_id: string
          subject?: string | null
          used_at?: string | null
          used_for_subject?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          points?: number
          semester_id?: string | null
          reason?: string
          student_id?: string
          type?: string
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
      reports: {
        Row: {
          content: string
          created_at: string
          id: string
          student_id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          student_id: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          student_id?: string
          title?: string
          type?: string
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
          end_time: string
          id: string
          start_time: string
          subject: string
          user_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          day: Database["public"]["Enums"]["day_of_week"]
          end_time: string
          id?: string
          start_time: string
          subject: string
          user_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          day?: Database["public"]["Enums"]["day_of_week"]
          end_time?: string
          id?: string
          start_time?: string
          subject?: string
          user_id?: string
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
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "semesters_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          }
        ]
      }
      students: {
        Row: {
          access_code: string | null
          avatar_url: string | null
          class_id: string | null
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
          class_id?: string | null
          created_at?: string
          deleted_at?: string | null
          gender: Database["public"]["Enums"]["gender_enum"]
          id?: string
          name: string
          parent_name?: string | null
          parent_phone?: string | null
          user_id: string
        }
        Update: {
          access_code?: string | null
          avatar_url?: string | null
          class_id?: string | null
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
      subjects: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          class_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          status: Database["public"]["Enums"]["task_status"]
          title: string
          user_id: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          user_id: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
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
      violations: {
        Row: {
          created_at: string
          date: string
          description: string | null
          id: string
          points: number
          semester_id?: string | null
          student_id: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          points: number
          semester_id?: string | null
          student_id: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          points?: number
          semester_id?: string | null
          student_id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "violations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ],
      },
      user_settings: {
        Row: {
          created_at: string
          id: string
          kkm: number
          school_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kkm?: number
          school_name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kkm?: number
          school_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      },
      user_roles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          role: "admin" | "teacher" | "student" | "parent"
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          role?: "admin" | "teacher" | "student" | "parent"
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          role?: "admin" | "teacher" | "student" | "parent"
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_student_access: {
        Args: {
          p_access_code: string
        }
        Returns: {
          id: string
          name: string
          class_name: string
        }[]
      }
      get_student_portal_data: {
        Args: {
          student_id_param: string
          access_code_param: string
        }
        Returns: {
          student: Json
          reports: Json
          attendanceRecords: Json
          academicRecords: Json
          violations: Json
          quizPoints: Json
          communications: Json
          teacher: Json
          schedules: Json
          tasks: Json
          announcements: Json
        }[]
      }
      update_parent_info: {
        Args: {
          student_id_param: string
          access_code_param: string
          new_parent_name: string
          new_parent_phone: string
        }
        Returns: boolean
      }
      send_parent_message: {
        Args: {
          student_id_param: string
          access_code_param: string
          message_param: string
          teacher_user_id_param: string
        }
        Returns: string
      }
      update_parent_message: {
        Args: {
          student_id_param: string
          access_code_param: string
          message_id_param: string
          new_message_param: string
        }
        Returns: boolean
      }
      delete_parent_message: {
        Args: {
          student_id_param: string
          access_code_param: string
          message_id_param: string
        }
        Returns: boolean
      }
      verify_access_code: {
        Args: {
          access_code_param: string
        }
        Returns: {
          id: string
          name: string
          class_id: string
          access_code: string
        }[]
      }
    }
    Enums: {
      attendance_status: "Hadir" | "Izin" | "Sakit" | "Alpha"
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
  ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
    Database[PublicTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
    Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
  ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
  ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
  PublicEnumNameOrOptions extends
  | keyof PublicSchema["Enums"]
  | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
  ? PublicSchema["Enums"][PublicEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof PublicSchema["CompositeTypes"]
  | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
  ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
  ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  public: {
    Enums: {
      attendance_status: ["Hadir", "Izin", "Sakit", "Alpha"],
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