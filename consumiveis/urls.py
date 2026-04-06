from django.urls import path
from . import views

urlpatterns = [
    path('', views.lista_consumiveis, name='lista_consumiveis'),
    path('novo/', views.novo_consumivel, name='novo_consumivel'),
    path('editar/<int:id>/', views.editar_consumivel, name='editar_consumivel'),
    path('excluir/<int:id>/', views.excluir_consumivel, name='excluir_consumivel'),
    path('movimentar/<int:id>/', views.registrar_movimentacao, name='registrar_movimentacao'),
    path('historico/', views.historico_movimentacoes, name='historico_movimentacoes'),
    path('exportar-excel/', views.exportar_movimentacoes_excel, name='exportar_movimentacoes_excel'),
    path('lote/lixeira/', views.lixeira_em_lote_consumiveis, name='lixeira_em_lote_consumiveis'),
]