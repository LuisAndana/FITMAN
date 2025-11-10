export interface NutriologoPublic {
  id_usuario: number;
  nombre?: string;
  profesion?: string;
  numero_cedula_mask?: string;
  validado: boolean;
  documento_url?: string;
}

export interface NutriologosResponse {
  page: number;
  size: number;
  total: number;
  items: NutriologoPublic[];
}
