from django.db.models import F
from django.http import JsonResponse
from django.views.decorators.http import require_GET
from api.utils import api_login_required, json_error
from decimal import Decimal

from api.serializers import serialize_dashboard_payload
from api.utils import api_login_required
from consumiveis.models import Consumivel, MovimentacaoConsumivel
from estoque.models import Equipamento
from rh.models import Colaborador


@require_GET
@api_login_required
def dashboard_summary(request):
    totals = {
        'equipamentos': Equipamento.objects.filter(excluido=False).count(),
        'equipamentos_disponiveis': Equipamento.objects.filter(excluido=False, status='disponivel').count(),
        'equipamentos_em_uso': Equipamento.objects.filter(excluido=False, status='em_uso').count(),
        'equipamentos_manutencao': Equipamento.objects.filter(excluido=False, status='manutencao').count(),
        'colaboradores_ativos': Colaborador.objects.filter(excluido=False, ativo=True).count(),
        'consumiveis': Consumivel.objects.filter(excluido=False).count(),
    }
    low_stock = Consumivel.objects.filter(excluido=False, quantidade_atual__lte=F('estoque_minimo')).order_by('nome')[:6]
    latest_equipments = Equipamento.objects.filter(excluido=False).select_related('categoria', 'responsavel').order_by('-id')[:5]
    latest_movements = MovimentacaoConsumivel.objects.select_related('consumivel', 'responsavel').order_by('-data')[:5]

    return JsonResponse(
        serialize_dashboard_payload(
            totals=totals,
            low_stock=low_stock,
            latest_equipments=latest_equipments,
            latest_movements=latest_movements,
        )
    )
    
    
@require_GET
@api_login_required
def dashboard_finance_summary(request):
    # Proteção 1: Se não for admin, nem calcula nada, bloqueia direto.
    if not request.user.is_superuser:
        return json_error("Acesso negado. Apenas gestores podem ver dados financeiros.", status=403)

    equipamentos = Equipamento.objects.filter(excluido=False)
    
    total_original = Decimal('0.00')
    total_atual = Decimal('0.00')
    gastos_por_centro = {}

    for eq in equipamentos:
        # Pega o valor da nota
        if getattr(eq, 'valor_compra', None):
            v_compra = Decimal(str(eq.valor_compra).replace(',', '.').replace('R$', '').strip())
            
            # Pega o valor depreciado (ou usa o original se der erro)
            try:
                v_atual = Decimal(str(eq.valor_atual_contabil).replace(',', '.').replace('R$', '').strip()) if getattr(eq, 'valor_atual_contabil', None) else v_compra
            except:
                v_atual = v_compra

            total_original += v_compra
            total_atual += v_atual

            # Agrupa os gastos pelo nome do Centro de Custo
            cc_nome = eq.centro_de_custo.nome if getattr(eq, 'centro_de_custo', None) else "Sem Centro de Custo"
            if cc_nome not in gastos_por_centro:
                gastos_por_centro[cc_nome] = Decimal('0.00')
            gastos_por_centro[cc_nome] += v_compra

    # Pega os 5 setores que mais gastaram para montar um gráfico/ranking
    top_centros = sorted(gastos_por_centro.items(), key=lambda x: x[1], reverse=True)[:5]
    centros_formatados = [{"nome": k, "valor": str(v)} for k, v in top_centros]

    return JsonResponse({
        'total_investido': str(total_original),
        'total_atual': str(total_atual),
        'total_depreciado': str(total_original - total_atual),
        'top_centros': centros_formatados
    })
