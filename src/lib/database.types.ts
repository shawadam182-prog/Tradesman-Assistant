export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      customers: {
        Row: {
          id: string
          user_id: string
          name: string
          email: string | null
          phone: string | null
          address: string | null
          company: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          email?: string | null
          phone?: string | null
          address?: string | null
          company?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          email?: string | null
          phone?: string | null
          address?: string | null
          company?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      job_packs: {
        Row: {
          id: string
          user_id: string
          customer_id: string | null
          title: string
          status: 'active' | 'completed' | 'archived'
          notepad: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          customer_id?: string | null
          title: string
          status?: 'active' | 'completed' | 'archived'
          notepad?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          customer_id?: string | null
          title?: string
          status?: 'active' | 'completed' | 'archived'
          notepad?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      site_notes: {
        Row: {
          id: string
          job_pack_id: string
          text: string
          is_voice: boolean
          created_at: string
        }
        Insert: {
          id?: string
          job_pack_id: string
          text: string
          is_voice?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          job_pack_id?: string
          text?: string
          is_voice?: boolean
          created_at?: string
        }
      }
      site_photos: {
        Row: {
          id: string
          job_pack_id: string
          storage_path: string
          caption: string | null
          tags: string[]
          is_drawing: boolean
          created_at: string
        }
        Insert: {
          id?: string
          job_pack_id: string
          storage_path: string
          caption?: string | null
          tags?: string[]
          is_drawing?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          job_pack_id?: string
          storage_path?: string
          caption?: string | null
          tags?: string[]
          is_drawing?: boolean
          created_at?: string
        }
      }
      site_documents: {
        Row: {
          id: string
          job_pack_id: string
          name: string
          storage_path: string
          file_type: string | null
          summary: string | null
          created_at: string
        }
        Insert: {
          id?: string
          job_pack_id: string
          name: string
          storage_path: string
          file_type?: string | null
          summary?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          job_pack_id?: string
          name?: string
          storage_path?: string
          file_type?: string | null
          summary?: string | null
          created_at?: string
        }
      }
      project_materials: {
        Row: {
          id: string
          job_pack_id: string
          name: string
          unit: string | null
          quoted_qty: number
          ordered_qty: number
          delivered_qty: number
          used_qty: number
          status: 'pending' | 'ordered' | 'delivered' | 'partially_delivered'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          job_pack_id: string
          name: string
          unit?: string | null
          quoted_qty?: number
          ordered_qty?: number
          delivered_qty?: number
          used_qty?: number
          status?: 'pending' | 'ordered' | 'delivered' | 'partially_delivered'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          job_pack_id?: string
          name?: string
          unit?: string | null
          quoted_qty?: number
          ordered_qty?: number
          delivered_qty?: number
          used_qty?: number
          status?: 'pending' | 'ordered' | 'delivered' | 'partially_delivered'
          created_at?: string
          updated_at?: string
        }
      }
      quotes: {
        Row: {
          id: string
          user_id: string
          customer_id: string | null
          job_pack_id: string | null
          reference_number: number | null
          title: string
          type: 'estimate' | 'quotation' | 'invoice'
          status: 'draft' | 'sent' | 'accepted' | 'declined' | 'invoiced' | 'paid'
          sections: Json
          labour_rate: number
          markup_percent: number
          tax_percent: number
          cis_percent: number
          notes: string | null
          display_options: Json | null
          date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          customer_id?: string | null
          job_pack_id?: string | null
          reference_number?: number | null
          title: string
          type?: 'estimate' | 'quotation' | 'invoice'
          status?: 'draft' | 'sent' | 'accepted' | 'declined' | 'invoiced' | 'paid'
          sections?: Json
          labour_rate?: number
          markup_percent?: number
          tax_percent?: number
          cis_percent?: number
          notes?: string | null
          display_options?: Json | null
          date?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          customer_id?: string | null
          job_pack_id?: string | null
          reference_number?: number | null
          title?: string
          type?: 'estimate' | 'quotation' | 'invoice'
          status?: 'draft' | 'sent' | 'accepted' | 'declined' | 'invoiced' | 'paid'
          sections?: Json
          labour_rate?: number
          markup_percent?: number
          tax_percent?: number
          cis_percent?: number
          notes?: string | null
          display_options?: Json | null
          date?: string
          created_at?: string
          updated_at?: string
        }
      }
      schedule_entries: {
        Row: {
          id: string
          user_id: string
          job_pack_id: string | null
          customer_id: string | null
          title: string
          description: string | null
          location: string | null
          start_time: string
          end_time: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          job_pack_id?: string | null
          customer_id?: string | null
          title: string
          description?: string | null
          location?: string | null
          start_time: string
          end_time: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          job_pack_id?: string | null
          customer_id?: string | null
          title?: string
          description?: string | null
          location?: string | null
          start_time?: string
          end_time?: string
          created_at?: string
          updated_at?: string
        }
      }
      user_settings: {
        Row: {
          id: string
          user_id: string
          default_labour_rate: number
          default_tax_rate: number
          default_cis_rate: number
          company_name: string | null
          company_address: string | null
          company_logo_path: string | null
          footer_logos: string[]
          enable_vat: boolean
          enable_cis: boolean
          quote_prefix: string
          invoice_prefix: string
          default_quote_notes: string | null
          default_invoice_notes: string | null
          cost_box_color: string
          show_breakdown: boolean
          default_display_options: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          default_labour_rate?: number
          default_tax_rate?: number
          default_cis_rate?: number
          company_name?: string | null
          company_address?: string | null
          company_logo_path?: string | null
          footer_logos?: string[]
          enable_vat?: boolean
          enable_cis?: boolean
          quote_prefix?: string
          invoice_prefix?: string
          default_quote_notes?: string | null
          default_invoice_notes?: string | null
          cost_box_color?: string
          show_breakdown?: boolean
          default_display_options?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          default_labour_rate?: number
          default_tax_rate?: number
          default_cis_rate?: number
          company_name?: string | null
          company_address?: string | null
          company_logo_path?: string | null
          footer_logos?: string[]
          enable_vat?: boolean
          enable_cis?: boolean
          quote_prefix?: string
          invoice_prefix?: string
          default_quote_notes?: string | null
          default_invoice_notes?: string | null
          cost_box_color?: string
          show_breakdown?: boolean
          default_display_options?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Functions: {
      get_next_reference_number: {
        Args: { p_user_id: string; p_type: string }
        Returns: number
      }
    }
  }
}
