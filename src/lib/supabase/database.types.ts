
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
    }
                  ]
                },"charges": {
                  Row: {
                    "amount_cents": number,"canceled_reason": string | null,"competence": string,"confirmed_at": string | null,"confirmed_by": string | null,"created_at": string,"due_date": string,"id": string,"paid_on": string | null,"payment_method": Database["public"]['Enums']["payment_method"] | null,"payment_note": string | null,"status": Database["public"]['Enums']["charge_status"],"student_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cents": number,"canceled_reason"?: string | null,"competence": string,"confirmed_at"?: string | null,"confirmed_by"?: string | null,"created_at"?: string,"due_date": string,"id"?: string,"paid_on"?: string | null,"payment_method"?: Database["public"]['Enums']["payment_method"] | null,"payment_note"?: string | null,"status"?: Database["public"]['Enums']["charge_status"],"student_id": string,"updated_at"?: string
                  }
                  Update: {
                    "amount_cents"?: number,"canceled_reason"?: string | null,"competence"?: string,"confirmed_at"?: string | null,"confirmed_by"?: string | null,"created_at"?: string,"due_date"?: string,"id"?: string,"paid_on"?: string | null,"payment_method"?: Database["public"]['Enums']["payment_method"] | null,"payment_note"?: string | null,"status"?: Database["public"]['Enums']["charge_status"],"student_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "charges_confirmed_by_fkey"
      columns: ["confirmed_by"]
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
                    "abdomen_cm": number | null,"bmi": number | null,"client_id": string,"created_at": string,"created_by": string,"height_cm": number | null,"id": string,"measured_at": string,"notes": string | null,"session_id": string | null,"student_id": string,"waist_cm": number | null,"weight_kg": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "abdomen_cm"?: number | null,"bmi"?: never,"client_id": string,"created_at"?: string,"created_by"?: string,"height_cm"?: number | null,"id"?: string,"measured_at"?: string,"notes"?: string | null,"session_id"?: string | null,"student_id": string,"waist_cm"?: number | null,"weight_kg"?: number | null
                  }
                  Update: {
                    "abdomen_cm"?: number | null,"bmi"?: never,"client_id"?: string,"created_at"?: string,"created_by"?: string,"height_cm"?: number | null,"id"?: string,"measured_at"?: string,"notes"?: string | null,"session_id"?: string | null,"student_id"?: string,"waist_cm"?: number | null,"weight_kg"?: number | null
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
      foreignKeyName: "measurements_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "active": boolean,"created_at": string,"email": string,"full_name": string,"id": string,"must_change_password": boolean,"role": Database["public"]['Enums']["staff_role"],"updated_at": string,"whatsapp": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"email": string,"full_name": string,"id": string,"must_change_password"?: boolean,"role"?: Database["public"]['Enums']["staff_role"],"updated_at"?: string,"whatsapp"?: string | null
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"email"?: string,"full_name"?: string,"id"?: string,"must_change_password"?: boolean,"role"?: Database["public"]['Enums']["staff_role"],"updated_at"?: string,"whatsapp"?: string | null
                  }
                  Relationships: [
                    
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
                    "activated_at": string | null,"activated_by": string | null,"anonymized_at": string | null,"birth_date": string | null,"cep": string | null,"city": string | null,"complement": string | null,"cpf": string | null,"created_at": string,"created_by": string | null,"email": string | null,"emergency_name": string | null,"emergency_phone": string | null,"emergency_relation": string | null,"full_name": string,"goals": (string)[],"goals_notes": string | null,"height_cm": number | null,"id": string,"neighborhood": string | null,"number": string | null,"personal_id": string | null,"state": string | null,"status": Database["public"]['Enums']["student_status"],"status_changed_at": string,"street": string | null,"submitted_at": string | null,"updated_at": string,"weekly_frequency": number | null,"whatsapp": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activated_at"?: string | null,"activated_by"?: string | null,"anonymized_at"?: string | null,"birth_date"?: string | null,"cep"?: string | null,"city"?: string | null,"complement"?: string | null,"cpf"?: string | null,"created_at"?: string,"created_by"?: string | null,"email"?: string | null,"emergency_name"?: string | null,"emergency_phone"?: string | null,"emergency_relation"?: string | null,"full_name": string,"goals"?: (string)[],"goals_notes"?: string | null,"height_cm"?: number | null,"id"?: string,"neighborhood"?: string | null,"number"?: string | null,"personal_id"?: string | null,"state"?: string | null,"status"?: Database["public"]['Enums']["student_status"],"status_changed_at"?: string,"street"?: string | null,"submitted_at"?: string | null,"updated_at"?: string,"weekly_frequency"?: number | null,"whatsapp": string
                  }
                  Update: {
                    "activated_at"?: string | null,"activated_by"?: string | null,"anonymized_at"?: string | null,"birth_date"?: string | null,"cep"?: string | null,"city"?: string | null,"complement"?: string | null,"cpf"?: string | null,"created_at"?: string,"created_by"?: string | null,"email"?: string | null,"emergency_name"?: string | null,"emergency_phone"?: string | null,"emergency_relation"?: string | null,"full_name"?: string,"goals"?: (string)[],"goals_notes"?: string | null,"height_cm"?: number | null,"id"?: string,"neighborhood"?: string | null,"number"?: string | null,"personal_id"?: string | null,"state"?: string | null,"status"?: Database["public"]['Enums']["student_status"],"status_changed_at"?: string,"street"?: string | null,"submitted_at"?: string | null,"updated_at"?: string,"weekly_frequency"?: number | null,"whatsapp"?: string
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
    }
                  ]
                },"studio_settings": {
                  Row: {
                    "id": boolean,"msg_due_today": string,"msg_invite": string,"msg_overdue": string,"pix_city": string | null,"pix_key": string | null,"pix_receiver_name": string | null,"reference_fees": NonNullable<Json>,"studio_name": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: boolean,"msg_due_today": string,"msg_invite": string,"msg_overdue": string,"pix_city"?: string | null,"pix_key"?: string | null,"pix_receiver_name"?: string | null,"reference_fees"?: NonNullable<Json>,"studio_name"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "id"?: boolean,"msg_due_today"?: string,"msg_invite"?: string,"msg_overdue"?: string,"pix_city"?: string | null,"pix_key"?: string | null,"pix_receiver_name"?: string | null,"reference_fees"?: NonNullable<Json>,"studio_name"?: string,"updated_at"?: string,"updated_by"?: string | null
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
            "current_legal_documents": {
                  Row: {
                    "body": string | null,"created_at": string | null,"id": string | null,"kind": Database["public"]['Enums']["legal_doc_kind"] | null,"version": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "search_students":
{ Args: { "max_results"?: number,"q": string }; Returns: {
              "full_name": string,"id": string,"status": Database["public"]['Enums']["student_status"],"whatsapp": string
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
