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
      cases: {
        Row: {
          created_at: string
          customer_id: string
          description: string | null
          id: string
          insurance_company: string | null
          owner_id: string | null
          price: number | null
          status: Database["public"]["Enums"]["case_status"]
          updated_at: string
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_plate: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          description?: string | null
          id?: string
          insurance_company?: string | null
          owner_id?: string | null
          price?: number | null
          status?: Database["public"]["Enums"]["case_status"]
          updated_at?: string
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_plate?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          description?: string | null
          id?: string
          insurance_company?: string | null
          owner_id?: string | null
          price?: number | null
          status?: Database["public"]["Enums"]["case_status"]
          updated_at?: string
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_plate?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cases_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          lead_id: string | null
          owner_id: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          lead_id?: string | null
          owner_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          lead_id?: string | null
          owner_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          case_id: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          owner_id: string | null
          uploaded_by: string | null
        }
        Insert: {
          case_id: string
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          owner_id?: string | null
          uploaded_by?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          owner_id?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string
          email: string | null
          fb_form_id: string | null
          fb_lead_id: string | null
          full_name: string
          id: string
          message: string | null
          owner_id: string | null
          phone: string | null
          position: number
          raw_payload: Json | null
          source: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          fb_form_id?: string | null
          fb_lead_id?: string | null
          full_name: string
          id?: string
          message?: string | null
          owner_id?: string | null
          phone?: string | null
          position?: number
          raw_payload?: Json | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          fb_form_id?: string | null
          fb_lead_id?: string | null
          full_name?: string
          id?: string
          message?: string | null
          owner_id?: string | null
          phone?: string | null
          position?: number
          raw_payload?: Json | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          author_id: string | null
          body: string
          case_id: string | null
          created_at: string
          id: string
          lead_id: string | null
          owner_id: string | null
        }
        Insert: {
          author_id?: string | null
          body: string
          case_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          owner_id?: string | null
        }
        Update: {
          author_id?: string | null
          body?: string
          case_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          owner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          fb_page_access_token: string | null
          fb_page_id: string | null
          fb_verify_token: string | null
          full_name: string | null
          id: string
          phone: string | null
          workshop_name: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          fb_page_access_token?: string | null
          fb_page_id?: string | null
          fb_verify_token?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          workshop_name?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          fb_page_access_token?: string | null
          fb_page_id?: string | null
          fb_verify_token?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          workshop_name?: string | null
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: {
      case_status:
        | "preventivo"
        | "attesa_pezzi"
        | "lavorazione"
        | "completata"
        | "consegnata"
      lead_status: "nuovo" | "contattato" | "preventivo" | "cliente" | "perso"
    }
    CompositeTypes: { [_ in never]: never }
  }
}

export type Lead = Database["public"]["Tables"]["leads"]["Row"]
export type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"]
export type LeadUpdate = Database["public"]["Tables"]["leads"]["Update"]
export type LeadStatus = Database["public"]["Enums"]["lead_status"]

export type Customer = Database["public"]["Tables"]["customers"]["Row"]
export type CustomerInsert = Database["public"]["Tables"]["customers"]["Insert"]

export type Case = Database["public"]["Tables"]["cases"]["Row"]
export type CaseInsert = Database["public"]["Tables"]["cases"]["Insert"]
export type CaseUpdate = Database["public"]["Tables"]["cases"]["Update"]
export type CaseStatus = Database["public"]["Enums"]["case_status"]

export type Document = Database["public"]["Tables"]["documents"]["Row"]
export type Note = Database["public"]["Tables"]["notes"]["Row"]
export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
