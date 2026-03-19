from django.urls import path
from . import views

urlpatterns = [
    path('', views.lista_colaboradores, name='lista_colaboradores'),
    path('<int:id>/editar/', views.editar_colaborador, name='editar_colaborador'),
    path('<int:id>/excluir/', views.excluir_colaborador, name='excluir_colaborador'),
    path('novo/', views.novo_colaborador, name='novo_colaborador'),
]
