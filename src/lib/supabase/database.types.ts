
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "agenda_settings": {
                  Row: {
                    "class_duration_min": number,"id": boolean,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "class_duration_min"?: number,"id"?: boolean,"updated_at"?: string
                  }
                  Update: {
                    "class_duration_min"?: number,"id"?: boolean,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"attendances": {
                  Row: {
                    "checked_in_at": string | null,"checked_in_by": string | null,"created_at": string,"created_by": string | null,"id": string,"kind": Database["public"]['Enums']["attendance_kind"],"session_id": string,"status": Database["public"]['Enums']["attendance_status"],"status_changed_at": string | null,"status_changed_by": string | null,"student_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "checked_in_at"?: string | null,"checked_in_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["attendance_kind"],"session_id": string,"status"?: Database["public"]['Enums']["attendance_status"],"status_changed_at"?: string | null,"status_changed_by"?: string | null,"student_id": string
                  }
                  Update: {
                    "checked_in_at"?: string | null,"checked_in_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["attendance_kind"],"session_id"?: string,"status"?: Database["public"]['Enums']["attendance_status"],"status_changed_at"?: string | null,"status_changed_by"?: string | null,"student_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "attendances_checked_in_by_fkey"
      columns: ["checked_in_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attendances_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attendances_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "class_sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attendances_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "session_occupancy"
      referencedColumns: ["session_id"]
    },{
      foreignKeyName: "attendances_status_changed_by_fkey"
      columns: ["status_changed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attendances_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"business_hours": {
                  Row: {
                    "closes_at": string,"opens_at": string,"weekday": number
                  }
                  ComputedFields: never
                  Insert: {
                    "closes_at": string,"opens_at": string,"weekday": number
                  }
                  Update: {
                    "closes_at"?: string,"opens_at"?: string,"weekday"?: number
                  }
                  Relationships: [
                    
                  ]
                },"campaigns": {
                  Row: {
                    "body": string | null,"created_at": string,"created_by": string | null,"ends_on": string,"id": string,"image_url": string | null,"link_url": string | null,"referral_bonus": boolean,"starts_on": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string | null,"created_at"?: string,"created_by"?: string | null,"ends_on": string,"id"?: string,"image_url"?: string | null,"link_url"?: string | null,"referral_bonus"?: boolean,"starts_on": string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "body"?: string | null,"created_at"?: string,"created_by"?: string | null,"ends_on"?: string,"id"?: string,"image_url"?: string | null,"link_url"?: string | null,"referral_bonus"?: boolean,"starts_on"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "campaigns_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"charge_events": {
                  Row: {
                    "action": string,"actor_id": string | null,"at": string,"charge_id": string,"id": number,"new_value": Json | null,"old_value": Json | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"at"?: string,"charge_id": string,"id"?: never,"new_value"?: Json | null,"old_value"?: Json | null
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"at"?: string,"charge_id"?: string,"id"?: never,"new_value"?: Json | null,"old_value"?: Json | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "charge_events_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "charge_events_charge_id_fkey"
      columns: ["charge_id"]
isOneToOne: false
      referencedRelation: "charges"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "charge_events_charge_id_fkey"
      columns: ["charge_id"]
isOneToOne: false
      referencedRelation: "charges_view"
      referencedColumns: ["id"]
    }
                  ]
                },"charges": {
                  Row: {
                    "amount_cents": number,"canceled_reason": string | null,"competence": string,"confirmed_at": string | null,"confirmed_by": string | null,"created_at": string,"due_date": string,"id": string,"paid_on": string | null,"payment_method": Database["public"]['Enums']["payment_method"] | null,"payment_note": string | null,"personal_id": string | null,"status": Database["public"]['Enums']["charge_status"],"student_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cents": number,"canceled_reason"?: string | null,"competence": string,"confirmed_at"?: string | null,"confirmed_by"?: string | null,"created_at"?: string,"due_date": string,"id"?: string,"paid_on"?: string | null,"payment_method"?: Database["public"]['Enums']["payment_method"] | null,"payment_note"?: string | null,"personal_id"?: string | null,"status"?: Database["public"]['Enums']["charge_status"],"student_id": string,"updated_at"?: string
                  }
                  Update: {
                    "amount_cents"?: number,"canceled_reason"?: string | null,"competence"?: string,"confirmed_at"?: string | null,"confirmed_by"?: string | null,"created_at"?: string,"due_date"?: string,"id"?: string,"paid_on"?: string | null,"payment_method"?: Database["public"]['Enums']["payment_method"] | null,"payment_note"?: string | null,"personal_id"?: string | null,"status"?: Database["public"]['Enums']["charge_status"],"student_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "charges_confirmed_by_fkey"
      columns: ["confirmed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "charges_personal_id_fkey"
      columns: ["personal_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "charges_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"class_sessions": {
                  Row: {
                    "created_at": string,"date": string,"id": string,"personal_id": string,"start_time": string,"status": Database["public"]['Enums']["session_status"],"status_reason": string | null,"time_slot_id": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"date": string,"id"?: string,"personal_id": string,"start_time": string,"status"?: Database["public"]['Enums']["session_status"],"status_reason"?: string | null,"time_slot_id": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"date"?: string,"id"?: string,"personal_id"?: string,"start_time"?: string,"status"?: Database["public"]['Enums']["session_status"],"status_reason"?: string | null,"time_slot_id"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "class_sessions_personal_id_fkey"
      columns: ["personal_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "class_sessions_time_slot_id_fkey"
      columns: ["time_slot_id"]
isOneToOne: false
      referencedRelation: "time_slot_occupancy"
      referencedColumns: ["time_slot_id"]
    },{
      foreignKeyName: "class_sessions_time_slot_id_fkey"
      columns: ["time_slot_id"]
isOneToOne: false
      referencedRelation: "time_slots"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "class_sessions_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"closures": {
                  Row: {
                    "created_at": string,"created_by": string | null,"date": string,"reason": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"date": string,"reason"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"date"?: string,"reason"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "closures_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"consents": {
                  Row: {
                    "accepted_at": string,"id": string,"ip": unknown,"legal_document_id": string,"student_id": string,"user_agent": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string,"id"?: string,"ip"?: unknown,"legal_document_id": string,"student_id": string,"user_agent"?: string | null
                  }
                  Update: {
                    "accepted_at"?: string,"id"?: string,"ip"?: unknown,"legal_document_id"?: string,"student_id"?: string,"user_agent"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "consents_legal_document_id_fkey"
      columns: ["legal_document_id"]
isOneToOne: false
      referencedRelation: "current_legal_documents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "consents_legal_document_id_fkey"
      columns: ["legal_document_id"]
isOneToOne: false
      referencedRelation: "legal_documents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "consents_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"enrollments": {
                  Row: {
                    "created_at": string,"created_by": string | null,"ends_on": string | null,"id": string,"starts_on": string,"student_id": string,"time_slot_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"ends_on"?: string | null,"id"?: string,"starts_on"?: string,"student_id": string,"time_slot_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"ends_on"?: string | null,"id"?: string,"starts_on"?: string,"student_id"?: string,"time_slot_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "enrollments_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "enrollments_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "enrollments_time_slot_id_fkey"
      columns: ["time_slot_id"]
isOneToOne: false
      referencedRelation: "time_slot_occupancy"
      referencedColumns: ["time_slot_id"]
    },{
      foreignKeyName: "enrollments_time_slot_id_fkey"
      columns: ["time_slot_id"]
isOneToOne: false
      referencedRelation: "time_slots"
      referencedColumns: ["id"]
    }
                  ]
                },"legal_documents": {
                  Row: {
                    "body": string,"created_at": string,"created_by": string | null,"id": string,"kind": Database["public"]['Enums']["legal_doc_kind"],"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["legal_doc_kind"],"version": number
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["legal_doc_kind"],"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "legal_documents_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"measurements": {
                  Row: {
                    "abdomen_cm": number | null,"bmi": number | null,"client_id": string,"created_at": string,"created_by": string | null,"height_cm": number | null,"id": string,"measured_at": string,"notes": string | null,"session_id": string | null,"source": string,"student_id": string,"waist_cm": number | null,"weight_kg": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "abdomen_cm"?: number | null,"bmi"?: never,"client_id": string,"created_at"?: string,"created_by"?: string | null,"height_cm"?: number | null,"id"?: string,"measured_at"?: string,"notes"?: string | null,"session_id"?: string | null,"source"?: string,"student_id": string,"waist_cm"?: number | null,"weight_kg"?: number | null
                  }
                  Update: {
                    "abdomen_cm"?: number | null,"bmi"?: never,"client_id"?: string,"created_at"?: string,"created_by"?: string | null,"height_cm"?: number | null,"id"?: string,"measured_at"?: string,"notes"?: string | null,"session_id"?: string | null,"source"?: string,"student_id"?: string,"waist_cm"?: number | null,"weight_kg"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "measurements_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "measurements_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "class_sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "measurements_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "session_occupancy"
      referencedColumns: ["session_id"]
    },{
      foreignKeyName: "measurements_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "active": boolean,"avatar_url": string | null,"created_at": string,"email": string,"full_name": string,"id": string,"joins_ranking": boolean | null,"must_change_password": boolean,"role": Database["public"]['Enums']["staff_role"],"updated_at": string,"whatsapp": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"avatar_url"?: string | null,"created_at"?: string,"email": string,"full_name": string,"id": string,"joins_ranking"?: boolean | null,"must_change_password"?: boolean,"role"?: Database["public"]['Enums']["staff_role"],"updated_at"?: string,"whatsapp"?: string | null
                  }
                  Update: {
                    "active"?: boolean,"avatar_url"?: string | null,"created_at"?: string,"email"?: string,"full_name"?: string,"id"?: string,"joins_ranking"?: boolean | null,"must_change_password"?: boolean,"role"?: Database["public"]['Enums']["staff_role"],"updated_at"?: string,"whatsapp"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"staff_awards": {
                  Row: {
                    "checkins": number,"classes": number,"created_at": string,"id": string,"kind": string,"month": string,"personal_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "checkins": number,"classes": number,"created_at"?: string,"id"?: string,"kind"?: string,"month": string,"personal_id": string
                  }
                  Update: {
                    "checkins"?: number,"classes"?: number,"created_at"?: string,"id"?: string,"kind"?: string,"month"?: string,"personal_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "staff_awards_personal_id_fkey"
      columns: ["personal_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"staff_commission_rates": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"personal_id": string,"rate_bp": number,"valid_from": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"personal_id": string,"rate_bp": number,"valid_from": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"personal_id"?: string,"rate_bp"?: number,"valid_from"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "staff_commission_rates_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "staff_commission_rates_personal_id_fkey"
      columns: ["personal_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"staff_payouts": {
                  Row: {
                    "amount_cents": number,"created_at": string,"created_by": string | null,"id": string,"month": string,"note": string | null,"paid_on": string,"payment_method": Database["public"]['Enums']["payment_method"],"personal_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cents": number,"created_at"?: string,"created_by"?: string | null,"id"?: string,"month": string,"note"?: string | null,"paid_on": string,"payment_method": Database["public"]['Enums']["payment_method"],"personal_id": string
                  }
                  Update: {
                    "amount_cents"?: number,"created_at"?: string,"created_by"?: string | null,"id"?: string,"month"?: string,"note"?: string | null,"paid_on"?: string,"payment_method"?: Database["public"]['Enums']["payment_method"],"personal_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "staff_payouts_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "staff_payouts_personal_id_fkey"
      columns: ["personal_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"student_billing": {
                  Row: {
                    "due_day": number,"monthly_fee_cents": number | null,"student_id": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "due_day"?: number,"monthly_fee_cents"?: number | null,"student_id": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "due_day"?: number,"monthly_fee_cents"?: number | null,"student_id"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "student_billing_student_id_fkey"
      columns: ["student_id"]
isOneToOne: true
      referencedRelation: "students"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_billing_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"student_health": {
                  Row: {
                    "clearance_received_on": string | null,"clearance_registered_at": string | null,"clearance_registered_by": string | null,"health_notes": string | null,"parq_answers": (boolean)[],"requires_clearance": boolean | null,"student_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "clearance_received_on"?: string | null,"clearance_registered_at"?: string | null,"clearance_registered_by"?: string | null,"health_notes"?: string | null,"parq_answers": (boolean)[],"requires_clearance"?: never,"student_id": string,"updated_at"?: string
                  }
                  Update: {
                    "clearance_received_on"?: string | null,"clearance_registered_at"?: string | null,"clearance_registered_by"?: string | null,"health_notes"?: string | null,"parq_answers"?: (boolean)[],"requires_clearance"?: never,"student_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "student_health_clearance_registered_by_fkey"
      columns: ["clearance_registered_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_health_student_id_fkey"
      columns: ["student_id"]
isOneToOne: true
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"student_invites": {
                  Row: {
                    "created_at": string,"created_by": string | null,"draft": NonNullable<Json>,"draft_step": number,"expires_at": string,"id": string,"student_id": string,"token_hash": string,"used_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"draft"?: NonNullable<Json>,"draft_step"?: number,"expires_at"?: string,"id"?: string,"student_id": string,"token_hash": string,"used_at"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"draft"?: NonNullable<Json>,"draft_step"?: number,"expires_at"?: string,"id"?: string,"student_id"?: string,"token_hash"?: string,"used_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "student_invites_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_invites_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"students": {
                  Row: {
                    "activated_at": string | null,"activated_by": string | null,"anonymized_at": string | null,"birth_date": string | null,"cep": string | null,"city": string | null,"complement": string | null,"cpf": string | null,"created_at": string,"created_by": string | null,"email": string | null,"emergency_name": string | null,"emergency_phone": string | null,"emergency_relation": string | null,"full_name": string,"goals": (string)[],"goals_notes": string | null,"height_cm": number | null,"id": string,"neighborhood": string | null,"number": string | null,"personal_id": string | null,"referred_by": string | null,"state": string | null,"status": Database["public"]['Enums']["student_status"],"status_changed_at": string,"street": string | null,"submitted_at": string | null,"updated_at": string,"weekly_frequency": number | null,"whatsapp": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activated_at"?: string | null,"activated_by"?: string | null,"anonymized_at"?: string | null,"birth_date"?: string | null,"cep"?: string | null,"city"?: string | null,"complement"?: string | null,"cpf"?: string | null,"created_at"?: string,"created_by"?: string | null,"email"?: string | null,"emergency_name"?: string | null,"emergency_phone"?: string | null,"emergency_relation"?: string | null,"full_name": string,"goals"?: (string)[],"goals_notes"?: string | null,"height_cm"?: number | null,"id"?: string,"neighborhood"?: string | null,"number"?: string | null,"personal_id"?: string | null,"referred_by"?: string | null,"state"?: string | null,"status"?: Database["public"]['Enums']["student_status"],"status_changed_at"?: string,"street"?: string | null,"submitted_at"?: string | null,"updated_at"?: string,"weekly_frequency"?: number | null,"whatsapp": string
                  }
                  Update: {
                    "activated_at"?: string | null,"activated_by"?: string | null,"anonymized_at"?: string | null,"birth_date"?: string | null,"cep"?: string | null,"city"?: string | null,"complement"?: string | null,"cpf"?: string | null,"created_at"?: string,"created_by"?: string | null,"email"?: string | null,"emergency_name"?: string | null,"emergency_phone"?: string | null,"emergency_relation"?: string | null,"full_name"?: string,"goals"?: (string)[],"goals_notes"?: string | null,"height_cm"?: number | null,"id"?: string,"neighborhood"?: string | null,"number"?: string | null,"personal_id"?: string | null,"referred_by"?: string | null,"state"?: string | null,"status"?: Database["public"]['Enums']["student_status"],"status_changed_at"?: string,"street"?: string | null,"submitted_at"?: string | null,"updated_at"?: string,"weekly_frequency"?: number | null,"whatsapp"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "students_activated_by_fkey"
      columns: ["activated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "students_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "students_personal_id_fkey"
      columns: ["personal_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "students_referred_by_fkey"
      columns: ["referred_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"studio_settings": {
                  Row: {
                    "id": boolean,"msg_due_today": string,"msg_invite": string,"msg_overdue": string,"msg_reminder": string,"pix_city": string | null,"pix_key": string | null,"pix_key_type": string | null,"pix_receiver_name": string | null,"reference_fees": NonNullable<Json>,"studio_name": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: boolean,"msg_due_today": string,"msg_invite": string,"msg_overdue": string,"msg_reminder"?: string,"pix_city"?: string | null,"pix_key"?: string | null,"pix_key_type"?: string | null,"pix_receiver_name"?: string | null,"reference_fees"?: NonNullable<Json>,"studio_name"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "id"?: boolean,"msg_due_today"?: string,"msg_invite"?: string,"msg_overdue"?: string,"msg_reminder"?: string,"pix_city"?: string | null,"pix_key"?: string | null,"pix_key_type"?: string | null,"pix_receiver_name"?: string | null,"reference_fees"?: NonNullable<Json>,"studio_name"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "studio_settings_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"time_slots": {
                  Row: {
                    "active": boolean,"capacity": number,"created_at": string,"id": string,"personal_id": string,"start_time": string,"updated_at": string,"weekday": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"capacity"?: number,"created_at"?: string,"id"?: string,"personal_id": string,"start_time": string,"updated_at"?: string,"weekday": number
                  }
                  Update: {
                    "active"?: boolean,"capacity"?: number,"created_at"?: string,"id"?: string,"personal_id"?: string,"start_time"?: string,"updated_at"?: string,"weekday"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "time_slots_personal_id_fkey"
      columns: ["personal_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "admin_tasks": {
                  Row: {
                    "amount_cents": number | null,"charge_id": string | null,"full_name": string | null,"kind": string | null,"priority": number | null,"ref_date": string | null,"student_id": string | null,"whatsapp": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"charges_view": {
                  Row: {
                    "amount_cents": number | null,"canceled_reason": string | null,"competence": string | null,"confirmed_at": string | null,"confirmed_by": string | null,"created_at": string | null,"days_overdue": number | null,"due_date": string | null,"effective_status": string | null,"full_name": string | null,"id": string | null,"paid_on": string | null,"payment_method": Database["public"]['Enums']["payment_method"] | null,"payment_note": string | null,"personal_id": string | null,"status": Database["public"]['Enums']["charge_status"] | null,"student_id": string | null,"updated_at": string | null,"whatsapp": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "charges_confirmed_by_fkey"
      columns: ["confirmed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "charges_personal_id_fkey"
      columns: ["personal_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "charges_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"current_legal_documents": {
                  Row: {
                    "body": string | null,"created_at": string | null,"id": string | null,"kind": Database["public"]['Enums']["legal_doc_kind"] | null,"version": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"session_occupancy": {
                  Row: {
                    "capacity": number | null,"date": string | null,"makeups": number | null,"personal_id": string | null,"present": number | null,"session_id": string | null,"start_time": string | null,"status": Database["public"]['Enums']["session_status"] | null,"status_reason": string | null,"taken": number | null,"time_slot_id": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "class_sessions_personal_id_fkey"
      columns: ["personal_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "class_sessions_time_slot_id_fkey"
      columns: ["time_slot_id"]
isOneToOne: false
      referencedRelation: "time_slot_occupancy"
      referencedColumns: ["time_slot_id"]
    },{
      foreignKeyName: "class_sessions_time_slot_id_fkey"
      columns: ["time_slot_id"]
isOneToOne: false
      referencedRelation: "time_slots"
      referencedColumns: ["id"]
    }
                  ]
                },"time_slot_occupancy": {
                  Row: {
                    "active": boolean | null,"capacity": number | null,"personal_id": string | null,"start_time": string | null,"taken": number | null,"time_slot_id": string | null,"weekday": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "time_slots_personal_id_fkey"
      columns: ["personal_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "activate_student":
{ Args: { "p_due_day": number,"p_fee_cents": number,"p_personal_id": string,"p_slot_ids": (string)[],"p_student_id": string,"p_weekly_frequency": number }; Returns: (string)[]
                           },
"anonymize_student":
{ Args: { "p_student_id": string }; Returns: undefined
                           },
"ensure_monthly_awards":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"ensure_monthly_charges":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"ensure_sessions":
{ Args: { "p_from": string,"p_to": string }; Returns: undefined
                           },
"last_measurement":
{ Args: { "p_session_id"?: string,"p_student_id": string }; Returns: {
              "abdomen_cm": number,"height_cm": number,"measured_at": string,"waist_cm": number,"weight_kg": number
            }[]
                           },
"my_payout":
{ Args: { "p_month": string }; Returns: {
              "bonus_cents": number,"paid_amount_cents": number,"paid_on": string,"total_cents": number
            }[]
                           },
"payout_details":
{ Args: { "p_month": string,"p_personal_id": string }; Returns: {
              "amount_cents": number,"bonus_cents": number,"charge_id": string,"commission_cents": number,"paid_on": string,"rate_bp": number,"student_id": string,"student_name": string
            }[]
                           },
"payout_report":
{ Args: { "p_month": string }; Returns: {
              "avatar_url": string,"base_cents": number,"bonus_cents": number,"charges_count": number,"commission_cents": number,"current_rate_bp": number,"full_name": string,"paid_amount_cents": number,"paid_on": string,"payment_method": Database["public"]['Enums']["payment_method"],"payout_note": string,"personal_id": string,"total_cents": number
            }[]
                           },
"release_student":
{ Args: { "p_status": Database["public"]['Enums']["student_status"],"p_student_id": string }; Returns: undefined
                           },
"search_students":
{ Args: { "max_results"?: number,"q": string }; Returns: {
              "full_name": string,"id": string,"status": Database["public"]['Enums']["student_status"],"whatsapp": string
            }[]
                           },
"search_students_for_makeup":
{ Args: { "p_session_id": string,"q": string }; Returns: {
              "full_name": string,"id": string,"is_mine": boolean,"owner_name": string
            }[]
                           },
"session_roster":
{ Args: { "p_session_id": string }; Returns: {
              "attendance_id": string,"checked_in_at": string,"created_at": string,"created_by_name": string,"full_name": string,"health_flag": boolean,"is_mine": boolean,"kind": Database["public"]['Enums']["attendance_kind"],"last_measured_at": string,"owner_name": string,"status": Database["public"]['Enums']["attendance_status"],"student_id": string
            }[]
                           },
"set_student_schedule":
{ Args: { "p_slot_ids": (string)[],"p_student_id": string }; Returns: undefined
                           },
"submit_signup":
{ Args: { "p_data": Json,"p_doc_ids": (string)[],"p_ip": unknown,"p_token_hash": string,"p_user_agent": string }; Returns: string
                           },
"teaching_ranking":
{ Args: { "p_month": string }; Returns: {
              "avatar_url": string,"checkins": number,"classes": number,"full_name": string,"personal_id": string,"rank_position": number
            }[]
                           }
          }
          Enums: {
            "attendance_kind": "fixo"|"reposicao","attendance_status": "previsto"|"presente"|"falta"|"falta_justificada","charge_status": "pendente"|"pago"|"cancelado","legal_doc_kind": "termos"|"lgpd"|"declaracao_saude","payment_method": "pix"|"dinheiro"|"cartao"|"outro","session_status": "normal"|"cancelada"|"feriado","staff_role": "admin"|"personal","student_status": "convidado"|"aguardando"|"ativo"|"pausado"|"inativo"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "attendance_kind": ["fixo", "reposicao"],"attendance_status": ["previsto", "presente", "falta", "falta_justificada"],"charge_status": ["pendente", "pago", "cancelado"],"legal_doc_kind": ["termos", "lgpd", "declaracao_saude"],"payment_method": ["pix", "dinheiro", "cartao", "outro"],"session_status": ["normal", "cancelada", "feriado"],"staff_role": ["admin", "personal"],"student_status": ["convidado", "aguardando", "ativo", "pausado", "inativo"]
          }
        }
} as const
