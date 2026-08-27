import csv
from datetime import datetime

from django.db import IntegrityError
from django.db.models import Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_GET, require_http_methods, require_POST

from api.serializers import serialize_equipment
from api.utils import api_login_required, form_errors, int_list, json_error, post_or_json, request_data
from estoque.forms import EquipamentoForm
from estoque.models import Categoria, Equipamento, EquipamentoImagem, HistoricoTransferencia
from rh.models import Colaborador
import csv
from django.http import HttpResponse


def _filtered_equipments(params):
    search = params.get('q') or params.get('search')
    ordering = params.get('ordenar') or params.get('ordering')
    category_id = params.get('categoria') or params.get('category')
    start_date = params.get('data_inicio') or params.get('start_date')
    end_date = params.get('data_fim') or params.get('end_date')

    # NOVO: Adicionado .prefetch_related('galeria') para otimizar a busca das fotos no banco
    equipments = Equipamento.objects.filter(excluido=False).select_related(
        'categoria', 'responsavel'
    ).prefetch_related('galeria', 'historico_transferencias')

    if search:
        equipments = equipments.filter(
            Q(nome__icontains=search)
            | Q(num_patrimonio__icontains=search)
            | Q(categoria__nome__icontains=search)
            | Q(responsavel__nome__icontains=search)
        )

    if category_id:
        equipments = equipments.filter(categoria_id=category_id)

    if start_date:
        equipments = equipments.filter(data__gte=start_date)

    if end_date:
        equipments = equipments.filter(data__lte=end_date)

    if ordering in {'data', '-data', 'nome', '-nome', 'status', '-status'}:
        equipments = equipments.order_by(ordering)
    else:
        equipments = equipments.order_by('-id')

    return equipments


@require_http_methods(['GET', 'POST'])
@api_login_required
def equipments_collection(request):
    if request.method == 'GET':
        equipments = _filtered_equipments(request.GET)
        summary = {
            'total': equipments.count(),
            'disponiveis': equipments.filter(status='disponivel').count(),
            'em_uso': equipments.filter(status='em_uso').count(),
            'manutencao': equipments.filter(status='manutencao').count(),
        }
        return JsonResponse({'items': [serialize_equipment(item) for item in equipments], 'summary': summary})

    form = EquipamentoForm(request.POST, request.FILES)
    if not form.is_valid():
        return json_error('Nao foi possivel cadastrar o equipamento.', errors=form_errors(form))

    equipment = form.save()
    
    # NOVO: Salva as imagens da galeria enviadas na criação
    fotos_extras = request.FILES.getlist('galeria')
    for foto in fotos_extras[:5]: # Pega no máximo 5 fotos
        EquipamentoImagem.objects.create(equipamento=equipment, imagem=foto)

    return JsonResponse({'detail': 'Equipamento criado com sucesso.', 'item': serialize_equipment(equipment)}, status=201)


@require_http_methods(['GET', 'POST'])
@api_login_required
def equipment_detail(request, equipment_id):
    # O prefetch_related garante que o histórico venha rápido
    equipment = get_object_or_404(
        Equipamento.objects.select_related('categoria', 'responsavel').prefetch_related('galeria', 'historico_transferencias'), 
        id=equipment_id
    )

    if request.method == 'GET':
        return JsonResponse({'item': serialize_equipment(equipment)})

    # 1. O DETETIVE: Guarda quem era o responsável ANTES de salvar a edição
    responsavel_antigo = equipment.responsavel

    form = EquipamentoForm(request.POST, request.FILES, instance=equipment)
    if not form.is_valid():
        return json_error('Nao foi possivel atualizar o equipamento.', errors=form_errors(form))

    equipment = form.save()
    
    # 2. O GATILHO: Se o responsável mudou durante a edição, cria o histórico na mesma hora!
    if responsavel_antigo != equipment.responsavel:
        from estoque.models import HistoricoTransferencia # Import local para garantir que funciona
        HistoricoTransferencia.objects.create(
            equipamento=equipment,
            responsavel_anterior=responsavel_antigo,
            responsavel_novo=equipment.responsavel
        )

    # Salva as imagens da galeria
    fotos_extras = request.FILES.getlist('galeria')
    for foto in fotos_extras[:5]:
        EquipamentoImagem.objects.create(equipamento=equipment, imagem=foto)

    return JsonResponse({'detail': 'Equipamento atualizado com sucesso.', 'item': serialize_equipment(equipment)})


