from django.contrib import admin
from .models import Categoria, Equipamento, Consumivel

# A Categoria pode continuar simples, pois tem poucos campos
admin.site.register(Categoria)

@admin.register(Equipamento)
class EquipamentoAdmin(admin.ModelAdmin):
    # Colunas na tabela (fica muito mais fácil bater o olho e achar o que precisa)
    list_display = ('nome', 'num_patrimonio', 'categoria', 'status', 'responsavel')
    
    # Filtros laterais (O coração do sistema! Filtra por quebrado, em uso, categoria...)
    list_filter = ('status', 'categoria')
    
    # Barra de pesquisa (Digitar a tag do equipamento e achar na hora)
    search_fields = ('nome', 'num_patrimonio')
    
    # Dica extra: Permite editar o status direto na tela de lista, sem precisar abrir o item
    list_editable = ('status',)

@admin.register(Consumivel)
class ConsumivelAdmin(admin.ModelAdmin):
    list_display = ('nome', 'categoria', 'quantidade', 'unidade_medida')
    list_filter = ('categoria',)
    search_fields = ('nome',)
    # Permite atualizar a quantidade rapidamente pela lista
    list_editable = ('quantidade',)