import json

from django.http import JsonResponse


def json_error(message, *, status=400):
    return JsonResponse({'detail': message}, status=status)


def request_data(request):
    content_type = request.content_type or ''
    if 'application/json' in content_type:
        if not request.body:
            return {}
        try:
            return json.loads(request.body.decode('utf-8'))
        except (json.JSONDecodeError, UnicodeDecodeError):
            return {}

    return request.POST
