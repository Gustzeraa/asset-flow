from django.contrib import admin
from .models import Colaborador

@admin.register(Colaborador)
class ColaboradorAdmin(admin.ModelAdmin):
    # Quais colunas vão aparecer na lista
    list_display = ('nome', 'email', 'departamento', 'cargo')
    
    # Filtros laterais (excelente para filtrar por setor)
    list_filter = ('departamento', 'cargo')
    
    # Barra de pesquisa (busca por nome ou email)
    search_fields = ('nome', 'email')
