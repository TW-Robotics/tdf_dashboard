FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend backend
COPY frontend frontend
COPY admin admin
ENV LAB_DATA_FILE=/data/status.json
VOLUME ["/data"]
EXPOSE 8080
CMD ["gunicorn", "-w", "1", "--threads", "4", "-b", "0.0.0.0:8080", "--chdir", "backend", "app:app"]
