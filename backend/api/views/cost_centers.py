from django.views.decorators.http import require_http_methods, require_POST
from django.shortcuts import get_object_or_404
from django.http import JsonResponse

from api.utils import api_login_required, form_errors, request_data, json_error
from patrimonio.models import CentroDeCusto
from patrimonio.forms import CentroDeCustoForm

# IMPORTANTE: Importe a função do arquivo correto onde ela está salva!
from api.serializers import serialize_centro_custo 

@require_http_methods(['GET', 'POST'])
@api_login_required
def collection(request):
    if request.method == 'GET':
        centros = CentroDeCusto.objects.all().order_by('nome')
        
        # --- NOVO: Descobre os anos que realmente existem no sistema ---
        from estoque.models import Equipamento
        from datetime import date
        
        # Puxa apenas os anos da data_compra dos equipamentos que não estão excluídos
        anos_db = Equipamento.objects.filter(
            data_compra__isnull=False, 
            excluido=False
        ).values_list('data_compra__year', flat=True).distinct()
        
        # Remove valores nulos, transforma em lista única e ordena do maior para o menor (ex: 2026, 2025)
        anos_disponiveis = sorted(list(set([ano for ano in anos_db if ano])), reverse=True)
        
        # Regra de Segurança: O ano atual (2026) sempre deve aparecer, mesmo que a empresa ainda não 
        # tenha comprado nada neste ano, para permitir o cadastro do novo orçamento!
        ano_atual = date.today().year
        if ano_atual not in anos_disponiveis:
            anos_disponiveis.insert(0, ano_atual)
            
        # Converte para string para o React ler perfeitamente
        anos_str = [str(ano) for ano in anos_disponiveis]
        # -------------------------------------------------------------

        # Retornamos os itens E a nova lista de anos!
        return JsonResponse({
            'items': [serialize_centro_custo(c, request) for c in centros],
            'anos_disponiveis': anos_str
        })

    # (O restante da função POST continua igual)
    data = request_data(request)
    form = CentroDeCustoForm(data)
    
    if not form.is_valid():
        return json_error('Não foi possível cadastrar o centro de custo.', errors=form_errors(form))

    centro = form.save()
    return JsonResponse({'detail': 'Centro de custo criado.', 'item': serialize_centro_custo(centro, request)}, status=201)

@require_http_methods(['GET', 'POST'])
@api_login_required
def detail(request, centro_id):
    centro = get_object_or_404(CentroDeCusto, id=centro_id)

    if request.method == 'GET':
        return JsonResponse({'item': serialize_centro_custo(centro, request)})

    data = request_data(request)
    form = CentroDeCustoForm(data, instance=centro)
    
    if not form.is_valid():
        return json_error('Não foi possível atualizar o centro de custo.', errors=form_errors(form))

    centro = form.save()
    return JsonResponse({'detail': 'Centro de custo atualizado.', 'item': serialize_centro_custo(centro, request)})

@require_POST
@api_login_required
def trash(request, centro_id):
    centro = get_object_or_404(CentroDeCusto, id=centro_id)
    
    if centro.equipamento_set.exists():
        return json_error('Não é possível excluir: existem equipamentos vinculados a este centro de custo.')
        
    centro.delete() 
    return JsonResponse({'detail': f'Centro de custo "{centro.nome}" foi removido.'})