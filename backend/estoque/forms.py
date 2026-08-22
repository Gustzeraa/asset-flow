from django import forms
from .models import Equipamento, Categoria
from django.contrib.auth.models import User
from django.contrib.auth.forms import UserCreationForm

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
        exclude = ['excluido']
        
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
        
class NovoUsuarioForm(UserCreationForm):
    class Meta:
        model = User
        fields = ['username', 'email', 'is_staff', 'is_active']
        labels = {
            'username': 'Nome de Usuário (Login)',
            'is_staff': 'Permissão de Admin (Acesso total e menus ocultos)',
            'is_active': 'Usuário Ativo (Pode fazer login)'
        }

    # Essa mágica aplica as classes do Bootstrap em todos os campos automaticamente!
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field_name, field in self.fields.items():
            if field.widget.__class__.__name__ == 'CheckboxInput':
                field.widget.attrs['class'] = 'form-check-input'
            else:
                field.widget.attrs['class'] = 'form-control border-secondary'

# Formulário para EDITAR um usuário (não mexe na senha)
class EditarUsuarioForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ['username', 'email', 'is_staff', 'is_active']
        labels = {
            'username': 'Nome de Usuário (Login)',
            'is_staff': 'Permissão de Admin (Acesso total e menus ocultos)',
            'is_active': 'Usuário Ativo (Pode fazer login)'
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field_name, field in self.fields.items():
            if field.widget.__class__.__name__ == 'CheckboxInput':
                field.widget.attrs['class'] = 'form-check-input'
            else:
                field.widget.attrs['class'] = 'form-control border-secondary'