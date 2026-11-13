import io
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.db.models import Q
from django.http import HttpResponse, JsonResponse
from django.views.decorators.http import require_GET, require_POST
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill
from openpyxl.worksheet.datavalidation import DataValidation

from api.planilhas import MAX_TAMANHO_ARQUIVO, ler_linhas, mapear_colunas, parse_data, texto
from api.utils import api_login_required
from patrimonio.models import Equipamento
from financeiro.models import CentroDeCusto, ExercicioFiscal
from financeiro.services import anos_fechados, parse_valor

MAX_LINHAS = 5000
LIMITE_VALOR_COMPRA = Decimal('10') ** 8  # valor_compra: max_digits=10, decimal_places=2

ALIASES_COLUNAS = {
    'patrimonio': 'patrimonio',
    'num_patrimonio': 'patrimonio',
    'numero_do_patrimonio': 'patrimonio',
    'n_patrimonio': 'patrimonio',
    'codigo_do_centro_de_custo': 'cc',
    'codigo_centro_de_custo': 'cc',
    'centro_de_custo': 'cc',
    'cc': 'cc',
    'data_de_compra': 'data_compra',
    'data_compra': 'data_compra',
    'data_de_aquisicao': 'data_compra',
    'valor_de_compra': 'valor_compra',
    'valor_compra': 'valor_compra',
    'valor': 'valor_compra',
    'taxa_de_depreciacao': 'taxa',
    'taxa_de_depreciacao_anual': 'taxa',
    'taxa_depreciacao_anual': 'taxa',
    'taxa': 'taxa',
}

CABECALHO = [
    'Patrimônio',
    'Equipamento',
    'Categoria',
    'Código do Centro de Custo',
    'Data de Compra',
    'Valor de Compra (R$)',
    'Taxa de Depreciação (%)',
]


def _pendentes(queryset):
    return queryset.filter(
        Q(centro_de_custo__isnull=True) | Q(data_compra__isnull=True) | Q(valor_compra=0)
    )


