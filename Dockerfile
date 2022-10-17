FROM python:3.9-slim as builder

RUN apt update && apt install -y unzip wget git && \
  wget https://chromedriver.storage.googleapis.com/106.0.5249.61/chromedriver_linux64.zip -P /opt/chrome/ && \
  cd /opt/chrome && \
  unzip chromedriver_linux64.zip && \
  rm -f chromedriver_linux64.zip

WORKDIR /app
COPY Pipfile* .

RUN pip install --upgrade pip && \
  pip install pipenv && \
  pipenv install --system --ignore-pipfile --deploy

RUN apt update && apt install -y wget curl gnupg && \
  wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add && \
  echo 'deb http://dl.google.com/linux/chrome/deb/ stable main' | tee -a /etc/apt/sources.list.d/google-chrome.list && \
  apt update && apt install -y google-chrome-stable && \
  apt -y clean && \
  rm -rf /var/lib/apt/lists/*

## runtime
FROM python:3.9-slim
COPY --from=builder /opt/chrome /usr/local/bin
COPY --from=builder /usr/local/lib/python3.9/site-packages /usr/local/lib/python3.9/site-packages

USER root
WORKDIR /app
COPY main.py .
COPY entrypoint.sh .
RUN chmod +x ./entrypoint.sh

RUN apt update && apt install -y wget curl gnupg && \
  wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add && \
  echo 'deb http://dl.google.com/linux/chrome/deb/ stable main' | tee -a /etc/apt/sources.list.d/google-chrome.list && \
  apt update && apt install -y google-chrome-stable && \
  apt -y clean && \
  rm -rf /var/lib/apt/lists/*

CMD ["./entrypoint.sh"]
