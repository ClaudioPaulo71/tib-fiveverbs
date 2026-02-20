# Use uma imagem oficial leve do Python
FROM python:3.12-slim

# Impede o Python de escrever arquivos pyc e bufferizar stdout
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Define diretório de trabalho
WORKDIR /app

# Instala dependências do sistema (necessário para alguns pacotes python)
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Instala dependências Python
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copia o projeto
COPY . /app/

# Expõe a porta (apenas para documentação, o Compose que define)
EXPOSE 8000

# Comando padrão (pode ser sobrescrito pelo docker-compose)
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000"]
