export type User = {
  id: string
  email?: string
  name?: string
}

export type Child = {
  id_paciente: string
  nombre_completo: string
  fecha_nacimiento: string
  sexo: 'M' | 'F'
  es_embarazada: boolean
  codigo_qr_token: string
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
  fecha_aplicacion: string
  fecha_vencimiento_proxima: string | null
  lote: string | null
  origen_registro: string
  cat_vacunas_oficiales?: Vaccine
}
