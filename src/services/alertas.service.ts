import { invoke } from './_client';

const SERVICE = 'alertas-service';

export type Alerta = {
  id: string;
  titulo: string;
  resumen: string;
  nivel: 'info' | 'warning' | 'critical';
  fuente_url: string | null;
  fecha_generacion: string;
  departamento: string | null;
  municipio: string | null;
  enfermedad: string | null;
};

export const alertasService = {
  listarActivas: () => invoke<Alerta[]>(SERVICE, 'listarActivas'),

  obtenerAlertaCercana: (payload: { departamento: string }) =>
    invoke<Pick<Alerta, 'id' | 'titulo' | 'resumen' | 'nivel' | 'departamento' | 'municipio' | 'fecha_generacion'> | null>(
      SERVICE, 'obtenerAlertaCercana', payload,
    ),
};
