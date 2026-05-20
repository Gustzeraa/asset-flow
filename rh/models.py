from django.db import models

# Create your models here.
class Colaborador(models.Model):
    nome = models.CharField(max_length=150)
    cpf = models.CharField(max_length=14, unique=True, null=True, blank=True, verbose_name="CPF")
    cargo = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    departamento = models.CharField(max_length=100)
    ativo = models.BooleanField(default=True, verbose_name="Colaborador Ativo?")
    excluido = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.nome} - {self.cargo} ({self.departamento})"
    
class TermoResponsabilidade(models.Model):
    # Como o Colaborador está neste mesmo arquivo, usamos o nome direto
    colaborador = models.ForeignKey(
        Colaborador, 
        on_delete=models.CASCADE, 
        related_name='termos_assinados'
    )
    
    equipamentos = models.ManyToManyField(
        'estoque.Equipamento', 
        related_name='termos'
    )
    
    data_emissao = models.DateTimeField(auto_now_add=True)
    
    arquivo_assinado = models.FileField(
        upload_to='termos_assinados/', 
        null=True, 
        blank=True,
        verbose_name="Termo Assinado (PDF)"
    )

    def __str__(self):
        return f"Termo {self.id} - {self.colaborador.nome} ({self.data_emissao.strftime('%d/%m/%Y')})"