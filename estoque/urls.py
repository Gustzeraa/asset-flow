from django.urls import path
# Importamos os dois arquivos novos em vez do "views" genérico
from . import views_equipamentos
from . import views_consumiveis

urlpatterns = [
    # Rotas de Equipamentos e Categorias
    path('', views_equipamentos.dashboard, name='dashboard'),
    path('equipamento/novo/', views_equipamentos.novo_equipamento, name='novo_equipamento'),
    path('equipamentos/', views_equipamentos.lista_equipamentos, name='lista_equipamentos'),
    path('equipamento/<int:id>/editar/', views_equipamentos.editar_equipamento, name='editar_equipamento'),
    path('equipamento/<int:id>/excluir/', views_equipamentos.excluir_equipamento, name='excluir_equipamento'),
    path('categoria/nova/', views_equipamentos.nova_categoria, name='nova_categoria'),
    path('equipamentos/exportar/', views_equipamentos.exportar_inventario, name='exportar_inventario'),
    # Exemplo de como vai ficar se estiver no arquivo de equipamentos:
    path('categorias/', views_equipamentos.lista_categorias, name='lista_categorias'),
    path('categorias/excluir/<int:id>/', views_equipamentos.excluir_categoria, name='excluir_categoria'),
    
    # Rotas de Consumíveis
    path('consumiveis/', views_consumiveis.lista_consumiveis, name='lista_consumiveis'),
    path('consumiveis/novo/', views_consumiveis.novo_consumivel, name='novo_consumivel'),
    path('consumiveis/<int:id>/editar/', views_consumiveis.editar_consumivel, name='editar_consumivel'),
    path('consumiveis/<int:id>/excluir/', views_consumiveis.excluir_consumivel, name='excluir_consumivel'),
    path('consumiveis/<int:id>/ajustar/<str:operacao>/', views_consumiveis.ajustar_estoque, name='ajustar_estoque'),
]