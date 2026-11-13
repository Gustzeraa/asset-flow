# api/views/collaborators_import.py
import io
import re

from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import transaction
from django.http import HttpResponse, JsonResponse
from django.views.decorators.http import require_GET, require_POST
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill

from api.planilhas import MAX_TAMANHO_ARQUIVO, ler_linhas, mapear_colunas, texto
from api.utils import api_login_required
from rh.models import Colaborador, Departamento

MAX_LINHAS = 5000

ALIASES_COLUNAS = {
    'nome': 'nome',
    'nome_completo': 'nome',
    'colaborador': 'nome',
    'email': 'email',
    'e_mail': 'email',
    'cargo': 'cargo',
    'funcao': 'cargo',
    'departamento': 'departamento',
    'setor': 'departamento',
    'cpf': 'cpf',
    'ativo': 'ativo',
    'situacao': 'ativo',
}

VALORES_SIM = {'sim', 's', 'true', '1', 'ativo', 'x'}
VALORES_NAO = {'nao', 'não', 'n', 'false', '0', 'inativo'}


def _cpf_valido(digitos):
    if len(digitos) != 11 or digitos == digitos[0] * 11:
        return False
    for tamanho in (9, 10):
        soma = sum(int(d) * (tamanho + 1 - i) for i, d in enumerate(digitos[:tamanho]))
        verificador = (soma * 10 % 11) % 10
        if verificador != int(digitos[tamanho]):
            return False
    return True


def _normalizar_cpf(valor):
    """Devolve (cpf_formatado, erro)."""
    bruto = texto(valor)
    if not bruto:
        return None, None
    digitos = re.sub(r'\D', '', bruto)
    if 8 <= len(digitos) < 11:
        digitos = digitos.zfill(11)  # Excel come os zeros à esquerda quando a célula é número
    if not _cpf_valido(digitos):
        return None, f'CPF "{bruto}" inválido.'
    return f'{digitos[:3]}.{digitos[3:6]}.{digitos[6:9]}-{digitos[9:]}', None


def _ler_ativo(valor):
    """Devolve (bool, erro)."""
    bruto = texto(valor).lower()
    if not bruto:
        return None, None
    if bruto in VALORES_SIM:
        return True, None
    if bruto in VALORES_NAO:
        return False, None
    return None, f'Valor "{texto(valor)}" inválido na coluna Ativo. Use Sim ou Não.'


