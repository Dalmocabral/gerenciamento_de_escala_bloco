import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useLocation } from "wouter";
import { ArrowLeft, Calendar, Plus, Trash2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { User, Escala, Ferias, PERIODOS, Periodo, getDiasNoMes } from '@/lib/types';
import { gerarEscala } from '@/lib/escalaGenerator';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

/**
 * Página de Geração de Escala
 * 
 * Permite:
 * 1. Selecionar período (mês e ano)
 * 2. Marcar colaboradores em férias
 * 3. Gerar escala rotativa
 */
export default function Gerar() {
  const [, navigate] = useLocation();
  const [periodo, setPeriodo] = useState<Periodo>('janeiro');
  const [ano, setAno] = useState(new Date().getFullYear());
  const [tipoGeracao, setTipoGeracao] = useState<'continuar' | 'novo'>('continuar');
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [ferias, setFerias] = useState<Ferias[]>([]);
  const [loading, setLoading] = useState(false);

  // Formulário de férias
  const [usuarioFeriasId, setUsuarioFeriasId] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      
      // Carregar usuários
      const usuariosSnapshot = await getDocs(collection(db, 'usuarios'));
      const usuariosData: User[] = [];
      usuariosSnapshot.forEach((doc) => {
        usuariosData.push({
          id: doc.id,
          name: doc.data().name,
          matricula: doc.data().matricula,
          createdAt: doc.data().createdAt?.toDate() || new Date()
        });
      });
      setUsuarios(usuariosData);

      // Carregar férias
      const feriasSnapshot = await getDocs(collection(db, 'ferias'));
      const feriasData: Ferias[] = [];
      feriasSnapshot.forEach((doc) => {
        feriasData.push({
          id: doc.id,
          usuarioId: doc.data().usuarioId,
          usuarioNome: doc.data().usuarioNome,
          dataInicio: doc.data().dataInicio,
          dataFim: doc.data().dataFim,
          periodo: doc.data().periodo,
          ano: doc.data().ano,
          createdAt: doc.data().createdAt?.toDate() || new Date()
        });
      });
      setFerias(feriasData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFerias = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!usuarioFeriasId) {
      toast.error('Selecione um colaborador');
      return;
    }

    if (!dataInicio || !dataFim) {
      toast.error('Preencha as datas de início e fim');
      return;
    }

    const inicio = parseInt(dataInicio);
    const fim = parseInt(dataFim);

    if (inicio > fim) {
      toast.error('Data de início não pode ser maior que data de fim');
      return;
    }

    const diasNoMes = getDiasNoMes(periodo, ano);
    if (inicio > diasNoMes || fim > diasNoMes) {
      toast.error(`Data inválida para ${periodo} (máximo ${diasNoMes} dias)`);
      return;
    }

    try {
      const usuario = usuarios.find(u => u.id === usuarioFeriasId);
      if (!usuario) return;

      await addDoc(collection(db, 'ferias'), {
        usuarioId: usuarioFeriasId,
        usuarioNome: usuario.name,
        dataInicio: String(inicio).padStart(2, '0'),
        dataFim: String(fim).padStart(2, '0'),
        periodo,
        ano,
        createdAt: new Date()
      });

      toast.success('Férias adicionadas com sucesso!');
      setUsuarioFeriasId('');
      setDataInicio('');
      setDataFim('');
      await carregarDados();
    } catch (error) {
      console.error('Erro ao adicionar férias:', error);
      toast.error('Erro ao adicionar férias');
    }
  };

  const handleDeleteFerias = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'ferias', id));
      toast.success('Férias removidas!');
      await carregarDados();
    } catch (error) {
      console.error('Erro ao deletar férias:', error);
      toast.error('Erro ao remover férias');
    }
  };

  const handleGerarEscala = async () => {
    if (usuarios.length === 0) {
      toast.error('Cadastre pelo menos um colaborador antes de gerar a escala');
      return;
    }

    try {
      setLoading(true);

      let ordemAnterior: User[] | undefined = undefined;

      if (tipoGeracao === 'continuar') {
        const indexAtual = PERIODOS.indexOf(periodo);
        
        let periodoAnterior: Periodo;
        let anoAnterior: number;

        if (indexAtual === 0) {
          periodoAnterior = 'dezembro';
          anoAnterior = ano - 1;
        } else {
          periodoAnterior = PERIODOS[indexAtual - 1];
          anoAnterior = ano;
        }

        const qAnt = query(
          collection(db, 'escalas'),
          where('periodo', '==', periodoAnterior),
          where('ano', '==', anoAnterior)
        );
        const prevSnapshot = await getDocs(qAnt);
        
        if (!prevSnapshot.empty) {
          const escalasAnt: Escala[] = [];
          prevSnapshot.forEach(doc => escalasAnt.push(doc.data() as Escala));
          
          escalasAnt.sort((a, b) => {
            const diaA = parseInt(a.data.split('/')[0]);
            const diaB = parseInt(b.data.split('/')[0]);
            return diaB - diaA; // sort desc
          });

          const ultimoDia = escalasAnt[0];
          
          if (ultimoDia && ultimoDia.posicoes) {
            ordemAnterior = ultimoDia.posicoes.map(p => {
               return usuarios.find(usr => usr.id === p.usuarioId);
            }).filter(Boolean) as User[];
            
            toast.success(`Continuando esquema do dia ${ultimoDia.data}...`);
          }
        } else {
          toast.warning(`Escala de ${periodoAnterior}/${anoAnterior} não encontrada. Gerando do zero.`);
        }
      }

      // Filtrar férias do período selecionado
      const feriasDoPeríodo = ferias.filter(f => f.periodo === periodo && f.ano === ano);

      // Gerar escala
      const escalas = gerarEscala(usuarios, periodo, ano, feriasDoPeríodo, ordemAnterior);

      // Deletar escalas antigas do mesmo período
      const q = query(
        collection(db, 'escalas'),
        where('periodo', '==', periodo),
        where('ano', '==', ano)
      );
      const querySnapshot = await getDocs(q);
      for (const doc of querySnapshot.docs) {
        await deleteDoc(doc.ref);
      }

      // Salvar novas escalas
      for (const escala of escalas) {
        await addDoc(collection(db, 'escalas'), {
          data: escala.data,
          posicoes: escala.posicoes,
          periodo: escala.periodo,
          ano: escala.ano,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      toast.success(`Escala de ${periodo} gerada com sucesso! (${escalas.length} dias)`);
      
      // Redirecionar para visualização
      setTimeout(() => navigate('/visualizar'), 1500);
    } catch (error) {
      console.error('Erro ao gerar escala:', error);
      toast.error('Erro ao gerar escala');
    } finally {
      setLoading(false);
    }
  };

  const feriasDoPeríodo = ferias.filter(f => f.periodo === periodo && f.ano === ano);

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
              <h1 className="text-xl font-bold text-foreground">Gerar Escala</h1>
              <p className="text-xs text-muted-foreground">Configure período e férias</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configurações */}
          <Card className="lg:col-span-1 h-fit">
            <CardHeader>
              <CardTitle>Configurações</CardTitle>
              <CardDescription>
                Selecione período e ano
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <Label htmlFor="ano">Ano</Label>
                <Input
                  id="ano"
                  type="number"
                  value={ano}
                  onChange={(e) => setAno(parseInt(e.target.value))}
                  min={2020}
                  max={2100}
                />
              </div>

              <div className="space-y-3 pt-2 pb-1 border-t border-border mt-2">
                <Label>Método de Geração</Label>
                <RadioGroup value={tipoGeracao} onValueChange={(v) => setTipoGeracao(v as 'continuar' | 'novo')}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="continuar" id="r1" />
                    <Label htmlFor="r1" className="font-normal cursor-pointer text-sm">Continuar escala do mês anterior</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="novo" id="r2" />
                    <Label htmlFor="r2" className="font-normal cursor-pointer text-sm">Nova escala (Gerar do zero)</Label>
                  </div>
                </RadioGroup>
              </div>

              <Button
                onClick={handleGerarEscala}
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                disabled={loading || usuarios.length === 0}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Gerar Escala
              </Button>

              {usuarios.length === 0 && (
                <p className="text-xs text-destructive">
                  ⚠️ Cadastre colaboradores antes de gerar
                </p>
              )}
            </CardContent>
          </Card>

          {/* Férias */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Férias - {periodo.charAt(0).toUpperCase() + periodo.slice(1)}</CardTitle>
              <CardDescription>
                Marque colaboradores em férias ({feriasDoPeríodo.length})
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Formulário de Férias */}
              <form onSubmit={handleAddFerias} className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border">
                <div className="space-y-2">
                  <Label htmlFor="usuario-ferias">Colaborador</Label>
                  <Select value={usuarioFeriasId} onValueChange={setUsuarioFeriasId}>
                    <SelectTrigger id="usuario-ferias">
                      <SelectValue placeholder="Selecione um colaborador" />
                    </SelectTrigger>
                    <SelectContent>
                      {usuarios.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} ({u.matricula})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="data-inicio">Início (dia)</Label>
                    <Input
                      id="data-inicio"
                      type="number"
                      placeholder="1"
                      value={dataInicio}
                      onChange={(e) => setDataInicio(e.target.value)}
                      min="1"
                      max={getDiasNoMes(periodo, ano)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="data-fim">Fim (dia)</Label>
                    <Input
                      id="data-fim"
                      type="number"
                      placeholder="5"
                      value={dataFim}
                      onChange={(e) => setDataFim(e.target.value)}
                      min="1"
                      max={getDiasNoMes(periodo, ano)}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Férias
                </Button>
              </form>

              {/* Lista de Férias */}
              {feriasDoPeríodo.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhuma féria registrada</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {feriasDoPeríodo.map((feria) => (
                    <div
                      key={feria.id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/60 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{feria.usuarioNome}</p>
                        <p className="text-sm text-muted-foreground">
                          {feria.dataInicio} a {feria.dataFim} de {periodo}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteFerias(feria.id)}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Info Box */}
        <Card className="mt-6 bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <p className="text-sm text-foreground">
              <strong>Como funciona:</strong> A escala rotativa coloca cada colaborador em uma posição diferente a cada dia. Colaboradores em férias são excluídos do período marcado.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
