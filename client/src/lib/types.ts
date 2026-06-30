// Tipos para o aplicativo de escala

export interface User {
  id: string;
  name: string;
  matricula: string;
  createdAt: Date;
}

export interface Escala {
  id: string;
  data: string; // formato: DD/MM
  posicoes: PosicaoEscala[];
  periodo: string; // janeiro, fevereiro, etc
  ano: number;
  removerFerias?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PosicaoEscala {
  posicao: number; // 1, 2, 3, etc
  usuarioId: string;
  usuarioNome: string;
  usuarioMatricula: string;
  isFolgaFeriado?: boolean;
  isCasadinha?: boolean;
}

export interface Ferias {
  id: string;
  usuarioId: string;
  usuarioNome: string;
  dataInicio: string; // YYYY-MM-DD (novo) ou DD/MM ou DD (legado)
  dataFim: string; // YYYY-MM-DD (novo) ou DD/MM ou DD (legado)
  periodo?: string; // legados (janeiro, fevereiro, etc)
  ano?: number; // legados
  createdAt: Date;
}

export type Periodo = 
  | 'janeiro' | 'fevereiro' | 'março' | 'abril' | 'maio' | 'junho'
  | 'julho' | 'agosto' | 'setembro' | 'outubro' | 'novembro' | 'dezembro';

export const PERIODOS: Periodo[] = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
];

export const DIAS_POR_MES: Record<Periodo, number> = {
  'janeiro': 31,
  'fevereiro': 28, // Será ajustado para 29 em anos bissextos
  'março': 31,
  'abril': 30,
  'maio': 31,
  'junho': 30,
  'julho': 31,
  'agosto': 31,
  'setembro': 30,
  'outubro': 31,
  'novembro': 30,
  'dezembro': 31
};

export function getDiasNoMes(periodo: Periodo, ano: number): number {
  if (periodo === 'fevereiro') {
    // Verificar se é ano bissexto
    return (ano % 4 === 0 && ano % 100 !== 0) || (ano % 400 === 0) ? 29 : 28;
  }
  return DIAS_POR_MES[periodo];
}
