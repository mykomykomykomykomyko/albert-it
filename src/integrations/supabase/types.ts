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
      access_codes: {
        Row: {
          code: string
          created_at: string
          current_uses: number | null
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
        }
        Insert: {
          code: string
          created_at?: string
          current_uses?: number | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          current_uses?: number | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
        }
        Relationships: []
      }
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
          is_shared: boolean | null
          model: string
          retention_days: number | null
          share_token: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          default_agent_id?: string | null
          id?: string
          is_shared?: boolean | null
          model?: string
          retention_days?: number | null
          share_token?: string | null
          title?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          default_agent_id?: string | null
          id?: string
          is_shared?: boolean | null
          model?: string
          retention_days?: number | null
          share_token?: string | null
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
      file_attachments: {
        Row: {
          conversation_id: string | null
          created_at: string
          data_url: string | null
          file_size: number
          file_type: string
          filename: string
          id: string
          metadata: Json | null
          mime_type: string | null
          storage_path: string | null
          thumbnail_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          data_url?: string | null
          file_size: number
          file_type: string
          filename: string
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          storage_path?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          data_url?: string | null
          file_size?: number
          file_type?: string
          filename?: string
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          storage_path?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_attachments_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
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
      image_analysis_images: {
        Row: {
          created_at: string
          file_name: string
          file_size: number
          file_type: string
          id: string
          resize_enabled: boolean | null
          selected: boolean | null
          session_id: string
          storage_path: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size: number
          file_type: string
          id?: string
          resize_enabled?: boolean | null
          selected?: boolean | null
          session_id: string
          storage_path?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          resize_enabled?: boolean | null
          selected?: boolean | null
          session_id?: string
          storage_path?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "image_analysis_images_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "image_analysis_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      image_analysis_prompts: {
        Row: {
          content: string
          created_at: string
          id: string
          is_custom: boolean | null
          name: string
          session_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_custom?: boolean | null
          name: string
          session_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_custom?: boolean | null
          name?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "image_analysis_prompts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "image_analysis_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      image_analysis_results: {
        Row: {
          content: string
          created_at: string
          id: string
          image_id: string
          processing_time: number | null
          prompt_id: string
          session_id: string
          status: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          image_id: string
          processing_time?: number | null
          prompt_id: string
          session_id: string
          status?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_id?: string
          processing_time?: number | null
          prompt_id?: string
          session_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "image_analysis_results_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "image_analysis_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_analysis_results_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "image_analysis_prompts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_analysis_results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "image_analysis_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      image_analysis_sessions: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meeting_transcripts: {
        Row: {
          action_items: Json | null
          content: string
          created_at: string | null
          file_format: string | null
          id: string
          is_in_knowledge_base: boolean | null
          meeting_date: string | null
          original_filename: string
          participants: string[] | null
          structured_data: Json | null
          summary: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          action_items?: Json | null
          content: string
          created_at?: string | null
          file_format?: string | null
          id?: string
          is_in_knowledge_base?: boolean | null
          meeting_date?: string | null
          original_filename: string
          participants?: string[] | null
          structured_data?: Json | null
          summary?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          action_items?: Json | null
          content?: string
          created_at?: string | null
          file_format?: string | null
          id?: string
          is_in_knowledge_base?: boolean | null
          meeting_date?: string | null
          original_filename?: string
          participants?: string[] | null
          structured_data?: Json | null
          summary?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          agent_id: string | null
          attachments: Json | null
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
          attachments?: Json | null
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
          attachments?: Json | null
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
      prompt_shares: {
        Row: {
          created_at: string
          id: string
          permission: string | null
          prompt_id: string
          shared_by_user_id: string
          shared_with_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission?: string | null
          prompt_id: string
          shared_by_user_id: string
          shared_with_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission?: string | null
          prompt_id?: string
          shared_by_user_id?: string
          shared_with_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompt_shares_prompt_id_fkey"
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
          is_marketplace: boolean | null
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
          is_marketplace?: boolean | null
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
          is_marketplace?: boolean | null
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
      saved_canvases: {
        Row: {
          canvas_data: Json
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          canvas_data: Json
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          canvas_data?: Json
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_stages: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          stage_data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          stage_data: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          stage_data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          contrast_theme: string
          created_at: string
          default_retention_days: number | null
          enhance_inputs: boolean
          font_family: string
          id: string
          line_spacing: string
          text_size: string
          updated_at: string
          user_id: string
        }
        Insert: {
          contrast_theme?: string
          created_at?: string
          default_retention_days?: number | null
          enhance_inputs?: boolean
          font_family?: string
          id?: string
          line_spacing?: string
          text_size?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          contrast_theme?: string
          created_at?: string
          default_retention_days?: number | null
          enhance_inputs?: boolean
          font_family?: string
          id?: string
          line_spacing?: string
          text_size?: string
          updated_at?: string
          user_id?: string
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
      voice_analysis_results: {
        Row: {
          analysis: string | null
          audio_storage_path: string | null
          created_at: string
          id: string
          model_used: string
          original_filename: string
          transcription: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis?: string | null
          audio_storage_path?: string | null
          created_at?: string
          id?: string
          model_used: string
          original_filename: string
          transcription?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis?: string | null
          audio_storage_path?: string | null
          created_at?: string
          id?: string
          model_used?: string
          original_filename?: string
          transcription?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workflow_executions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          execution_time_ms: number | null
          id: string
          input_data: Json | null
          output_data: Json | null
          started_at: string | null
          status: string | null
          user_id: string
          workflow_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          started_at?: string | null
          status?: string | null
          user_id: string
          workflow_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          started_at?: string | null
          status?: string | null
          user_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_shares: {
        Row: {
          created_at: string | null
          id: string
          permission: string | null
          shared_by_user_id: string
          shared_with_user_id: string
          workflow_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission?: string | null
          shared_by_user_id: string
          shared_with_user_id: string
          workflow_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          permission?: string | null
          shared_by_user_id?: string
          shared_with_user_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_shares_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_template: boolean | null
          name: string
          parent_workflow_id: string | null
          tags: string[] | null
          updated_at: string
          user_id: string
          version: number | null
          visibility: string | null
          workflow_data: Json
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_template?: boolean | null
          name: string
          parent_workflow_id?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
          version?: number | null
          visibility?: string | null
          workflow_data: Json
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_template?: boolean | null
          name?: string
          parent_workflow_id?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
          version?: number | null
          visibility?: string | null
          workflow_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "workflows_parent_workflow_id_fkey"
            columns: ["parent_workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_id_by_email: { Args: { _email: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_access_code_usage: {
        Args: { code_input: string }
        Returns: undefined
      }
      validate_access_code: { Args: { code_input: string }; Returns: boolean }
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
