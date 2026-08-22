from django.db.models import F
from django.http import JsonResponse
from django.views.decorators.http import require_GET

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
    latest_equipments = Equipamento.objects.filter(excluido=False).select_related('categoria', 'responsavel', 'validador').order_by('-id')[:5]
    latest_movements = MovimentacaoConsumivel.objects.select_related('consumivel', 'responsavel').order_by('-data')[:5]

    return JsonResponse(
        serialize_dashboard_payload(
            totals=totals,
            low_stock=low_stock,
            latest_equipments=latest_equipments,
            latest_movements=latest_movements,
        )
    )
