from django.urls import path, include

from gitbusy.api import urls


urlpatterns = [
    # path('admin/', admin.site.urls),
    path('api/', include(urls, namespace='api'))
]
