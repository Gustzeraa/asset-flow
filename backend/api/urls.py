from django.urls import path

from .views import users
from .views import auth
from .views import categories
from .views import collaborators
from .views import consumables
from .views import dashboard
from .views import departments
from .views import equipments
from .views import lookups
from .views import trash
from .views import cost_centers

urlpatterns = [
    # ==========================================
    # Rotas de Autenticação e Sessão
    # ==========================================
    path('auth/csrf/', auth.csrf, name='api_csrf'),
    path('auth/login/', auth.login_view, name='api_login'),
    path('auth/logout/', auth.logout_view, name='api_logout'),
    path('auth/me/', auth.me, name='api_me'),

    # ==========================================
    # Rotas de Dashboard e Consultas Globais
    # ==========================================
    path('dashboard/', dashboard.dashboard_summary, name='api_dashboard'),
    path('dashboard/finance/', dashboard.dashboard_finance_summary, name='api_dashboard_finance'),
    path('lookups/', lookups.lookups, name='api_lookups'),

    # ==========================================
    # Rotas de Categorias
    # ==========================================
    path('categories/', categories.categories_collection, name='api_categories'),
    path('categories/<int:category_id>/', categories.category_detail, name='api_category_detail'),

    # ==========================================
    # Rotas de Departamentos
    # ==========================================
    path('departments/', departments.departments_collection, name='api_departments'),
    path('departments/<int:department_id>/', departments.department_detail, name='api_department_detail'),

    # ==========================================
    # Rotas de Equipamentos (Ativos e Inventário)
    # ==========================================
    path('equipments/', equipments.equipments_collection, name='api_equipments'),
    path('equipments/export/', equipments.export_inventory, name='api_equipments_export'),
    path('equipments/import/', equipments.import_inventory, name='api_equipments_import'),
    path('equipments/import/template/', equipments.download_template, name='api_equipments_import_template'),
    path('equipments/bulk/transfer/', equipments.bulk_transfer, name='api_equipments_bulk_transfer'),
    path('equipments/bulk/category/', equipments.bulk_change_category, name='api_equipments_bulk_category'),
    path('equipments/bulk/trash/', equipments.bulk_trash, name='api_equipments_bulk_trash'),
    path('equipments/bulk/finance/', equipments.bulk_update_finance, name='api_equipments_bulk_finance'),
    path('equipments/finance/export/', equipments.export_finance_csv, name='api_equipments_finance_export'),
    path('equipments/<int:equipment_id>/', equipments.equipment_detail, name='api_equipment_detail'),
    path('equipments/<int:equipment_id>/transfer/', equipments.transfer_equipment, name='api_equipment_transfer'),
    path('equipments/<int:equipment_id>/trash/', equipments.trash_equipment, name='api_equipment_trash'),
    
    # -> Nova Rota de Controle Contábil / Financeiro (Atualização exclusiva de valores)
    path('equipments/<int:equipment_id>/finance/', equipments.update_finance, name='api_equipment_finance'),

    # ==========================================
    # Rotas de Colaboradores (Módulo RH)
    # ==========================================
    path('collaborators/', collaborators.collaborators_collection, name='api_collaborators'),
    path('collaborators/bulk/trash/', collaborators.bulk_trash, name='api_collaborators_bulk_trash'),
    path('collaborators/<int:collaborator_id>/', collaborators.collaborator_detail, name='api_collaborator_detail'),
    path('collaborators/<int:collaborator_id>/term/', collaborators.term_pdf, name='api_collaborator_term'),
    path('collaborators/<int:collaborator_id>/upload-term/', collaborators.upload_signed_term, name='api_collaborator_upload_term'),
    path('collaborators/<int:collaborator_id>/term/<int:term_id>/delete/', collaborators.delete_signed_term, name='api_collaborator_delete_term'),
    path('collaborators/<int:collaborator_id>/trash/', collaborators.trash_collaborator, name='api_collaborator_trash'),

    # ==========================================
    # Rotas de Consumíveis (Almoxarifado)
    # ==========================================
    path('consumables/', consumables.consumables_collection, name='api_consumables'),
    path('consumables/bulk/trash/', consumables.bulk_trash, name='api_consumables_bulk_trash'),
    path('consumables/movements/', consumables.movements_collection, name='api_consumable_movements'),
    path('consumables/movements/export/', consumables.export_movements, name='api_consumable_movements_export'),
    path('consumables/<int:consumable_id>/', consumables.consumable_detail, name='api_consumable_detail'),
    path('consumables/<int:consumable_id>/movements/', consumables.register_movement, name='api_consumable_movement_create'),
    path('consumables/<int:consumable_id>/trash/', consumables.trash_consumable, name='api_consumable_trash'),

    # ==========================================
    # Rotas de Lixeira (Lixeira Operacional)
    # ==========================================
    path('trash/', trash.trash_collection, name='api_trash'),
    path('trash/<str:item_type>/<int:item_id>/restore/', trash.restore_item, name='api_trash_restore'),
    path('trash/<str:item_type>/<int:item_id>/', trash.delete_item, name='api_trash_delete'),

    # ==========================================
    # Rotas de Usuários do Sistema (Acessos)
    # ==========================================
    path('users/', users.users_collection, name='api_users'),
    path('users/<int:user_id>/', users.user_detail, name='api_user_detail'),

    # ==========================================
    # Rotas de Centro de Custo (Módulo Financeiro)
    # ==========================================
    path('cost-centers/', cost_centers.collection, name='cost_centers_collection'),
    path('cost-centers/<int:centro_id>/', cost_centers.detail, name='cost_center_detail'),
    path('cost-centers/<int:centro_id>/trash/', cost_centers.trash, name='cost_center_trash'),
]