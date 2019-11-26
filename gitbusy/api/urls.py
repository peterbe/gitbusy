from django.urls import path

from . import views

app_name = "api"

urlpatterns = [
    path("hello", views.hello),
    path("search-repos", views.search_repos),
    path("open-prs", views.open_prs),
]
