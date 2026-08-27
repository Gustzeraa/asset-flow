from consumiveis.models import Consumivel, MovimentacaoConsumivel
from estoque.models import Categoria, Equipamento
from rh.models import Colaborador, Departamento
from datetime import date
from decimal import Decimal


def serialize_user(user):
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'is_superuser': user.is_superuser,
    }


def serialize_choices(choices):
    return [{'value': value, 'label': label} for value, label in choices]


def serialize_category(category, equipment_count=None):
    payload = {
        'id': category.id,
        'nome': category.nome,
    }
    if equipment_count is not None:
        payload['equipamentos_count'] = equipment_count
    return payload


def serialize_department(department, collaborator_count=None, equipment_count=None):
    payload = {
        'id': department.id,
        'nome': department.nome,
    }
    if collaborator_count is not None:
        payload['colaboradores_count'] = collaborator_count
    if equipment_count is not None:
        payload['equipamentos_count'] = equipment_count
    return payload


def serialize_collaborator_summary(collaborator):
    if not collaborator:
        return None

    return {
        'id': collaborator.id,
        'nome': collaborator.nome,
        'cargo': collaborator.cargo,
        'departamento_id': collaborator.departamento_id,
        'departamento': collaborator.departamento.nome if collaborator.departamento else 'Sem departamento',
        'email': collaborator.email,
        'ativo': collaborator.ativo,
    }


def serialize_equipment_summary(equipment):
    return {
        'id': equipment.id,
        'nome': equipment.nome,
        'num_patrimonio': equipment.num_patrimonio,
        'status': equipment.status,
        'status_label': equipment.get_status_display(),
    }


def serialize_equipment(equipment):
    data = {
        'id': equipment.id,
        'data': equipment.data.isoformat() if equipment.data else None,
        'nome': equipment.nome,
        'num_patrimonio': equipment.num_patrimonio,
        'categoria_id': equipment.categoria_id,
        'categoria': serialize_category(equipment.categoria) if equipment.categoria else None,
        
        # ==========================================
        # NOVO: Injetando os campos financeiros
        # ==========================================
        'centro_de_custo_id': equipment.centro_de_custo_id,
        'centro_de_custo': serialize_centro_custo(equipment.centro_de_custo),
        'valor_compra': str(equipment.valor_compra) if getattr(equipment, 'valor_compra', None) else "0.00",
        'data_compra': equipment.data_compra.isoformat() if getattr(equipment, 'data_compra', None) else None,
        'taxa_depreciacao_anual': str(getattr(equipment, 'taxa_depreciacao_anual', '10.0')),
        'valor_atual_contabil': str(getattr(equipment, 'valor_atual_contabil', '0.00')) if getattr(equipment, 'valor_atual_contabil', None) else "0.00",
        # ==========================================

        'departamento': equipment.departamento,
        'descricao': equipment.descricao,
        'status': equipment.status,
        'status_label': equipment.get_status_display(),
        'responsavel_id': equipment.responsavel_id,
        'responsavel': serialize_collaborator_summary(equipment.responsavel),
        'observacao': equipment.observacao,
        'foto_url': equipment.foto.url if equipment.foto else None,
        'excluido': equipment.excluido,
        'galeria': [img.imagem.url for img in equipment.galeria.all() if img.imagem] if hasattr(equipment, 'galeria') else [],
    }
    
    # ... (o resto da função com o histórico continua igual) ...
    
    # NOVO: Injeta o histórico de transferências no JSON (Sem o hasattr)
    historico_bd = equipment.historico_transferencias.all().order_by('-data_transferencia')
    
    data['historico'] = [
        {
            'id': h.id,
            'data': h.data_transferencia.strftime('%d/%m/%Y %H:%M'),
            'anterior': h.responsavel_anterior.nome if h.responsavel_anterior else 'Estoque Interno',
            'novo': h.responsavel_novo.nome if h.responsavel_novo else 'Estoque Interno'
        } for h in historico_bd
    ]

    print("🚨🚨🚨 PASSOU PELO SERIALIZER NOVO! CHAVES:", data.keys())
    return data


def serialize_collaborator(collaborator, assets=None):
    data = {
        'id': collaborator.id,
        'nome': collaborator.nome,
        'cpf': collaborator.cpf,
        'cargo': collaborator.cargo,
        'departamento_id': collaborator.departamento_id,
        'departamento': collaborator.departamento.nome if collaborator.departamento else 'Sem departamento',
        'email': collaborator.email,
        'ativo': collaborator.ativo,
        'ativos_count': assets.count() if assets else 0,
        'ativos': [{'id': a.id, 'nome': a.nome, 'num_patrimonio': a.num_patrimonio} for a in assets] if assets else [],
    }

    termos = collaborator.termos_assinados.exclude(arquivo_assinado='').order_by('-data_emissao')
    
    data['termo_assinado'] = termos.exists()
    
    data['termos_assinados'] = [
        {
            'id': t.id,
            'data': t.data_emissao.strftime('%d/%m/%Y %H:%M'),
            'url': t.arquivo_assinado.url
        } for t in termos
    ]

    return data


def serialize_consumable(consumable):
    return {
        'id': consumable.id,
        'nome': consumable.nome,
        'unidade_medida': consumable.unidade_medida,
        'unidade_medida_label': consumable.get_unidade_medida_display(),
        'quantidade_atual': consumable.quantidade_atual,
        'estoque_minimo': consumable.estoque_minimo,
        'descricao': consumable.descricao,
        'estoque_baixo': consumable.quantidade_atual <= consumable.estoque_minimo,
        'excluido': consumable.excluido,
    }


