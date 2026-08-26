import { invoke } from './_client';
import type { Establecimiento, TipoEstablecimiento } from '../types';

const SERVICE = 'establecimientos-service';

export const establecimientosService = {
  crear: (payload: { nombre_establecimiento: string; ciudad_municipio: string; tipo: TipoEstablecimiento }) =>
    invoke<Establecimiento>(SERVICE, 'crear', payload),

  listar: () => invoke<Establecimiento[]>(SERVICE, 'listar'),

  obtenerPorId: (payload: { id_establecimiento: string }) =>
    invoke<Establecimiento>(SERVICE, 'obtenerPorId', payload),

  contarEstablecimientos: () => invoke<{ total: number }>(SERVICE, 'contarEstablecimientos'),

  actualizar: (payload: {
    id_establecimiento: string;
    nombre_establecimiento?: string;
    ciudad_municipio?: string;
    tipo?: TipoEstablecimiento;
  }) => invoke<Establecimiento>(SERVICE, 'actualizar', payload),

  eliminar: (payload: { id_establecimiento: string }) =>
    invoke<{ eliminado: true }>(SERVICE, 'eliminar', payload),
};
