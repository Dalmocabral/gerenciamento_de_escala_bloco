import { User, Escala, PosicaoEscala, Ferias, Periodo, getDiasNoMes } from './types';

/**
 * Gera a escala rotativa para um período específico
 * A escala roda diariamente com os usuários em posições rotativas
 * 
 * @param users - Lista de usuários cadastrados
 * @param periodo - Mês (janeiro, fevereiro, etc)
 * @param ano - Ano
 * @param ferias - Lista de períodos de férias
 * @returns Array de escalas por dia
 */
export function gerarEscala(
  users: User[],
  periodo: Periodo,
  ano: number,
  ferias: Ferias[] = []
): Escala[] {
  if (users.length === 0) {
    return [];
  }

  const diasNoMes = getDiasNoMes(periodo, ano);
  const escalas: Escala[] = [];

  // Criar um mapa de usuários em férias por data
  const usuariosEmFerias = new Map<string, Set<string>>();
  
  ferias.forEach(feria => {
    if (feria.periodo === periodo && feria.ano === ano) {
      const dataInicio = parseInt(feria.dataInicio.split('/')[0]);
      const dataFim = parseInt(feria.dataFim.split('/')[0]);
      
      for (let dia = dataInicio; dia <= dataFim; dia++) {
        const chave = `${String(dia).padStart(2, '0')}/${periodo}`;
        if (!usuariosEmFerias.has(chave)) {
          usuariosEmFerias.set(chave, new Set());
        }
        usuariosEmFerias.get(chave)!.add(feria.usuarioId);
      }
    }
  });

  // Gerar escala para cada dia do mês
  for (let dia = 1; dia <= diasNoMes; dia++) {
    const diaFormatado = String(dia).padStart(2, '0');
    const dataChave = `${diaFormatado}/${periodo}`;
    const usuariosEmFeriasHoje = usuariosEmFerias.get(dataChave) || new Set();

    // Filtrar usuários que não estão em férias
    const usuariosDisponiveis = users.filter(u => !usuariosEmFeriasHoje.has(u.id));

    if (usuariosDisponiveis.length === 0) {
      // Se todos estão em férias, usar todos mesmo assim
      const posicoes = users.map((user, index) => ({
        posicao: index + 1,
        usuarioId: user.id,
        usuarioNome: user.name,
        usuarioMatricula: user.matricula
      }));

      escalas.push({
        id: `${dataChave}-${periodo}-${ano}`,
        data: dataChave,
        posicoes,
        periodo,
        ano,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      continue;
    }

    // Calcular rotação: cada dia, a posição dos usuários muda
    // Dia 1: usuário 0 na posição 1, usuário 1 na posição 2, etc
    // Dia 2: usuário 1 na posição 1, usuário 2 na posição 2, etc (rotação)
    const rotacao = (dia - 1) % usuariosDisponiveis.length;

    const posicoes: PosicaoEscala[] = [];
    for (let pos = 0; pos < usuariosDisponiveis.length; pos++) {
      const userIndex = (pos + rotacao) % usuariosDisponiveis.length;
      const user = usuariosDisponiveis[userIndex];
      
      posicoes.push({
        posicao: pos + 1,
        usuarioId: user.id,
        usuarioNome: user.name,
        usuarioMatricula: user.matricula
      });
    }

    escalas.push({
      id: `${dataChave}-${periodo}-${ano}`,
      data: dataChave,
      posicoes,
      periodo,
      ano,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  return escalas;
}

/**
 * Formata a data para exibição
 * @param data - Data no formato DD/MM
 * @param periodo - Período (mês)
 * @returns Data formatada
 */
export function formatarData(data: string, periodo: Periodo): string {
  return `${data} de ${periodo}`;
}

/**
 * Valida se um usuário está em férias em uma data específica
 * @param usuarioId - ID do usuário
 * @param data - Data no formato DD/MM
 * @param ferias - Lista de férias
 * @returns true se está em férias
 */
export function estaEmFerias(
  usuarioId: string,
  data: string,
  ferias: Ferias[]
): boolean {
  return ferias.some(feria => {
    const [diaData] = data.split('/');
    const [diaInicio] = feria.dataInicio.split('/');
    const [diaFim] = feria.dataFim.split('/');
    
    const dia = parseInt(diaData);
    const inicio = parseInt(diaInicio);
    const fim = parseInt(diaFim);
    
    return (
      feria.usuarioId === usuarioId &&
      dia >= inicio &&
      dia <= fim
    );
  });
}
