import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { ArrowLeft, Plus, Trash2, Users, Pencil, X } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { User } from '@/lib/types';
import { toast } from 'sonner';

/**
 * Página de Cadastro de Usuários
 * 
 * Permite adicionar e visualizar colaboradores
 * Campos: Nome e Matrícula
 * Armazenamento: Firebase Firestore
 */
export default function Cadastro() {
  const [, navigate] = useLocation();
  const [nome, setNome] = useState('');
  const [matricula, setMatricula] = useState('');
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletando, setDeletando] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  // Carregar usuários ao montar o componente
  useEffect(() => {
    carregarUsuarios();
  }, []);

  const carregarUsuarios = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'usuarios'));
      const usuariosData: User[] = [];
      
      querySnapshot.forEach((doc) => {
        usuariosData.push({
          id: doc.id,
          name: doc.data().name,
          matricula: doc.data().matricula,
          createdAt: doc.data().createdAt?.toDate() || new Date()
        });
      });
      
      setUsuarios(usuariosData);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (usuario: User) => {
    setEditandoId(usuario.id);
    setNome(usuario.name);
    setMatricula(usuario.matricula);
    // Rolar para o topo caso esteja em mobile
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditandoId(null);
    setNome('');
    setMatricula('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação
    if (!nome.trim()) {
      toast.error('Por favor, insira o nome');
      return;
    }

    if (!matricula.trim()) {
      toast.error('Por favor, insira a matrícula');
      return;
    }

    // Verificar se matrícula já existe para outro usuário
    const matriculaExistente = usuarios.find(u => u.matricula === matricula);
    if (matriculaExistente && matriculaExistente.id !== editandoId) {
      toast.error('Esta matrícula já está cadastrada');
      return;
    }

    try {
      setLoading(true);
      
      if (editandoId) {
        // Atualizar o próprio usuário
        await updateDoc(doc(db, 'usuarios', editandoId), {
          name: nome.trim(),
          matricula: matricula.trim()
        });

        // ----------------------------------------------------
        // Atualizar Nome/Matricula nas ESCALAS já geradas (NoSQL Fan-out)
        // ----------------------------------------------------
        const escalasSnapshot = await getDocs(collection(db, 'escalas'));
        const promessasEscalas = escalasSnapshot.docs.map(async (escalaDoc) => {
          const escalaData = escalaDoc.data();
          let modificado = false;
          
          const novasPosicoes = escalaData.posicoes.map((pos: any) => {
            if (pos && pos.usuarioId === editandoId) {
              modificado = true;
              return { ...pos, usuarioNome: nome.trim(), usuarioMatricula: matricula.trim() };
            }
            return pos;
          });

          if (modificado) {
            return updateDoc(doc(db, 'escalas', escalaDoc.id), { posicoes: novasPosicoes });
          }
        });

        // Atualizar nas FÉRIAS já registradas
        const feriasSnapshot = await getDocs(collection(db, 'ferias'));
        const promessasFerias = feriasSnapshot.docs.map(async (feriaDoc) => {
          if (feriaDoc.data().usuarioId === editandoId) {
            return updateDoc(doc(db, 'ferias', feriaDoc.id), { usuarioNome: nome.trim() });
          }
        });

        await Promise.all([...promessasEscalas.filter(Boolean), ...promessasFerias.filter(Boolean)]);
        // ----------------------------------------------------

        toast.success('Usuário atualizado com sucesso em todas as escalas!');
        setEditandoId(null);
      } else {
        // Adicionar novo
        await addDoc(collection(db, 'usuarios'), {
          name: nome.trim(),
          matricula: matricula.trim(),
          createdAt: new Date()
        });
        toast.success('Usuário cadastrado com sucesso!');
      }

      setNome('');
      setMatricula('');
      
      // Recarregar lista
      await carregarUsuarios();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este usuário?')) {
      return;
    }

    try {
      setDeletando(id);
      await deleteDoc(doc(db, 'usuarios', id));
      toast.success('Usuário deletado com sucesso!');
      await carregarUsuarios();
    } catch (error) {
      console.error('Erro ao deletar:', error);
      toast.error('Erro ao deletar usuário');
    } finally {
      setDeletando(null);
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
              <h1 className="text-xl font-bold text-foreground">Cadastro de Usuários</h1>
              <p className="text-xs text-muted-foreground">Gerencie seus colaboradores</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulário */}
          <Card className="lg:col-span-1 h-fit">
            <CardHeader>
              <CardTitle>{editandoId ? 'Editar Usuário' : 'Novo Usuário'}</CardTitle>
              <CardDescription>
                {editandoId ? 'Atualize os dados do colaborador' : 'Preencha os dados do colaborador'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome</Label>
                  <Input
                    id="nome"
                    placeholder="Ex: João Silva"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="matricula">Matrícula</Label>
                  <Input
                    id="matricula"
                    placeholder="Ex: 1078"
                    value={matricula}
                    onChange={(e) => setMatricula(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    className="flex-1 bg-primary hover:bg-primary/90"
                    disabled={loading}
                  >
                    <Plus className={`w-4 h-4 mr-2 ${editandoId ? 'hidden' : ''}`} />
                    {loading ? (editandoId ? 'Salvando...' : 'Cadastrando...') : (editandoId ? 'Salvar Alterações' : 'Cadastrar')}
                  </Button>
                  
                  {editandoId && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={cancelEdit}
                      disabled={loading}
                      title="Cancelar Edição"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Lista de Usuários */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Usuários Cadastrados</CardTitle>
                  <CardDescription>
                    {usuarios.length} colaborador(es)
                  </CardDescription>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {usuarios.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhum usuário cadastrado ainda</p>
                  <p className="text-sm text-muted-foreground/70">Adicione o primeiro colaborador usando o formulário ao lado</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {usuarios.map((usuario) => (
                    <div
                      key={usuario.id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/60 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{usuario.name}</p>
                        <p className="text-sm text-muted-foreground">Matrícula: {usuario.matricula}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(usuario)}
                          disabled={deletando === usuario.id || editandoId === usuario.id}
                          className="text-muted-foreground hover:text-primary transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(usuario.id)}
                          disabled={deletando === usuario.id || editandoId === usuario.id}
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Info Box */}
        <Card className="mt-6 bg-accent/5 border-accent/20">
          <CardContent className="pt-6">
            <p className="text-sm text-foreground">
              <strong>Dica:</strong> Cadastre todos os seus colaboradores antes de gerar a escala. Você pode adicionar ou remover usuários a qualquer momento.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
