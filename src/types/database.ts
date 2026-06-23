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
      organizations: {
        Row: {
          id: string
          name: string
          created_at: string
          google_maps_api_key: string | null
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          google_maps_api_key?: string | null
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          google_maps_api_key?: string | null
        }
      }
      stores: {
        Row: {
          id: string
          organization_id: string
          name: string
          country: string
          waba_number: string | null
          meta_pixel_id: string | null
          meta_capi_token: string | null
          fb_page_id: string | null
          ig_account_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          country: string
          waba_number?: string | null
          meta_pixel_id?: string | null
          meta_capi_token?: string | null
          fb_page_id?: string | null
          ig_account_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          country?: string
          waba_number?: string | null
          meta_pixel_id?: string | null
          meta_capi_token?: string | null
          fb_page_id?: string | null
          ig_account_id?: string | null
          created_at?: string
        }
      }
      products: {
        Row: {
          id: string
          store_id: string
          name: string
          price: number
          master_prompt: string | null
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          name: string
          price: number
          master_prompt?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          name?: string
          price?: number
          master_prompt?: string | null
          created_at?: string
        }
      }
      leads: {
        Row: {
          id: string
          store_id: string
          name: string
          phone: string
          traffic_source: string | null
          board_type: 'sales_wa' | 'social_media' | 'logistics'
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          name: string
          phone: string
          traffic_source?: string | null
          board_type: 'sales_wa' | 'social_media' | 'logistics'
          status: string
          created_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          name?: string
          phone?: string
          traffic_source?: string | null
          board_type?: 'sales_wa' | 'social_media' | 'logistics'
          status?: string
          created_at?: string
        }
      }
    }
  }
}
