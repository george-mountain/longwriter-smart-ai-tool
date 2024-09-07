

FROM pytorch/pytorch:2.3.1-cuda11.8-cudnn8-devel

ENV PYTHONUNBUFFERED=1


WORKDIR /app

COPY requirements.txt /app/

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt


COPY . /app/

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
