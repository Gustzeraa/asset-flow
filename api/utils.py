import json
from functools import wraps

from django.http import JsonResponse, QueryDict


def api_login_required(view_func):
    @wraps(view_func)
    def wrapped(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return JsonResponse({'detail': 'Autenticacao necessaria.'}, status=401)
        return view_func(request, *args, **kwargs)

    return wrapped


def json_error(message, *, status=400, errors=None):
    payload = {'detail': message}
    if errors:
        payload['errors'] = errors
    return JsonResponse(payload, status=status)


def form_errors(form):
    return {field: [str(error) for error in errors] for field, errors in form.errors.items()}


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


def querydict_from_mapping(mapping):
    querydict = QueryDict('', mutable=True)
    for key, value in mapping.items():
        if isinstance(value, list):
            querydict.setlist(key, [str(item) for item in value])
        elif value is None:
            continue
        else:
            querydict[key] = str(value)
    return querydict


def list_value(data, *keys):
    for key in keys:
        if hasattr(data, 'getlist'):
            values = [item for item in data.getlist(key) if item not in (None, '')]
            if values:
                return values

        value = data.get(key) if hasattr(data, 'get') else None
        if isinstance(value, list):
            return [item for item in value if item not in (None, '')]
        if isinstance(value, str) and value:
            return [item.strip() for item in value.split(',') if item.strip()]

    return []


def int_list(data, *keys):
    values = []
    for item in list_value(data, *keys):
        try:
            values.append(int(item))
        except (TypeError, ValueError):
            continue
    return values


def post_or_json(request):
    data = request_data(request)
    if hasattr(data, 'getlist'):
        return data
    return querydict_from_mapping(data)
