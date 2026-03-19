from django import forms
from .models import Equipamento, Consumivel, Categoria

class EquipamentoForm(forms.ModelForm):
    data = forms.DateField(
        label='Data de Registro',
        required=False,
        widget=forms.DateInput(
            format='%Y-%m-%d',
            attrs={'type': 'date', 'class': 'form-control'}
        )
    )

    class Meta:
        model = Equipamento
        # 1. Adicione os novos campos na lista (escolha a ordem que eles vão aparecer na tela)
        fields = [
            'data', 'validador', 'nome', 'num_patrimonio', 'categoria', 'tipo', 'local', 'responsavel', 
            'status', 'departamento', 'descricao', 'observacao', 'foto'
        ]
        
        # 2. Adicione os widgets para os novos campos
        widgets = {
            'validador': forms.Select(attrs={'class': 'form-select'}),
            'nome': forms.TextInput(attrs={'class': 'form-control'}),
            'num_patrimonio': forms.TextInput(attrs={'class': 'form-control'}),
            'categoria': forms.Select(attrs={'class': 'form-select'}),
            'local': forms.TextInput(attrs={'class': 'form-control'}),
            'status': forms.Select(attrs={'class': 'form-select'}),
            'tipo': forms.TextInput(attrs={'class': 'form-control'}),
            'responsavel': forms.Select(attrs={'class': 'form-select'}),
            'departamento': forms.TextInput(attrs={'class': 'form-control'}),
            'descricao': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}), # Textarea para textos longos
            'observacao': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
            'foto': forms.FileInput(attrs={'class': 'form-control'}),
        }


class ConsumivelForm(forms.ModelForm):
    class Meta:
        model = Consumivel
        fields = ['nome', 'categoria', 'quantidade', 'unidade_medida', 'estoque_minimo']
        
        # Injetando as classes do Bootstrap para manter o aspeto profissional
        widgets = {
            'nome': forms.TextInput(attrs={'class': 'form-control'}),
            'categoria': forms.Select(attrs={'class': 'form-select'}),
            'quantidade': forms.NumberInput(attrs={'class': 'form-control'}),
            'unidade_medida': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Ex: Pacote, Caixa, Litro'}),
            'estoque_minimo': forms.NumberInput(attrs={'class': 'form-control'}),
        }

    
class CategoriaForm(forms.ModelForm):
    class Meta:
        model = Categoria
        fields = ['nome']
        widgets = {
            'nome': forms.TextInput(attrs={'class': 'form-control'}),
        }