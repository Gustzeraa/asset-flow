from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_GET, require_http_methods, require_POST

from api.serializers import serialize_trash_item
from api.utils import api_login_required, json_error
from consumiveis.models import Consumivel
from estoque.models import Equipamento
from rh.models import Colaborador


def _resolve_item(item_type, item_id):
    if item_type == 'equipamento':
        return get_object_or_404(Equipamento, id=item_id)
    if item_type == 'consumivel':
        return get_object_or_404(Consumivel, id=item_id)
    if item_type == 'colaborador':
        return get_object_or_404(Colaborador, id=item_id)
    return None


@require_GET
@api_login_required
def trash_collection(request):
    items = []
    items.extend(serialize_trash_item('equipamento', item) for item in Equipamento.objects.filter(excluido=True).order_by('-id'))
    items.extend(serialize_trash_item('consumivel', item) for item in Consumivel.objects.filter(excluido=True).order_by('-id'))
    items.extend(serialize_trash_item('colaborador', item) for item in Colaborador.objects.filter(excluido=True).order_by('-id'))
    return JsonResponse({'items': items})


@require_POST
@api_login_required
def restore_item(request, item_type, item_id):
    item = _resolve_item(item_type, item_id)
    if item is None:
        return json_error('Tipo de item invalido.', status=404)

    item.excluido = False
    item.save(update_fields=['excluido'])
    return JsonResponse({'detail': f'"{item.nome}" restaurado com sucesso.'})


@require_http_methods(['DELETE', 'POST'])
@api_login_required
def delete_item(request, item_type, item_id):
    item = _resolve_item(item_type, item_id)
    if item is None:
        return json_error('Tipo de item invalido.', status=404)

    item_name = item.nome
    item.delete()
    return JsonResponse({'detail': f'O item "{item_name}" foi apagado permanentemente.'})