def serialize_movement(movement):
    return {
        'id': movement.id,
        'consumivel_id': movement.consumivel_id,
        'consumivel_nome': movement.consumivel.nome,
        'tipo': movement.tipo,
        'tipo_label': movement.get_tipo_display(),
        'quantidade': movement.quantidade,
        'data': movement.data.isoformat(),
        'responsavel': serialize_collaborator_summary(movement.responsavel),
        'destino': movement.destino,
        'observacao': movement.observacao,
    }


def serialize_trash_item(item_type, item):
    if item_type == 'equipamento':
        detail = f'Patrimonio: {item.num_patrimonio}'
        badge = 'Equipamento'
    elif item_type == 'consumivel':
        detail = 'Item de almoxarifado'
        badge = 'Consumivel'
    else:
        detail = 'Colaborador'
        badge = 'Colaborador'

    return {
        'id': item.id,
        'tipo': item_type,
        'nome': item.nome,
        'detalhe': detail,
        'badge': badge,
    }


def serialize_dashboard_payload(*, totals, low_stock, latest_equipments, latest_movements):
    return {
        'totais': totals,
        'alertas_estoque': [serialize_consumable(item) for item in low_stock],
        'equipamentos_recentes': [serialize_equipment(item) for item in latest_equipments],
        'movimentacoes_recentes': [serialize_movement(item) for item in latest_movements],
    }


def serialize_lookups_payload(categories=None, collaborators=None, departments=None, centros_custo=None):
    payload = {}
    
    if categories is not None:
        payload['categorias'] = [serialize_category(c) for c in categories]
    if collaborators is not None:
        payload['colaboradores'] = [serialize_collaborator_summary(c) for c in collaborators]
    if departments is not None:
        payload['departamentos'] = [serialize_department(d) for d in departments]
        
    # Os Centros de Custo que adicionamos
    if centros_custo is not None:
        payload['centros_custo'] = [serialize_centro_custo(c) for c in centros_custo]
        
    # ==========================================
    # RESTAURANDO AS OPÇÕES FIXAS (CHOICES)
    # ==========================================
    # (Verifique se no seu models.py as constantes estão com esses nomes exatos, 
    # como STATUS_CHOICES, TIPO_CHOICES, etc. Caso sejam diferentes, é só ajustar).
    
    if hasattr(Equipamento, 'STATUS_CHOICES'):
        payload['equipamento_status'] = serialize_choices(Equipamento.STATUS_CHOICES)
        
    if hasattr(Consumivel, 'UNIDADES_CHOICES'):
        payload['consumivel_unidades'] = serialize_choices(Consumivel.UNIDADES_CHOICES)
        
    if hasattr(MovimentacaoConsumivel, 'TIPO_CHOICES'):
        payload['movimentacao_tipos'] = serialize_choices(MovimentacaoConsumivel.TIPO_CHOICES)
        
    return payload


def serialize_centro_custo(centro, request=None):
    if not centro:
        return None
        
    from datetime import date
    from decimal import Decimal
    
    total = Decimal('0.00')
    ano_alvo = date.today().year
    
    print(f"\n--- [DEBUG] Processando Centro de Custo: {centro.nome} ---")
    
    # 1. Verifica se o React mandou o ano
    if request and hasattr(request, 'GET') and request.GET.get('ano'):
        try:
            ano_alvo = int(request.GET.get('ano'))
        except ValueError:
            pass
            
    print(f"1. Ano Alvo do Filtro: {ano_alvo}")

    try:
        equipamentos = centro.equipamentos.filter(excluido=False)
        print(f"2. Equipamentos vinculados encontrados no banco: {equipamentos.count()}")
        
        for equip in equipamentos:
            print(f"  -> Equip: {equip.nome} | Data: {getattr(equip, 'data_compra', 'SEM DATA')} | Valor: {getattr(equip, 'valor_compra', 'SEM VALOR')}")
            
            if getattr(equip, 'data_compra', None) and getattr(equip, 'valor_compra', None):
                ano_compra = None
                
                if isinstance(equip.data_compra, str):
                    try:
                        ano_compra = int(equip.data_compra[:4])
                    except:
                        pass
                elif hasattr(equip.data_compra, 'year'):
                    ano_compra = equip.data_compra.year
                    
                print(f"    - Ano lido do equipamento: {ano_compra}")
                
                if ano_compra == ano_alvo:
                    v = equip.valor_compra
                    try:
                        if isinstance(v, (int, float, Decimal)):
                            valor_decimal = Decimal(str(v))
                        else:
                            v_str = str(v).replace('R$', '').strip()
                            if ',' in v_str and '.' in v_str:
                                v_str = v_str.replace('.', '').replace(',', '.')
                            elif ',' in v_str:
                                v_str = v_str.replace(',', '.')
                            valor_decimal = Decimal(v_str)
                            
                        total += valor_decimal
                        print(f"    - SOMOU COM SUCESSO! Novo total parcial: {total}")
                    except Exception as e:
                        print(f"    - ⚠️ ERRO NA CONVERSÃO DA MOEDA: {e}")
                else:
                    print("    - IGNORADO: O ano de compra é diferente do ano filtrado.")
            else:
                print("    - IGNORADO: Equipamento não possui data de compra ou valor preenchido.")
                
    except Exception as e:
        print(f"⚠️ ERRO GERAL AO BUSCAR EQUIPAMENTOS: {e}")

    print(f"3. TOTAL FINAL QUE VAI PARA O REACT: {total}\n")

    return {
        'id': centro.id,
        'codigo': centro.codigo,
        'nome': centro.nome,
        'orcamento_anual': str(centro.orcamento_anual) if centro.orcamento_anual else None,
        'total_investido': str(round(total, 2))
    }