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
  ferias: Ferias[] = [],
  ordemAnterior?: User[]
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
    const tail = currentBaseOrder.pop();
    if (tail) currentBaseOrder.unshift(tail);
  }

  // Gerar escala para cada dia do mês
  for (let dia = 1; dia <= diasNoMes; dia++) {
    const diaFormatado = String(dia).padStart(2, '0');
    const dataChave = `${diaFormatado}/${periodo}`;
    const usuariosEmFeriasHoje = usuariosEmFerias.get(dataChave) || new Set();

    // Filtrar usuários que não estão em férias hoje para criar posições
    const usuariosDisponiveis = currentBaseOrder.filter(u => !usuariosEmFeriasHoje.has(u.id));

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
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // Final do dia: rotaciona a lista base para o próximo dia
    const tailD = currentBaseOrder.pop();
    if (tailD) currentBaseOrder.unshift(tailD);
  }

  return escalas;
}

export function recalcularEscalas(
  escalasExistentes: Escala[],
  diaModificadoIndex: number,
  novaOrdemPosicoes: PosicaoEscala[],
  todosUsuarios: User[],
  ferias: Ferias[]
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
  
  const tail = currentBaseOrder.pop();
  if (tail) currentBaseOrder.unshift(tail);

  const usuariosEmFerias = new Map<string, Set<string>>();
  
  ferias.forEach(feria => {
    const dataInicio = parseInt(feria.dataInicio.split('/')[0]);
    const dataFim = parseInt(feria.dataFim.split('/')[0]);
    
    for (let dia = dataInicio; dia <= dataFim; dia++) {
      const chave = `${String(dia).padStart(2, '0')}/${feria.periodo}`; 
      if (!usuariosEmFerias.has(chave)) {
        usuariosEmFerias.set(chave, new Set());
      }
      usuariosEmFerias.get(chave)!.add(feria.usuarioId);
    }
  });

  for (let i = diaModificadoIndex + 1; i < novaEscalas.length; i++) {
    const escalaAtual = novaEscalas[i];
    const dataChave = escalaAtual.data; 
    const usuariosEmFeriasHoje = usuariosEmFerias.get(dataChave) || new Set();

    const usuariosDisponiveis = currentBaseOrder.filter(u => !usuariosEmFeriasHoje.has(u.id));

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
    
    const nextTail = currentBaseOrder.pop();
    if (nextTail) currentBaseOrder.unshift(nextTail);
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

