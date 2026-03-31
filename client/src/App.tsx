import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Router as WouterRouter } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Cadastro from "./pages/Cadastro";
import Gerar from "./pages/Gerar";
import Visualizar from "./pages/Visualizar";


const base = import.meta.env.DEV ? "/" : "/gerenciamento_de_escala_bloco";

function Router() {
  return (
    <WouterRouter base={base}>
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/cadastro"} component={Cadastro} />
        <Route path={"/gerar"} component={Gerar} />
        <Route path={"/visualizar"} component={Visualizar} />
        <Route path={"/404"} component={NotFound} />
        {/* Final fallback route */}
        <Route component={NotFound} />
      </Switch>
    </WouterRouter>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
