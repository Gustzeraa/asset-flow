import csv
from decimal import Decimal, InvalidOperation

from django.db.models.functions import ExtractYear
from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404
from django.utils.dateparse import parse_date
from django.views.decorators.http import require_GET, require_POST

from api.utils import api_login_required, int_list, json_error, request_data
from estoque.models import Equipamento
from patrimonio.models import ExercicioFiscal
from patrimonio.services import anos_fechados, parse_valor, sincronizar_exercicios

LIMITE_VALOR_COMPRA = Decimal('10') ** 8  # valor_compra: max_digits=10, decimal_places=2


def _erro_exercicio_fechado(anos):
    lista = ', '.join(str(a) for a in anos)
    return json_error(
        f'O exercício de {lista} está fechado. Os dados contábeis de equipamentos desse ano não podem ser alterados.'
    )


@require_POST
@api_login_required
def update_finance(request, equipment_id):
    equipment = get_object_or_404(Equipamento, id=equipment_id, excluido=False)
    data = request_data(request)

    centro_de_custo_id = data.get('centro_de_custo_id')
    data_compra = data.get('data_compra')

    try:
        novo_cc = int(centro_de_custo_id) if centro_de_custo_id else None
    except (TypeError, ValueError):
        return json_error('Centro de custo inválido.')

    nova_data = parse_date(str(data_compra)) if data_compra else None
    if data_compra and nova_data is None:
        return json_error('Data de compra inválida.')

    try:
        novo_valor = parse_valor(data.get('valor_compra')) or Decimal('0.00')
        nova_taxa = parse_valor(data.get('taxa_depreciacao_anual'))
    except (InvalidOperation, ValueError):
        return json_error('Valor de compra ou taxa de depreciação inválidos.')

    if novo_valor >= LIMITE_VALOR_COMPRA:
        return json_error('Valor de compra acima do limite permitido.')

    # Centro, data ou valor mexem no gasto do ano: bloqueia se o ano antigo ou o novo estiver fechado
    mudou_gasto = (
        novo_cc != equipment.centro_de_custo_id
        or nova_data != equipment.data_compra
        or novo_valor != equipment.valor_compra
    )
    if mudou_gasto:
        anos = {d.year for d in (equipment.data_compra, nova_data) if d}
        fechados = anos_fechados(anos)
        if fechados:
            return _erro_exercicio_fechado(fechados)

    equipment.centro_de_custo_id = novo_cc
    equipment.data_compra = nova_data
    equipment.valor_compra = novo_valor  # o campo não aceita nulo
    if nova_taxa is not None:
        equipment.taxa_depreciacao_anual = nova_taxa
    equipment.save()

    if nova_data:
        ExercicioFiscal.objects.get_or_create(ano=nova_data.year)

    return JsonResponse({'detail': 'Conciliação contábil atualizada com sucesso!'})


@require_POST
@api_login_required
def bulk_update_finance(request):
    data = request_data(request)
    ids = int_list(data, 'ids')
    centro_de_custo_id = data.get('centro_de_custo_id')

    if not ids:
        return json_error('Nenhum equipamento selecionado.')

    try:
        novo_cc = int(centro_de_custo_id) if centro_de_custo_id else None
    except (TypeError, ValueError):
        return json_error('Centro de custo inválido.')

    equipamentos = Equipamento.objects.filter(id__in=ids, excluido=False)

    # Só importam os que realmente vão trocar de centro
    if novo_cc:
        afetados = equipamentos.exclude(centro_de_custo_id=novo_cc)
    else:
        afetados = equipamentos.exclude(centro_de_custo__isnull=True)

    anos = set(afetados.filter(data_compra__isnull=False).values_list('data_compra__year', flat=True))
    fechados = anos_fechados(anos)
    if fechados:
        return _erro_exercicio_fechado(fechados)

    atualizados = equipamentos.update(centro_de_custo_id=novo_cc)
    return JsonResponse({'detail': f'{atualizados} equipamento(s) atualizado(s) e conciliado(s).'})


@require_GET
@api_login_required
def export_finance_csv(request):
    ano = request.GET.get('ano')
    centro_custo_id = request.GET.get('centro_custo')

    queryset = Equipamento.objects.filter(excluido=False).select_related('centro_de_custo')

    if ano:
        queryset = queryset.filter(data_compra__year=ano)
    if centro_custo_id:
        queryset = queryset.filter(centro_de_custo_id=centro_custo_id)

    response = HttpResponse(
        content_type='text/csv',
        headers={'Content-Disposition': 'attachment; filename="fechamento_contabil.csv"'},
    )
    response.write('\ufeff'.encode('utf8'))
    writer = csv.writer(response, delimiter=';')

    writer.writerow(['Patrimônio', 'Equipamento', 'Centro de Custo', 'Data de Aquisição', 'Valor Original (R$)', 'Taxa (%)', 'Valor Contábil Atual (R$)'])

    for equip in queryset:
        cc_nome = f"{equip.centro_de_custo.codigo} - {equip.centro_de_custo.nome}" if equip.centro_de_custo else "Não vinculado"
        dt_compra = equip.data_compra.strftime('%d/%m/%Y') if equip.data_compra else "Sem data"
        v_compra = str(equip.valor_compra).replace('.', ',') if equip.valor_compra else "0,00"
        v_atual = str(equip.valor_atual_contabil).replace('.', ',') if getattr(equip, 'valor_atual_contabil', None) else "0,00"
        taxa = str(getattr(equip, 'taxa_depreciacao_anual', '10.0')).replace('.', ',')

        writer.writerow([equip.num_patrimonio, equip.nome, cc_nome, dt_compra, v_compra, taxa, v_atual])

    return response


@require_GET
@api_login_required
def available_years(request):
    cc_id = request.GET.get('centro_custo_id')

    # Filtrando por centro: só os anos em que ele tem equipamento
    if cc_id:
        anos = (
            Equipamento.objects.filter(excluido=False, data_compra__isnull=False, centro_de_custo_id=cc_id)
            .annotate(ano_compra=ExtractYear('data_compra'))
            .values_list('ano_compra', flat=True)
            .distinct()
            .order_by('-ano_compra')
        )
        return JsonResponse({'anos_disponiveis': [str(a) for a in anos if a]})

    # Sem filtro: os mesmos exercícios da tela de centros de custo
    sincronizar_exercicios()
    anos = ExercicioFiscal.objects.order_by('-ano').values_list('ano', flat=True)
    return JsonResponse({'anos_disponiveis': [str(a) for a in anos]})