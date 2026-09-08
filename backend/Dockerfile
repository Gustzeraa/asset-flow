# 1. Usa o Linux oficial com Python
FROM python:3.12-slim

# 2. Desativa o buffer do Python para os logs aparecerem
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# 3. Instala as ferramentas do Cairo (PDF) e Postgres (psycopg2)
RUN apt-get update && apt-get install -y \
    gcc \
    pkg-config \
    libcairo2-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# 4. Copia o requirements e instala os pacotes
COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copia todo o resto do seu projeto
COPY . .

# 6. Roda o servidor
CMD python manage.py runserver 0.0.0.0:$PORT