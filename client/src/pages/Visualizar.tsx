import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { ArrowLeft, Calendar, Download, AlertCircle } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Escala, PERIODOS, Periodo } from '@/lib/types';
import { toast } from 'sonner';

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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    carregarEscalas();
  }, [periodo, ano]);

  const carregarEscalas = async () => {
    try {
      setLoading(true);
      
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
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

              <div className="space-y-2 flex items-end">
                <Button
                  onClick={handleExportarCSV}
                  variant="outline"
                  className="w-full"
                  disabled={escalas.length === 0}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exportar CSV
                </Button>
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
              <div className="overflow-x-auto">
                <table className="w-full table-striped">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-left font-semibold text-foreground border-r border-border">Posição</th>
                      {escalas.map(escala => (
                        <th key={escala.id} className="px-4 py-3 text-left font-semibold text-foreground border-r border-border min-w-[120px]">
                          {escala.data}
                        </th>
                      ))}
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
                        {escalas.map(escala => {
                          const posicao = escala.posicoes[i];
                          return (
                            <td key={escala.id} className="px-4 py-3 text-sm border-r border-border">
                              {posicao ? (
                                <div className="flex flex-col">
                                  <span className="font-medium text-foreground">
                                    {posicao.usuarioNome}
                                  </span>
                                  <span className="text-xs text-muted-foreground mt-1">
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
