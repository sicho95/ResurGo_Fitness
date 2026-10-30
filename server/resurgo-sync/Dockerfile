FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 RS_DB_PATH=/data/resurgo.sqlite3
RUN groupadd -g 10001 resurgo && useradd -u 10001 -g 10001 -M -s /usr/sbin/nologin resurgo \
    && mkdir -p /data /app && chown 10001:10001 /data /app
WORKDIR /app
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py /app/
USER 10001:10001
EXPOSE 8080
CMD ["uvicorn", "app:public", "--host", "0.0.0.0", "--port", "8080", "--no-access-log"]
