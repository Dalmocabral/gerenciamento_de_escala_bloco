# ⚡ Gerenciamento de Escala (Escala-Trabalho)

![Versão](https://img.shields.io/badge/version-1.0.0-blue.svg)
![React](https://img.shields.io/badge/React-19-61dafb.svg?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178c6.svg?logo=typescript)
![Tailwind](https://img.shields.io/badge/TailwindCSS-v4-06B6D4.svg?logo=tailwindcss)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28.svg?logo=firebase)

O **Gerenciamento de Escala** é uma Single Page Application (SPA) moderna focada em resolver o complexo problema de lotação e rodízio de funcionários (ex: Blocos Cirúrgicos, Hospitais ou Equipes Fixas). Ele gera tabelas dinâmicas e sequenciais de escalas de trabalho com a capacidade única de recalculagem preditiva através de uma interface interativa (Drag and Drop).

---

## ✨ Funcionalidades Principais

* 👥 **Gestão de Colaboradores e Férias**: Cadastro rápido de profissionais e registro antecipado de férias. O motor de escala *ignora automaticamente* profissionais em férias durante o preenchimento de suas datas de ausência.
* 🧠 **Geração de Rodízio Contínua (Stateful)**: Capacidade avançada de puxar o estado estrutural do último dia do mês anterior para dar continuidade à cadeia de rotação no mês atual organicamente (Ex: Se João era o 1º no dia 31, ele naturalmente vai para o fim da fila no dia 1º, empurrando a equipe adequadamente).
* 🖱️ **"Modo Reorganizar" (Drag & Drop)**: Interface interativa tátil! Ative o modo de reorganização na tela de Visualização, clique em um funcionário e "solte-o" em outra posição no mesmo dia. O sistema processa a troca em memória e **recalcula recursivamente** todos os dias do restante do mês, salvando as centenas de novos cálculos em lote (*Batch Write*) no Firestore em milissegundos.
* 📱 **Mobile UI & Compartilhamento Instantâneo**: A tela se adapta visualmente, e a proteção nativa antiesbarrões impede que o celular role acidentalmente as células. A escala final pode ser exportada integralmente como **CSV** (para Excel) ou renderizada de forma responsiva como uma **Imagem (.png)** super nítida usando `html-to-image`, pronta para compartilhamento no WhatsApp/Telegram.

---

## 🛠️ Stack Tecnológica e Arquitetura

O projeto foi construído objetivando altíssima performance client-side, sem a necessidade de manter e pagar por uma arquitetura Serverless (Node API) custosa:

* **Frontend Framework:** [React 19](https://react.dev/) instanciado via [Vite](https://vitejs.dev/) para HMR super rápido.
* **Linguagem Principal:** TypeScript estrito com `zod` para schema de validação.
* **Estilização e Componentes:** [TailwindCSS v4](https://tailwindcss.com/) com paleta nativa `oklch`, acrescido do framework visual Radix-UI (baseado no *shadcn/ui*). Componentes como Switch, Select e Cards garantem interatividade rica.
* **Roteamento:** [Wouter](https://github.com/molefrog/wouter), um router minimalista (< 2KB) robusto perfeito para SPAs sem lag.
* **Backend como Serviço (BaaS):** [Firebase Firestore](https://firebase.google.com/) estruturando dados NoSQL para salvar estados, posições diárias, metadados de funcionários e histórico de períodos de forma resiliente.

---

## 🚀 Guia Rápido de Instalação e Execução

### Pré-Requisitos
1. [Node.js](https://nodejs.org/) (Recomendado versão 20+)
2. [pnpm](https://pnpm.io/) (Gerenciador de pacotes ultrarrápido)
3. Conta ativa no Firebase e novo projeto instanciado

### Passo a Passo Local

```bash
# 1. Clone o repositório
git clone https://github.com/Dalmocabral/gerenciamento_de_escala_bloco.git
cd gerenciamento_de_escala_bloco

# 2. Instale as dependências
pnpm install

# 3. Configure as Variáveis de Ambiente
# Crie o arquivo .env.local baseado no setup do Firebase do seu projeto (Veja `SETUP.md`).
# Exemplo de conteúdo do .env.local:
VITE_FIREBASE_API_KEY="AIzaSy..."
VITE_FIREBASE_AUTH_DOMAIN="seu-projeto.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="seu-projeto-id"

# 4. Inicie o Servidor de Desenvolvimento
pnpm dev
# O app estará rodando em http://localhost:3000
```

---

## 🚢 Deploy (GitHub Pages)

A aplicação conta com deploy automatizado pronto para subir sua versão em HTML Estático diretamente para a branch `gh-pages` de seu Github. A infraestrutura de Vite já aponta para a Base Sub-URL do diretório do respositório (Configurado no `vite.config.ts`).

Para realizar uma atualização para Produção:
```bash
# Rode este comando na pasta raiz do projeto
pnpm run deploy
```
*O que este comando faz?*
1. Executa o `pnpm build`, que empacota o código inteiro dentro da pasta `dist/public`.
2. O pacote local silencioso executa o script do `gh-pages`, pegando apenas o que importa da `dist/public` e esmagando (force pull) para cima da origin remota Branch `gh-pages`.

---

## 🔧 Guia para Futuras Manutenções (Tech Handoff)

Seções vitais para os desenvolvedores que manterão o projeto vivo:

### 1. Rotinas do Algoritmo de Geração
O coração imutável da aplicação mora em `client/src/lib/escalaGenerator.ts`.
A engrenagem do algorítmo é sequencial.
- O iterador caminha baseando-se num array rotativo (Fila Posicional diária): A cada novo dia gerado, ele retira o funcionário que atuou da Posição "X", empurra todos um bloco adiante através do uso matemático nativo de `pop()` seguido de um `unshift()` recolocando o antigo remanescente na liderança do plantão à frente.
- **Dica de Manutenção:** Caso a empresa modifique regras trabalhistas (exemplo: ninguém pode trabalhar domingos x2), é apenas nos loops de `gerarEscala` e `recalcularEscalas` onde as exceções (`ifs` + interações de calendário com `date-fns` seriam requeridas) devem ser colocadas.

### 2. A Magia do Drag-and-Drop
Construído nativamente (Sem pacotes inchados pesando!). O core do controlador mora em `client/src/pages/Visualizar.tsx`.
- Para poupar uso de bibliotecas massivas como *dnd-kit* ou *react-beautiful-dnd*, as células da tabela manipulam a UI usando as APIs do HTML5 (Eventos `onDrop` e `onDragStart` atados a condicional de `draggable`).
- **Atenção em Touch/Mobile:** A tabela pode perder seu scrolling nativo horizontal nas telas pequenas se a engine captar "Intenção de arraste", por isso usamos o "Modo Reorganizar". Sempre defenda que ele apenas injete os event listeners de drag na árvore DOM **quando explicitamente ligado (Toggle Switch ativo)**.

### 3. Integrações de Persistência em Nuvem
Integra-se diretamente com o SDK Frontend da Firebase v12+. Veja `client/src/lib/firebase.ts`.
A ferramenta salva a teia sequencial da escala através de **Batch Writes** (Lotes Atômicos). O limite do Firestore é de 500 chamadas simultâneas via `writeBatch(db)`; Como um mês conta no máximo com 31 Dias/Instâncias modificadas por varredura, o salvamento acontece sob 1 ciclo de requisição HTTP único otimizando radicalmente a quota da nuvem.

### 4. Cores, Estilos & Exportação Oklch (Tailwind v4)
`client/src/index.css` rege as cores padrões nativamente baseadas no espaço Web moderno `.oklch`. 
**Aviso importante para geradores de Canvas/PNG:** Por ser v4 moderno, APIs defasadas geradoras de tela (como `html2canvas`) quebrassem ao tentar parsear oklch. A aplicação exporta a imagem da tabela usando **`html-to-image`**, transformando o nodo React inteiro em SVG via `<foreignObject>` que abstrai todo o layout sem corromper folhas de estilo mais novas. 

---
> Desenvolvido com carinho para otimizar alocação temporal e simplificar rotinas de recursos humanos operacionais.
