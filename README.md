# Asset Flow 📦💻

**Asset Flow** é um sistema de gestão de inventário e ativos de TI. Ele centraliza o controle de equipamentos, consumíveis, colaboradores e termos de responsabilidade, além de oferecer uma visão financeira do patrimônio (centros de custo, depreciação e fechamento contábil).

🔗 **Demo:** [asset-flow-system.vercel.app](https://asset-flow-system.vercel.app)

---

## 📑 Sumário

- [Funcionalidades](#-funcionalidades)
- [Tecnologias](#️-tecnologias)
- [Arquitetura](#️-arquitetura)
- [Estrutura do projeto](#-estrutura-do-projeto)
- [Como rodar localmente](#️-como-rodar-localmente)
- [Variáveis de ambiente](#-variáveis-de-ambiente)
- [Deploy](#-deploy)
- [Endpoints da API](#-endpoints-da-api)

---

## 🚀 Funcionalidades

### Inventário de equipamentos
- Cadastro de ativos com número de patrimônio, categoria, departamento, fotos e status (**Disponível**, **Em uso**, **Manutenção**, **Descartado**).
- Transferência de equipamentos entre colaboradores, com **histórico de transferências**.
- Ações em massa: transferir, trocar categoria e enviar para a lixeira.
- **Importação via CSV** (com modelo para download) e **exportação** do inventário.

### Colaboradores (RH)
- Cadastro de colaboradores com CPF, cargo, e-mail, departamento e status (Ativo/Desligado).
- Geração do **Termo de Responsabilidade em PDF** com os equipamentos vinculados.
- Upload e gestão dos termos assinados.

### Consumíveis (Almoxarifado)
- Controle de estoque de itens como mouses, teclados e cabos, com **estoque mínimo**.
- Registro de **entradas e saídas**, com destino e observação.
- Histórico de movimentações com exportação.

### Financeiro
- **Centros de custo** com orçamento anual.
- **Controle contábil**: valor e data de compra e taxa de depreciação anual por equipamento.
- Painel financeiro no dashboard (valor original × valor atual × total depreciado).
- Exportação de **fechamento contábil em CSV**, filtrável por ano e centro de custo.

### Sistema
- **Dashboard** operacional e financeiro.
- **Lixeira**: itens excluídos podem ser restaurados ou removidos definitivamente.
- Gestão de **usuários do sistema** (restrita a administradores).
- Autenticação por sessão com proteção CSRF.

---

## 🛠️ Tecnologias

| Camada | Stack |
| --- | --- |
| **Backend** | Python 3.12, Django 6, PostgreSQL, Gunicorn, WhiteNoise, django-cors-headers |
| **Frontend** | React 19, TypeScript, Vite, Mantine, Tailwind CSS, React Router, Framer Motion |
| **Documentos** | xhtml2pdf / ReportLab (PDF), openpyxl |
| **Infra** | Docker Compose (Postgres local), Railway (API), Vercel (frontend) |

---

## 🏗️ Arquitetura

```
┌──────────────────────┐    /api/*    ┌──────────────────────┐      ┌────────────┐
│  Frontend (React)    │ ───────────▶ │  Backend (Django)    │ ───▶ │ PostgreSQL │
│  Vite · Vercel       │ ◀─────────── │  API JSON · Railway  │      └────────────┘
└──────────────────────┘   sessão +   └──────────────────────┘
                           cookie CSRF
```

- O **frontend** é uma SPA que consome a API REST em `/api/`.
  - Em desenvolvimento, o Vite faz proxy de `/api` e `/media` para `http://127.0.0.1:8000`.
  - Em produção, o `vercel.json` reescreve `/api/*` para o backend no Railway.
- O **backend** expõe a API JSON, o Django Admin (`/admin/`) e os arquivos de mídia (`/media/`).

---

## 📁 Estrutura do projeto

```
asset-flow/
├── backend/
│   ├── api/            # API REST (views por módulo, serializers, utils)
│   ├── estoque/        # Equipamentos, categorias, imagens e histórico de transferências
│   ├── rh/             # Colaboradores, departamentos e termos de responsabilidade
│   ├── consumiveis/    # Consumíveis e movimentações de estoque
│   ├── patrimonio/     # Centros de custo
│   ├── setup/          # Configurações do projeto Django (settings, urls, wsgi)
│   ├── Dockerfile
│   ├── Procfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/        # Rotas, providers e contextos (auth, lookups)
│   │   ├── components/ # Layout e componentes de UI reutilizáveis
│   │   ├── features/   # Páginas por módulo (dashboard, equipamentos, colaboradores…)
│   │   ├── lib/        # Cliente da API e utilitários
│   │   └── types/      # Tipos de domínio
│   ├── templates/      # Template HTML do termo de responsabilidade (PDF)
│   └── vercel.json
├── docker-compose.yml  # PostgreSQL para desenvolvimento
└── railpack.json       # Configuração de build/deploy no Railway
```

---

## ⚙️ Como rodar localmente

### Pré-requisitos
- [Python 3.12+](https://www.python.org/)
- [Node.js 20+](https://nodejs.org/) e npm
- [Docker](https://www.docker.com/) (para o PostgreSQL) — ou um Postgres instalado localmente
- No Linux, as bibliotecas do Cairo/Postgres usadas na geração de PDF: `libcairo2-dev pkg-config libpq-dev`

### 1. Clone o repositório
```bash
git clone https://github.com/Gustzeraa/asset-flow.git
cd asset-flow
```

### 2. Suba o banco de dados
```bash
docker compose up -d
```
Isso cria um PostgreSQL em `localhost:5432` com usuário `root`, senha `root` e banco `assetflow` — exatamente a conexão padrão usada pelo backend.

### 3. Configure o backend
```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# Linux / macOS
source .venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```
A API ficará disponível em `http://127.0.0.1:8000/api/` e o Django Admin em `http://127.0.0.1:8000/admin/`.

### 4. Configure o frontend
Em outro terminal:
```bash
cd frontend
npm install
npm run dev
```
Acesse **http://127.0.0.1:5173** e entre com o superusuário criado no passo anterior.

### Scripts úteis do frontend

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento com hot reload |
| `npm run build` | Checagem de tipos + build de produção em `dist/` |
| `npm run lint` | Executa o ESLint |
| `npm run preview` | Serve o build de produção localmente |

---

## 🔐 Variáveis de ambiente

O backend lê as seguintes variáveis (todas opcionais em desenvolvimento):

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `DATABASE_URL` | `postgres://root:root@127.0.0.1:5432/assetflow` | URL de conexão com o banco |
| `SECRET_KEY` | chave insegura de teste | **Obrigatório definir em produção** |
| `DEBUG` | `True` | Use `False` em produção |
| `PORT` | — | Porta usada pelo Gunicorn/Docker no deploy |

> As origens permitidas para CORS/CSRF ficam em `backend/setup/settings.py` (`CORS_ALLOWED_ORIGINS` e `CSRF_TRUSTED_ORIGINS`). Adicione ali o domínio do seu frontend se for publicar em outro endereço.

---

## ☁️ Deploy

- **Backend (Railway):** build configurado pelo `railpack.json`/`Procfile`. No start, roda `migrate` e sobe o Gunicorn (`setup.wsgi`). Também há um `Dockerfile` em `backend/` como alternativa.
- **Frontend (Vercel):** build com `npm run build`; o `vercel.json` redireciona `/api/*` para o backend e faz o fallback das rotas da SPA para `index.html`.

---

## 📡 Endpoints da API

Todas as rotas ficam sob `/api/` e, exceto as de autenticação, exigem usuário logado.

| Módulo | Rotas principais |
| --- | --- |
| Autenticação | `auth/csrf/`, `auth/login/`, `auth/logout/`, `auth/me/` |
| Dashboard | `dashboard/`, `dashboard/finance/`, `lookups/` |
| Equipamentos | `equipments/`, `equipments/<id>/`, `equipments/<id>/transfer/`, `equipments/import/`, `equipments/export/`, `equipments/bulk/*` |
| Financeiro | `finance/years/`, `finance/export/`, `finance/equipments/<id>/`, `finance/equipments/bulk/` |
| Centros de custo | `cost-centers/`, `cost-centers/<id>/` |
| Colaboradores | `collaborators/`, `collaborators/<id>/`, `collaborators/<id>/term/`, `collaborators/<id>/upload-term/` |
| Consumíveis | `consumables/`, `consumables/<id>/movements/`, `consumables/movements/`, `consumables/movements/export/` |
| Categorias / Departamentos | `categories/`, `departments/` |
| Lixeira | `trash/`, `trash/<tipo>/<id>/restore/`, `trash/<tipo>/<id>/` |
| Usuários | `users/`, `users/<id>/` |

A lista completa está em [`backend/api/urls.py`](backend/api/urls.py).
