import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { ArrowLeft, Plus, Trash2, Users } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
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

    // Verificar se matrícula já existe
    if (usuarios.some(u => u.matricula === matricula)) {
      toast.error('Esta matrícula já está cadastrada');
      return;
    }

    try {
      setLoading(true);
      
      // Adicionar ao Firestore
      await addDoc(collection(db, 'usuarios'), {
        name: nome.trim(),
        matricula: matricula.trim(),
        createdAt: new Date()
      });

      toast.success('Usuário cadastrado com sucesso!');
      setNome('');
      setMatricula('');
      
      // Recarregar lista
      await carregarUsuarios();
    } catch (error) {
      console.error('Erro ao cadastrar:', error);
      toast.error('Erro ao cadastrar usuário');
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
              <CardTitle>Novo Usuário</CardTitle>
              <CardDescription>
                Preencha os dados do colaborador
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

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={loading}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {loading ? 'Cadastrando...' : 'Cadastrar'}
                </Button>
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(usuario.id)}
                        disabled={deletando === usuario.id}
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
