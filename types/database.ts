export type EstadoObra = "pendiente" | "aprobado" | "rechazado" | "cuarentena";
export type EstadoReto = "activo" | "en_cola" | "finalizado" | "eliminado";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      perfiles: {
        Row: {
          id: string;
          nombre_usuario: string;
          nombre_completo: string | null;
          es_admin: boolean;
          creado_en: string;
          actualizado_en: string;
        };
        Insert: {
          id: string;
          nombre_usuario: string;
          nombre_completo?: string | null;
          es_admin?: boolean;
          creado_en?: string;
          actualizado_en?: string;
        };
        Update: {
          id?: string;
          nombre_usuario?: string;
          nombre_completo?: string | null;
          es_admin?: boolean;
          creado_en?: string;
          actualizado_en?: string;
        };
        Relationships: [];
      };
      retos: {
        Row: {
          id: string;
          titulo: string;
          descripcion: string;
          estado: EstadoReto;
          orden_cola: number | null;
          fecha_inicio: string | null;
          fecha_fin: string | null;
          creado_en: string;
        };
        Insert: {
          id?: string;
          titulo: string;
          descripcion?: string;
          estado?: EstadoReto;
          orden_cola?: number | null;
          fecha_inicio?: string | null;
          fecha_fin?: string | null;
          creado_en?: string;
        };
        Update: {
          id?: string;
          titulo?: string;
          descripcion?: string;
          estado?: EstadoReto;
          orden_cola?: number | null;
          fecha_inicio?: string | null;
          fecha_fin?: string | null;
          creado_en?: string;
        };
        Relationships: [];
      };
      obras: {
        Row: {
          id: string;
          id_reto: string;
          id_usuario: string;
          titulo: string;
          id_cloudflare: string;
          estado: EstadoObra;
          comprobado: boolean;
          creado_en: string;
        };
        Insert: {
          id?: string;
          id_reto: string;
          id_usuario: string;
          titulo: string;
          id_cloudflare: string;
          estado?: EstadoObra;
          comprobado?: boolean;
          creado_en?: string;
        };
        Update: {
          id?: string;
          id_reto?: string;
          id_usuario?: string;
          titulo?: string;
          id_cloudflare?: string;
          estado?: EstadoObra;
          comprobado?: boolean;
          creado_en?: string;
        };
        Relationships: [
          {
            foreignKeyName: "obras_id_reto_fkey";
            columns: ["id_reto"];
            isOneToOne: false;
            referencedRelation: "retos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "obras_id_usuario_fkey";
            columns: ["id_usuario"];
            isOneToOne: false;
            referencedRelation: "perfiles";
            referencedColumns: ["id"];
          },
        ];
      };
      reportes: {
        Row: {
          id: string;
          id_video: string;
          id_usuario: string;
          motivo: string;
          creado_en: string;
        };
        Insert: {
          id?: string;
          id_video: string;
          id_usuario: string;
          motivo: string;
          creado_en?: string;
        };
        Update: {
          id?: string;
          id_video?: string;
          id_usuario?: string;
          motivo?: string;
          creado_en?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reportes_id_video_fkey";
            columns: ["id_video"];
            isOneToOne: false;
            referencedRelation: "obras";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reportes_id_usuario_fkey";
            columns: ["id_usuario"];
            isOneToOne: false;
            referencedRelation: "perfiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      estado_obra: EstadoObra;
      estado_reto: EstadoReto;
    };
    CompositeTypes: Record<string, never>;
  };
}
