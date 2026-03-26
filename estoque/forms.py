from django import forms
from .models import Equipamento, Categoria

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
        fields = '__all__'  
        
        # 2. Adicione os widgets para os novos campos
        widgets = {
            'data': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
            'nome': forms.TextInput(attrs={'class': 'form-control'}),
            'num_patrimonio': forms.TextInput(attrs={'class': 'form-control'}),
            'categoria': forms.Select(attrs={'class': 'form-select'}),
            'status': forms.Select(attrs={'class': 'form-select'}),
            'local': forms.TextInput(attrs={'class': 'form-control'}),
            'tipo': forms.TextInput(attrs={'class': 'form-control'}),
            'departamento': forms.TextInput(attrs={'class': 'form-control'}),
            'descricao': forms.Textarea(attrs={'class': 'form-control', 'rows': 2}),
            'observacao': forms.Textarea(attrs={'class': 'form-control', 'rows': 2}),
            'responsavel': forms.Select(attrs={'class': 'form-select'}),
            'validador': forms.Select(attrs={'class': 'form-select'}),
            'foto': forms.FileInput(attrs={'class': 'form-control'}),
        }

    
class CategoriaForm(forms.ModelForm):
    class Meta:
        model = Categoria
        fields = ['nome']
        widgets = {
            'nome': forms.TextInput(attrs={'class': 'form-control'}),
        }