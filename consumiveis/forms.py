from django import forms
from .models import Consumivel, MovimentacaoConsumivel

class ConsumivelForm(forms.ModelForm):
    class Meta:
        model = Consumivel
        # Aqui colocamos exatamente os campos que existem no novo models.py
        fields = ['nome', 'unidade_medida', 'quantidade_atual', 'estoque_minimo', 'descricao']
        
        widgets = {
            'nome': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Ex: Copo Descartável 200ml'}),
            'unidade_medida': forms.Select(attrs={'class': 'form-select'}),
            'quantidade_atual': forms.NumberInput(attrs={'class': 'form-control'}),
            'estoque_minimo': forms.NumberInput(attrs={'class': 'form-control'}),
            'descricao': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
        }

# Já vou deixar de brinde o formulário de Entrada/Saída que vamos usar no Modal depois!
class MovimentacaoForm(forms.ModelForm):
    class Meta:
        model = MovimentacaoConsumivel
        fields = ['tipo', 'quantidade', 'responsavel', 'observacao']
        
        widgets = {
            'tipo': forms.Select(attrs={'class': 'form-select'}),
            'quantidade': forms.NumberInput(attrs={'class': 'form-control'}),
            'responsavel': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Ex: Copa 2º Andar'}),
            'observacao': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Opcional'}),
        }