@require_POST
@api_login_required
def transfer_equipment(request, equipment_id):
    equipment = get_object_or_404(Equipamento, id=equipment_id, excluido=False)
    data = request_data(request)
    collaborator_id = data.get('novo_responsavel') or data.get('responsavel_id')

    # 1. Guarda o responsável antigo antes de sobrescrever
    responsavel_anterior = equipment.responsavel 

    if collaborator_id:
        collaborator = get_object_or_404(Colaborador, id=collaborator_id, excluido=False)
        equipment.responsavel = collaborator
        equipment.status = 'em_uso'
        detail = f'{equipment.nome} transferido para {collaborator.nome}.'
    else:
        collaborator = None
        equipment.responsavel = None
        equipment.status = 'disponivel'
        detail = f'{equipment.nome} devolvido ao estoque.'

    equipment.save()

    # 2. Salva o registro no histórico
    HistoricoTransferencia.objects.create(
        equipamento=equipment,
        responsavel_anterior=responsavel_anterior,
        responsavel_novo=collaborator
    )

    return JsonResponse({'detail': detail, 'item': serialize_equipment(equipment)})


@require_POST
@api_login_required
def trash_equipment(request, equipment_id):
    equipment = get_object_or_404(Equipamento, id=equipment_id, excluido=False)
    equipment.excluido = True
    equipment.save(update_fields=['excluido'])
    return JsonResponse({'detail': f'Equipamento "{equipment.nome}" movido para a lixeira.'})


@require_POST
@api_login_required
def bulk_transfer(request):
    data = request_data(request)
    ids = int_list(data, 'ids', 'equipamentos_ids', 'equipment_ids')
    if not ids:
        return json_error('Nenhum equipamento foi selecionado.')

    equipments = Equipamento.objects.filter(id__in=ids, excluido=False)
    collaborator_id = data.get('novo_responsavel') or data.get('responsavel_id')

    if collaborator_id:
        collaborator = get_object_or_404(Colaborador, id=collaborator_id, excluido=False)
        status_novo = 'em_uso'
        detail = f'{equipments.count()} equipamento(s) transferido(s) para {collaborator.nome}.'
    else:
        collaborator = None
        status_novo = 'disponivel'
        detail = f'{equipments.count()} equipamento(s) devolvido(s) ao estoque.'

    # 1. Prepara o histórico ANTES de atualizar os dados no banco
    historicos = []
    for eq in equipments:
        historicos.append(
            HistoricoTransferencia(
                equipamento=eq,
                responsavel_anterior=eq.responsavel,
                responsavel_novo=collaborator
            )
        )

    # 2. Cria todos os registros de histórico de uma vez só (alta performance)
    HistoricoTransferencia.objects.bulk_create(historicos)

    # 3. Atualiza todos os equipamentos de uma vez
    equipments.update(responsavel=collaborator, status=status_novo)

    return JsonResponse({'detail': detail})


@require_POST
@api_login_required
def bulk_change_category(request):
    data = request_data(request)
    ids = int_list(data, 'ids', 'equipamentos_ids', 'equipment_ids')
    category_id = data.get('nova_categoria') or data.get('categoria_id') or data.get('category_id')
    if not ids or not category_id:
        return json_error('Selecione equipamentos e categoria.')

    category = get_object_or_404(Categoria, id=category_id)
    equipments = Equipamento.objects.filter(id__in=ids, excluido=False)
    updated = equipments.count()
    equipments.update(categoria=category)
    return JsonResponse({'detail': f'Categoria alterada em {updated} equipamento(s).'})


@require_POST
@api_login_required
def bulk_trash(request):
    data = request_data(request)
    ids = int_list(data, 'ids', 'equipamentos_ids', 'equipment_ids')
    if not ids:
        return json_error('Nenhum equipamento foi selecionado.')

    updated = Equipamento.objects.filter(id__in=ids, excluido=False).update(excluido=True)
    return JsonResponse({'detail': f'{updated} equipamento(s) movido(s) para a lixeira.'})


