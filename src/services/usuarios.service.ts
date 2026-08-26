import { invoke } from './_client';
import type { UsuarioDB, RolUsuario } from '../types';

const SERVICE = 'usuarios-service';

type UsuarioListado = {
  id_usuario: string;
  nombre_completo: string;
  correo_electronico: string;
  rol: RolUsuario;
  activo: boolean;
  fecha_registro: string;
  establecimientos?: { nombre_establecimiento: string } | null;
};

export const usuariosService = {
  obtenerPerfil: () => invoke<UsuarioDB>(SERVICE, 'obtenerPerfil'),

  registrarTutor: (payload: { nombre_completo: string; correo_electronico: string }) =>
    invoke<UsuarioDB>(SERVICE, 'registrarTutor', payload),

  crearUsuarioStaff: (payload: {
    id_usuario: string;
    nombre_completo: string;
    correo_electronico: string;
    rol: RolUsuario;
    id_establecimiento?: string | null;
  }) => invoke<UsuarioDB>(SERVICE, 'crearUsuarioStaff', payload),

  listarUsuarios: () => invoke<UsuarioListado[]>(SERVICE, 'listarUsuarios'),

  contarUsuarios: () => invoke<{ total: number }>(SERVICE, 'contarUsuarios'),

  actualizarPerfil: (payload: { tiene_hijos?: boolean; nombre_completo?: string }) =>
    invoke<UsuarioDB>(SERVICE, 'actualizarPerfil', payload),

  actualizarUsuario: (payload: {
    id_usuario: string;
    nombre_completo?: string;
    rol?: RolUsuario;
    id_establecimiento?: string | null;
  }) => invoke<UsuarioDB>(SERVICE, 'actualizarUsuario', payload),

  cambiarEstadoUsuario: (payload: { id_usuario: string; activo: boolean }) =>
    invoke<UsuarioDB>(SERVICE, 'cambiarEstadoUsuario', payload),

  eliminarUsuario: (payload: { id_usuario: string }) =>
    invoke<{ eliminado: true }>(SERVICE, 'eliminarUsuario', payload),
};
