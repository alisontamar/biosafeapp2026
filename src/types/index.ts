export type RolUsuario =
  | 'SuperAdmin'
  | 'AdminEstablecimiento'
  | 'Medico'
  | 'Enfermero'
  | 'Farmaceutico'
  | 'Tutor_PersonaNormal';

export type TipoEstablecimiento = 'Centro de Salud' | 'Farmacia';

export type User = {
  id: string
  email?: string
  name?: string
}

export type UsuarioDB = {
  id_usuario: string
  id_establecimiento: string | null
  nombre_completo: string
  correo_electronico: string
  rol: RolUsuario
  tiene_hijos: boolean
  fecha_registro: string
}

export type Establecimiento = {
  id_establecimiento: string
  nombre_establecimiento: string
  ciudad_municipio: string
  tipo: TipoEstablecimiento
  fecha_registro: string
}

export type Child = {
  id_paciente: string
  nombre_completo: string
  fecha_nacimiento: string
  sexo: 'M' | 'F'
  es_embarazada: boolean
  codigo_qr_token: string
}

export type Paciente = {
  id_paciente: string
  id_tutor_registro: string | null
  nombre_completo: string
  fecha_nacimiento: string
  sexo: 'M' | 'F'
  es_embarazada: boolean
  codigo_qr_token: string
  fecha_registro: string
}

export type Vaccine = {
  id_vacuna: string
  nombre_enfermedad: string
  dosis_numero: string
  edad_meses_ideal: number
}

export type Dose = {
  id_registro: string
  id_paciente: string
  id_vacuna: string
  id_usuario_atendedor: string | null
  fecha_aplicacion: string
  fecha_vencimiento_proxima: string | null
  lote: string | null
  origen_registro: 'Validado_En_Establecimiento' | 'Migrado_Cartilla_Fisica'
  cat_vacunas_oficiales?: Vaccine
}

export type QRPayload = {
  id_paciente: string
  token: string
}

export const ROLES_SALUD: RolUsuario[] = ['Medico', 'Enfermero', 'Farmaceutico'];
export const ROLES_ADMIN: RolUsuario[] = ['SuperAdmin', 'AdminEstablecimiento'];

export const LABEL_ROL: Record<RolUsuario, string> = {
  SuperAdmin: 'Super Administrador',
  AdminEstablecimiento: 'Admin. Establecimiento',
  Medico: 'Médico',
  Enfermero: 'Enfermero/a',
  Farmaceutico: 'Farmacéutico/a',
  Tutor_PersonaNormal: 'Padre / Tutor',
};
