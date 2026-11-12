import csv
import io
import unicodedata
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.http import HttpResponse, JsonResponse
from django.views.decorators.http import require_GET, require_POST
from openpyxl import Workbook, load_workbook

from api.utils import api_login_required
from patrimonio.models import CentroDeCusto, ExercicioFiscal, OrcamentoCentroCusto
from patrimonio.services import ano_do_valor, parse_valor

MAX_TAMANHO_ARQUIVO = 5 * 1024 * 1024  # 5 MB
MAX_LINHAS = 5000

# Cabeçalhos aceitos na planilha (já normalizados) -> campo do model
ALIASES_COLUNAS = {
    'codigo': 'codigo',
    'nome': 'nome',
    'nome_do_setor': 'nome',
    'setor': 'nome',
    'orcamento_anual': 'orcamento_anual',
    'orcamento': 'orcamento_anual',
}


def _normalizar_cabecalho(valor):
    texto = str(valor or '').strip().lower()
    texto = unicodedata.normalize('NFKD', texto).encode('ascii', 'ignore').decode()
    return '_'.join(texto.replace('-', ' ').split())


def _ler_linhas(arquivo):
    """Retorna uma lista de linhas (a primeira é o cabeçalho)."""
    nome = arquivo.name.lower()

    if nome.endswith('.xlsx'):
        wb = load_workbook(arquivo, read_only=True, data_only=True)
        ws = wb.active
        linhas = [list(linha) for linha in ws.iter_rows(values_only=True)]
        wb.close()
        return linhas

    if nome.endswith('.csv'):
        conteudo = arquivo.read()
        try:
            texto = conteudo.decode('utf-8-sig')
        except UnicodeDecodeError:
            texto = conteudo.decode('latin-1')  # CSV salvo pelo Excel em Windows
        try:
            dialeto = csv.Sniffer().sniff(texto[:2048], delimiters=';,')
        except csv.Error:
            class dialeto(csv.excel):  # padrão do Excel em pt-BR
                delimiter = ';'
        return [linha for linha in csv.reader(io.StringIO(texto), dialeto)]

    raise ValueError('Formato não suportado. Envie um arquivo .xlsx ou .csv.')


def _texto(valor):
    if valor is None:
        return ''
    if isinstance(valor, float) and valor.is_integer():
        valor = int(valor)  # Excel transforma "101" em 101.0
    return str(valor).strip()


