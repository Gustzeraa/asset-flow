from django.http import JsonResponse
from django.views.decorators.http import require_GET

from api.serializers import serialize_lookups_payload
from api.utils import api_login_required
from estoque.models import Categoria
from consumiveis.models import Consumivel  # <-- Importação corrigida
from rh.models import Colaborador, Departamento
from patrimonio.models import CentroDeCusto

@require_GET
@api_login_required
def lookups(request):
    categories = Categoria.objects.all().order_by('nome')
    collaborators = Colaborador.objects.filter(excluido=False, ativo=True).order_by('nome')
    departments = Departamento.objects.all().order_by('nome')
    centros_custo = CentroDeCusto.objects.all().order_by('nome')
    
    # 1. Gera o payload padrão usando o seu serializer
    payload = serialize_lookups_payload(
        categories=categories, 
        collaborators=collaborators, 
        departments=departments, 
        centros_custo=centros_custo
    )
    
    # 2. Injeta as opções estáticas do model direto no payload
    payload['consumivel_unidades'] = [
        {'value': sigla, 'label': nome} for sigla, nome in Consumivel.UNIDADES
    ]
    
    # 3. Adiciona também os tipos de movimentação (para o React não quebrar no modal de transferir)
    payload['movimentacao_tipos'] = [
        {'value': 'entrada', 'label': 'Entrada'},
        {'value': 'saida', 'label': 'Saída'}
    ]

    return JsonResponse(payload)