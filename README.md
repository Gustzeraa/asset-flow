# Asset Flow 📦💻

**Asset Flow** é um sistema ERP focado na gestão de inventário e controle de ativos de TI. Desenvolvido para modernizar e organizar o fluxo de equipamentos, consumíveis e termos de responsabilidade vinculados aos colaboradores da empresa.

## 🚀 Funcionalidades
* **Gestão de Colaboradores:** Cadastro completo de funcionários com controle de status (Ativo/Desligado).
* **Controle de Equipamentos:** Rastreamento de ativos de TI (Notebooks, Monitores, etc.) por número de patrimônio e status de uso.
* **Gestão de Consumíveis:** Controle de estoque de itens como mouses, teclados e cabos.
* **Interface Moderna:** Utilização de Modais flutuantes (iframes) para formulários limpos e navegação sem interrupções.
* **Segurança de Dados:** Proteção nativa contra exclusão acidental de colaboradores ou categorias que possuam itens vinculados no banco de dados.

## 🛠️ Tecnologias Utilizadas
* **Backend:** Python 3, Django 6
* **Frontend:** HTML5, CSS3, Bootstrap 5, JavaScript
* **Banco de Dados:** SQLite (desenvolvimento)

---

## ⚙️ Como rodar o projeto localmente

Siga os passos abaixo para executar o sistema na sua máquina:

### 1. Clone o repositório
```bash
git clone [https://github.com/Gustzeraa/asset-flow.git](https://github.com/Gustzeraa/asset-flow.git)
cd asset-flow
```

### 2. Crie e ative o ambiente virtual
```bash
python -m venv .venv
.venv\Scripts\activate
```

### 3. Instale as dependências
```bash
pip install -r requirements.txt
```

### 4. Configure o Banco de Dados
```bash
python manage.py migrate
```

### 5. Crie um Superusuário (Admin)
```bash
python manage.py createsuperuser
```

### 6. Inicie o Servidor
```bash
python manage.py runserver
```