@require_POST
@api_login_required
def importar_centros_custo(request):
    arquivo = request.FILES.get('arquivo')
    atualizar = request.POST.get('atualizar') == 'true'
    ano = ano_do_valor(request.POST.get('ano'))

    if not arquivo:
        return JsonResponse({'detail': 'Selecione um arquivo para importar.'}, status=400)
    if arquivo.size > MAX_TAMANHO_ARQUIVO:
        return JsonResponse({'detail': 'O arquivo passa de 5 MB.'}, status=400)

    try:
        linhas = _ler_linhas(arquivo)
    except ValueError as exc:
        return JsonResponse({'detail': str(exc)}, status=400)
    except Exception:
        return JsonResponse({'detail': 'Não foi possível ler o arquivo. Confira se ele não está corrompido.'}, status=400)

    # Remove linhas totalmente vazias
    linhas = [l for l in linhas if any(_texto(c) for c in l)]
    if len(linhas) < 2:
        return JsonResponse({'detail': 'A planilha não tem linhas para importar.'}, status=400)
    if len(linhas) - 1 > MAX_LINHAS:
        return JsonResponse({'detail': f'Limite de {MAX_LINHAS} linhas por importação.'}, status=400)

    # Mapeia índice da coluna -> campo do model
    mapa = {}
    for indice, cabecalho in enumerate(linhas[0]):
        campo = ALIASES_COLUNAS.get(_normalizar_cabecalho(cabecalho))
        if campo and campo not in mapa.values():
            mapa[indice] = campo

    faltando = {'codigo', 'nome'} - set(mapa.values())
    if faltando:
        return JsonResponse(
            {'detail': f'Coluna obrigatória ausente: {", ".join(sorted(faltando))}. Use a planilha modelo.'},
            status=400,
        )

    erros = []
    validos = {}  # codigo -> dados
    for numero_linha, linha in enumerate(linhas[1:], start=2):  # linha 1 é o cabeçalho
        dados = {campo: (linha[i] if i < len(linha) else None) for i, campo in mapa.items()}

        codigo = _texto(dados.get('codigo'))
        nome = _texto(dados.get('nome'))

        if not codigo:
            erros.append({'linha': numero_linha, 'erro': 'Código vazio.'})
            continue
        if len(codigo) > 20:
            erros.append({'linha': numero_linha, 'erro': 'Código com mais de 20 caracteres.'})
            continue
        if not nome:
            erros.append({'linha': numero_linha, 'erro': 'Nome vazio.'})
            continue
        if len(nome) > 100:
            erros.append({'linha': numero_linha, 'erro': 'Nome com mais de 100 caracteres.'})
            continue
        if codigo in validos:
            erros.append({'linha': numero_linha, 'erro': f'Código "{codigo}" repetido na planilha.'})
            continue

        try:
            orcamento = parse_valor(dados.get('orcamento_anual'))
        except (InvalidOperation, ValueError):
            erros.append({'linha': numero_linha, 'erro': 'Orçamento anual inválido.'})
            continue

        validos[codigo] = {'nome': nome, 'orcamento_anual': orcamento}

    # Se houver qualquer erro, nada é gravado: corrige a planilha e envia de novo
    if erros:
        return JsonResponse({'detail': 'A planilha tem erros. Nada foi importado.', 'erros': erros}, status=400)

    exercicio, _ = ExercicioFiscal.objects.get_or_create(ano=ano)
    if exercicio.fechado and any(d['orcamento_anual'] is not None for d in validos.values()):
        return JsonResponse(
            {'detail': f'O exercício {ano} está fechado. Remova a coluna de orçamento ou escolha outro ano.'},
            status=400,
        )

    existentes = CentroDeCusto.objects.in_bulk(list(validos.keys()), field_name='codigo')
    orcamentos_ano = {
        o.centro_custo_id: o
        for o in OrcamentoCentroCusto.objects.filter(exercicio=exercicio, centro_custo__in=existentes.values())
    }

    criar_orc, atualizar_orc = [], []

    def agendar_orcamento(centro, valor):
        if valor is None:  # célula vazia não mexe no orçamento que já existe
            return
        atual = orcamentos_ano.get(centro.id)
        if atual:
            atual.valor = valor
            atualizar_orc.append(atual)
        else:
            criar_orc.append(OrcamentoCentroCusto(centro_custo=centro, exercicio=exercicio, valor=valor))

    with transaction.atomic():
        novos = CentroDeCusto.objects.bulk_create([
            CentroDeCusto(codigo=codigo, nome=dados['nome'])
            for codigo, dados in validos.items()
            if codigo not in existentes
        ])
        for centro in novos:
            agendar_orcamento(centro, validos[centro.codigo]['orcamento_anual'])

        atualizados = []
        if atualizar:
            for codigo, centro in existentes.items():
                centro.nome = validos[codigo]['nome']
                atualizados.append(centro)
                agendar_orcamento(centro, validos[codigo]['orcamento_anual'])
            CentroDeCusto.objects.bulk_update(atualizados, ['nome'])

        OrcamentoCentroCusto.objects.bulk_create(criar_orc)
        if atualizar_orc:
            OrcamentoCentroCusto.objects.bulk_update(atualizar_orc, ['valor'])

    return JsonResponse({
        'ano': ano,
        'criados': len(novos),
        'atualizados': len(atualizados),
        'ignorados': len(existentes) - len(atualizados),
        'erros': [],
    })


@require_GET
@api_login_required
def modelo_importacao_centros_custo(request):
    wb = Workbook()
    ws = wb.active
    ws.title = 'Centros de custo'
    ws.append(['Código', 'Nome', 'Orçamento Anual'])
    ws.append(['CC-001', 'Financeiro', 150000.00])
    ws.append(['CC-002', 'Tecnologia da Informação', None])
    ws.column_dimensions['A'].width = 14
    ws.column_dimensions['B'].width = 40
    ws.column_dimensions['C'].width = 18

    buffer = io.BytesIO()
    wb.save(buffer)

    response = HttpResponse(
        buffer.getvalue(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    response['Content-Disposition'] = 'attachment; filename="modelo_centros_custo.xlsx"'
    return response