from decimal import InvalidOperation

from django.db import transaction
from django.db.models import Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_http_methods, require_POST

from api.serializers import serialize_centro_custo
from api.utils import api_login_required, form_errors, json_error, request_data
from patrimonio.forms import CentroDeCustoForm
from patrimonio.models import CentroDeCusto, ExercicioFiscal
from patrimonio.services import (
    ExercicioFechadoError,
    ano_do_request,
    ano_do_valor,
    montar_contexto_financeiro,
    parse_valor,
    salvar_orcamento,
    sincronizar_exercicios,
)


def _com_ativo(data, padrao):
    # Se o front não mandar "ativo", o ModelForm entenderia como False
    data = data.copy() if hasattr(data, 'copy') else dict(data)
    if 'ativo' not in data:
        data['ativo'] = padrao
    return data


def _salvar(request, centro=None):
    data = request_data(request)
    data = _com_ativo(data, centro.ativo if centro else True)
    ano = ano_do_valor(data.get('ano'))

    try:
        orcamento = parse_valor(data.get('orcamento_anual'))
    except (InvalidOperation, ValueError):
        return None, json_error('Orçamento anual inválido.')

    form = CentroDeCustoForm(data, instance=centro)
    if not form.is_valid():
        acao = 'atualizar' if centro else 'cadastrar'
        return None, json_error(f'Não foi possível {acao} o centro de custo.', errors=form_errors(form))

    try:
        with transaction.atomic():
            salvo = form.save()
            salvar_orcamento(salvo, ano, orcamento)
    except ExercicioFechadoError as exc:
        return None, json_error(str(exc))

    contexto = montar_contexto_financeiro(ano)
    return serialize_centro_custo(salvo, request, contexto), None


@require_http_methods(['GET', 'POST'])
@api_login_required
def collection(request):
    if request.method == 'GET':
        sincronizar_exercicios()
        ano = ano_do_request(request)
        contexto = montar_contexto_financeiro(ano)

        # Ativos sempre aparecem; inativos só nos anos em que têm orçamento ou gasto
        com_movimento = set(contexto['orcamentos']) | set(contexto['gastos'])
        centros = CentroDeCusto.objects.filter(Q(ativo=True) | Q(id__in=com_movimento)).order_by('nome')

        anos = ExercicioFiscal.objects.order_by('-ano').values_list('ano', flat=True)

        return JsonResponse({
            'items': [serialize_centro_custo(c, request, contexto) for c in centros],
            'anos_disponiveis': [str(a) for a in anos],
            'exercicio_fechado': contexto['fechado'],
        })

    item, erro = _salvar(request)
    if erro:
        return erro
    return JsonResponse({'detail': 'Centro de custo criado.', 'item': item}, status=201)


@require_http_methods(['GET', 'POST'])
@api_login_required
def detail(request, centro_id):
    centro = get_object_or_404(CentroDeCusto, id=centro_id)

    if request.method == 'GET':
        contexto = montar_contexto_financeiro(ano_do_request(request))
        return JsonResponse({'item': serialize_centro_custo(centro, request, contexto)})

    item, erro = _salvar(request, centro)
    if erro:
        return erro
    return JsonResponse({'detail': 'Centro de custo atualizado.', 'item': item})


@require_POST
@api_login_required
def trash(request, centro_id):
    centro = get_object_or_404(CentroDeCusto, id=centro_id)

    tem_historico = centro.equipamentos.exists() or centro.orcamentos.exists()
    if tem_historico:
        return json_error(
            'Este centro de custo tem equipamentos ou orçamentos vinculados e não pode ser excluído. '
            'Desative-o para que ele não apareça em novos cadastros.'
        )

    nome = centro.nome
    centro.delete()
    return JsonResponse({'detail': f'Centro de custo "{nome}" foi removido.'})