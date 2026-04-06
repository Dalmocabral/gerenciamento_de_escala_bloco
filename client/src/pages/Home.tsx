import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, Eye,  Github, Linkedin, Map } from "lucide-react";
import { useLocation } from "wouter";

/**
 * Página Inicial - Design Corporativo Moderno
 * 
 * Apresenta três botões principais:
 * 1. Cadastrar Usuário
 * 2. Gerar Escala
 * 3. Visualizar Escala
 * 
 * Paleta: Azul profundo (confiança), cinza neutro (fundo), verde menta (ações)
 */
export default function Home() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Calendar className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Escala de Trabalho</h1>
              <p className="text-xs text-muted-foreground">Gerenciador de Escalas Rotativas</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-12 md:py-20">
        {/* Hero Section */}
        <div className="mb-16 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Escala do Bloco
          </h2>
          
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Card 1: Cadastrar Usuário */}
          <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-border hover:border-primary/50 h-full flex flex-col"
            onClick={() => navigate("/cadastro")}>
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-xl">Cadastrar Usuário</CardTitle>
              <CardDescription>
                Adicione novos colaboradores ao sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between">
              <p className="text-sm text-muted-foreground mb-4">
                Registre nome e matrícula dos seus colaboradores para gerar as escalas.
              </p>
              <Button 
                variant="outline" 
                className="w-full group-hover:border-primary group-hover:text-primary transition-colors"
              >
                Ir para Cadastro
              </Button>
            </CardContent>
          </Card>

          {/* Card 2: Gerar Escala */}
          <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-border hover:border-accent/50 h-full flex flex-col"
            onClick={() => navigate("/gerar")}>
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-3 group-hover:bg-accent/20 transition-colors">
                <Calendar className="w-6 h-6 text-accent" />
              </div>
              <CardTitle className="text-xl">Gerar Escala</CardTitle>
              <CardDescription>
                Crie escalas rotativas automáticas
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between">
              <p className="text-sm text-muted-foreground mb-4">
                Selecione o período e configure férias para gerar a escala rotativa.
              </p>
              <Button 
                variant="outline" 
                className="w-full group-hover:border-accent group-hover:text-accent transition-colors"
              >
                Gerar Escala
              </Button>
            </CardContent>
          </Card>

          {/* Card 3: Visualizar Escala */}
          <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-border hover:border-primary/50 h-full flex flex-col"
            onClick={() => navigate("/visualizar")}>
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                <Eye className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-xl">Visualizar Escala</CardTitle>
              <CardDescription>
                Consulte as escalas geradas
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between">
              <p className="text-sm text-muted-foreground mb-4">
                Veja em detalhes a escala do período selecionado em formato de tabela.
              </p>
              <Button 
                variant="outline" 
                className="w-full group-hover:border-primary group-hover:text-primary transition-colors"
              >
                Visualizar
              </Button>
            </CardContent>
          </Card>
          {/* Card 4: Folgas */}
          <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-border hover:border-yellow-500/50 h-full flex flex-col"
            onClick={() => navigate("/folgas")}>
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-lg bg-yellow-500/10 flex items-center justify-center mb-3 group-hover:bg-yellow-500/20 transition-colors">
                <Map className="w-6 h-6 text-yellow-600" />
              </div>
              <CardTitle className="text-xl">Definir Folgas</CardTitle>
              <CardDescription>
                Planejamento de Folgas
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between">
              <p className="text-sm text-muted-foreground mb-4">
                Monte a escala do mês arrastando os colaboradores para seus dias de folga.
              </p>
              <Button 
                variant="outline" 
                className="w-full group-hover:border-yellow-600 group-hover:text-yellow-600 transition-colors"
              >
                Gerenciar Folgas
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Info Section */}
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Como funciona?
          </h3>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            1. Cadastre seus colaboradores com nome e matrícula • 2. Configure o período e marque férias • 3. Gere a escala rotativa automática • 4. Visualize em tabela organizada
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 mt-16 py-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>Desenvolvido por <strong>Dalmo dos Santos Cabral</strong></p>
          <div className="social-links">
          <a href="https://github.com/Dalmocabral" target="_blank" rel="noopener noreferrer" className="social-btn">
            <Github size={20} />
            <span>GitHub</span>
          </a>
          <a href="https://www.linkedin.com/in/dalmo-cabral-062374131/" target="_blank" rel="noopener noreferrer" className="social-btn">
            <Linkedin size={20} />
            <span>LinkedIn</span>
          </a>
        </div>
        </div>
      </footer>
    </div>
  );
}
