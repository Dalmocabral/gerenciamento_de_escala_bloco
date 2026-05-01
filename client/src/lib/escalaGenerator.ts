import { User, Escala, PosicaoEscala, Ferias, Periodo, getDiasNoMes } from './types';

export const getMesIndex = (mes: string) => {
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  return meses.indexOf(mes.toLowerCase());
};

export function parseFeriaDates(feria: Ferias): { start: number, end: number } | null {
  try {
    if (feria.dataInicio.includes('-')) {
      // Formato novo YYYY-MM-DD
      const start = new Date(feria.dataInicio + 'T00:00:00').getTime();
      const end = new Date(feria.dataFim + 'T23:59:59').getTime();
      return { start, end };
    } else {
      // Formato legado DD ou DD/MM
      if (!feria.periodo || !feria.ano) return null;
      const mIdx = getMesIndex(feria.periodo);
      const dIni = parseInt(feria.dataInicio.split('/')[0]);
      const dFim = parseInt(feria.dataFim.split('/')[0]);
      
      const start = new Date(feria.ano, mIdx, dIni, 0, 0, 0).getTime();
      const end = new Date(feria.ano, mIdx, dFim, 23, 59, 59).getTime();
      return { start, end };
    }
  } catch (e) {
    return null;
  }
}

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
  ferias: Ferias[] = [],
  ordemAnterior?: User[],
  removerFerias: boolean = false
): Escala[] {
  if (users.length === 0) {
    return [];
  }

  const diasNoMes = getDiasNoMes(periodo, ano);
  const escalas: Escala[] = [];

  // Analisar datas de férias ativas
  const parsedFerias = ferias.map(f => ({ ...f, range: parseFeriaDates(f) })).filter(f => f.range) as (Ferias & { range: {start: number, end: number} })[];
  const mesIndexAtual = getMesIndex(periodo);

  // Determinar a ordem base inicial
  let currentBaseOrder = [...users];

  if (ordemAnterior && ordemAnterior.length > 0) {
    const anteriorIds = ordemAnterior.map(u => u.id);
    const usersInAnterior = users
      .filter(u => anteriorIds.includes(u.id))
      .sort((a, b) => anteriorIds.indexOf(a.id) - anteriorIds.indexOf(b.id));
    const newUsers = users.filter(u => !anteriorIds.includes(u.id));
    currentBaseOrder = [...usersInAnterior, ...newUsers];

    // Como ordemAnterior é o último dia da escala passada,
    // precisamos rotacionar 1 vez para preparar o DIA 1 do novo mês.
    if (usersInAnterior.length > 0) {
      const lastTrabalhou = usersInAnterior[usersInAnterior.length - 1];
      const idx = currentBaseOrder.findIndex(u => u.id === lastTrabalhou.id);
      if (idx !== -1) {
        currentBaseOrder.splice(idx, 1);
        currentBaseOrder.unshift(lastTrabalhou);
      }
    } else {
      const tail = currentBaseOrder.pop();
      if (tail) currentBaseOrder.unshift(tail);
    }
  }

  // Gerar escala para cada dia do mês
  for (let dia = 1; dia <= diasNoMes; dia++) {
    const diaFormatado = String(dia).padStart(2, '0');
    const dataChave = `${diaFormatado}/${periodo}`;
    
    const diaTimestamp = new Date(ano, mesIndexAtual, dia, 12, 0, 0).getTime();
    const usuariosEmFeriasHoje = new Set<string>();
    parsedFerias.forEach(pf => {
      if (diaTimestamp >= pf.range.start && diaTimestamp <= pf.range.end) {
        usuariosEmFeriasHoje.add(pf.usuarioId);
      }
    });

    // Modificação: Usuários em férias serão retirados condicionalmente com base na escolha do usuário.
    const usuariosDisponiveis = removerFerias
      ? currentBaseOrder.filter(u => !usuariosEmFeriasHoje.has(u.id))
      : [...currentBaseOrder];

    if (usuariosDisponiveis.length === 0) {
      const posicoes = currentBaseOrder.map((user, index) => ({
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
        removerFerias,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } else {
      const posicoes: PosicaoEscala[] = usuariosDisponiveis.map((user, index) => ({
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
        removerFerias,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // Final do dia: rotaciona a lista base garantindo que os ativos andem
    if (usuariosDisponiveis.length > 0) {
      const lastVisivel = usuariosDisponiveis[usuariosDisponiveis.length - 1];
      const idx = currentBaseOrder.findIndex(u => u.id === lastVisivel.id);
      if (idx !== -1) {
        currentBaseOrder.splice(idx, 1);
        currentBaseOrder.unshift(lastVisivel);
      }
    } else {
      const tailD = currentBaseOrder.pop();
      if (tailD) currentBaseOrder.unshift(tailD);
    }
  }

  return escalas;
}

export function recalcularEscalas(
  escalasExistentes: Escala[],
  diaModificadoIndex: number,
  novaOrdemPosicoes: PosicaoEscala[],
  todosUsuarios: User[],
  ferias: Ferias[],
  removerFerias: boolean = false
): Escala[] {
  const novaEscalas = [...escalasExistentes];
  
  novaEscalas[diaModificadoIndex] = {
    ...novaEscalas[diaModificadoIndex],
    posicoes: novaOrdemPosicoes
  };
  
  const novaOrdemIds = novaOrdemPosicoes.map(p => p.usuarioId);
  const usuariosFaltantes = todosUsuarios.filter(u => !novaOrdemIds.includes(u.id));
  
  const usuariosPresentes = novaOrdemPosicoes.map(p => todosUsuarios.find(u => u.id === p.usuarioId) as User).filter(Boolean);

  let currentBaseOrder = [...usuariosPresentes, ...usuariosFaltantes];
  
  if (usuariosPresentes.length > 0) {
    const lastTrabalhou = usuariosPresentes[usuariosPresentes.length - 1];
    const idx = currentBaseOrder.findIndex(u => u.id === lastTrabalhou.id);
    if (idx !== -1) {
      currentBaseOrder.splice(idx, 1);
      currentBaseOrder.unshift(lastTrabalhou);
    }
  } else {
    const tail = currentBaseOrder.pop();
    if (tail) currentBaseOrder.unshift(tail);
  }

  const parsedFerias = ferias.map(f => ({ ...f, range: parseFeriaDates(f) })).filter(f => f.range) as (Ferias & { range: {start: number, end: number} })[];

  for (let i = diaModificadoIndex + 1; i < novaEscalas.length; i++) {
    const escalaAtual = novaEscalas[i];
    const dataChave = escalaAtual.data; 
    
    const [diaStr, periodoStr] = dataChave.split('/');
    const pStr = periodoStr || escalaAtual.periodo;
    const diaTimestamp = new Date(escalaAtual.ano || (new Date().getFullYear()), getMesIndex(pStr), parseInt(diaStr), 12, 0, 0).getTime();
    
    const usuariosEmFeriasHoje = new Set<string>();
    parsedFerias.forEach(pf => {
      if (diaTimestamp >= pf.range.start && diaTimestamp <= pf.range.end) {
        usuariosEmFeriasHoje.add(pf.usuarioId);
      }
    });

    const usuariosDisponiveis = removerFerias
      ? currentBaseOrder.filter(u => !usuariosEmFeriasHoje.has(u.id))
      : [...currentBaseOrder];

    if (usuariosDisponiveis.length === 0) {
      novaEscalas[i] = {
        ...escalaAtual,
        posicoes: currentBaseOrder.map((user, index) => ({
          posicao: index + 1,
          usuarioId: user.id,
          usuarioNome: user.name,
          usuarioMatricula: user.matricula
        }))
      };
    } else {
      novaEscalas[i] = {
        ...escalaAtual,
        posicoes: usuariosDisponiveis.map((user, index) => ({
          posicao: index + 1,
          usuarioId: user.id,
          usuarioNome: user.name,
          usuarioMatricula: user.matricula
        }))
      };
    }
    
    if (usuariosDisponiveis.length > 0) {
      const lastVisivel = usuariosDisponiveis[usuariosDisponiveis.length - 1];
      const idx = currentBaseOrder.findIndex(u => u.id === lastVisivel.id);
      if (idx !== -1) {
        currentBaseOrder.splice(idx, 1);
        currentBaseOrder.unshift(lastVisivel);
      }
    } else {
      const nextTail = currentBaseOrder.pop();
      if (nextTail) currentBaseOrder.unshift(nextTail);
    }
  }

  return novaEscalas;
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
  ferias: Ferias[],
  ano?: number
): boolean {
  const parsedFerias = ferias.map(f => ({ ...f, range: parseFeriaDates(f) })).filter(f => f.range) as (Ferias & { range: {start: number, end: number} })[];
  const [diaStr, periodoStr] = data.split('/');
  const yr = ano || new Date().getFullYear();
  const diaTimestamp = new Date(yr, getMesIndex(periodoStr), parseInt(diaStr), 12, 0, 0).getTime();

  return parsedFerias.some(pf => {
    return pf.usuarioId === usuarioId && diaTimestamp >= pf.range.start && diaTimestamp <= pf.range.end;
  });
}

