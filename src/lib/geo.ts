import * as Location from 'expo-location';

// Los 9 departamentos de Bolivia (forma canónica)
export const DEPARTAMENTOS = [
  'La Paz', 'Cochabamba', 'Santa Cruz', 'Oruro', 'Potosí',
  'Chuquisaca', 'Tarija', 'Beni', 'Pando',
] as const;

export type Departamento = (typeof DEPARTAMENTOS)[number];

// Normaliza texto: minúsculas, sin acentos, sin espacios extra
const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i')
    .replace(/ó/g, 'o').replace(/ú/g, 'u').replace(/ñ/g, 'n')
    .trim();

/**
 * Mapea un texto libre (región, ciudad, etc.) a un departamento canónico.
 * Devuelve null si no reconoce ninguno.
 */
export function aDepartamento(texto?: string | null): Departamento | null {
  if (!texto) return null;
  const t = norm(texto);
  for (const dep of DEPARTAMENTOS) {
    if (t.includes(norm(dep))) return dep;
  }
  // Alias / ciudades capitales que no coinciden con el nombre del departamento
  if (t.includes('sucre')) return 'Chuquisaca';
  if (t.includes('trinidad')) return 'Beni';
  if (t.includes('cobija')) return 'Pando';
  return null;
}

/**
 * Obtiene el departamento del usuario.
 * 1) GPS si hay permiso concedido (geocodificación inversa)
 * 2) Fallback por IP (sin permisos)
 * Devuelve null si no se pudo determinar.
 */
export async function getDepartamentoUsuario(): Promise<Departamento | null> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status === 'granted') {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const [place] = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      const dep = aDepartamento(place?.region) ?? aDepartamento(place?.city);
      if (dep) return dep;
    }
  } catch {
    /* cae al fallback por IP */
  }

  try {
    const geo = await fetch('https://ip-api.com/json/?fields=regionName,city')
      .then((r) => r.json());
    return aDepartamento(geo?.regionName) ?? aDepartamento(geo?.city);
  } catch {
    return null;
  }
}

/** ¿La alerta corresponde al departamento del usuario? */
export function alertaEsCercana(
  alertaDepartamento: string | null | undefined,
  userDepartamento: Departamento | null,
): boolean {
  if (!alertaDepartamento || !userDepartamento) return false;
  return aDepartamento(alertaDepartamento) === userDepartamento;
}
