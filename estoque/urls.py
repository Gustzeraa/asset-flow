from django.urls import path
# Importamos os dois arquivos novos em vez do "views" genérico
from . import views

urlpatterns = [
    # Rotas de Equipamentos e Categorias
    path('', views.dashboard, name='dashboard'),
    path('equipamento/novo/', views.novo_equipamento, name='novo_equipamento'),
    path('equipamentos/', views.lista_equipamentos, name='lista_equipamentos'),
    path('equipamento/<int:id>/editar/', views.editar_equipamento, name='editar_equipamento'),
    path('equipamento/<int:id>/excluir/', views.excluir_equipamento, name='excluir_equipamento'),
    path('categoria/nova/', views.nova_categoria, name='nova_categoria'),
    path('equipamentos/exportar/', views.exportar_inventario, name='exportar_inventario'),
    path('equipamentos/<int:id>/transferir/', views.transferir_equipamento, name='transferir_equipamento'),
    path('equipamentos/transferir-lote/', views.transferir_lote, name='transferir_lote'),
    path('equipamentos/alterar-categoria-lote/', views.alterar_categoria_lote, name='alterar_categoria_lote'),
    # Exemplo de como vai ficar se estiver no arquivo de equipamentos:
    path('categorias/', views.lista_categorias, name='lista_categorias'),
    path('categorias/excluir/<int:id>/', views.excluir_categoria, name='excluir_categoria'),
    path('equipamentos/importar/', views.importar_planilha, name='importar_planilha'),
    path('equipamentos/importar/modelo/', views.baixar_modelo_csv, name='baixar_modelo_csv'),
    path('lixeira/', views.lixeira, name='lixeira'),
    path('lixeira/restaurar/<str:tipo>/<int:id>/', views.restaurar_item, name='restaurar_item'),
    path('lixeira/excluir-permanente/<str:tipo>/<int:id>/', views.excluir_permanente, name='excluir_permanente'),
    path('equipamentos/lote/lixeira/', views.lixeira_em_lote_equipamentos, name='lixeira_em_lote_equipamentos'),
    path('configuracoes/usuarios/', views.gerenciar_usuarios, name='gerenciar_usuarios'),
    path('configuracoes/usuarios/novo/', views.novo_usuario, name='novo_usuario'),
    path('configuracoes/usuarios/<int:id>/editar/', views.editar_usuario, name='editar_usuario'),
    path('configuracoes/usuarios/<int:id>/senha/', views.resetar_senha, name='resetar_senha'),
]