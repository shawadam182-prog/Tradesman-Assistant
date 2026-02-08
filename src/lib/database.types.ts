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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      bank_transactions: {
        Row: {
          account_last_four: string | null
          amount: number
          balance: number | null
          bank_name: string | null
          created_at: string | null
          description: string
          id: string
          import_batch_id: string | null
          is_reconciled: boolean | null
          reconciled_expense_id: string | null
          reconciled_invoice_id: string | null
          reference: string | null
          transaction_date: string
          transaction_type: string | null
          user_id: string
        }
        Insert: {
          account_last_four?: string | null
          amount: number
          balance?: number | null
          bank_name?: string | null
          created_at?: string | null
          description: string
          id?: string
          import_batch_id?: string | null
          is_reconciled?: boolean | null
          reconciled_expense_id?: string | null
          reconciled_invoice_id?: string | null
          reference?: string | null
          transaction_date: string
          transaction_type?: string | null
          user_id: string
        }
        Update: {
          account_last_four?: string | null
          amount?: number
          balance?: number | null
          bank_name?: string | null
          created_at?: string | null
          description?: string
          id?: string
          import_batch_id?: string | null
          is_reconciled?: boolean | null
          reconciled_expense_id?: string | null
          reconciled_invoice_id?: string | null
          reference?: string | null
          transaction_date?: string
          transaction_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_reconciled_expense_id_fkey"
            columns: ["reconciled_expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_reconciled_invoice_id_fkey"
            columns: ["reconciled_invoice_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_preferences: {
        Row: {
          appointment_reminder_enabled: boolean | null
          appointment_reminder_hours: number | null
          created_at: string | null
          id: string
          payment_reminder_days: number[] | null
          payment_reminder_enabled: boolean | null
          quote_follow_up_days: number | null
          quote_follow_up_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          appointment_reminder_enabled?: boolean | null
          appointment_reminder_hours?: number | null
          created_at?: string | null
          id?: string
          payment_reminder_days?: number[] | null
          payment_reminder_enabled?: boolean | null
          quote_follow_up_days?: number | null
          quote_follow_up_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          appointment_reminder_enabled?: boolean | null
          appointment_reminder_hours?: number | null
          created_at?: string | null
          id?: string
          payment_reminder_days?: number[] | null
          payment_reminder_enabled?: boolean | null
          quote_follow_up_days?: number | null
          quote_follow_up_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          company: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          company?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          company?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_log: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          max_retries: number | null
          next_retry_at: string | null
          opened_at: string | null
          quote_id: string | null
          recipient_email: string
          resend_message_id: string | null
          retry_count: number | null
          sent_at: string | null
          status: string | null
          subject: string
          template_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          max_retries?: number | null
          next_retry_at?: string | null
          opened_at?: string | null
          quote_id?: string | null
          recipient_email: string
          resend_message_id?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string | null
          subject: string
          template_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          max_retries?: number | null
          next_retry_at?: string | null
          opened_at?: string | null
          quote_id?: string | null
          recipient_email?: string
          resend_message_id?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string | null
          subject?: string
          template_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_log_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body: string
          created_at: string | null
          id: string
          is_default: boolean | null
          subject: string
          template_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          subject: string
          template_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          subject?: string
          template_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          color: string | null
          created_at: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_default: boolean | null
          name: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          description: string | null
          expense_date: string
          id: string
          is_reconciled: boolean | null
          job_pack_id: string | null
          payment_method: string | null
          receipt_extracted_text: string | null
          receipt_storage_path: string | null
          reconciled_transaction_id: string | null
          updated_at: string | null
          user_id: string
          vat_amount: number | null
          vendor: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          is_reconciled?: boolean | null
          job_pack_id?: string | null
          payment_method?: string | null
          receipt_extracted_text?: string | null
          receipt_storage_path?: string | null
          reconciled_transaction_id?: string | null
          updated_at?: string | null
          user_id: string
          vat_amount?: number | null
          vendor: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          is_reconciled?: boolean | null
          job_pack_id?: string | null
          payment_method?: string | null
          receipt_extracted_text?: string | null
          receipt_storage_path?: string | null
          reconciled_transaction_id?: string | null
          updated_at?: string | null
          user_id?: string
          vat_amount?: number | null
          vendor?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_job_pack_id_fkey"
            columns: ["job_pack_id"]
            isOneToOne: false
            referencedRelation: "job_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      filed_documents: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          document_date: string | null
          expense_id: string | null
          expiry_date: string | null
          extracted_text: string | null
          file_size: number | null
          file_type: string | null
          id: string
          job_pack_id: string | null
          name: string
          payable_id: string | null
          storage_path: string
          tags: string[] | null
          tax_year: string | null
          updated_at: string | null
          user_id: string
          vendor_name: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          document_date?: string | null
          expense_id?: string | null
          expiry_date?: string | null
          extracted_text?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          job_pack_id?: string | null
          name: string
          payable_id?: string | null
          storage_path: string
          tags?: string[] | null
          tax_year?: string | null
          updated_at?: string | null
          user_id: string
          vendor_name?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          document_date?: string | null
          expense_id?: string | null
          expiry_date?: string | null
          extracted_text?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          job_pack_id?: string | null
          name?: string
          payable_id?: string | null
          storage_path?: string
          tags?: string[] | null
          tax_year?: string | null
          updated_at?: string | null
          user_id?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "filed_documents_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "filed_documents_job_pack_id_fkey"
            columns: ["job_pack_id"]
            isOneToOne: false
            referencedRelation: "job_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "filed_documents_payable_id_fkey"
            columns: ["payable_id"]
            isOneToOne: false
            referencedRelation: "payables"
            referencedColumns: ["id"]
          },
        ]
      }
      gps_logs: {
        Row: {
          accuracy: number | null
          id: string
          lat: number
          lng: number
          logged_at: string | null
          timesheet_id: string
        }
        Insert: {
          accuracy?: number | null
          id?: string
          lat: number
          lng: number
          logged_at?: string | null
          timesheet_id: string
        }
        Update: {
          accuracy?: number | null
          id?: string
          lat?: number
          lng?: number
          logged_at?: string | null
          timesheet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gps_logs_timesheet_id_fkey"
            columns: ["timesheet_id"]
            isOneToOne: false
            referencedRelation: "timesheets"
            referencedColumns: ["id"]
          },
        ]
      }
      job_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string
          id: string
          job_pack_id: string
          team_member_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by: string
          id?: string
          job_pack_id: string
          team_member_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string
          id?: string
          job_pack_id?: string
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_assignments_job_pack_id_fkey"
            columns: ["job_pack_id"]
            isOneToOne: false
            referencedRelation: "job_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_assignments_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      job_packs: {
        Row: {
          created_at: string | null
          customer_id: string | null
          id: string
          notepad: string | null
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          notepad?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          notepad?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_packs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      material_kits: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_favourite: boolean | null
          items: Json
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_favourite?: boolean | null
          items?: Json
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_favourite?: boolean | null
          items?: Json
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      materials_import_history: {
        Row: {
          filename: string | null
          id: string
          imported_at: string | null
          items_failed: number | null
          items_imported: number | null
          items_updated: number | null
          supplier: string | null
          user_id: string
        }
        Insert: {
          filename?: string | null
          id?: string
          imported_at?: string | null
          items_failed?: number | null
          items_imported?: number | null
          items_updated?: number | null
          supplier?: string | null
          user_id: string
        }
        Update: {
          filename?: string | null
          id?: string
          imported_at?: string | null
          items_failed?: number | null
          items_imported?: number | null
          items_updated?: number | null
          supplier?: string | null
          user_id?: string
        }
        Relationships: []
      }
      materials_library: {
        Row: {
          category: string | null
          cost_price: number | null
          created_at: string | null
          description: string | null
          id: string
          is_favourite: boolean | null
          last_updated: string | null
          name: string
          product_code: string | null
          sell_price: number | null
          supplier: string | null
          unit: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_favourite?: boolean | null
          last_updated?: string | null
          name: string
          product_code?: string | null
          sell_price?: number | null
          supplier?: string | null
          unit?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_favourite?: boolean | null
          last_updated?: string | null
          name?: string
          product_code?: string | null
          sell_price?: number | null
          supplier?: string | null
          unit?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payables: {
        Row: {
          amount: number
          amount_paid: number | null
          category: string | null
          created_at: string | null
          description: string | null
          document_path: string | null
          due_date: string | null
          id: string
          invoice_date: string
          invoice_number: string | null
          is_reconciled: boolean | null
          job_pack_id: string | null
          notes: string | null
          paid_date: string | null
          reconciled_transaction_id: string | null
          status: string | null
          updated_at: string | null
          user_id: string
          vat_amount: number | null
          vendor_id: string | null
          vendor_name: string
        }
        Insert: {
          amount: number
          amount_paid?: number | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          document_path?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string | null
          is_reconciled?: boolean | null
          job_pack_id?: string | null
          notes?: string | null
          paid_date?: string | null
          reconciled_transaction_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
          vat_amount?: number | null
          vendor_id?: string | null
          vendor_name: string
        }
        Update: {
          amount?: number
          amount_paid?: number | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          document_path?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string | null
          is_reconciled?: boolean | null
          job_pack_id?: string | null
          notes?: string | null
          paid_date?: string | null
          reconciled_transaction_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
          vat_amount?: number | null
          vendor_id?: string | null
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "payables_job_pack_id_fkey"
            columns: ["job_pack_id"]
            isOneToOne: false
            referencedRelation: "job_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payables_reconciled_transaction_id_fkey"
            columns: ["reconciled_transaction_id"]
            isOneToOne: false
            referencedRelation: "bank_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payables_reconciled_transaction_id_fkey"
            columns: ["reconciled_transaction_id"]
            isOneToOne: false
            referencedRelation: "reconciliation_summary"
            referencedColumns: ["transaction_id"]
          },
          {
            foreignKeyName: "payables_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_milestones: {
        Row: {
          created_at: string | null
          due_date: string | null
          fixed_amount: number | null
          id: string
          invoice_id: string | null
          label: string
          paid_at: string | null
          percentage: number | null
          quote_id: string
          sort_order: number | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          due_date?: string | null
          fixed_amount?: number | null
          id?: string
          invoice_id?: string | null
          label: string
          paid_at?: string | null
          percentage?: number | null
          quote_id: string
          sort_order?: number | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          due_date?: string | null
          fixed_amount?: number | null
          id?: string
          invoice_id?: string | null
          label?: string
          paid_at?: string | null
          percentage?: number | null
          quote_id?: string
          sort_order?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_milestones_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_milestones_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      project_materials: {
        Row: {
          created_at: string | null
          delivered_qty: number | null
          id: string
          job_pack_id: string
          name: string
          ordered_qty: number | null
          quoted_qty: number | null
          status: string | null
          unit: string | null
          updated_at: string | null
          used_qty: number | null
        }
        Insert: {
          created_at?: string | null
          delivered_qty?: number | null
          id?: string
          job_pack_id: string
          name: string
          ordered_qty?: number | null
          quoted_qty?: number | null
          status?: string | null
          unit?: string | null
          updated_at?: string | null
          used_qty?: number | null
        }
        Update: {
          created_at?: string | null
          delivered_qty?: number | null
          id?: string
          job_pack_id?: string
          name?: string
          ordered_qty?: number | null
          quoted_qty?: number | null
          status?: string | null
          unit?: string | null
          updated_at?: string | null
          used_qty?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_materials_job_pack_id_fkey"
            columns: ["job_pack_id"]
            isOneToOne: false
            referencedRelation: "job_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_signatures: {
        Row: {
          created_at: string | null
          id: string
          ip_address: string | null
          quote_id: string
          signature_data: string
          signature_type: string | null
          signed_at: string | null
          signer_name: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ip_address?: string | null
          quote_id: string
          signature_data: string
          signature_type?: string | null
          signed_at?: string | null
          signer_name: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ip_address?: string | null
          quote_id?: string
          signature_data?: string
          signature_type?: string | null
          signed_at?: string | null
          signer_name?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_signatures_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          accepted_at: string | null
          amount_paid: number | null
          cis_percent: number | null
          created_at: string | null
          credit_note_reason: string | null
          customer_id: string | null
          customer_response_ip: string | null
          customer_response_user_agent: string | null
          date: string | null
          declined_at: string | null
          discount_description: string | null
          discount_type: string | null
          discount_value: number | null
          display_options: Json | null
          due_date: string | null
          id: string
          is_credit_note: boolean | null
          is_recurring: boolean | null
          job_address: string | null
          job_pack_id: string | null
          labour_rate: number | null
          markup_percent: number | null
          notes: string | null
          online_payment_amount: number | null
          online_payment_fee: number | null
          online_payment_net: number | null
          original_invoice_id: string | null
          parent_quote_id: string | null
          part_payment_enabled: boolean | null
          part_payment_label: string | null
          part_payment_type: string | null
          part_payment_value: number | null
          payment_date: string | null
          payment_link_created_at: string | null
          payment_link_expires_at: string | null
          payment_link_url: string | null
          payment_method: string | null
          recurring_end_date: string | null
          recurring_frequency: string | null
          recurring_next_date: string | null
          recurring_parent_id: string | null
          recurring_start_date: string | null
          reference_number: number | null
          sections: Json | null
          share_token: string | null
          status: string | null
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          tax_percent: number | null
          title: string
          type: string | null
          updated_at: string | null
          user_id: string
          view_count: number | null
        }
        Insert: {
          accepted_at?: string | null
          amount_paid?: number | null
          cis_percent?: number | null
          created_at?: string | null
          credit_note_reason?: string | null
          customer_id?: string | null
          customer_response_ip?: string | null
          customer_response_user_agent?: string | null
          date?: string | null
          declined_at?: string | null
          discount_description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          display_options?: Json | null
          due_date?: string | null
          id?: string
          is_credit_note?: boolean | null
          is_recurring?: boolean | null
          job_address?: string | null
          job_pack_id?: string | null
          labour_rate?: number | null
          markup_percent?: number | null
          notes?: string | null
          online_payment_amount?: number | null
          online_payment_fee?: number | null
          online_payment_net?: number | null
          original_invoice_id?: string | null
          parent_quote_id?: string | null
          part_payment_enabled?: boolean | null
          part_payment_label?: string | null
          part_payment_type?: string | null
          part_payment_value?: number | null
          payment_date?: string | null
          payment_link_created_at?: string | null
          payment_link_expires_at?: string | null
          payment_link_url?: string | null
          payment_method?: string | null
          recurring_end_date?: string | null
          recurring_frequency?: string | null
          recurring_next_date?: string | null
          recurring_parent_id?: string | null
          recurring_start_date?: string | null
          reference_number?: number | null
          sections?: Json | null
          share_token?: string | null
          status?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          tax_percent?: number | null
          title: string
          type?: string | null
          updated_at?: string | null
          user_id: string
          view_count?: number | null
        }
        Update: {
          accepted_at?: string | null
          amount_paid?: number | null
          cis_percent?: number | null
          created_at?: string | null
          credit_note_reason?: string | null
          customer_id?: string | null
          customer_response_ip?: string | null
          customer_response_user_agent?: string | null
          date?: string | null
          declined_at?: string | null
          discount_description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          display_options?: Json | null
          due_date?: string | null
          id?: string
          is_credit_note?: boolean | null
          is_recurring?: boolean | null
          job_address?: string | null
          job_pack_id?: string | null
          labour_rate?: number | null
          markup_percent?: number | null
          notes?: string | null
          online_payment_amount?: number | null
          online_payment_fee?: number | null
          online_payment_net?: number | null
          original_invoice_id?: string | null
          parent_quote_id?: string | null
          part_payment_enabled?: boolean | null
          part_payment_label?: string | null
          part_payment_type?: string | null
          part_payment_value?: number | null
          payment_date?: string | null
          payment_link_created_at?: string | null
          payment_link_expires_at?: string | null
          payment_link_url?: string | null
          payment_method?: string | null
          recurring_end_date?: string | null
          recurring_frequency?: string | null
          recurring_next_date?: string | null
          recurring_parent_id?: string | null
          recurring_start_date?: string | null
          reference_number?: number | null
          sections?: Json | null
          share_token?: string | null
          status?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          tax_percent?: number | null
          title?: string
          type?: string | null
          updated_at?: string | null
          user_id?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_job_pack_id_fkey"
            columns: ["job_pack_id"]
            isOneToOne: false
            referencedRelation: "job_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_original_invoice_id_fkey"
            columns: ["original_invoice_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_parent_quote_id_fkey"
            columns: ["parent_quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_recurring_parent_id_fkey"
            columns: ["recurring_parent_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_links: {
        Row: {
          amount_matched: number | null
          bank_transaction_id: string
          created_at: string | null
          expense_id: string | null
          id: string
          invoice_id: string | null
          user_id: string
        }
        Insert: {
          amount_matched?: number | null
          bank_transaction_id: string
          created_at?: string | null
          expense_id?: string | null
          id?: string
          invoice_id?: string | null
          user_id: string
        }
        Update: {
          amount_matched?: number | null
          bank_transaction_id?: string
          created_at?: string | null
          expense_id?: string | null
          id?: string
          invoice_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_links_bank_transaction_id_fkey"
            columns: ["bank_transaction_id"]
            isOneToOne: false
            referencedRelation: "bank_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_links_bank_transaction_id_fkey"
            columns: ["bank_transaction_id"]
            isOneToOne: false
            referencedRelation: "reconciliation_summary"
            referencedColumns: ["transaction_id"]
          },
          {
            foreignKeyName: "reconciliation_links_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_links_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_entries: {
        Row: {
          confirmation_sent_at: string | null
          created_at: string | null
          customer_email: string | null
          customer_id: string | null
          description: string | null
          end_time: string
          id: string
          job_pack_id: string | null
          location: string | null
          reminder_sent_at: string | null
          start_time: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          confirmation_sent_at?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_id?: string | null
          description?: string | null
          end_time: string
          id?: string
          job_pack_id?: string | null
          location?: string | null
          reminder_sent_at?: string | null
          start_time: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          confirmation_sent_at?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_id?: string | null
          description?: string | null
          end_time?: string
          id?: string
          job_pack_id?: string | null
          location?: string | null
          reminder_sent_at?: string | null
          start_time?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_entries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_entries_job_pack_id_fkey"
            columns: ["job_pack_id"]
            isOneToOne: false
            referencedRelation: "job_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      site_documents: {
        Row: {
          created_at: string | null
          file_type: string | null
          id: string
          job_pack_id: string
          name: string
          storage_path: string
          summary: string | null
        }
        Insert: {
          created_at?: string | null
          file_type?: string | null
          id?: string
          job_pack_id: string
          name: string
          storage_path: string
          summary?: string | null
        }
        Update: {
          created_at?: string | null
          file_type?: string | null
          id?: string
          job_pack_id?: string
          name?: string
          storage_path?: string
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_documents_job_pack_id_fkey"
            columns: ["job_pack_id"]
            isOneToOne: false
            referencedRelation: "job_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      site_notes: {
        Row: {
          created_at: string | null
          id: string
          is_voice: boolean | null
          job_pack_id: string
          text: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_voice?: boolean | null
          job_pack_id: string
          text: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_voice?: boolean | null
          job_pack_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_notes_job_pack_id_fkey"
            columns: ["job_pack_id"]
            isOneToOne: false
            referencedRelation: "job_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      site_photos: {
        Row: {
          caption: string | null
          created_at: string | null
          id: string
          is_drawing: boolean | null
          job_pack_id: string
          storage_path: string
          tags: string[] | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          id?: string
          is_drawing?: boolean | null
          job_pack_id: string
          storage_path: string
          tags?: string[] | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          id?: string
          is_drawing?: boolean | null
          job_pack_id?: string
          storage_path?: string
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "site_photos_job_pack_id_fkey"
            columns: ["job_pack_id"]
            isOneToOne: false
            referencedRelation: "job_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      support_requests: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          id: string
          message: string
          resolved_at: string | null
          status: string
          title: string
          updated_at: string | null
          user_email: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          id?: string
          message: string
          resolved_at?: string | null
          status?: string
          title: string
          updated_at?: string | null
          user_email?: string | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          id?: string
          message?: string
          resolved_at?: string | null
          status?: string
          title?: string
          updated_at?: string | null
          user_email?: string | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      team_invitations: {
        Row: {
          created_at: string | null
          display_name: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: string
          status: string
          team_id: string
          token: string
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: string
          status?: string
          team_id: string
          token?: string
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: string
          status?: string
          team_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string | null
          display_name: string
          hourly_rate: number | null
          id: string
          phone: string | null
          role: string
          status: string
          team_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          display_name: string
          hourly_rate?: number | null
          id?: string
          phone?: string | null
          role?: string
          status?: string
          team_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          display_name?: string
          hourly_rate?: number | null
          id?: string
          phone?: string | null
          role?: string
          status?: string
          team_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          id: string
          name: string
          owner_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          owner_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      timesheets: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          break_minutes: number | null
          clock_in: string
          clock_in_accuracy: number | null
          clock_in_lat: number | null
          clock_in_lng: number | null
          clock_out: string | null
          clock_out_accuracy: number | null
          clock_out_lat: number | null
          clock_out_lng: number | null
          created_at: string | null
          id: string
          is_gps_verified: boolean | null
          job_pack_id: string | null
          notes: string | null
          rejection_reason: string | null
          status: string | null
          team_member_id: string
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          break_minutes?: number | null
          clock_in: string
          clock_in_accuracy?: number | null
          clock_in_lat?: number | null
          clock_in_lng?: number | null
          clock_out?: string | null
          clock_out_accuracy?: number | null
          clock_out_lat?: number | null
          clock_out_lng?: number | null
          created_at?: string | null
          id?: string
          is_gps_verified?: boolean | null
          job_pack_id?: string | null
          notes?: string | null
          rejection_reason?: string | null
          status?: string | null
          team_member_id: string
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          break_minutes?: number | null
          clock_in?: string
          clock_in_accuracy?: number | null
          clock_in_lat?: number | null
          clock_in_lng?: number | null
          clock_out?: string | null
          clock_out_accuracy?: number | null
          clock_out_lat?: number | null
          clock_out_lng?: number | null
          created_at?: string | null
          id?: string
          is_gps_verified?: boolean | null
          job_pack_id?: string | null
          notes?: string | null
          rejection_reason?: string | null
          status?: string | null
          team_member_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timesheets_job_pack_id_fkey"
            columns: ["job_pack_id"]
            isOneToOne: false
            referencedRelation: "job_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_logs: {
        Row: {
          action_details: Json | null
          action_name: string
          action_type: string
          created_at: string | null
          id: string
          page_name: string | null
          page_path: string | null
          session_id: string | null
          user_id: string
        }
        Insert: {
          action_details?: Json | null
          action_name: string
          action_type: string
          created_at?: string | null
          id?: string
          page_name?: string | null
          page_path?: string | null
          session_id?: string | null
          user_id: string
        }
        Update: {
          action_details?: Json | null
          action_name?: string
          action_type?: string
          created_at?: string | null
          id?: string
          page_name?: string | null
          page_path?: string | null
          session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          browser: string | null
          created_at: string | null
          device_type: string | null
          id: string
          is_pwa: boolean | null
          login_at: string
          logout_at: string | null
          os: string | null
          session_duration_seconds: number | null
          session_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          created_at?: string | null
          device_type?: string | null
          id?: string
          is_pwa?: boolean | null
          login_at?: string
          logout_at?: string | null
          os?: string | null
          session_duration_seconds?: number | null
          session_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          created_at?: string | null
          device_type?: string | null
          id?: string
          is_pwa?: boolean | null
          login_at?: string
          logout_at?: string | null
          os?: string | null
          session_duration_seconds?: number | null
          session_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          bank_account_name: string | null
          bank_account_number: string | null
          bank_name: string | null
          bank_sort_code: string | null
          company_address: string | null
          company_logo_path: string | null
          company_name: string | null
          converted: boolean | null
          converted_at: string | null
          cost_box_color: string | null
          created_at: string | null
          default_cis_rate: number | null
          default_display_options: Json | null
          default_invoice_notes: string | null
          default_labour_rate: number | null
          default_markup_percent: number | null
          default_payment_terms_days: number | null
          default_quote_notes: string | null
          default_tax_rate: number | null
          document_template: string | null
          email: string | null
          enable_cis: boolean | null
          enable_vat: boolean | null
          footer_logos: string[] | null
          id: string
          invoice_color_scheme: string | null
          invoice_display_options: Json | null
          invoice_labour_rate: number | null
          invoice_markup_percent: number | null
          invoice_prefix: string | null
          is_vat_registered: boolean | null
          labour_rate_presets: Json | null
          phone: string | null
          quick_pick_materials: string[] | null
          quote_color_scheme: string | null
          quote_display_options: Json | null
          quote_labour_rate: number | null
          quote_markup_percent: number | null
          quote_prefix: string | null
          referral_code: string | null
          show_breakdown: boolean | null
          stripe_connect_account_id: string | null
          stripe_connect_charges_enabled: boolean | null
          stripe_connect_onboarded_at: string | null
          stripe_connect_onboarding_complete: boolean | null
          stripe_connect_payouts_enabled: boolean | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_end: string | null
          subscription_period_end: string | null
          subscription_start: string | null
          subscription_status:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          subscription_tier:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          tax_year_start_day: number | null
          tax_year_start_month: number | null
          trial_end: string | null
          trial_start: string | null
          updated_at: string | null
          usage_limits: Json | null
          user_id: string
          vat_number: string | null
        }
        Insert: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          bank_sort_code?: string | null
          company_address?: string | null
          company_logo_path?: string | null
          company_name?: string | null
          converted?: boolean | null
          converted_at?: string | null
          cost_box_color?: string | null
          created_at?: string | null
          default_cis_rate?: number | null
          default_display_options?: Json | null
          default_invoice_notes?: string | null
          default_labour_rate?: number | null
          default_markup_percent?: number | null
          default_payment_terms_days?: number | null
          default_quote_notes?: string | null
          default_tax_rate?: number | null
          document_template?: string | null
          email?: string | null
          enable_cis?: boolean | null
          enable_vat?: boolean | null
          footer_logos?: string[] | null
          id?: string
          invoice_color_scheme?: string | null
          invoice_display_options?: Json | null
          invoice_labour_rate?: number | null
          invoice_markup_percent?: number | null
          invoice_prefix?: string | null
          is_vat_registered?: boolean | null
          labour_rate_presets?: Json | null
          phone?: string | null
          quick_pick_materials?: string[] | null
          quote_color_scheme?: string | null
          quote_display_options?: Json | null
          quote_labour_rate?: number | null
          quote_markup_percent?: number | null
          quote_prefix?: string | null
          referral_code?: string | null
          show_breakdown?: boolean | null
          stripe_connect_account_id?: string | null
          stripe_connect_charges_enabled?: boolean | null
          stripe_connect_onboarded_at?: string | null
          stripe_connect_onboarding_complete?: boolean | null
          stripe_connect_payouts_enabled?: boolean | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end?: string | null
          subscription_period_end?: string | null
          subscription_start?: string | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          tax_year_start_day?: number | null
          tax_year_start_month?: number | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          usage_limits?: Json | null
          user_id: string
          vat_number?: string | null
        }
        Update: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          bank_sort_code?: string | null
          company_address?: string | null
          company_logo_path?: string | null
          company_name?: string | null
          converted?: boolean | null
          converted_at?: string | null
          cost_box_color?: string | null
          created_at?: string | null
          default_cis_rate?: number | null
          default_display_options?: Json | null
          default_invoice_notes?: string | null
          default_labour_rate?: number | null
          default_markup_percent?: number | null
          default_payment_terms_days?: number | null
          default_quote_notes?: string | null
          default_tax_rate?: number | null
          document_template?: string | null
          email?: string | null
          enable_cis?: boolean | null
          enable_vat?: boolean | null
          footer_logos?: string[] | null
          id?: string
          invoice_color_scheme?: string | null
          invoice_display_options?: Json | null
          invoice_labour_rate?: number | null
          invoice_markup_percent?: number | null
          invoice_prefix?: string | null
          is_vat_registered?: boolean | null
          labour_rate_presets?: Json | null
          phone?: string | null
          quick_pick_materials?: string[] | null
          quote_color_scheme?: string | null
          quote_display_options?: Json | null
          quote_labour_rate?: number | null
          quote_markup_percent?: number | null
          quote_prefix?: string | null
          referral_code?: string | null
          show_breakdown?: boolean | null
          stripe_connect_account_id?: string | null
          stripe_connect_charges_enabled?: boolean | null
          stripe_connect_onboarded_at?: string | null
          stripe_connect_onboarding_complete?: boolean | null
          stripe_connect_payouts_enabled?: boolean | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end?: string | null
          subscription_period_end?: string | null
          subscription_start?: string | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          tax_year_start_day?: number | null
          tax_year_start_month?: number | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          usage_limits?: Json | null
          user_id?: string
          vat_number?: string | null
        }
        Relationships: []
      }
      vendor_keywords: {
        Row: {
          category_id: string
          created_at: string | null
          id: string
          keyword: string
          match_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string | null
          id?: string
          keyword: string
          match_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string | null
          id?: string
          keyword?: string
          match_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_keywords_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          created_at: string | null
          default_category: string | null
          default_payment_method: string | null
          expense_count: number | null
          id: string
          last_expense_date: string | null
          name: string
          notes: string | null
          total_spent: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          default_category?: string | null
          default_payment_method?: string | null
          expense_count?: number | null
          id?: string
          last_expense_date?: string | null
          name: string
          notes?: string | null
          total_spent?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          default_category?: string | null
          default_payment_method?: string | null
          expense_count?: number | null
          id?: string
          last_expense_date?: string | null
          name?: string
          notes?: string | null
          total_spent?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      wholesalers: {
        Row: {
          active: boolean | null
          commission_paid: number | null
          commission_per_conversion: number | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          last_payment_date: string | null
          name: string
          notes: string | null
          referral_code: string
        }
        Insert: {
          active?: boolean | null
          commission_paid?: number | null
          commission_per_conversion?: number | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          last_payment_date?: string | null
          name: string
          notes?: string | null
          referral_code: string
        }
        Update: {
          active?: boolean | null
          commission_paid?: number | null
          commission_per_conversion?: number | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          last_payment_date?: string | null
          name?: string
          notes?: string | null
          referral_code?: string
        }
        Relationships: []
      }
    }
    Views: {
      expiring_documents: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          document_date: string | null
          expense_id: string | null
          expiry_date: string | null
          extracted_text: string | null
          file_size: number | null
          file_type: string | null
          id: string | null
          job_pack_id: string | null
          name: string | null
          payable_id: string | null
          storage_path: string | null
          tags: string[] | null
          tax_year: string | null
          updated_at: string | null
          user_id: string | null
          vendor_name: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          document_date?: string | null
          expense_id?: string | null
          expiry_date?: string | null
          extracted_text?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string | null
          job_pack_id?: string | null
          name?: string | null
          payable_id?: string | null
          storage_path?: string | null
          tags?: string[] | null
          tax_year?: string | null
          updated_at?: string | null
          user_id?: string | null
          vendor_name?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          document_date?: string | null
          expense_id?: string | null
          expiry_date?: string | null
          extracted_text?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string | null
          job_pack_id?: string | null
          name?: string | null
          payable_id?: string | null
          storage_path?: string | null
          tags?: string[] | null
          tax_year?: string | null
          updated_at?: string | null
          user_id?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "filed_documents_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "filed_documents_job_pack_id_fkey"
            columns: ["job_pack_id"]
            isOneToOne: false
            referencedRelation: "job_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "filed_documents_payable_id_fkey"
            columns: ["payable_id"]
            isOneToOne: false
            referencedRelation: "payables"
            referencedColumns: ["id"]
          },
        ]
      }
      filing_summary: {
        Row: {
          category: string | null
          document_count: number | null
          last_upload: string | null
          total_size: number | null
          user_id: string | null
        }
        Relationships: []
      }
      payables_summary: {
        Row: {
          due_this_week: number | null
          overdue_count: number | null
          paid_count: number | null
          partial_count: number | null
          total_outstanding: number | null
          total_overdue: number | null
          unpaid_count: number | null
          user_id: string | null
        }
        Relationships: []
      }
      reconciliation_summary: {
        Row: {
          description: string | null
          is_reconciled: boolean | null
          link_count: number | null
          linked_items: string[] | null
          total_matched: number | null
          transaction_amount: number | null
          transaction_date: string | null
          transaction_id: string | null
          unmatched_amount: number | null
          user_id: string | null
        }
        Relationships: []
      }
      trial_users_analytics: {
        Row: {
          activity_last_24h: number | null
          activity_last_7d: number | null
          avg_session_minutes: number | null
          company_name: string | null
          converted: boolean | null
          converted_at: string | null
          customers_count: number | null
          days_remaining: number | null
          engagement_score: number | null
          features_used: number | null
          first_login: string | null
          invoices_count: number | null
          job_packs_count: number | null
          last_activity: string | null
          last_login: string | null
          most_used_feature: string | null
          page_views: number | null
          quotes_count: number | null
          referral_code: string | null
          subscription_status:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          subscription_tier:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          total_logins: number | null
          total_session_minutes: number | null
          trial_end: string | null
          trial_start: string | null
          trial_status: string | null
          unique_features_used: number | null
          user_email: string | null
          user_id: string | null
        }
        Relationships: []
      }
      user_subscription_status: {
        Row: {
          is_active: boolean | null
          referral_code: string | null
          subscription_end: string | null
          subscription_start: string | null
          subscription_status:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          subscription_tier:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          trial_days_remaining: number | null
          trial_end: string | null
          trial_start: string | null
          usage_limits: Json | null
          user_id: string | null
        }
        Insert: {
          is_active?: never
          referral_code?: string | null
          subscription_end?: string | null
          subscription_start?: string | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          trial_days_remaining?: never
          trial_end?: string | null
          trial_start?: string | null
          usage_limits?: Json | null
          user_id?: string | null
        }
        Update: {
          is_active?: never
          referral_code?: string | null
          subscription_end?: string | null
          subscription_start?: string | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          trial_days_remaining?: never
          trial_end?: string | null
          trial_start?: string | null
          usage_limits?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      vat_summary: {
        Row: {
          input_vat: number | null
          output_vat: number | null
          quarter: string | null
          user_id: string | null
        }
        Relationships: []
      }
      wholesaler_stats: {
        Row: {
          active: boolean | null
          commission_owed: number | null
          commission_paid: number | null
          commission_per_conversion: number | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          id: string | null
          last_payment_date: string | null
          name: string | null
          notes: string | null
          referral_code: string | null
          total_conversions: number | null
          total_signups: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_team_invitation: { Args: { p_token: string }; Returns: Json }
      admin_extend_trial: {
        Args: { extra_days: number; target_user_id: string }
        Returns: undefined
      }
      admin_reset_trial: {
        Args: { new_trial_end: string; target_user_id: string }
        Returns: undefined
      }
      decline_team_invitation: { Args: { p_token: string }; Returns: Json }
      generate_share_token: { Args: { p_quote_id: string }; Returns: Json }
      get_next_reference_number: {
        Args: { p_type: string; p_user_id: string }
        Returns: number
      }
      get_quote_by_share_token: {
        Args: { p_share_token: string }
        Returns: Json
      }
      has_subscription_access: {
        Args: {
          required_tier: Database["public"]["Enums"]["subscription_tier"]
          user_uuid: string
        }
        Returns: boolean
      }
      is_admin_user: { Args: never; Returns: boolean }
      is_assigned_to_job: { Args: { p_job_pack_id: string }; Returns: boolean }
      is_trial_active: { Args: { user_uuid: string }; Returns: boolean }
      mark_payable_paid: {
        Args: {
          p_paid_date?: string
          p_payable_id: string
          p_transaction_id?: string
        }
        Returns: undefined
      }
      reconcile_transaction_multi: {
        Args: {
          p_expense_ids: string[]
          p_invoice_ids: string[]
          p_transaction_id: string
        }
        Returns: undefined
      }
      respond_to_quote: {
        Args: {
          p_ip?: string
          p_response: string
          p_share_token: string
          p_signature_data?: string
          p_signature_type?: string
          p_signer_name?: string
          p_user_agent?: string
        }
        Returns: Json
      }
      search_filed_documents: {
        Args: {
          p_category?: string
          p_query: string
          p_tax_year?: string
          p_user_id: string
        }
        Returns: {
          category: string
          description: string
          document_date: string
          id: string
          name: string
          rank: number
          storage_path: string
        }[]
      }
      unreconcile_transaction: {
        Args: { p_transaction_id: string }
        Returns: undefined
      }
    }
    Enums: {
      subscription_status:
        | "trialing"
        | "active"
        | "cancelled"
        | "past_due"
        | "expired"
      subscription_tier: "free" | "professional" | "business"
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
      subscription_status: [
        "trialing",
        "active",
        "cancelled",
        "past_due",
        "expired",
      ],
      subscription_tier: ["free", "professional", "business"],
    },
  },
} as const
