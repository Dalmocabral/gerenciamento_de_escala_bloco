import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useLocation } from "wouter";
import { ArrowLeft, Calendar, Download, AlertCircle, Camera } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, writeBatch, doc } from 'firebase/firestore';
import { Escala, PERIODOS, Periodo, User, Ferias } from '@/lib/types';
import { recalcularEscalas } from '@/lib/escalaGenerator';
import { toast } from 'sonner';
import * as htmlToImage from 'html-to-image';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

/**
 * Página de Visualização de Escala
 * 
 * Exibe a escala gerada em formato de tabela
 * Permite filtrar por período e ano
 */
export default function Visualizar() {
  const [, navigate] = useLocation();
  const [periodo, setPeriodo] = useState<Periodo>('janeiro');
  const [ano, setAno] = useState(new Date().getFullYear());
  const [escalas, setEscalas] = useState<Escala[]>([]);
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [ferias, setFerias] = useState<Ferias[]>([]);
  const [loading, setLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [dragEnabled, setDragEnabled] = useState(false);
  const [dragInfo, setDragInfo] = useState<{diaIndex: number, posIndex: number} | null>(null);
  const [vistaExportacao, setVistaExportacao] = useState<'completo'|'quinzena1'|'quinzena2'>('completo');
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    carregarEscalas();
  }, [periodo, ano]);

  const carregarEscalas = async () => {
    try {
      setLoading(true);
      
      // Carregar usuários para o recálculo
      const usuariosSnapshot = await getDocs(collection(db, 'usuarios'));
      const usuariosData: User[] = [];
      usuariosSnapshot.forEach((d) => {
        usuariosData.push({
          id: d.id,
          name: d.data().name,
          matricula: d.data().matricula,
          createdAt: d.data().createdAt?.toDate() || new Date()
        });
      });
      setUsuarios(usuariosData);

      // Carregar férias para o recálculo (apenas do período, ou todas)
      const feriasSnapshot = await getDocs(collection(db, 'ferias'));
      const feriasData: Ferias[] = [];
      feriasSnapshot.forEach((d) => {
        feriasData.push({
          id: d.id,
          usuarioId: d.data().usuarioId,
          usuarioNome: d.data().usuarioNome,
          dataInicio: d.data().dataInicio,
          dataFim: d.data().dataFim,
          periodo: d.data().periodo,
          ano: d.data().ano,
          createdAt: d.data().createdAt?.toDate() || new Date()
        });
      });
      setFerias(feriasData);

      const q = query(
        collection(db, 'escalas'),
        where('periodo', '==', periodo),
        where('ano', '==', ano)
      );
      
      const querySnapshot = await getDocs(q);
      const escalasData: Escala[] = [];
      
      querySnapshot.forEach((doc) => {
        escalasData.push({
          id: doc.id,
          data: doc.data().data,
          posicoes: doc.data().posicoes,
          periodo: doc.data().periodo,
          ano: doc.data().ano,
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date()
        });
      });

      // Ordenar por data
      escalasData.sort((a, b) => {
        const diaA = parseInt(a.data.split('/')[0]);
        const diaB = parseInt(b.data.split('/')[0]);
        return diaA - diaB;
      });

      setEscalas(escalasData);
    } catch (error) {
      console.error('Erro ao carregar escalas:', error);
      toast.error('Erro ao carregar escalas');
    } finally {
      setLoading(false);
    }
  };

  const handleExportarCSV = () => {
    if (escalas.length === 0) {
      toast.error('Nenhuma escala para exportar');
      return;
    }

    // Encontrar número máximo de posições
    const maxPosicoes = Math.max(...escalas.map(e => e.posicoes.length));

    // Criar cabeçalho
    let csv = 'Posição';
    escalas.forEach(escala => {
      csv += `,${escala.data}`;
    });
    csv += '\n';

    // Adicionar dados por posição
    for (let i = 0; i < maxPosicoes; i++) {
      csv += `${i + 1}`;
      
      escalas.forEach(escala => {
        if (i < escala.posicoes.length) {
          const pos = escala.posicoes[i];
          csv += `,"${pos.usuarioNome} (${pos.usuarioMatricula})"`;
        } else {
          csv += `,`;
        }
      });
      
      csv += '\n';
    }

    // Download
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    element.setAttribute('download', `escala-${periodo}-${ano}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    toast.success('Escala exportada em CSV!');
  };

  const handleExportarImagem = async (modo: 'completo' | 'quinzena1' | 'quinzena2' = 'completo') => {
    if (!tableRef.current) return;
    try {
      const nomeModo = modo === 'completo' ? 'Mês inteiro' : modo === 'quinzena1' ? '1ª Quinzena' : '2ª Quinzena';
      const toastId = toast.loading(`Processando imagem (${nomeModo})...`);
      
      setVistaExportacao(modo);

      // Timeout para permitir que o React processe a ocultação das colunas
      setTimeout(async () => {
        try {
          const dataUrl = await htmlToImage.toPng(tableRef.current!, {
            pixelRatio: 2, 
            backgroundColor: document.documentElement.classList.contains('dark') ? '#09090b' : '#ffffff',
          });
          
          let nomeArquivo = `escala-${periodo}-${ano}`;
          if (modo === 'quinzena1') nomeArquivo += '-1a-quinzena';
          if (modo === 'quinzena2') nomeArquivo += '-2a-quinzena';

          const element = document.createElement('a');
          element.setAttribute('href', dataUrl);
          element.setAttribute('download', `${nomeArquivo}.png`);
          element.style.display = 'none';
          document.body.appendChild(element);
          element.click();
          document.body.removeChild(element);

          toast.success(`Escala exportada! (${nomeModo})`, { id: toastId });
        } catch (error) {
          console.error('Erro ao gerar imagem:', error);
          toast.error('Erro ao converter escala em imagem', { id: toastId });
        } finally {
          setVistaExportacao('completo');
        }
      }, 300);
    } catch (error) {
      console.error('Erro geral na imagem:', error);
      toast.error('Erro ao preparar exportação');
    }
  };

  const handleSwap = async (diaIndex: number, sourcePosIndex: number, targetPosIndex: number) => {
    try {
      if (sourcePosIndex === targetPosIndex) return;
      setIsUpdating(true);

      const novasPosicoes = [...escalas[diaIndex].posicoes];
      const source = novasPosicoes[sourcePosIndex];
      const target = novasPosicoes[targetPosIndex];

      // Troca os usuários, mantendo o "posicao" numérico intacto
      novasPosicoes[sourcePosIndex] = { 
        ...novasPosicoes[sourcePosIndex], 
        usuarioId: target.usuarioId, 
        usuarioNome: target.usuarioNome, 
        usuarioMatricula: target.usuarioMatricula 
      };
      
      novasPosicoes[targetPosIndex] = { 
        ...novasPosicoes[targetPosIndex], 
        usuarioId: source.usuarioId, 
        usuarioNome: source.usuarioNome, 
        usuarioMatricula: source.usuarioMatricula 
      };

      const feriasDoPeríodo = ferias.filter(f => f.periodo === periodo && f.ano === ano);
      
      const novasEscalas = recalcularEscalas(
        escalas,
        diaIndex,
        novasPosicoes,
        usuarios,
        feriasDoPeríodo
      );

      setEscalas(novasEscalas);

      // Salvar em lote
      const batch = writeBatch(db);
      for (let i = diaIndex; i < novasEscalas.length; i++) {
        const esc = novasEscalas[i];
        const docRef = doc(db, 'escalas', esc.id);
        batch.update(docRef, { posicoes: esc.posicoes, updatedAt: new Date() });
      }

      await batch.commit();
      toast.success('Escala atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao recalcular:', error);
      toast.error('Erro ao salvar nova organização');
      carregarEscalas(); // Reverte p/ db state se falhar
    } finally {
      setIsUpdating(false);
      setDragInfo(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="hover:bg-primary/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Visualizar Escala</h1>
              <p className="text-xs text-muted-foreground">Consulte as escalas geradas</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8">
        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros e Opções</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="periodo">Período</Label>
                <Select value={periodo} onValueChange={(value) => setPeriodo(value as Periodo)}>
                  <SelectTrigger id="periodo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIODOS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ano-viz">Ano</Label>
                <Select value={String(ano)} onValueChange={(value) => setAno(parseInt(value))}>
                  <SelectTrigger id="ano-viz">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026, 2027, 2028].map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 flex flex-col justify-center border-border md:border-l md:pl-4">
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="drag-mode" 
                    checked={dragEnabled}
                    onCheckedChange={setDragEnabled}
                  />
                  <Label htmlFor="drag-mode" className="text-sm font-medium cursor-pointer">
                    Modo Reorganizar
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground leading-tight">
                  Ative para arrastar posições e soltar.
                </p>
              </div>

              <div className="space-y-2 flex items-end">
                <div className="flex gap-2 w-full">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="flex-1 p-2"
                        title="Baixar como Imagem"
                        disabled={escalas.length === 0}
                      >
                        <Camera className="w-4 h-4 mx-auto" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleExportarImagem('completo')} className="cursor-pointer">
                        Mês Completo (Integral)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExportarImagem('quinzena1')} className="cursor-pointer">
                        1ª Quinzena (Dia 01 a 15)
                      </DropdownMenuItem>
                      {escalas.length > 15 && (
                        <DropdownMenuItem onClick={() => handleExportarImagem('quinzena2')} className="cursor-pointer">
                          2ª Quinzena (Dia 16 em diante)
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    onClick={handleExportarCSV}
                    variant="outline"
                    className="flex-1 p-2 bg-primary/5 hover:bg-primary/10"
                    title="Baixar Tabela (CSV)"
                    disabled={escalas.length === 0}
                  >
                    <Download className="w-4 h-4 mx-auto" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Escala */}
        {escalas.length === 0 ? (
          <Card>
            <CardContent className="pt-12 pb-12">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground mb-2">Nenhuma escala gerada para este período</p>
                <p className="text-sm text-muted-foreground/70 mb-4">
                  Vá para "Gerar Escala" para criar uma nova escala
                </p>
                <Button onClick={() => navigate('/gerar')} className="bg-primary hover:bg-primary/90">
                  <Calendar className="w-4 h-4 mr-2" />
                  Gerar Escala Agora
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>
                Escala de {periodo.charAt(0).toUpperCase() + periodo.slice(1)} de {ano}
              </CardTitle>
              <CardDescription>
                {escalas.length} dias configurados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto pb-4">
                <div ref={tableRef} className="bg-card w-full min-w-max">
                  <table className="w-full table-striped">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-left font-semibold text-foreground border-r border-border">Posição</th>
                      {escalas.map((escala, escalaIndex) => {
                        if (vistaExportacao === 'quinzena1' && escalaIndex >= 15) return null;
                        if (vistaExportacao === 'quinzena2' && escalaIndex < 15) return null;
                        return (
                          <th key={escala.id} className="px-4 py-3 text-left font-semibold text-foreground border-r border-border min-w-[120px]">
                            {escala.data}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: Math.max(...escalas.map(e => e.posicoes.length)) }).map((_, i) => (
                      <tr
                        key={i}
                        className={i % 2 === 0 ? 'bg-background' : 'bg-muted/30 hover:bg-muted/50 transition-colors'}
                      >
                        <td className="px-4 py-3 font-medium text-foreground border-r border-border sticky left-0 bg-inherit shadow-sm">
                          {i + 1}
                        </td>
                        {escalas.map((escala, escalaIndex) => {
                          if (vistaExportacao === 'quinzena1' && escalaIndex >= 15) return null;
                          if (vistaExportacao === 'quinzena2' && escalaIndex < 15) return null;
                          const posicao = escala.posicoes[i];
                          const isDraggingOver = dragInfo && dragInfo.diaIndex === escalaIndex && dragInfo.posIndex !== i;
                          
                          return (
                            <td 
                              key={escala.id} 
                              className={`px-4 py-3 text-sm border-r border-border transition-colors ${isDraggingOver ? 'bg-primary/10 border-primary rounded ring-1 ring-primary relative z-10' : ''}`}
                              draggable={dragEnabled && !!posicao && !isUpdating ? true : undefined}
                              onDragStart={dragEnabled ? (e) => {
                                if (!posicao) return;
                                setDragInfo({ diaIndex: escalaIndex, posIndex: i });
                                e.dataTransfer.effectAllowed = 'move';
                              } : undefined}
                              onDragOver={dragEnabled ? (e) => {
                                e.preventDefault();
                                if (dragInfo && dragInfo.diaIndex === escalaIndex && dragInfo.posIndex !== i && posicao) {
                                  e.dataTransfer.dropEffect = 'move';
                                } else {
                                  e.dataTransfer.dropEffect = 'none';
                                }
                              } : undefined}
                              onDragLeave={dragEnabled ? () => {
                                // opcional
                              } : undefined}
                              onDrop={dragEnabled ? (e) => {
                                e.preventDefault();
                                if (!dragInfo || dragInfo.diaIndex !== escalaIndex || !posicao) return;
                                handleSwap(dragInfo.diaIndex, dragInfo.posIndex, i);
                              } : undefined}
                            >
                              {posicao ? (
                                <div className={`flex flex-col p-1 -m-1 rounded ${dragEnabled ? 'cursor-grab active:cursor-grabbing hover:bg-muted/50' : 'cursor-default'} ${dragInfo?.diaIndex === escalaIndex && dragInfo?.posIndex === i ? 'opacity-50' : ''}`}>
                                  <span className="font-medium text-foreground pointer-events-none">
                                    {posicao.usuarioNome}
                                  </span>
                                  <span className="text-xs text-muted-foreground mt-1 pointer-events-none">
                                    {posicao.usuarioMatricula}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground/50">-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

              {/* Resumo */}
              <div className="mt-6 p-4 bg-accent/5 border border-accent/20 rounded-lg">
                <p className="text-sm text-foreground">
                  <strong>Resumo:</strong> {escalas.length} dias de escala gerados com rotação automática de {escalas[0]?.posicoes.length || 0} colaboradores por dia.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
