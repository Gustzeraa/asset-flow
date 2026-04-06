from django.urls import path
from . import views

urlpatterns = [
    path('', views.lista_colaboradores, name='lista_colaboradores'),
    path('<int:id>/editar/', views.editar_colaborador, name='editar_colaborador'),
    path('<int:id>/excluir/', views.excluir_colaborador, name='excluir_colaborador'),
    path('novo/', views.novo_colaborador, name='novo_colaborador'),
    path('colaboradores/<int:id>/termo-pdf/', views.gerar_termo_pdf, name='gerar_termo_pdf'),
    path('colaboradores/lote/lixeira/', views.lixeira_em_lote_colaboradores, name='lixeira_em_lote_colaboradores'),
]
