import { invoke } from './_client';
import type { Establecimiento, Vaccine } from '../types';

const SERVICE = 'dashboard-service';

type ResumenAdmin = {
  establecimiento: Establecimiento | null;
  stats: { establecimientos: number; usuarios: number; pacientes: number; dosis: number };
  catalogo: Vaccine[];
};

export const dashboardService = {
  obtenerResumenAdmin: () => invoke<ResumenAdmin>(SERVICE, 'obtenerResumenAdmin'),
};
