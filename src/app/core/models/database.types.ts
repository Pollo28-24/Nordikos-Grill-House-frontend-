
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "categorias": {
                  Row: {
                    "created_at": string | null,"descripcion": string | null,"id": number,"nombre": string,"orden": number | null,"updated_at": string | null,"visible": boolean | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string | null,"descripcion"?: string | null,"id"?: never,"nombre": string,"orden"?: number | null,"updated_at"?: string | null,"visible"?: boolean | null
                  }
                  Update: {
                    "created_at"?: string | null,"descripcion"?: string | null,"id"?: never,"nombre"?: string,"orden"?: number | null,"updated_at"?: string | null,"visible"?: boolean | null
                  }
                  Relationships: [
                    
                  ]
                },"clientes": {
                  Row: {
                    "created_at": string | null,"direccion": string | null,"email": string | null,"id": number,"nombre": string | null,"telefono": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string | null,"direccion"?: string | null,"email"?: string | null,"id"?: never,"nombre"?: string | null,"telefono"?: string | null
                  }
                  Update: {
                    "created_at"?: string | null,"direccion"?: string | null,"email"?: string | null,"id"?: never,"nombre"?: string | null,"telefono"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"metodos_pago": {
                  Row: {
                    "created_at": string | null,"id": number,"nombre": string,"tipo": string,"updated_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string | null,"id"?: never,"nombre": string,"tipo": string,"updated_at"?: string | null
                  }
                  Update: {
                    "created_at"?: string | null,"id"?: never,"nombre"?: string,"tipo"?: string,"updated_at"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"modificador_categorias": {
                  Row: {
                    "created_at": string | null,"descripcion": string | null,"id": number,"max_selections": number,"min_selections": number,"nombre": string,"obligatorio": boolean,"orden_visual": number,"tipo_seleccion": string,"updated_at": string | null,"visible": boolean | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string | null,"descripcion"?: string | null,"id"?: never,"max_selections"?: number,"min_selections"?: number,"nombre": string,"obligatorio"?: boolean,"orden_visual"?: number,"tipo_seleccion"?: string,"updated_at"?: string | null,"visible"?: boolean | null
                  }
                  Update: {
                    "created_at"?: string | null,"descripcion"?: string | null,"id"?: never,"max_selections"?: number,"min_selections"?: number,"nombre"?: string,"obligatorio"?: boolean,"orden_visual"?: number,"tipo_seleccion"?: string,"updated_at"?: string | null,"visible"?: boolean | null
                  }
                  Relationships: [
                    
                  ]
                },"modificadores": {
                  Row: {
                    "cantidad_maxima": number | null,"categoria_id": number | null,"costo": number | null,"created_at": string | null,"descuento": number | null,"disponible": boolean,"id": number,"nombre": string,"precio": number,"sku": string | null,"updated_at": string | null,"visible": boolean | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cantidad_maxima"?: number | null,"categoria_id"?: number | null,"costo"?: number | null,"created_at"?: string | null,"descuento"?: number | null,"disponible"?: boolean,"id"?: never,"nombre": string,"precio": number,"sku"?: string | null,"updated_at"?: string | null,"visible"?: boolean | null
                  }
                  Update: {
                    "cantidad_maxima"?: number | null,"categoria_id"?: number | null,"costo"?: number | null,"created_at"?: string | null,"descuento"?: number | null,"disponible"?: boolean,"id"?: never,"nombre"?: string,"precio"?: number,"sku"?: string | null,"updated_at"?: string | null,"visible"?: boolean | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "modificadores_categoria_id_fkey"
      columns: ["categoria_id"]
isOneToOne: false
      referencedRelation: "modificador_categorias"
      referencedColumns: ["id"]
    }
                  ]
                },"order_daily_counter": {
                  Row: {
                    "fecha": string,"last_value": number
                  }
                  ComputedFields: never
                  Insert: {
                    "fecha": string,"last_value": number
                  }
                  Update: {
                    "fecha"?: string,"last_value"?: number
                  }
                  Relationships: [
                    
                  ]
                },"order_item_modificadores": {
                  Row: {
                    "cantidad": number,"id": number,"modificador_id": number | null,"nombre_modificador": string,"order_item_id": number | null,"precio_unitario": number
                  }
                  ComputedFields: never
                  Insert: {
                    "cantidad": number,"id"?: never,"modificador_id"?: number | null,"nombre_modificador": string,"order_item_id"?: number | null,"precio_unitario": number
                  }
                  Update: {
                    "cantidad"?: number,"id"?: never,"modificador_id"?: number | null,"nombre_modificador"?: string,"order_item_id"?: number | null,"precio_unitario"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_item_modificadores_modificador_id_fkey"
      columns: ["modificador_id"]
isOneToOne: false
      referencedRelation: "modificadores"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_item_modificadores_order_item_id_fkey"
      columns: ["order_item_id"]
isOneToOne: false
      referencedRelation: "order_items"
      referencedColumns: ["id"]
    }
                  ]
                },"order_items": {
                  Row: {
                    "cantidad": number,"estado": string | null,"id": number,"nombre_producto": string,"nota": string | null,"order_id": number | null,"precio_unitario": number,"producto_id": number | null,"total": number,"variante_id": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cantidad": number,"estado"?: string | null,"id"?: never,"nombre_producto": string,"nota"?: string | null,"order_id"?: number | null,"precio_unitario": number,"producto_id"?: number | null,"total": number,"variante_id"?: number | null
                  }
                  Update: {
                    "cantidad"?: number,"estado"?: string | null,"id"?: never,"nombre_producto"?: string,"nota"?: string | null,"order_id"?: number | null,"precio_unitario"?: number,"producto_id"?: number | null,"total"?: number,"variante_id"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_items_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_producto_id_fkey"
      columns: ["producto_id"]
isOneToOne: false
      referencedRelation: "productos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_variante_id_fkey"
      columns: ["variante_id"]
isOneToOne: false
      referencedRelation: "producto_variantes"
      referencedColumns: ["id"]
    }
                  ]
                },"order_request_item_modificadores": {
                  Row: {
                    "cantidad": number,"id": number,"modificador_id": number | null,"nombre_modificador": string,"precio_unitario": number,"request_item_id": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cantidad": number,"id"?: never,"modificador_id"?: number | null,"nombre_modificador": string,"precio_unitario"?: number,"request_item_id"?: number | null
                  }
                  Update: {
                    "cantidad"?: number,"id"?: never,"modificador_id"?: number | null,"nombre_modificador"?: string,"precio_unitario"?: number,"request_item_id"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_request_item_modificadores_modificador_id_fkey"
      columns: ["modificador_id"]
isOneToOne: false
      referencedRelation: "modificadores"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_request_item_modificadores_request_item_id_fkey"
      columns: ["request_item_id"]
isOneToOne: false
      referencedRelation: "order_request_items"
      referencedColumns: ["id"]
    }
                  ]
                },"order_request_items": {
                  Row: {
                    "cantidad": number,"id": number,"nombre_producto": string,"nota": string | null,"precio_unitario": number,"producto_id": number | null,"request_id": number | null,"total": number,"variante_id": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cantidad": number,"id"?: never,"nombre_producto": string,"nota"?: string | null,"precio_unitario": number,"producto_id"?: number | null,"request_id"?: number | null,"total": number,"variante_id"?: number | null
                  }
                  Update: {
                    "cantidad"?: number,"id"?: never,"nombre_producto"?: string,"nota"?: string | null,"precio_unitario"?: number,"producto_id"?: number | null,"request_id"?: number | null,"total"?: number,"variante_id"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_request_items_producto_id_fkey"
      columns: ["producto_id"]
isOneToOne: false
      referencedRelation: "productos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_request_items_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "order_requests"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_request_items_variante_id_fkey"
      columns: ["variante_id"]
isOneToOne: false
      referencedRelation: "producto_variantes"
      referencedColumns: ["id"]
    }
                  ]
                },"order_requests": {
                  Row: {
                    "accepted_at": string | null,"accuracy": number | null,"cliente_id": number | null,"created_at": string | null,"direccion_entrega": string | null,"estado": string,"id": number,"latitude": number | null,"longitude": number | null,"metodo_pago_id": number | null,"motivo_rechazo": string | null,"nota_general": string | null,"numero_mesa": string | null,"referencias": string | null,"request_code": string | null,"tipo_servicio_id": number | null,"total": number
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"accuracy"?: number | null,"cliente_id"?: number | null,"created_at"?: string | null,"direccion_entrega"?: string | null,"estado"?: string,"id"?: never,"latitude"?: number | null,"longitude"?: number | null,"metodo_pago_id"?: number | null,"motivo_rechazo"?: string | null,"nota_general"?: string | null,"numero_mesa"?: string | null,"referencias"?: string | null,"request_code"?: string | null,"tipo_servicio_id"?: number | null,"total": number
                  }
                  Update: {
                    "accepted_at"?: string | null,"accuracy"?: number | null,"cliente_id"?: number | null,"created_at"?: string | null,"direccion_entrega"?: string | null,"estado"?: string,"id"?: never,"latitude"?: number | null,"longitude"?: number | null,"metodo_pago_id"?: number | null,"motivo_rechazo"?: string | null,"nota_general"?: string | null,"numero_mesa"?: string | null,"referencias"?: string | null,"request_code"?: string | null,"tipo_servicio_id"?: number | null,"total"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_requests_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_requests_metodo_pago_id_fkey"
      columns: ["metodo_pago_id"]
isOneToOne: false
      referencedRelation: "metodos_pago"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_requests_tipo_servicio_id_fkey"
      columns: ["tipo_servicio_id"]
isOneToOne: false
      referencedRelation: "tipos_servicio"
      referencedColumns: ["id"]
    }
                  ]
                },"orders": {
                  Row: {
                    "accuracy": number | null,"client_request_id": string | null,"cliente_id": number | null,"direccion_entrega": string | null,"estado_pago": string,"estado_pedido": string,"fecha_cierre": string | null,"fecha_creacion": string | null,"id": number,"latitude": number | null,"longitude": number | null,"metodo_pago_id": number | null,"motivo_cancelacion": string | null,"nota_general": string | null,"numero_mesa": string | null,"numero_orden": number | null,"propina": number | null,"referencias": string | null,"tipo_servicio_id": number | null,"total": number,"turno_id": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "accuracy"?: number | null,"client_request_id"?: string | null,"cliente_id"?: number | null,"direccion_entrega"?: string | null,"estado_pago"?: string,"estado_pedido"?: string,"fecha_cierre"?: string | null,"fecha_creacion"?: string | null,"id"?: never,"latitude"?: number | null,"longitude"?: number | null,"metodo_pago_id"?: number | null,"motivo_cancelacion"?: string | null,"nota_general"?: string | null,"numero_mesa"?: string | null,"numero_orden"?: number | null,"propina"?: number | null,"referencias"?: string | null,"tipo_servicio_id"?: number | null,"total": number,"turno_id"?: number | null
                  }
                  Update: {
                    "accuracy"?: number | null,"client_request_id"?: string | null,"cliente_id"?: number | null,"direccion_entrega"?: string | null,"estado_pago"?: string,"estado_pedido"?: string,"fecha_cierre"?: string | null,"fecha_creacion"?: string | null,"id"?: never,"latitude"?: number | null,"longitude"?: number | null,"metodo_pago_id"?: number | null,"motivo_cancelacion"?: string | null,"nota_general"?: string | null,"numero_mesa"?: string | null,"numero_orden"?: number | null,"propina"?: number | null,"referencias"?: string | null,"tipo_servicio_id"?: number | null,"total"?: number,"turno_id"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "orders_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_metodo_pago_id_fkey"
      columns: ["metodo_pago_id"]
isOneToOne: false
      referencedRelation: "metodos_pago"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_tipo_servicio_id_fkey"
      columns: ["tipo_servicio_id"]
isOneToOne: false
      referencedRelation: "tipos_servicio"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_turno_id_fkey"
      columns: ["turno_id"]
isOneToOne: false
      referencedRelation: "turnos"
      referencedColumns: ["id"]
    }
                  ]
                },"producto_fotos": {
                  Row: {
                    "id": number,"producto_id": number | null,"url": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: never,"producto_id"?: number | null,"url": string
                  }
                  Update: {
                    "id"?: never,"producto_id"?: number | null,"url"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "producto_fotos_producto_id_fkey"
      columns: ["producto_id"]
isOneToOne: false
      referencedRelation: "productos"
      referencedColumns: ["id"]
    }
                  ]
                },"producto_modificadores": {
                  Row: {
                    "cantidad_maxima": number | null,"created_at": string | null,"modificador_id": number,"producto_id": number,"updated_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cantidad_maxima"?: number | null,"created_at"?: string | null,"modificador_id": number,"producto_id": number,"updated_at"?: string | null
                  }
                  Update: {
                    "cantidad_maxima"?: number | null,"created_at"?: string | null,"modificador_id"?: number,"producto_id"?: number,"updated_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "producto_modificadores_modificador_id_fkey"
      columns: ["modificador_id"]
isOneToOne: false
      referencedRelation: "modificadores"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "producto_modificadores_producto_id_fkey"
      columns: ["producto_id"]
isOneToOne: false
      referencedRelation: "productos"
      referencedColumns: ["id"]
    }
                  ]
                },"producto_variantes": {
                  Row: {
                    "costo": number | null,"created_at": string | null,"descuento": number | null,"disponible": boolean | null,"embalaje": string | null,"id": number,"nombre": string,"precio": number,"producto_id": number | null,"sku": string | null,"updated_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "costo"?: number | null,"created_at"?: string | null,"descuento"?: number | null,"disponible"?: boolean | null,"embalaje"?: string | null,"id"?: never,"nombre": string,"precio": number,"producto_id"?: number | null,"sku"?: string | null,"updated_at"?: string | null
                  }
                  Update: {
                    "costo"?: number | null,"created_at"?: string | null,"descuento"?: number | null,"disponible"?: boolean | null,"embalaje"?: string | null,"id"?: never,"nombre"?: string,"precio"?: number,"producto_id"?: number | null,"sku"?: string | null,"updated_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "producto_variantes_producto_id_fkey"
      columns: ["producto_id"]
isOneToOne: false
      referencedRelation: "productos"
      referencedColumns: ["id"]
    }
                  ]
                },"productos": {
                  Row: {
                    "categoria_id": number | null,"costo": number | null,"created_at": string | null,"descripcion": string | null,"descuento": number | null,"disponible": boolean | null,"embalaje": string | null,"id": number,"nombre": string,"orden": number | null,"precio": number | null,"price_type": string,"sku": string | null,"updated_at": string | null,"visible": boolean | null
                  }
                  ComputedFields: never
                  Insert: {
                    "categoria_id"?: number | null,"costo"?: number | null,"created_at"?: string | null,"descripcion"?: string | null,"descuento"?: number | null,"disponible"?: boolean | null,"embalaje"?: string | null,"id"?: never,"nombre": string,"orden"?: number | null,"precio"?: number | null,"price_type": string,"sku"?: string | null,"updated_at"?: string | null,"visible"?: boolean | null
                  }
                  Update: {
                    "categoria_id"?: number | null,"costo"?: number | null,"created_at"?: string | null,"descripcion"?: string | null,"descuento"?: number | null,"disponible"?: boolean | null,"embalaje"?: string | null,"id"?: never,"nombre"?: string,"orden"?: number | null,"precio"?: number | null,"price_type"?: string,"sku"?: string | null,"updated_at"?: string | null,"visible"?: boolean | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "productos_categoria_id_fkey"
      columns: ["categoria_id"]
isOneToOne: false
      referencedRelation: "categorias"
      referencedColumns: ["id"]
    }
                  ]
                },"tickets": {
                  Row: {
                    "created_at": string | null,"id": number,"impreso": boolean | null,"order_id": number | null,"tipo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string | null,"id"?: never,"impreso"?: boolean | null,"order_id"?: number | null,"tipo": string
                  }
                  Update: {
                    "created_at"?: string | null,"id"?: never,"impreso"?: boolean | null,"order_id"?: number | null,"tipo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tickets_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"tipos_servicio": {
                  Row: {
                    "id": number,"nombre": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: never,"nombre": string
                  }
                  Update: {
                    "id"?: never,"nombre"?: string
                  }
                  Relationships: [
                    
                  ]
                },"turnos": {
                  Row: {
                    "hora_fin": string | null,"hora_inicio": string | null,"id": number,"nombre": string
                  }
                  ComputedFields: never
                  Insert: {
                    "hora_fin"?: string | null,"hora_inicio"?: string | null,"id"?: never,"nombre": string
                  }
                  Update: {
                    "hora_fin"?: string | null,"hora_inicio"?: string | null,"id"?: never,"nombre"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "accept_order_request":
{ Args: { "p_metodo_pago_id": number,"p_request_id": number,"p_turno_id"?: number }; Returns: Json
                           },
"create_public_order_request_v1":
{ Args: { "p_client_info"?: Json,"p_direccion_entrega"?: string,"p_items"?: Json,"p_location"?: Json,"p_metodo_pago_id"?: number,"p_nota_general"?: string,"p_numero_mesa"?: string,"p_referencias"?: string,"p_tipo_servicio_id"?: number }; Returns: Json
                           },
"get_next_order_number":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"orders_create_v1":
{ Args: { "p_client_request_id": string,"p_cliente_id": number,"p_items": Json,"p_metodo_pago_id": number,"p_propina": number,"p_tipo_servicio_id": number,"p_turno_id": number }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
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
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
