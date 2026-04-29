from django.db.models import Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_GET, require_http_methods, require_POST

from api.serializers import serialize_consumable, serialize_movement
from api.utils import api_login_required, form_errors, int_list, json_error, post_or_json
from consumiveis.forms import ConsumivelForm, MovimentacaoForm
from consumiveis.models import Consumivel, MovimentacaoConsumivel
from consumiveis.views import exportar_movimentacoes_excel


def _filtered_movements(params):
    movements = MovimentacaoConsumivel.objects.select_related('consumivel', 'responsavel').order_by('-data')
    search = params.get('q') or params.get('search')
    movement_type = params.get('tipo') or params.get('type')
    start_date = params.get('data_inicio') or params.get('start_date')
    end_date = params.get('data_fim') or params.get('end_date')

    if search:
        movements = movements.filter(
            Q(consumivel__nome__icontains=search)
            | Q(responsavel__nome__icontains=search)
            | Q(destino__icontains=search)
            | Q(observacao__icontains=search)
        )
    if movement_type:
        movements = movements.filter(tipo=movement_type)
    if start_date:
        movements = movements.filter(data__date__gte=start_date)
    if end_date:
        movements = movements.filter(data__date__lte=end_date)

    return movements


@require_http_methods(['GET', 'POST'])
@api_login_required
def consumables_collection(request):
    if request.method == 'GET':
        search = request.GET.get('q') or request.GET.get('search')
        consumables = Consumivel.objects.filter(excluido=False).order_by('nome')
        if search:
            consumables = consumables.filter(nome__icontains=search)

        summary = {
            'total': consumables.count(),
            'estoque_baixo': consumables.filter(quantidade_atual__lte=0).count(),
            'alertas': sum(1 for item in consumables if item.quantidade_atual <= item.estoque_minimo),
        }
        return JsonResponse({'items': [serialize_consumable(item) for item in consumables], 'summary': summary})

    form = ConsumivelForm(post_or_json(request))
    if not form.is_valid():
        return json_error('Nao foi possivel cadastrar o item.', errors=form_errors(form))

    consumable = form.save()
    return JsonResponse({'detail': 'Consumivel criado com sucesso.', 'item': serialize_consumable(consumable)}, status=201)


@require_http_methods(['GET', 'POST'])
@api_login_required
def consumable_detail(request, consumable_id):
    consumable = get_object_or_404(Consumivel, id=consumable_id)

    if request.method == 'GET':
        return JsonResponse({'item': serialize_consumable(consumable)})

    form = ConsumivelForm(post_or_json(request), instance=consumable)
    if not form.is_valid():
        return json_error('Nao foi possivel atualizar o item.', errors=form_errors(form))

    consumable = form.save()
    return JsonResponse({'detail': 'Consumivel atualizado com sucesso.', 'item': serialize_consumable(consumable)})


@require_POST
@api_login_required
def trash_consumable(request, consumable_id):
    consumable = get_object_or_404(Consumivel, id=consumable_id, excluido=False)
    consumable.excluido = True
    consumable.save(update_fields=['excluido'])
    return JsonResponse({'detail': f'Item "{consumable.nome}" movido para a lixeira.'})


@require_POST
@api_login_required
def register_movement(request, consumable_id):
    consumable = get_object_or_404(Consumivel, id=consumable_id, excluido=False)
    form = MovimentacaoForm(post_or_json(request))
    if not form.is_valid():
        return json_error('Nao foi possivel registrar a movimentacao.', errors=form_errors(form))

    movement = form.save(commit=False)
    movement.consumivel = consumable

    if movement.tipo == 'entrada':
        consumable.quantidade_atual += movement.quantidade
    elif movement.quantidade > consumable.quantidade_atual:
        return json_error(
            f'Nao ha saldo suficiente para saida de {movement.quantidade}. Estoque atual: {consumable.quantidade_atual}.',
            status=409,
        )
    else:
        consumable.quantidade_atual -= movement.quantidade

    consumable.save()
    movement.save()
    return JsonResponse(
        {
            'detail': 'Movimentacao registrada com sucesso.',
            'item': serialize_movement(movement),
            'consumivel': serialize_consumable(consumable),
        },
        status=201,
    )


@require_GET
@api_login_required
def movements_collection(request):
    movements = _filtered_movements(request.GET)
    return JsonResponse({'items': [serialize_movement(item) for item in movements]})


@require_GET
@api_login_required
def export_movements(request):
    return exportar_movimentacoes_excel(request)


@require_POST
@api_login_required
def bulk_trash(request):
    data = post_or_json(request)
    ids = int_list(data, 'ids', 'consumiveis_ids', 'consumable_ids')
    if not ids:
        return json_error('Nenhum item foi selecionado.')

    updated = Consumivel.objects.filter(id__in=ids, excluido=False).update(excluido=True)
    return JsonResponse({'detail': f'{updated} consumivel(is) movido(s) para a lixeira.'})
