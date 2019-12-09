#frontend: cd frontend && PORT=3000 yarn start
#django: ./manage.py runserver 0.0.0.0:8000
web: uvicorn gitbusy.asgi:application --port $PORT
frontend: cd frontend && yarn build
