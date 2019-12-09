from django.urls import path

from . import views

app_name = "api"

urlpatterns = [
    path("hello", views.hello),
    path("search-repos", views.search_repos),
    path("pr-review-requests", views.pr_review_requests),
]