@require_GET
@api_login_required
def export_conciliacao(request):
    """Planilha para preencher a conciliação. ?escopo=todos para incluir os já conciliados."""
    escopo = request.GET.get('escopo', 'pendentes')

    equipamentos = (
        Equipamento.objects.filter(excluido=False)
        .select_related('categoria', 'centro_de_custo')
        .order_by('num_patrimonio')
    )
    if escopo != 'todos':
        equipamentos = _pendentes(equipamentos)

    wb = Workbook()
    ws = wb.active
    ws.title = 'Conciliação'
    ws.append(CABECALHO)

    destaque = PatternFill('solid', fgColor='DDEBF7')
    for celula in ws[1]:
        celula.font = Font(bold=True)
        celula.fill = destaque

    for eq in equipamentos:
        ws.append([
            eq.num_patrimonio,
            eq.nome,
            eq.categoria.nome if eq.categoria else '',
            eq.centro_de_custo.codigo if eq.centro_de_custo else None,
            eq.data_compra,
            float(eq.valor_compra) if eq.valor_compra else None,
            float(eq.taxa_depreciacao_anual) if eq.taxa_depreciacao_anual is not None else None,
        ])

    total = ws.max_row
    for linha in range(2, total + 1):
        ws.cell(linha, 1).number_format = '@'          # patrimônio como texto (mantém zeros à esquerda)
        ws.cell(linha, 5).number_format = 'DD/MM/YYYY'
        ws.cell(linha, 6).number_format = '#,##0.00'
        ws.cell(linha, 7).number_format = '0.00'

    for coluna, largura in zip('ABCDEFG', (16, 40, 22, 26, 16, 20, 24)):
        ws.column_dimensions[coluna].width = largura
    ws.freeze_panes = 'A2'

    # Aba de apoio com os centros de custo ativos + lista suspensa na coluna D
    centros = list(CentroDeCusto.objects.filter(ativo=True).order_by('codigo'))
    apoio = wb.create_sheet('Centros de Custo')
    apoio.append(['Código', 'Nome'])
    for celula in apoio[1]:
        celula.font = Font(bold=True)
    for centro in centros:
        apoio.append([centro.codigo, centro.nome])
    apoio.column_dimensions['A'].width = 16
    apoio.column_dimensions['B'].width = 40

    if centros:
        validacao = DataValidation(
            type='list',
            formula1=f"='Centros de Custo'!$A$2:$A${len(centros) + 1}",
            allow_blank=True,
            showErrorMessage=True,
            errorTitle='Centro de custo inválido',
            error='Escolha um código da aba "Centros de Custo".',
        )
        ws.add_data_validation(validacao)
        validacao.add(f'D2:D{max(total, 2) + 500}')  # sobra para linhas coladas

    buffer = io.BytesIO()
    wb.save(buffer)

    nome = 'conciliacao_todos.xlsx' if escopo == 'todos' else 'conciliacao_pendentes.xlsx'
    response = HttpResponse(
        buffer.getvalue(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    response['Content-Disposition'] = f'attachment; filename="{nome}"'
    return response


@require_POST
@api_login_required
def import_conciliacao(request):
    """Atualiza os dados contábeis de equipamentos existentes, casando pelo patrimônio.
    Célula vazia mantém o valor atual. Nunca cria equipamento."""
    arquivo = request.FILES.get('arquivo')
    if not arquivo:
        return JsonResponse({'detail': 'Selecione um arquivo para importar.'}, status=400)
    if arquivo.size > MAX_TAMANHO_ARQUIVO:
        return JsonResponse({'detail': 'O arquivo passa de 5 MB.'}, status=400)

    try:
        linhas = ler_linhas(arquivo)
    except ValueError as exc:
        return JsonResponse({'detail': str(exc)}, status=400)
    except Exception:
        return JsonResponse({'detail': 'Não foi possível ler o arquivo. Confira se ele não está corrompido.'}, status=400)

    if len(linhas) < 2:
        return JsonResponse({'detail': 'A planilha não tem linhas para importar.'}, status=400)
    if len(linhas) - 1 > MAX_LINHAS:
        return JsonResponse({'detail': f'Limite de {MAX_LINHAS} linhas por importação.'}, status=400)

    mapa = mapear_colunas(linhas[0], ALIASES_COLUNAS)
    if 'patrimonio' not in mapa.values():
        return JsonResponse({'detail': 'Coluna "Patrimônio" não encontrada. Use a planilha exportada.'}, status=400)
    if len(set(mapa.values()) - {'patrimonio'}) == 0:
        return JsonResponse({'detail': 'Nenhuma coluna contábil encontrada na planilha.'}, status=400)

    # Carrega tudo de uma vez (evita uma consulta por linha)
    patrimonios = {
        texto(linha[i])
        for linha in linhas[1:]
        for i, campo in mapa.items()
        if campo == 'patrimonio' and i < len(linha)
    }
    equipamentos = {
        eq.num_patrimonio: eq
        for eq in Equipamento.objects.filter(num_patrimonio__in=patrimonios, excluido=False)
    }
    centros = {c.codigo.upper(): c for c in CentroDeCusto.objects.all()}

    erros = []
    vistos = set()
    alterados = []
    anos_afetados = set()
    sem_alteracao = 0

    for numero_linha, linha in enumerate(linhas[1:], start=2):
        dados = {campo: (linha[i] if i < len(linha) else None) for i, campo in mapa.items()}
        patrimonio = texto(dados.get('patrimonio'))

        if not patrimonio:
            erros.append({'linha': numero_linha, 'erro': 'Patrimônio vazio.'})
            continue
        if patrimonio in vistos:
            erros.append({'linha': numero_linha, 'erro': f'Patrimônio "{patrimonio}" repetido na planilha.'})
            continue
        vistos.add(patrimonio)

        eq = equipamentos.get(patrimonio)
        if eq is None:
            erros.append({'linha': numero_linha, 'erro': f'Patrimônio "{patrimonio}" não encontrado (ou está na lixeira).'})
            continue

        novo_cc_id = eq.centro_de_custo_id
        nova_data = eq.data_compra
        novo_valor = eq.valor_compra
        nova_taxa = eq.taxa_depreciacao_anual

        # Célula vazia = mantém o valor atual
        codigo_cc = texto(dados.get('cc'))
        if codigo_cc:
            centro = centros.get(codigo_cc.upper())
            if centro is None:
                erros.append({'linha': numero_linha, 'erro': f'Centro de custo "{codigo_cc}" não existe.'})
                continue
            if not centro.ativo and centro.id != eq.centro_de_custo_id:
                erros.append({'linha': numero_linha, 'erro': f'Centro de custo "{codigo_cc}" está inativo.'})
                continue
            novo_cc_id = centro.id

        try:
            data_lida = parse_data(dados.get('data_compra'))
        except ValueError:
            erros.append({'linha': numero_linha, 'erro': 'Data de compra inválida. Use dd/mm/aaaa.'})
            continue
        if data_lida:
            nova_data = data_lida

        try:
            valor_lido = parse_valor(dados.get('valor_compra'))
            taxa_lida = parse_valor(dados.get('taxa'))
        except (InvalidOperation, ValueError):
            erros.append({'linha': numero_linha, 'erro': 'Valor de compra ou taxa inválidos.'})
            continue
        if valor_lido is not None:
            if valor_lido >= LIMITE_VALOR_COMPRA:
                erros.append({'linha': numero_linha, 'erro': 'Valor de compra acima do limite permitido.'})
                continue
            novo_valor = valor_lido
        if taxa_lida is not None:
            if taxa_lida > 100:
                erros.append({'linha': numero_linha, 'erro': 'Taxa de depreciação acima de 100%.'})
                continue
            nova_taxa = taxa_lida

        mudou_gasto = (
            novo_cc_id != eq.centro_de_custo_id
            or nova_data != eq.data_compra
            or novo_valor != eq.valor_compra
        )
        mudou_taxa = nova_taxa != eq.taxa_depreciacao_anual

        if not mudou_gasto and not mudou_taxa:
            sem_alteracao += 1
            continue

        if mudou_gasto:
            anos = {d.year for d in (eq.data_compra, nova_data) if d}
            fechados = anos_fechados(anos)
            if fechados:
                lista = ', '.join(str(a) for a in fechados)
                erros.append({'linha': numero_linha, 'erro': f'Exercício de {lista} fechado.'})
                continue

        eq.centro_de_custo_id = novo_cc_id
        eq.data_compra = nova_data
        eq.valor_compra = novo_valor
        eq.taxa_depreciacao_anual = nova_taxa
        alterados.append(eq)
        if nova_data:
            anos_afetados.add(nova_data.year)

    # Qualquer erro: nada é gravado. Corrige a planilha e envia de novo.
    if erros:
        return JsonResponse({'detail': 'A planilha tem erros. Nada foi importado.', 'erros': erros}, status=400)

    with transaction.atomic():
        Equipamento.objects.bulk_update(
            alterados,
            ['centro_de_custo', 'data_compra', 'valor_compra', 'taxa_depreciacao_anual'],
            batch_size=500,
        )
        ExercicioFiscal.objects.bulk_create(
            [ExercicioFiscal(ano=ano) for ano in anos_afetados],
            ignore_conflicts=True,
        )

    return JsonResponse({
        'atualizados': len(alterados),
        'sem_alteracao': sem_alteracao,
        'erros': [],
    })