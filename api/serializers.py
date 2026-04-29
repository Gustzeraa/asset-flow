from consumiveis.models import Consumivel, MovimentacaoConsumivel
from estoque.models import Categoria, Equipamento
from rh.models import Colaborador


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


def serialize_collaborator_summary(collaborator):
    if not collaborator:
        return None

    return {
        'id': collaborator.id,
        'nome': collaborator.nome,
        'cargo': collaborator.cargo,
        'departamento': collaborator.departamento,
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
    return {
        'id': equipment.id,
        'data': equipment.data.isoformat() if equipment.data else None,
        'nome': equipment.nome,
        'num_patrimonio': equipment.num_patrimonio,
        'categoria_id': equipment.categoria_id,
        'categoria': serialize_category(equipment.categoria) if equipment.categoria else None,
        'local': equipment.local,
        'tipo': equipment.tipo,
        'departamento': equipment.departamento,
        'descricao': equipment.descricao,
        'status': equipment.status,
        'status_label': equipment.get_status_display(),
        'responsavel_id': equipment.responsavel_id,
        'responsavel': serialize_collaborator_summary(equipment.responsavel),
        'validador_id': equipment.validador_id,
        'validador': serialize_collaborator_summary(equipment.validador),
        'observacao': equipment.observacao,
        'foto_url': equipment.foto.url if equipment.foto else None,
        'excluido': equipment.excluido,
    }


def serialize_collaborator(collaborator, assets=None):
    if assets is None:
        assets = collaborator.equipamentos_responsavel.all().order_by('-id')

    return {
        'id': collaborator.id,
        'nome': collaborator.nome,
        'cpf': collaborator.cpf,
        'cargo': collaborator.cargo,
        'email': collaborator.email,
        'departamento': collaborator.departamento,
        'ativo': collaborator.ativo,
        'excluido': collaborator.excluido,
        'ativos_count': assets.count() if hasattr(assets, 'count') else len(assets),
        'ativos': [serialize_equipment_summary(item) for item in assets],
    }


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


def serialize_lookups_payload(*, categories, collaborators):
    return {
        'categorias': [serialize_category(item) for item in categories],
        'colaboradores': [serialize_collaborator_summary(item) for item in collaborators],
        'equipamento_status': serialize_choices(Equipamento.STATUS_CHOICES),
        'consumivel_unidades': serialize_choices(Consumivel.UNIDADES),
        'movimentacao_tipos': serialize_choices(MovimentacaoConsumivel.TIPOS),
    }
