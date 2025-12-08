// This file is now populated with a schema based on the application's needs.
// You can generate this file using the Supabase CLI:
// npx supabase gen types typescript --project-id YOUR_PROJECT_ID > services/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// FIX: Changed 'interface' to 'type' for correct Supabase type inference.
export type Database = {
  public: {
    Tables: {
      academic_records: {
        Row: {
          id: string;
          student_id: string;
          subject: string;
          score: number;
          notes: string;
          user_id: string;
          created_at: string;
          assessment_name: string | null;
        };
        Insert: {
          id?: string;
          student_id: string;
          subject: string;
          score: number;
          notes: string;
          user_id: string;
          created_at?: string;
          assessment_name?: string | null;
        };
        Update: {
          id?: string;
          student_id?: string;
          subject?: string;
          score?: number;
          notes?: string;
          user_id?: string;
          created_at?: string;
          assessment_name?: string | null;
        };
        // FIX: Add Relationships property to conform to Supabase type definitions.
        Relationships: []
      };
      communications: {
        Row: {
          id: string
          created_at: string
          student_id: string
          user_id: string
          message: string
          sender: "teacher" | "parent"
          is_read: boolean
          attachment_url: string | null
          attachment_type: "image" | "document" | null
          attachment_name: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          student_id: string
          user_id: string
          message: string
          sender: "teacher" | "parent"
          is_read?: boolean
          attachment_url?: string | null
          attachment_type?: "image" | "document" | null
          attachment_name?: string | null
        }
        Update: {
          id?: string
          message?: string
          is_read?: boolean
          attachment_url?: string | null
          attachment_type?: "image" | "document" | null
          attachment_name?: string | null
        }
        // FIX: Add Relationships property to conform to Supabase type definitions.
        Relationships: []
      }
      quiz_points: {
        Row: {
          id: number;
          created_at: string;
          quiz_name: string;
          subject: string;
          points: number;
          max_points: number;
          quiz_date: string;
          student_id: string;
          user_id: string;
          category: 'bertanya' | 'presentasi' | 'tugas_tambahan' | 'menjawab' | 'diskusi' | 'lainnya' | null;
          is_used: boolean;
          used_at: string | null;
          used_for_subject: string | null;
        };
        Insert: {
          id?: number;
          created_at?: string;
          quiz_name: string;
          subject: string;
          points: number;
          max_points: number;
          quiz_date: string;
          student_id: string;
          user_id: string;
          category?: 'bertanya' | 'presentasi' | 'tugas_tambahan' | 'menjawab' | 'diskusi' | 'lainnya' | null;
          is_used?: boolean;
          used_at?: string | null;
          used_for_subject?: string | null;
        };
        Update: {
          id?: number;
          created_at?: string;
          quiz_name?: string;
          subject?: string;
          points?: number;
          max_points?: number;
          quiz_date?: string;
          student_id?: string;
          user_id?: string;
          category?: 'bertanya' | 'presentasi' | 'tugas_tambahan' | 'menjawab' | 'diskusi' | 'lainnya' | null;
          is_used?: boolean;
          used_at?: string | null;
          used_for_subject?: string | null;
        };
        // FIX: Add Relationships property to conform to Supabase type definitions.
        Relationships: []
      };
      attendance: {
        Row: {
          id: string
          student_id: string
          date: string
          status: "Hadir" | "Izin" | "Sakit" | "Alpha"
          notes: string | null
          user_id: string
          created_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          student_id: string
          date: string
          status: "Hadir" | "Izin" | "Sakit" | "Alpha"
          notes?: string | null
          user_id: string
          created_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          student_id?: string
          date?: string
          status?: "Hadir" | "Izin" | "Sakit" | "Alpha"
          notes?: string | null
          user_id?: string
          created_at?: string
          deleted_at?: string | null
        }
        // FIX: Add Relationships property to conform to Supabase type definitions.
        Relationships: []
      }
      classes: {
        Row: { id: string; name: string; user_id: string; created_at: string; deleted_at: string | null; }
        Insert: { id?: string; name: string; user_id: string; created_at?: string; deleted_at?: string | null; }
        Update: { id?: string; name?: string; user_id?: string; created_at?: string; deleted_at?: string | null; }
        // FIX: Add Relationships property to conform to Supabase type definitions.
        Relationships: []
      }
      students: {
        Row: { id: string; name: string; class_id: string; avatar_url: string; user_id: string; created_at: string; gender: "Laki-laki" | "Perempuan"; access_code: string | null; parent_phone: string | null; deleted_at: string | null }
        Insert: { id?: string; name: string; class_id: string; avatar_url: string; user_id: string; created_at?: string; gender: "Laki-laki" | "Perempuan"; access_code?: string | null; parent_phone?: string | null; deleted_at?: string | null }
        Update: { id?: string; name?: string; class_id?: string; avatar_url?: string; user_id?: string; created_at?: string; gender?: "Laki-laki" | "Perempuan"; access_code?: string | null; parent_phone?: string | null; deleted_at?: string | null }
        // FIX: Add Relationships property to conform to Supabase type definitions.
        Relationships: []
      }
      reports: {
        Row: {
          id: string
          student_id: string
          date: string
          title: string
          notes: string
          attachment_url: string | null
          user_id: string
          created_at: string
          category: 'akademik' | 'perilaku' | 'kesehatan' | 'prestasi' | 'lainnya' | null
          tags: string[] | null
        }
        Insert: {
          id?: string
          student_id: string
          date: string
          title: string
          notes: string
          attachment_url?: string | null
          user_id: string
          created_at?: string
          category?: 'akademik' | 'perilaku' | 'kesehatan' | 'prestasi' | 'lainnya' | null
          tags?: string[] | null
        }
        Update: {
          id?: string
          student_id?: string
          date?: string
          title?: string
          notes?: string
          attachment_url?: string | null
          user_id?: string
          created_at?: string
          category?: 'akademik' | 'perilaku' | 'kesehatan' | 'prestasi' | 'lainnya' | null
          tags?: string[] | null
        }
        // FIX: Add Relationships property to conform to Supabase type definitions.
        Relationships: []
      }
      schedules: {
        Row: {
          id: string
          day: "Senin" | "Selasa" | "Rabu" | "Kamis" | "Jumat"
          start_time: string
          end_time: string
          subject: string
          class_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          day: "Senin" | "Selasa" | "Rabu" | "Kamis" | "Jumat"
          start_time: string
          end_time: string
          subject: string
          class_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          day?: "Senin" | "Selasa" | "Rabu" | "Kamis" | "Jumat"
          start_time?: string
          end_time?: string
          subject?: string
          class_id?: string
          user_id?: string
          created_at?: string
        }
        // FIX: Add Relationships property to conform to Supabase type definitions.
        Relationships: []
      }
      violations: {
        Row: {
          id: string
          student_id: string
          date: string
          description: string
          points: number
          user_id: string
          created_at: string
          severity: 'ringan' | 'sedang' | 'berat' | null
          evidence_url: string | null
          follow_up_status: 'pending' | 'in_progress' | 'resolved' | null
          follow_up_notes: string | null
          parent_notified: boolean
          parent_notified_at: string | null
        }
        Insert: {
          id?: string
          student_id: string
          date: string
          description: string
          points: number
          user_id: string
          created_at?: string
          severity?: 'ringan' | 'sedang' | 'berat' | null
          evidence_url?: string | null
          follow_up_status?: 'pending' | 'in_progress' | 'resolved' | null
          follow_up_notes?: string | null
          parent_notified?: boolean
          parent_notified_at?: string | null
        }
        Update: {
          id?: string
          student_id?: string
          date?: string
          description?: string
          points?: number
          user_id?: string
          created_at?: string
          severity?: 'ringan' | 'sedang' | 'berat' | null
          evidence_url?: string | null
          follow_up_status?: 'pending' | 'in_progress' | 'resolved' | null
          follow_up_notes?: string | null
          parent_notified?: boolean
          parent_notified_at?: string | null
        }
        // FIX: Add Relationships property to conform to Supabase type definitions.
        Relationships: []
      }
      tasks: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          due_date: string | null;
          status: "todo" | "in_progress" | "done";
          created_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          due_date?: string | null;
          status?: "todo" | "in_progress" | "done";
          created_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          due_date?: string | null;
          status?: "todo" | "in_progress" | "done";
          created_at?: string;
          deleted_at?: string | null;
        };
        // FIX: Add Relationships property to conform to Supabase type definitions.
        Relationships: []
      };
      action_history: {
        Row: {
          id: string;
          user_id: string;
          action_type: string;
          entity_type: string;
          affected_ids: string[];
          previous_state: Json | null;
          created_at: string;
          expires_at: string;
          can_undo: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          action_type: string;
          entity_type: string;
          affected_ids: string[];
          previous_state?: Json | null;
          created_at?: string;
          expires_at: string;
          can_undo?: boolean;
        };
        Update: {
          id?: string;
          user_id?: string;
          action_type?: string;
          entity_type?: string;
          affected_ids?: string[];
          previous_state?: Json | null;
          created_at?: string;
          expires_at?: string;
          can_undo?: boolean;
        };
        Relationships: []
      };
      export_templates: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          config: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          config: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          config?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: []
      };
    }
    Views: { [_ in never]: never }
    Functions: {
      apply_quiz_points_to_grade: {
        Args: {
          student_id_param: string
          subject_param: string
          user_id_param: string
        }
        Returns: undefined
      }
      delete_parent_message: {
        Args: {
          student_id_param: string
          access_code_param: string
          message_id_param: string
        }
        Returns: undefined
      }
      delete_user_account: {
        // FIX: Changed 'Record<string, unknown>' to '{}' for functions with no arguments to fix type inference.
        Args: {}
        Returns: undefined
      }
      get_daily_attendance_summary: {
        Args: {
          for_date: string
        }
        Returns: {
          present_percentage: number
          permission_percentage: number
          sick_percentage: number
          absent_percentage: number
        }[]
      }
      get_student_portal_data: {
        Args: {
          student_id_param: string
          access_code_param: string
        }
        Returns: {
          student: {
            id: string
            name: string
            avatar_url: string
            user_id: string
            classes: { name: string }
          }
          reports: {
            id: string
            date: string
            title: string
            notes: string
          }[]
          attendanceRecords: {
            id: string
            date: string
            status: string
            notes: string | null
          }[]
          academicRecords: {
            id: string
            subject: string
            score: number
            notes: string
            created_at: string
            assessment_name: string | null
          }[]
          violations: {
            id: string
            date: string
            description: string
            points: number
          }[]
          quizPoints: {
            id: number
            quiz_date: string
            subject: string
            quiz_name: string
            points: number
            max_points: number
          }[]
          communications: {
            id: string
            created_at: string
            message: string
            sender: "teacher" | "parent"
            is_read: boolean
          }[]
          teacher: { user_id: string; name: string; avatar_url: string } | null
        }[]
      }
      get_weekly_attendance_summary: {
        // FIX: Changed 'Record<string, unknown>' to '{}' for functions with no arguments to fix type inference.
        Args: {}
        Returns: {
          day: string
          present_percentage: number
        }[]
      }
      send_parent_message: {
        Args: {
          student_id_param: string
          access_code_param: string
          message_param: string
          teacher_user_id_param: string
        }
        Returns: undefined
      }
      update_parent_message: {
        Args: {
          student_id_param: string
          access_code_param: string
          message_id_param: string
          new_message_param: string
        }
        Returns: undefined
      }
      verify_access_code: {
        Args: {
          access_code_param: string
        }
        Returns: {
          id: string
          access_code: string
        }[]
      }
    }
    Enums: {
      "attendance_status": "Hadir" | "Izin" | "Sakit" | "Alpha"
      "day_of_week": "Senin" | "Selasa" | "Rabu" | "Kamis" | "Jumat"
    }
    CompositeTypes: { [_ in never]: never }
  }
}