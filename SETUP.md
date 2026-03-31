# Guia de Configuração - Escala de Trabalho

## Pré-requisitos

- Node.js 18+
- npm ou pnpm
- Conta Firebase (gratuita)
- Conta GitHub (para deploy)

---

## 1. Configurar Firebase

### 1.1 Criar Projeto Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com)
2. Clique em "Criar Projeto"
3. Preencha o nome: `escala-trabalho`
4. Desabilite Google Analytics (opcional)
5. Clique em "Criar Projeto"

### 1.2 Configurar Firestore Database

1. No console Firebase, clique em "Firestore Database"
2. Clique em "Criar banco de dados"
3. Selecione modo "Iniciar no modo de teste"
4. Escolha localização: `us-central1` ou a mais próxima
5. Clique em "Criar"

### 1.3 Obter Credenciais

1. No console Firebase, vá para "Configurações do Projeto" (ícone de engrenagem)
2. Selecione aba "Geral"
3. Procure por "Seus aplicativos" e clique em "Adicionar aplicativo"
4. Selecione "Web"
5. Preencha o nome: `escala-trabalho`
6. Clique em "Registrar aplicativo"
7. Copie o objeto de configuração (firebaseConfig)

### 1.4 Adicionar Variáveis de Ambiente

1. Na raiz do projeto, crie arquivo `.env.local`:

```env
VITE_FIREBASE_API_KEY=seu_api_key_aqui
VITE_FIREBASE_AUTH_DOMAIN=seu_auth_domain_aqui
VITE_FIREBASE_PROJECT_ID=seu_project_id_aqui
VITE_FIREBASE_STORAGE_BUCKET=seu_storage_bucket_aqui
VITE_FIREBASE_MESSAGING_SENDER_ID=seu_messaging_sender_id_aqui
VITE_FIREBASE_APP_ID=seu_app_id_aqui
```

Substitua pelos valores obtidos no passo anterior.

### 1.5 Configurar Regras de Segurança Firestore

1. No console Firebase, vá para Firestore Database
2. Clique em "Regras"
3. Substitua o conteúdo pelas regras abaixo:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

⚠️ **Nota**: Estas são regras de desenvolvimento. Para produção, implemente autenticação adequada.

---

## 2. Configuração Local

### 2.1 Instalar Dependências

```bash
pnpm install
```

### 2.2 Executar Servidor de Desenvolvimento

```bash
pnpm dev
```

O aplicativo estará disponível em `http://localhost:3000`

---

## 3. Usar o Aplicativo

### 3.1 Cadastrar Usuários

1. Clique em "Cadastrar Usuário"
2. Preencha Nome e Matrícula
3. Clique em "Cadastrar"
4. Repita para todos os colaboradores

### 3.2 Gerar Escala

1. Clique em "Gerar Escala"
2. Selecione o período (mês) e ano
3. (Opcional) Marque colaboradores em férias
4. Clique em "Gerar Escala"

### 3.3 Visualizar Escala

1. Clique em "Visualizar Escala"
2. Selecione período e ano
3. Veja a tabela com a escala rotativa
4. (Opcional) Clique em "Exportar CSV" para baixar

---

## 4. Deploy em GitHub Pages

### 4.1 Preparar Repositório

```bash
# Inicializar git (se não estiver)
git init

# Adicionar remote
git remote add origin https://github.com/seu-usuario/escala-trabalho.git

# Criar branch gh-pages
git checkout -b gh-pages
```

### 4.2 Configurar vite.config.ts

Adicione a configuração de base:

```typescript
export default defineConfig({
  base: '/escala-trabalho/', // Substitua pelo nome do seu repositório
  plugins: [react()],
})
```

### 4.3 Build e Deploy

```bash
# Build para produção
pnpm build

# Deploy (usando gh-pages)
pnpm add -D gh-pages

# Adicionar script ao package.json
# "deploy": "gh-pages -d dist"

pnpm deploy
```

### 4.4 Ativar GitHub Pages

1. Vá para Configurações do repositório
2. Selecione "Pages"
3. Em "Source", selecione branch `gh-pages`
4. Clique em "Save"
5. Seu site estará disponível em `https://seu-usuario.github.io/escala-trabalho`

### 4.5 Variáveis de Ambiente no GitHub Pages

1. Vá para Configurações do repositório
2. Selecione "Secrets and variables" > "Actions"
3. Clique em "New repository secret"
4. Adicione cada variável do `.env.local`:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - etc.

5. Crie arquivo `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm build
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
          VITE_FIREBASE_STORAGE_BUCKET: ${{ secrets.VITE_FIREBASE_STORAGE_BUCKET }}
          VITE_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}
          VITE_FIREBASE_APP_ID: ${{ secrets.VITE_FIREBASE_APP_ID }}
      
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

---

## 5. Estrutura do Banco de Dados

### Coleção: `usuarios`
```json
{
  "name": "João Silva",
  "matricula": "1078",
  "createdAt": "2026-03-30T21:00:00Z"
}
```

### Coleção: `escalas`
```json
{
  "data": "30/03",
  "periodo": "março",
  "ano": 2026,
  "posicoes": [
    {
      "posicao": 1,
      "usuarioId": "doc_id",
      "usuarioNome": "João Silva",
      "usuarioMatricula": "1078"
    }
  ],
  "createdAt": "2026-03-30T21:00:00Z",
  "updatedAt": "2026-03-30T21:00:00Z"
}
```

### Coleção: `ferias`
```json
{
  "usuarioId": "doc_id",
  "usuarioNome": "João Silva",
  "dataInicio": "01",
  "dataFim": "15",
  "periodo": "março",
  "ano": 2026,
  "createdAt": "2026-03-30T21:00:00Z"
}
```

---

## 6. Troubleshooting

### Erro: "Cannot find module 'firebase'"
```bash
pnpm install firebase
```

### Erro: "Firebase config not found"
Verifique se `.env.local` está preenchido corretamente com as credenciais do Firebase.

### Escala não aparece
1. Verifique se usuários foram cadastrados
2. Verifique se a escala foi gerada (vá para "Gerar Escala")
3. Verifique o console do navegador para erros

### Dados não salvam no Firebase
1. Verifique as regras de segurança do Firestore
2. Verifique a conexão de internet
3. Verifique se o projeto Firebase está ativo

---

## 7. Recursos Adicionais

- [Documentação Firebase](https://firebase.google.com/docs)
- [Documentação React](https://react.dev)
- [Documentação Vite](https://vitejs.dev)
- [GitHub Pages Docs](https://docs.github.com/en/pages)

---

## Suporte

Para dúvidas ou problemas, abra uma issue no repositório GitHub.
