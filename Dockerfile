FROM node:12 as frontend

COPY . /app
WORKDIR /app
RUN cd frontend && yarn install && yarn build



FROM python:3.8-slim

WORKDIR /app

RUN groupadd --gid 10001 app && useradd -g app --uid 10001 --shell /usr/sbin/nologin app
RUN chown app:app /tmp

RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
    gcc apt-transport-https python-dev

# Gotta try moving this to poetry instead!
COPY ./requirements.txt /app/requirements.txt

RUN pip install --upgrade --no-cache-dir -r requirements.txt


COPY . /app

COPY --from=frontend /app/frontend/build /app/frontend/build

USER app

ENV PORT=8000

EXPOSE $PORT

CMD uvicorn gitbusy.asgi:application --host 0.0.0.0 --port $PORT
