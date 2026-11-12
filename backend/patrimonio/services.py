# patrimonio/services.py
from datetime import date
from decimal import Decimal, InvalidOperation

from django.db.models import Sum

from patrimonio.models import ExercicioFiscal, OrcamentoCentroCusto


class ExercicioFechadoError(Exception):
    pass


def ano_do_request(request):
    try:
        return int(request.GET.get('ano'))
    except (TypeError, ValueError, AttributeError):
        return date.today().year


def ano_do_valor(valor):
    try:
        return int(valor)
    except (TypeError, ValueError):
        return date.today().year


def parse_valor(valor):
    """'' ou None -> None. Aceita 1234.56, '1234,56', '1.234,56', 'R$ 1.500,00'."""
    if valor is None or str(valor).strip() == '':
        return None
    if isinstance(valor, (int, float, Decimal)):
        numero = Decimal(str(valor))
    else:
        s = str(valor).replace('R$', '').replace(' ', '')
        if ',' in s:
            s = s.replace('.', '').replace(',', '.')
        numero = Decimal(s)
    numero = numero.quantize(Decimal('0.01'))
    if numero < 0 or numero >= Decimal('10') ** 10:
        raise InvalidOperation
    return numero


def sincronizar_exercicios():
    """Garante um exercício para o ano atual e para cada ano com equipamento comprado."""
    from estoque.models import Equipamento

    anos = set(
        Equipamento.objects.filter(excluido=False, data_compra__isnull=False)
        .values_list('data_compra__year', flat=True)
        .distinct()
    )
    anos.add(date.today().year)
    existentes = set(ExercicioFiscal.objects.values_list('ano', flat=True))
    faltando = [ExercicioFiscal(ano=ano) for ano in anos - existentes if ano]
    if faltando:
        ExercicioFiscal.objects.bulk_create(faltando, ignore_conflicts=True)


def gastos_por_centro(ano):
    """{centro_id: total} das compras do ano (pela data_compra)."""
    from estoque.models import Equipamento

    linhas = (
        Equipamento.objects.filter(excluido=False, data_compra__year=ano, centro_de_custo__isnull=False)
        .values('centro_de_custo')
        .annotate(total=Sum('valor_compra'))
    )
    return {linha['centro_de_custo']: linha['total'] for linha in linhas}


def anos_fechados(anos):
    """Dos anos informados, quais têm o exercício fechado."""
    anos = {a for a in anos if a}
    if not anos:
        return []
    return sorted(ExercicioFiscal.objects.filter(ano__in=anos, fechado=True).values_list('ano', flat=True))


def orcamentos_por_centro(ano):
    return dict(
        OrcamentoCentroCusto.objects.filter(exercicio__ano=ano).values_list('centro_custo_id', 'valor')
    )


def montar_contexto_financeiro(ano):
    """Tudo que o serializer precisa para o ano, em 3 consultas (em vez de 1 por centro)."""
    return {
        'ano': ano,
        'fechado': ExercicioFiscal.objects.filter(ano=ano, fechado=True).exists(),
        'orcamentos': orcamentos_por_centro(ano),
        'gastos': gastos_por_centro(ano),
    }


def salvar_orcamento(centro, ano, valor):
    """Cria, atualiza ou remove (valor None) o orçamento do centro no ano.
    Só bloqueia exercício fechado se o valor realmente mudar."""
    exercicio, _ = ExercicioFiscal.objects.get_or_create(ano=ano)
    atual = OrcamentoCentroCusto.objects.filter(centro_custo=centro, exercicio=exercicio).first()

    if (atual.valor if atual else None) == valor:
        return

    if exercicio.fechado:
        raise ExercicioFechadoError(f'O exercício {ano} está fechado. O orçamento desse ano não pode ser alterado.')

    if valor is None:
        atual.delete()
    elif atual:
        atual.valor = valor
        atual.save(update_fields=['valor'])
    else:
        OrcamentoCentroCusto.objects.create(centro_custo=centro, exercicio=exercicio, valor=valor)