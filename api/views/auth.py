from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST

from api.serializers import serialize_user
from api.utils import json_error, request_data


@require_GET
@ensure_csrf_cookie
def csrf(request):
    return JsonResponse({'detail': 'CSRF cookie atualizado.'})


@require_GET
@ensure_csrf_cookie
def me(request):
    if not request.user.is_authenticated:
        return JsonResponse({'authenticated': False, 'user': None})

    return JsonResponse({'authenticated': True, 'user': serialize_user(request.user)})


@require_POST
def login_view(request):
    data = request_data(request)
    username = (data.get('username') or '').strip()
    password = data.get('password') or ''

    user = authenticate(request, username=username, password=password)
    if not user:
        return json_error('Usuario ou senha invalidos.', status=400)

    login(request, user)
    return JsonResponse(
        {
            'detail': 'Login realizado com sucesso.',
            'user': serialize_user(user),
        }
    )


@require_POST
def logout_view(request):
    logout(request)
    return JsonResponse({'detail': 'Logout realizado com sucesso.'})
