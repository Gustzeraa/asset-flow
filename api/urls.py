from django.urls import path

from .views import auth


urlpatterns = [
    path('auth/csrf/', auth.csrf, name='api_csrf'),
    path('auth/login/', auth.login_view, name='api_login'),
    path('auth/logout/', auth.logout_view, name='api_logout'),
    path('auth/me/', auth.me, name='api_me'),
]
