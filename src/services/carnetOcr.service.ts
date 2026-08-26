import { invoke } from './_client';

const SERVICE = 'carnet-ocr-service';

type DosisExtraida = { vacuna: string; fecha: string | null; lote: string | null };
type ResultadoAnalisis = { dosis: DosisExtraida[]; sinTexto?: boolean };

export const carnetOcrService = {
  analizarImagen: (payload: { base64: string }) =>
    invoke<ResultadoAnalisis>(SERVICE, 'analizarImagen', payload),

  analizarPDF: (payload: { base64: string }) =>
    invoke<ResultadoAnalisis>(SERVICE, 'analizarPDF', payload),
};
