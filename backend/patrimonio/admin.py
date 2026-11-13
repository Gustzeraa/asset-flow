from django.contrib import admin
from .models import Categoria, Equipamento

# A Categoria pode continuar simples, pois tem poucos campos
admin.site.register(Categoria)

@admin.register(Equipamento)
class EquipamentoAdmin(admin.ModelAdmin):
    # Colunas na tabela (fica muito mais fácil bater o olho e achar o que precisa)
    list_display = ('nome', 'num_patrimonio', 'status', 'responsavel', 'centro_de_custo', 'valor_atual_contabil')
    
    # Como o valor contábil é calculado, ele precisa ser "somente leitura" no formulário
    readonly_fields = ('valor_atual_contabil',)
        
    # Filtros laterais (O coração do sistema! Filtra por quebrado, em uso, categoria...)
    list_filter = ('status', 'categoria')
    
    # Barra de pesquisa (Digitar a tag do equipamento e achar na hora)
    search_fields = ('nome', 'num_patrimonio')
    
    # Dica extra: Permite editar o status direto na tela de lista, sem precisar abrir o item
    list_editable = ('status',)