@require_POST
@api_login_required
def import_inventory(request):
    uploaded = request.FILES.get('file') or request.FILES.get('arquivo_csv')
    if not uploaded or not uploaded.name.endswith('.csv'):
        return json_error('Envie um arquivo CSV valido.')

    try:
        binary_content = uploaded.read()
        try:
            decoded_lines = binary_content.decode('utf-8-sig').splitlines()
        except UnicodeDecodeError:
            decoded_lines = binary_content.decode('iso-8859-1').splitlines()

        reader = csv.DictReader(decoded_lines, delimiter=';')
        status_map = {
            'em uso': 'em_uso',
            'em_uso': 'em_uso',
            'uso': 'em_uso',
            'estoque': 'disponivel',
            'em estoque': 'disponivel',
            'disponivel': 'disponivel',
            'disponível': 'disponivel',
            'descartado': 'descarte',
            'manutenção': 'manutencao',
            'manutencao': 'manutencao',
        }

        successes = 0
        errors = []

        for index, row in enumerate(reader, start=1):
            name = (row.get('Nome') or '').strip()
            patrimony = (row.get('Patrimonio') or row.get('Patrimônio') or '').strip()
            category_name = (row.get('Categoria') or '').strip()
            status_input = (row.get('Status') or '').strip().lower()

            if not name or not patrimony or not category_name:
                errors.append(f'Linha {index}: faltam dados obrigatorios.')
                continue

            category, _ = Categoria.objects.get_or_create(nome=category_name)

            try:
                Equipamento.objects.create(
                    nome=name,
                    num_patrimonio=patrimony,
                    categoria=category,
                    status=status_map.get(status_input, 'disponivel'),
                    data=datetime.now().date(),
                )
                successes += 1
            except IntegrityError:
                errors.append(f'Linha {index}: patrimonio "{patrimony}" ja cadastrado.')
            except Exception:
                errors.append(f'Linha {index}: erro ao salvar o equipamento.')

        return JsonResponse(
            {
                'detail': 'Importacao concluida.',
                'successes': successes,
                'errors': errors,
            }
        )
    except Exception:
        return json_error('Erro critico ao ler o arquivo CSV.', status=500)


@require_GET
@api_login_required
def export_inventory(request):
    from estoque.models import Equipamento
    equipments = Equipamento.objects.filter(excluido=False).order_by('nome')
    
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="inventario_completo_equipamentos.csv"'
    
    # Força a codificação UTF-8 com BOM para o Excel abrir com acentos corretos
    response.write('\ufeff'.encode('utf8'))
    
    writer = csv.writer(response, delimiter=';')
    
    # NOVO: Cabeçalho com todos os campos disponíveis no banco de dados
    writer.writerow([
        'Patrimônio', 
        'Nome', 
        'Categoria', 
        'Status', 
        'Centro de Custo',
        'Valor de Compra',
        'Valor Atual Contábil',
        'Departamento',
        'Responsável', 
        'Data de Aquisição',
        'Descrição',
        'Observações'
    ])
    
    for eq in equipments:
        # Tratamento para não quebrar caso algum campo de relacionamento esteja vazio
        categoria = eq.categoria.nome if eq.categoria else ''
        responsavel = eq.responsavel.nome if eq.responsavel else 'Sem responsável'
        data_formatada = eq.data.strftime('%d/%m/%Y') if eq.data else ''
        centro = eq.centro_de_custo.nome if eq.centro_de_custo else 'Não Atribuído'
        
        # Preenchendo as colunas na mesma ordem do cabeçalho
        writer.writerow([
            eq.num_patrimonio or '',
            eq.nome or '',
            categoria,
            eq.get_status_display() or '',
            centro,
            str(eq.valor_compra) if eq.valor_compra else "0.00",
            str(eq.valor_atual_contabil) if eq.valor_atual_contabil else "0.00",
            eq.departamento or '',
            responsavel,
            data_formatada,
            eq.descricao or '',
            eq.observacao or ''
        ])
        
    return response


