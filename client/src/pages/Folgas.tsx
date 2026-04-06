import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { ArrowLeft, GripVertical, Save, Trash2, CalendarDays } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, setDoc, getDocs } from 'firebase/firestore';
import { PERIODOS, Periodo, User, getDiasNoMes } from '@/lib/types';
import { toast } from 'sonner';

/**
 * Página de Definição de Folgas Mensais
 */
export default function Folgas() {
  const [, navigate] = useLocation();
  const [periodo, setPeriodo] = useState<Periodo>('janeiro');
  const [ano, setAno] = useState(new Date().getFullYear());
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // folgasMap: { "01": ["id1", "id2"], "02": ["id3"] }
  const [folgasMap, setFolgasMap] = useState<Record<string, string[]>>({});

  useEffect(() => {
    carregarUsuarios();
  }, []);

  useEffect(() => {
    carregarFolgas();
  }, [periodo, ano]);

  const carregarUsuarios = async () => {
    try {
      const snap = await getDocs(collection(db, 'usuarios'));
      const us: User[] = [];
      snap.forEach(d => us.push({ id: d.id, ...d.data() } as User));
      us.sort((a, b) => a.name.localeCompare(b.name));
      setUsuarios(us);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao buscar colaboradores');
    }
  };

  const carregarFolgas = async () => {
    try {
      setLoading(true);
      const docRef = doc(db, 'folgas_mes', `${periodo}-${ano}`);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && data.diasOff) {
          setFolgasMap(data.diasOff);
        } else {
          setFolgasMap({});
        }
      } else {
        setFolgasMap({});
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar folgas do mês');
    } finally {
      setLoading(false);
    }
  };

  const handleSalvar = async () => {
    try {
      setSaving(true);
      const docRef = doc(db, 'folgas_mes', `${periodo}-${ano}`);
      await setDoc(docRef, {
        periodo,
        ano,
        diasOff: folgasMap,
        updatedAt: new Date()
      });
      toast.success('Escala de Folgas salva com sucesso!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar as folgas');
    } finally {
      setSaving(false);
    }
  };

  // Drag and Drop Logic
  const handleDragStart = (e: React.DragEvent, usuarioId: string) => {
    e.dataTransfer.setData('usuarioId', usuarioId);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDrop = (e: React.DragEvent, dia: number) => {
    e.preventDefault();
    const usuarioId = e.dataTransfer.getData('usuarioId');
    if (!usuarioId) return;

    const diaStr = String(dia).padStart(2, '0');
    
    setFolgasMap(prev => {
      const listasDia = [...(prev[diaStr] || [])];
      // Impedir duplicatas
      if (!listasDia.includes(usuarioId)) {
        listasDia.push(usuarioId);
      }
      return { ...prev, [diaStr]: listasDia };
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleRemoverFolga = (dia: number, usuarioId: string) => {
    const diaStr = String(dia).padStart(2, '0');
    setFolgasMap(prev => {
      const listasDia = prev[diaStr]?.filter(id => id !== usuarioId) || [];
      return { ...prev, [diaStr]: listasDia };
    });
  };

  const diasNoMes = getDiasNoMes(periodo, ano);
  const diasArray = Array.from({ length: diasNoMes }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5 pb-12">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="hover:bg-primary/10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Escala de Folgas</h1>
              <p className="text-xs text-muted-foreground">Arraste os colaboradores para definir folgas</p>
            </div>
          </div>
          <Button onClick={handleSalvar} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm px-6">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Gravando...' : 'Gravar Mês'}
          </Button>
        </div>
      </header>

      <main className="container pt-6">
        {/* Controles de Filtros */}
        <Card className="mb-6 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="space-y-2 flex-1">
                <Label>Mês Base</Label>
                <Select value={periodo} onValueChange={(val) => setPeriodo(val as Periodo)}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    {PERIODOS.map((p) => (
                      <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 flex-[0.5]">
                <Label>Ano Base</Label>
                <Select value={String(ano)} onValueChange={(val) => setAno(Number(val))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026, 2027, 2028].map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="p-12 flex justify-center"><div className="animate-spin text-primary">Carregando folgas...</div></div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            
            {/* Lista Arrastável de Usuários (Painel Lateral) */}
            <Card className="lg:w-1/4 w-full sticky top-[90px] shadow-md border-border">
              <CardHeader className="bg-muted/30 border-b border-border pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-primary"/>
                  Equipe
                </CardTitle>
                <CardDescription>
                  Arraste o nome para jogar na Folga.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 max-h-[60vh] overflow-y-auto">
                <div className="flex flex-col gap-2">
                  {usuarios.map(user => (
                    <div
                      key={user.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, user.id)}
                      className="group flex flex-col p-2 pl-3 bg-background border border-border rounded-md shadow-sm cursor-grab active:cursor-grabbing hover:bg-muted/50 hover:border-primary/40 transition-colors relative"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/20 rounded-l-md group-hover:bg-primary/50 transition-colors"></div>
                      <span className="font-semibold text-sm select-none">{user.name}</span>
                      <span className="text-xs text-muted-foreground select-none">Mat: {user.matricula}</span>
                      <GripVertical className="w-4 h-4 text-muted-foreground opacity-30 absolute right-2 top-1/2 -translate-y-1/2 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Painel do Calendário (Zonas de Drop) */}
            <Card className="flex-1 shadow-sm border-border">
               <CardHeader className="bg-muted/20 border-b border-border">
                  <CardTitle>Painel do Mês: {periodo.charAt(0).toUpperCase() + periodo.slice(1)} {ano}</CardTitle>
                  <CardDescription>Os blocos abaixo representam os dias do mês. Solte a equipe aqui.</CardDescription>
               </CardHeader>
               <CardContent className="p-4 sm:p-6">
                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                   {diasArray.map(dia => {
                     const diaStr = String(dia).padStart(2, '0');
                     const funcionariosNoDia = folgasMap[diaStr] || [];

                     return (
                       <div
                         key={dia}
                         onDragOver={handleDragOver}
                         onDrop={(e) => handleDrop(e, dia)}
                         className="flex flex-col min-h-[140px] border border-dashed border-border rounded-lg bg-accent/5 hover:bg-accent/10 transition-colors overflow-hidden"
                       >
                         <div className="w-full bg-muted/40 border-b border-border/50 p-2 py-1.5 flex justify-between items-center">
                           <span className="text-sm font-bold text-foreground">Dia {diaStr}</span>
                           {funcionariosNoDia.length > 0 && <span className="text-[10px] bg-primary/20 text-primary-foreground font-bold px-1.5 py-0.5 rounded-full">{funcionariosNoDia.length}</span>}
                         </div>
                         <div className="flex-1 p-2 flex flex-col gap-1.5 overflow-y-auto">
                           {funcionariosNoDia.map(uid => {
                             const userMatch = usuarios.find(u => u.id === uid);
                             if (!userMatch) return null;
                             return (
                               <div key={userMatch.id} className="relative group bg-yellow-300 text-yellow-950 px-2 py-1.5 rounded-md text-xs font-semibold shadow-sm animate-in fade-in zoom-in-95 flex items-center justify-between border border-yellow-400">
                                 <span className="truncate pr-1 drop-shadow-sm">{userMatch.name.split(' ')[0]} {userMatch.name.split(' ').pop()}</span>
                                 <button 
                                   onClick={() => handleRemoverFolga(dia, userMatch.id)}
                                   className="text-yellow-700/60 hover:text-red-600 hover:bg-red-100 rounded-full p-0.5 transition-colors absolute -right-0.5 -top-0.5 bg-yellow-200 border border-yellow-400 shadow-sm opacity-0 group-hover:opacity-100 scale-90"
                                   title="Remover folga"
                                 >
                                   <Trash2 className="w-3 h-3" />
                                 </button>
                               </div>
                             );
                           })}
                           {funcionariosNoDia.length === 0 && (
                             <div className="h-full w-full flex items-center justify-center opacity-30 select-none">
                               <p className="text-[10px] text-center font-medium leading-tight px-2 text-muted-foreground">Arraste para cá</p>
                             </div>
                           )}
                         </div>
                       </div>
                     );
                   })}
                 </div>
               </CardContent>
            </Card>

          </div>
        )}
      </main>
    </div>
  );
}
