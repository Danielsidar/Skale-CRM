export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      activities: {
        Row: {
          assignee_user_id: string | null
          business_id: string
          contact_id: string | null
          content: string | null
          created_at: string | null
          created_by_user_id: string
          deal_id: string | null
          due_date: string | null
          id: string
          metadata: Json | null
          task_status: Database["public"]["Enums"]["task_status"] | null
          type: Database["public"]["Enums"]["activity_type"]
          updated_at: string | null
        }
        Insert: {
          assignee_user_id?: string | null
          business_id: string
          contact_id?: string | null
          content?: string | null
          created_at?: string | null
          created_by_user_id: string
          deal_id?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json | null
          task_status?: Database["public"]["Enums"]["task_status"] | null
          type: Database["public"]["Enums"]["activity_type"]
          updated_at?: string | null
        }
        Update: {
          assignee_user_id?: string | null
          business_id?: string
          contact_id?: string | null
          content?: string | null
          created_at?: string | null
          created_by_user_id?: string
          deal_id?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json | null
          task_status?: Database["public"]["Enums"]["task_status"] | null
          type?: Database["public"]["Enums"]["activity_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          actions: Json
          active: boolean
          business_id: string
          conditions: Json | null
          created_at: string | null
          id: string
          name: string
          trigger_config: Json | null
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          actions?: Json
          active?: boolean
          business_id: string
          conditions?: Json | null
          created_at?: string | null
          id?: string
          name: string
          trigger_config?: Json | null
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          actions?: Json
          active?: boolean
          business_id?: string
          conditions?: Json | null
          created_at?: string | null
          id?: string
          name?: string
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_edges: {
        Row: {
          automation_id: string
          branch_label: string | null
          created_at: string | null
          from_node_id: string
          id: string
          to_node_id: string
        }
        Insert: {
          automation_id: string
          branch_label?: string | null
          created_at?: string | null
          from_node_id: string
          id?: string
          to_node_id: string
        }
        Update: {
          automation_id?: string
          branch_label?: string | null
          created_at?: string | null
          from_node_id?: string
          id?: string
          to_node_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_edges_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_edges_from_node_id_fkey"
            columns: ["from_node_id"]
            isOneToOne: false
            referencedRelation: "automation_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_edges_to_node_id_fkey"
            columns: ["to_node_id"]
            isOneToOne: false
            referencedRelation: "automation_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_nodes: {
        Row: {
          automation_id: string
          config: Json | null
          created_at: string | null
          id: string
          position_x: number
          position_y: number
          subtype: string
          type: string
        }
        Insert: {
          automation_id: string
          config?: Json | null
          created_at?: string | null
          id?: string
          position_x?: number
          position_y?: number
          subtype: string
          type: string
        }
        Update: {
          automation_id?: string
          config?: Json | null
          created_at?: string | null
          id?: string
          position_x?: number
          position_y?: number
          subtype?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_nodes_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rule_runs: {
        Row: {
          automation_rule_id: string
          created_at: string | null
          entity_id: string
          entity_type: string
          error_message: string | null
          id: string
          result: Json | null
          status: string
        }
        Insert: {
          automation_rule_id: string
          created_at?: string | null
          entity_id: string
          entity_type: string
          error_message?: string | null
          id?: string
          result?: Json | null
          status?: string
        }
        Update: {
          automation_rule_id?: string
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          error_message?: string | null
          id?: string
          result?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_runs_automation_rule_id_fkey"
            columns: ["automation_rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_run_steps: {
        Row: {
          automation_run_id: string
          created_at: string | null
          error_message: string | null
          id: string
          input_payload: Json | null
          node_id: string
          output_payload: Json | null
          status: string
        }
        Insert: {
          automation_run_id: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          input_payload?: Json | null
          node_id: string
          output_payload?: Json | null
          status: string
        }
        Update: {
          automation_run_id?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          input_payload?: Json | null
          node_id?: string
          output_payload?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_run_steps_automation_run_id_fkey"
            columns: ["automation_run_id"]
            isOneToOne: false
            referencedRelation: "automation_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_run_steps_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "automation_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_folders: {
        Row: {
          id: string
          business_id: string
          name: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          business_id: string
          name: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          business_id?: string
          name?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_folders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_runs: {
        Row: {
          automation_id: string
          business_id: string
          entity_id: string
          entity_type: string
          execution_depth: number
          finished_at: string | null
          id: string
          parent_run_id: string | null
          started_at: string | null
          status: string
        }
        Insert: {
          automation_id: string
          business_id: string
          entity_id: string
          entity_type: string
          execution_depth?: number
          finished_at?: string | null
          id?: string
          parent_run_id?: string | null
          started_at?: string | null
          status?: string
        }
        Update: {
          automation_id?: string
          business_id?: string
          entity_id?: string
          entity_type?: string
          execution_depth?: number
          finished_at?: string | null
          id?: string
          parent_run_id?: string | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_runs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_runs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_runs_parent_run_id_fkey"
            columns: ["parent_run_id"]
            isOneToOne: false
            referencedRelation: "automation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      automations: {
        Row: {
          business_id: string
          created_at: string | null
          id: string
          name: string
          status: string
          updated_at: string | null
          version: number
          folder_id: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          id?: string
          name: string
          status?: string
          updated_at?: string | null
          version?: number
          folder_id?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          id?: string
          name?: string
          status?: string
          updated_at?: string | null
          version?: number
          folder_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automations_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "automation_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      business_users: {
        Row: {
          business_id: string
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["business_role"]
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["business_role"]
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["business_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_users_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          business_id: string
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          business_id: string
          company_id: string | null
          created_at: string | null
          custom_fields: Json | null
          email: string | null
          full_name: string
          id: string
          owner_user_id: string | null
          phone: string | null
          source: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          company_id?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          email?: string | null
          full_name: string
          id?: string
          owner_user_id?: string | null
          phone?: string | null
          source?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          company_id?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          email?: string | null
          full_name?: string
          id?: string
          owner_user_id?: string | null
          phone?: string | null
          source?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_fields: {
        Row: {
          business_id: string
          created_at: string | null
          entity: Database["public"]["Enums"]["custom_field_entity"]
          id: string
          kind: Database["public"]["Enums"]["custom_field_kind"]
          name: string
          options: Json | null
          position: number
        }
        Insert: {
          business_id: string
          created_at?: string | null
          entity: Database["public"]["Enums"]["custom_field_entity"]
          id?: string
          kind?: Database["public"]["Enums"]["custom_field_kind"]
          name: string
          options?: Json | null
          position?: number
        }
        Update: {
          business_id?: string
          created_at?: string | null
          entity?: Database["public"]["Enums"]["custom_field_entity"]
          id?: string
          kind?: Database["public"]["Enums"]["custom_field_kind"]
          name?: string
          options?: Json | null
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "custom_fields_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_purchases: {
        Row: {
          business_id: string | null
          created_at: string | null
          customer_id: string
          id: string
          notes: string | null
          price: number
          product_id: string | null
          user_id: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          customer_id: string
          id?: string
          notes?: string | null
          price: number
          product_id?: string | null
          user_id: string
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          customer_id?: string
          id?: string
          notes?: string | null
          price?: number
          product_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_purchases_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_purchases_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          business_id: string | null
          contact_name: string
          created_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          source: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          business_id?: string | null
          contact_name: string
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          business_id?: string | null
          contact_name?: string
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_stage_history: {
        Row: {
          changed_by_user_id: string | null
          created_at: string | null
          deal_id: string
          id: string
          lost_reason: string | null
          new_stage_id: string
          old_stage_id: string | null
        }
        Insert: {
          changed_by_user_id?: string | null
          created_at?: string | null
          deal_id: string
          id?: string
          lost_reason?: string | null
          new_stage_id: string
          old_stage_id?: string | null
        }
        Update: {
          changed_by_user_id?: string | null
          created_at?: string | null
          deal_id?: string
          id?: string
          lost_reason?: string | null
          new_stage_id?: string
          old_stage_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_stage_history_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_stage_history_new_stage_id_fkey"
            columns: ["new_stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_stage_history_old_stage_id_fkey"
            columns: ["old_stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          business_id: string
          company_id: string | null
          contact_id: string | null
          created_at: string | null
          currency: string | null
          custom_fields: Json | null
          id: string
          lost_reason: string | null
          owner_user_id: string | null
          pipeline_id: string
          product_id: string | null
          source: string | null
          stage_id: string
          tags: string[] | null
          title: string
          updated_at: string | null
          value: number | null
        }
        Insert: {
          business_id: string
          company_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          currency?: string | null
          custom_fields?: Json | null
          id?: string
          lost_reason?: string | null
          owner_user_id?: string | null
          pipeline_id: string
          product_id?: string | null
          source?: string | null
          stage_id: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          business_id?: string
          company_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          currency?: string | null
          custom_fields?: Json | null
          id?: string
          lost_reason?: string | null
          owner_user_id?: string | null
          pipeline_id?: string
          product_id?: string | null
          source?: string | null
          stage_id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activities_legacy: {
        Row: {
          id: string
          lead_id: string
          user_id: string
          activity_type: string
          description: string
          metadata: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          lead_id: string
          user_id: string
          activity_type: string
          description: string
          metadata?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          lead_id?: string
          user_id?: string
          activity_type?: string
          description?: string
          metadata?: Json | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_legacy"
            referencedColumns: ["id"]
          },
        ]
      }
      leads_legacy: {
        Row: {
          id: string
          user_id: string
          name: string
          contact_name: string
          email: string | null
          phone: string | null
          status: string
          estimated_value: number | null
          source: string | null
          tags: string[] | null
          notes: string | null
          follow_up_date: string | null
          created_at: string | null
          updated_at: string | null
          pipeline_id: string | null
          product_id: string | null
          is_converted: boolean | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          contact_name: string
          email?: string | null
          phone?: string | null
          status: string
          estimated_value?: number | null
          source?: string | null
          tags?: string[] | null
          notes?: string | null
          follow_up_date?: string | null
          created_at?: string | null
          updated_at?: string | null
          pipeline_id?: string | null
          product_id?: string | null
          is_converted?: boolean | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          contact_name?: string
          email?: string | null
          phone?: string | null
          status?: string
          estimated_value?: number | null
          source?: string | null
          tags?: string[] | null
          notes?: string | null
          follow_up_date?: string | null
          created_at?: string | null
          updated_at?: string | null
          pipeline_id?: string | null
          product_id?: string | null
          is_converted?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines_legacy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      pipelines: {
        Row: {
          business_id: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          product_id: string | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          product_id?: string | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          product_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipelines_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipelines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      pipelines_legacy: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          product_id: string | null
          statuses: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          product_id?: string | null
          statuses?: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          product_id?: string | null
          statuses?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipelines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          business_id: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          price: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          price?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          price?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      stages: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          is_lost: boolean
          is_won: boolean
          name: string
          pipeline_id: string
          position: number
          probability: number | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_lost?: boolean
          is_won?: boolean
          name: string
          pipeline_id: string
          position?: number
          probability?: number | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_lost?: boolean
          is_won?: boolean
          name?: string
          pipeline_id?: string
          position?: number
          probability?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_business: { Args: { p_name: string }; Returns: Json }
      move_deal_stage: {
        Args: {
          p_changed_by_user_id: string
          p_deal_id: string
          p_lost_reason?: string
          p_new_stage_id: string
        }
        Returns: Json
      }
      user_business_ids: { Args: never; Returns: string[] }
    }
    Enums: {
      activity_type: "note" | "call" | "meeting" | "task" | "message" | "email"
      business_role: "admin" | "manager" | "agent"
      custom_field_entity: "contact" | "deal"
      custom_field_kind: "text" | "number" | "date" | "select" | "checkbox"
      task_status: "open" | "done"
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
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
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
        Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
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
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
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
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
    ? Database["public"]["Enums"][PublicEnumNameOrOptions]
    : never
