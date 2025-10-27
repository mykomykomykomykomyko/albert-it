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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      agent_shares: {
        Row: {
          agent_id: string | null
          created_at: string | null
          id: string
          permission: string | null
          shared_by_user_id: string | null
          shared_with_user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          id?: string
          permission?: string | null
          shared_by_user_id?: string | null
          shared_with_user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          id?: string
          permission?: string | null
          shared_by_user_id?: string | null
          shared_with_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_shares_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          icon_name: string
          id: string
          is_template: boolean | null
          metadata_tags: string[] | null
          name: string
          profile_picture_url: string | null
          rating: number | null
          reviewed_at: string | null
          reviewer_id: string | null
          submitted_at: string | null
          system_prompt: string
          type: string
          updated_at: string
          usage_count: number | null
          user_id: string
          user_prompt: string
          visibility: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          icon_name?: string
          id?: string
          is_template?: boolean | null
          metadata_tags?: string[] | null
          name: string
          profile_picture_url?: string | null
          rating?: number | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          submitted_at?: string | null
          system_prompt: string
          type: string
          updated_at?: string
          usage_count?: number | null
          user_id: string
          user_prompt: string
          visibility?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          icon_name?: string
          id?: string
          is_template?: boolean | null
          metadata_tags?: string[] | null
          name?: string
          profile_picture_url?: string | null
          rating?: number | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          submitted_at?: string | null
          system_prompt?: string
          type?: string
          updated_at?: string
          usage_count?: number | null
          user_id?: string
          user_prompt?: string
          visibility?: string | null
        }
        Relationships: []
      }
      chat_history: {
        Row: {
          content: string
          created_at: string | null
          files: Json | null
          id: string
          images: Json | null
          role: string
          user_email: string
        }
        Insert: {
          content: string
          created_at?: string | null
          files?: Json | null
          id?: string
          images?: Json | null
          role: string
          user_email: string
        }
        Update: {
          content?: string
          created_at?: string | null
          files?: Json | null
          id?: string
          images?: Json | null
          role?: string
          user_email?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string | null
          default_agent_id: string | null
          id: string
          model: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          default_agent_id?: string | null
          id?: string
          model?: string
          title?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          default_agent_id?: string | null
          id?: string
          model?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_default_agent_id_fkey"
            columns: ["default_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      frameworks: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          description: string | null
          id: string
          is_published: boolean | null
          name: string
          order_index: number | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          name: string
          order_index?: number | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          name?: string
          order_index?: number | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          agent_id: string | null
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          image_url: string | null
          metadata: Json | null
          role: string
        }
        Insert: {
          agent_id?: string | null
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          metadata?: Json | null
          role: string
        }
        Update: {
          agent_id?: string | null
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      prompt_executions: {
        Row: {
          created_at: string | null
          execution_time_ms: number | null
          id: string
          input_variables: Json | null
          output: string | null
          prompt_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          execution_time_ms?: number | null
          id?: string
          input_variables?: Json | null
          output?: string | null
          prompt_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          execution_time_ms?: number | null
          id?: string
          input_variables?: Json | null
          output?: string | null
          prompt_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prompt_executions_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      prompts: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          is_template: boolean | null
          name: string
          prompt_text: string
          tags: string[] | null
          updated_at: string | null
          usage_count: number | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          is_template?: boolean | null
          name: string
          prompt_text: string
          tags?: string[] | null
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          is_template?: boolean | null
          name?: string
          prompt_text?: string
          tags?: string[] | null
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workflows: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
          workflow_data: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
          workflow_data: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
          workflow_data?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      agent_type: "Text" | "Voice" | "Image" | "Audio" | "Multimodal"
      app_role: "admin" | "moderator" | "user"
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
      agent_type: ["Text", "Voice", "Image", "Audio", "Multimodal"],
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
