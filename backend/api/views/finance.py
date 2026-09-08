import csv
from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_GET, require_POST
from django.db.models.functions import ExtractYear

# Importando os utilitários da própria API
from api.utils import api_login_required, json_error, request_data

# Importando o model do app estoque
from estoque.models import Equipamento

@require_POST
@api_login_required
def update_finance(request, equipment_id):
    equipment = get_object_or_404(Equipamento, id=equipment_id, excluido=False)
    data = request_data(request)
    
    centro_de_custo_id = data.get('centro_de_custo_id')
    data_compra = data.get('data_compra')
    valor_compra = data.get('valor_compra')
    taxa_depreciacao = data.get('taxa_depreciacao_anual')

    try:
        equipment.centro_de_custo_id = centro_de_custo_id if centro_de_custo_id else None
        equipment.data_compra = data_compra if data_compra else None
            
        if valor_compra:
            equipment.valor_compra = str(valor_compra).replace(',', '.')
        else:
            equipment.valor_compra = None
            
        if taxa_depreciacao:
            equipment.taxa_depreciacao_anual = str(taxa_depreciacao).replace(',', '.')
            
        equipment.save()
        return JsonResponse({'detail': 'Conciliação contábil atualizada com sucesso!'})
        
    except Exception as e:
        return json_error(f'Erro ao salvar dados financeiros: {str(e)}')
    

@require_POST
@api_login_required
def bulk_update_finance(request):
    data = request_data(request)
    ids = data.get('ids', [])
    centro_de_custo_id = data.get('centro_de_custo_id')

    if not ids:
        return json_error('Nenhum equipamento selecionado.')

    Equipamento.objects.filter(id__in=ids, excluido=False).update(
        centro_de_custo_id=centro_de_custo_id
    )

    return JsonResponse({'detail': f'{len(ids)} equipamentos foram atualizados e conciliados.'})


@require_GET
@api_login_required
def export_finance_csv(request):
    ano = request.GET.get('ano')
    centro_custo_id = request.GET.get('centro_custo')
    
    queryset = Equipamento.objects.filter(excluido=False)
    
    if ano:
        queryset = queryset.filter(data_compra__year=ano)
    if centro_custo_id:
        queryset = queryset.filter(centro_de_custo_id=centro_custo_id)
        
    response = HttpResponse(
        content_type='text/csv',
        headers={'Content-Disposition': 'attachment; filename="fechamento_contabil.csv"'},
    )
    
    response.write(u'\ufeff'.encode('utf8'))
    writer = csv.writer(response, delimiter=';')
    
    writer.writerow(['Patrimônio', 'Equipamento', 'Centro de Custo', 'Data de Aquisição', 'Valor Original (R$)', 'Taxa (%)', 'Valor Contábil Atual (R$)'])
    
    for equip in queryset:
        cc_nome = f"{equip.centro_de_custo.codigo} - {equip.centro_de_custo.nome}" if equip.centro_de_custo else "Não vinculado"
        dt_compra = equip.data_compra.strftime('%d/%m/%Y') if equip.data_compra else "Sem data"
        
        v_compra = str(equip.valor_compra).replace('.', ',') if equip.valor_compra else "0,00"
        v_atual = str(equip.valor_atual_contabil).replace('.', ',') if getattr(equip, 'valor_atual_contabil', None) else "0,00"
        taxa = str(getattr(equip, 'taxa_depreciacao_anual', '10.0')).replace('.', ',')
        
        writer.writerow([
            equip.num_patrimonio, equip.nome, cc_nome, dt_compra, v_compra, taxa, v_atual
        ])
        
    return response


# --- NOVA VIEW PARA RESOLVER O SELECT DINÂMICO DE ANOS NO FRONTEND ---
@require_GET
@api_login_required
def available_years(request):
    cc_id = request.GET.get('centro_custo_id')
    
    queryset = Equipamento.objects.filter(excluido=False, data_compra__isnull=False)
    
    if cc_id:
        queryset = queryset.filter(centro_de_custo_id=cc_id)
        
    anos = queryset.annotate(
        ano_compra=ExtractYear('data_compra')
    ).values_list('ano_compra', flat=True).distinct().order_by('-ano_compra')
    
    anos_formatados = [str(ano) for ano in anos if ano]
    
    return JsonResponse({'anos_disponiveis': anos_formatados})