@require_GET
@api_login_required
def download_template(request):
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="modelo_importacao_equipamentos.csv"'
    
    response.write('\ufeff'.encode('utf8'))
    writer = csv.writer(response, delimiter=';')
    
    # Cabeçalho do Modelo
    writer.writerow(['nome', 'num_patrimonio', 'categoria_id', 'status'])
    
    return response


@require_POST
@api_login_required
def update_finance(request, equipment_id):
    # Pega o equipamento no banco
    equipment = get_object_or_404(Equipamento, id=equipment_id, excluido=False)
    
    # Recebe o JSON do React
    data = request_data(request)
    
    # Extrai os dados do payload
    centro_de_custo_id = data.get('centro_de_custo_id')
    data_compra = data.get('data_compra')
    valor_compra = data.get('valor_compra')
    taxa_depreciacao = data.get('taxa_depreciacao_anual')

    try:
        # Atualiza o Centro de Custo
        if centro_de_custo_id:
            equipment.centro_de_custo_id = centro_de_custo_id
        else:
            equipment.centro_de_custo_id = None
            
        # Atualiza a Data
        if data_compra:
            equipment.data_compra = data_compra
        else:
            equipment.data_compra = None
            
        # Atualiza o Valor
        if valor_compra:
            # Tratamento básico para garantir que seja um decimal
            equipment.valor_compra = str(valor_compra).replace(',', '.')
        else:
            equipment.valor_compra = None
            
        # Atualiza a Taxa
        if taxa_depreciacao:
            equipment.taxa_depreciacao_anual = str(taxa_depreciacao).replace(',', '.')
            
        # Salva as alterações "na marra", ignorando o Form da TI
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

    # Faz o update massivo no banco de dados com 1 única query
    Equipamento.objects.filter(id__in=ids, excluido=False).update(
        centro_de_custo_id=centro_de_custo_id
    )

    return JsonResponse({'detail': f'{len(ids)} equipamentos foram atualizados e conciliados.'})

@require_GET
@api_login_required
def export_finance_csv(request):
    ano = request.GET.get('ano')
    centro_custo_id = request.GET.get('centro_custo')
    
    # Começa pegando tudo que não está na lixeira
    queryset = Equipamento.objects.filter(excluido=False)
    
    # Aplica os filtros se o usuário tiver selecionado
    if ano:
        queryset = queryset.filter(data_compra__year=ano)
    if centro_custo_id:
        queryset = queryset.filter(centro_de_custo_id=centro_custo_id)
        
    # Prepara a resposta para ser um download de arquivo
    response = HttpResponse(
        content_type='text/csv',
        headers={'Content-Disposition': 'attachment; filename="fechamento_contabil.csv"'},
    )
    
    # Esse comando força o Excel a entender os acentos do português (UTF-8 com BOM)
    response.write(u'\ufeff'.encode('utf8'))
    
    # Usamos o ponto e vírgula porque o Excel no Brasil prefere assim
    writer = csv.writer(response, delimiter=';')
    
    # Cabeçalho da Planilha
    writer.writerow(['Patrimônio', 'Equipamento', 'Centro de Custo', 'Data de Aquisição', 'Valor Original (R$)', 'Taxa (%)', 'Valor Contábil Atual (R$)'])
    
    for equip in queryset:
        cc_nome = f"{equip.centro_de_custo.codigo} - {equip.centro_de_custo.nome}" if equip.centro_de_custo else "Não vinculado"
        dt_compra = equip.data_compra.strftime('%d/%m/%Y') if equip.data_compra else "Sem data"
        
        # Formatando os números para o padrão brasileiro (vírgula no lugar do ponto)
        v_compra = str(equip.valor_compra).replace('.', ',') if equip.valor_compra else "0,00"
        v_atual = str(equip.valor_atual_contabil).replace('.', ',') if getattr(equip, 'valor_atual_contabil', None) else "0,00"
        taxa = str(getattr(equip, 'taxa_depreciacao_anual', '10.0')).replace('.', ',')
        
        writer.writerow([
            equip.num_patrimonio,
            equip.nome,
            cc_nome,
            dt_compra,
            v_compra,
            taxa,
            v_atual
        ])
        
    return response