@require_POST
@api_login_required
def importar_colaboradores(request):
    arquivo = request.FILES.get('arquivo')
    atualizar = request.POST.get('atualizar') == 'true'

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
    faltando = {'nome', 'email', 'cargo', 'departamento', 'cpf', 'ativo'} - set(mapa.values())
    if faltando:
        return JsonResponse(
            {'detail': f'Coluna(s) obrigatória(s) ausente(s): {", ".join(sorted(faltando))}. Use a planilha modelo.'},
            status=400,
        )

    erros = []
    validos = {}        # email -> dados
    cpfs_planilha = {}  # cpf -> email

    for numero_linha, linha in enumerate(linhas[1:], start=2):
        dados = {campo: (linha[i] if i < len(linha) else None) for i, campo in mapa.items()}

        nome = texto(dados.get('nome'))
        email = texto(dados.get('email')).lower()
        cargo = texto(dados.get('cargo'))
        departamento = texto(dados.get('departamento'))

        faltam = [
            rotulo
            for rotulo, valor in (
                ('nome', nome),
                ('e-mail', email),
                ('cargo', cargo),
                ('departamento', departamento),
                ('CPF', texto(dados.get('cpf'))),
                ('ativo', texto(dados.get('ativo'))),
            )
            if not valor
        ]
        if faltam:
            erros.append({'linha': numero_linha, 'erro': f'Falta {", ".join(faltam)}.'})
            continue

        try:
            validate_email(email)
        except ValidationError:
            erros.append({'linha': numero_linha, 'erro': f'E-mail "{email}" inválido.'})
            continue

        if len(nome) > 150 or len(cargo) > 100 or len(departamento) > 100:
            erros.append({'linha': numero_linha, 'erro': 'Nome, cargo ou departamento com texto longo demais.'})
            continue

        if email in validos:
            erros.append({'linha': numero_linha, 'erro': f'E-mail "{email}" repetido na planilha.'})
            continue

        cpf, erro_cpf = _normalizar_cpf(dados.get('cpf'))
        if erro_cpf:
            erros.append({'linha': numero_linha, 'erro': erro_cpf})
            continue
        if cpf in cpfs_planilha:
            erros.append({'linha': numero_linha, 'erro': f'CPF {cpf} repetido na planilha.'})
            continue

        ativo, erro_ativo = _ler_ativo(dados.get('ativo'))
        if erro_ativo:
            erros.append({'linha': numero_linha, 'erro': erro_ativo})
            continue

        cpfs_planilha[cpf] = email
        validos[email] = {
            'linha': numero_linha,
            'nome': nome,
            'cargo': cargo,
            'departamento': departamento,
            'cpf': cpf,
            'ativo': ativo,
        }

    # Confere com o banco: e-mails e CPFs que já existem
    existentes = {c.email.lower(): c for c in Colaborador.objects.filter(email__in=list(validos.keys()))}
    cpfs_com_digitos = list(cpfs_planilha.keys()) + [re.sub(r'\D', '', c) for c in cpfs_planilha]
    donos_cpf = {
        re.sub(r'\D', '', c.cpf): c
        for c in Colaborador.objects.filter(cpf__in=cpfs_com_digitos)
    }

    for email, dados in validos.items():
        atual = existentes.get(email)
        if atual and atual.excluido:
            erros.append({'linha': dados['linha'], 'erro': f'E-mail "{email}" pertence a um colaborador na lixeira.'})
            continue
        dono = donos_cpf.get(re.sub(r'\D', '', dados['cpf']))
        if dono and (atual is None or dono.id != atual.id):
            erros.append({'linha': dados['linha'], 'erro': f'CPF {dados["cpf"]} já pertence a {dono.nome}.'})

    # Qualquer erro: nada é gravado. Corrige a planilha e envia de novo.
    if erros:
        erros.sort(key=lambda e: e['linha'])
        return JsonResponse({'detail': 'A planilha tem erros. Nada foi importado.', 'erros': erros}, status=400)

    with transaction.atomic():
        # Departamentos por nome, sem diferenciar maiúsculas; cria os que faltarem
        departamentos = {d.nome.lower(): d for d in Departamento.objects.all()}
        for dados in validos.values():
            nome_dep = dados['departamento']
            if nome_dep.lower() not in departamentos:
                departamentos[nome_dep.lower()] = Departamento.objects.create(nome=nome_dep)

        def dep(dados):
            return departamentos[dados['departamento'].lower()]

        novos = []
        atualizados = []
        for email, dados in validos.items():
            atual = existentes.get(email)
            if atual is None:
                novos.append(Colaborador(
                    nome=dados['nome'],
                    email=email,
                    cargo=dados['cargo'],
                    cpf=dados['cpf'],
                    departamento=dep(dados),
                    ativo=dados['ativo'],
                ))
            elif atualizar:
                atual.nome = dados['nome']
                atual.cargo = dados['cargo']
                atual.departamento = dep(dados)
                atual.cpf = dados['cpf']
                atual.ativo = dados['ativo']
                atualizados.append(atual)

        Colaborador.objects.bulk_create(novos)
        if atualizados:
            Colaborador.objects.bulk_update(atualizados, ['nome', 'cargo', 'departamento', 'cpf', 'ativo'])

    return JsonResponse({
        'criados': len(novos),
        'atualizados': len(atualizados),
        'ignorados': len(existentes) - len(atualizados),
        'erros': [],
    })


@require_GET
@api_login_required
def modelo_importacao_colaboradores(request):
    wb = Workbook()
    ws = wb.active
    ws.title = 'Colaboradores'
    ws.append(['Nome', 'E-mail', 'Cargo', 'Departamento', 'CPF', 'Ativo'])
    ws.append(['Maria da Silva', 'maria.silva@empresa.com', 'Analista Financeiro', 'Financeiro', '529.982.247-25', 'Sim'])

    destaque = PatternFill('solid', fgColor='DDEBF7')
    for celula in ws[1]:
        celula.font = Font(bold=True)
        celula.fill = destaque
    for linha in range(2, 1002):
        ws.cell(linha, 5).number_format = '@'  # CPF como texto (mantém os zeros)
    for coluna, largura in zip('ABCDEF', (32, 32, 26, 22, 18, 10)):
        ws.column_dimensions[coluna].width = largura
    ws.freeze_panes = 'A2'

    buffer = io.BytesIO()
    wb.save(buffer)
    response = HttpResponse(
        buffer.getvalue(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    response['Content-Disposition'] = 'attachment; filename="modelo_colaboradores.xlsx"'
    return response