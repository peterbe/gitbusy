#frontend: cd frontend && PORT=3000 yarn start
#django: ./manage.py runserver 0.0.0.0:8000
web: uvicorn gitbusy.asgi:application --bind 0.0.0.0:$PORT --log-file=-
