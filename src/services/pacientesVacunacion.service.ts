import { invoke } from './_client';
import type { Paciente, Vaccine, Dose } from '../types';

const SERVICE = 'pacientes-vacunacion-service';

type PacienteConTutor = Paciente & {
  usuarios?: { nombre_completo: string; correo_electronico: string } | null;
};

type PacienteAtendido = {
  id_paciente: string;
  nombre_completo: string;
  fecha_nacimiento: string;
  sexo: 'M' | 'F';
  ultima_atencion: string;
};

type AtencionReciente = {
  id_registro: string;
  fecha_aplicacion: string;
  cat_vacunas_oficiales?: { nombre_enfermedad: string; dosis_numero: string } | null;
  pacientes?: { nombre_completo: string } | null;
};

export const pacientesVacunacionService = {
  listarCatalogoVacunas: () => invoke<Vaccine[]>(SERVICE, 'listarCatalogoVacunas'),

  registrarPaciente: (payload: {
    nombre_completo: string;
    fecha_nacimiento: string;
    sexo: 'M' | 'F';
    es_embarazada?: boolean;
    id_tutor_registro?: string;
  }) => invoke<Paciente>(SERVICE, 'registrarPaciente', payload),

  listarHijosDeTutor: () => invoke<Paciente[]>(SERVICE, 'listarHijosDeTutor'),

  obtenerProximaVacunaTutor: () =>
    invoke<{
      fecha_vencimiento_proxima: string;
      cat_vacunas_oficiales?: { nombre_enfermedad: string } | null;
      pacientes?: { nombre_completo: string } | null;
    } | null>(SERVICE, 'obtenerProximaVacunaTutor'),

  obtenerPacientePorQR: (payload: { id_paciente: string; token: string }) =>
    invoke<{ id_paciente: string; nombre_completo: string; codigo_qr_token: string }>(
      SERVICE, 'obtenerPacientePorQR', payload,
    ),

  obtenerPaciente: (payload: { id_paciente: string }) =>
    invoke<PacienteConTutor>(SERVICE, 'obtenerPaciente', payload),

  listarDosisDePaciente: (payload: { id_paciente: string }) =>
    invoke<{ dosis: Dose[]; catalogo: Vaccine[] }>(SERVICE, 'listarDosisDePaciente', payload),

  listarPacientesAtendidosPorUsuario: () =>
    invoke<PacienteAtendido[]>(SERVICE, 'listarPacientesAtendidosPorUsuario'),

  registrarDosis: (payload: {
    id_paciente: string;
    id_vacuna: string;
    fecha_aplicacion: string;
    lote?: string | null;
    fecha_vencimiento_proxima?: string | null;
  }) => invoke<Dose>(SERVICE, 'registrarDosis', payload),

  importarDosisDesdeCartilla: (payload: {
    id_paciente: string;
    dosis: { id_vacuna: string; fecha: string; lote?: string | null }[];
  }) => invoke<{ guardadas: number }>(SERVICE, 'importarDosisDesdeCartilla', payload),

  obtenerEstadisticasAtencion: () =>
    invoke<{ hoy: number; mes: number; recientes: AtencionReciente[] }>(SERVICE, 'obtenerEstadisticasAtencion'),

  actualizarPaciente: (payload: {
    id_paciente: string;
    nombre_completo?: string;
    fecha_nacimiento?: string;
    sexo?: 'M' | 'F';
    es_embarazada?: boolean;
  }) => invoke<Paciente>(SERVICE, 'actualizarPaciente', payload),

  actualizarDosis: (payload: {
    id_registro: string;
    fecha_aplicacion?: string;
    lote?: string | null;
    fecha_vencimiento_proxima?: string | null;
  }) => invoke<Dose>(SERVICE, 'actualizarDosis', payload),

  eliminarDosis: (payload: { id_registro: string }) =>
    invoke<{ eliminado: true }>(SERVICE, 'eliminarDosis', payload),

  crearVacunaCatalogo: (payload: { nombre_enfermedad: string; dosis_numero: string; edad_meses_ideal: number }) =>
    invoke<Vaccine>(SERVICE, 'crearVacunaCatalogo', payload),

  actualizarVacunaCatalogo: (payload: {
    id_vacuna: string;
    nombre_enfermedad?: string;
    dosis_numero?: string;
    edad_meses_ideal?: number;
  }) => invoke<Vaccine>(SERVICE, 'actualizarVacunaCatalogo', payload),

  eliminarVacunaCatalogo: (payload: { id_vacuna: string }) =>
    invoke<{ eliminado: true }>(SERVICE, 'eliminarVacunaCatalogo', payload),
};
