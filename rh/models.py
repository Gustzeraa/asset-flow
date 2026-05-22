from django.db import models

class Departamento(models.Model):
    nome = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.nome

class Colaborador(models.Model):
    nome = models.CharField(max_length=150)
    cpf = models.CharField(max_length=14, unique=True, null=True, blank=True, verbose_name="CPF")
    cargo = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    
    # MODIFICADO: Agora é uma ForeignKey apontando para a nova tabela
    departamento = models.ForeignKey(
        Departamento, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='colaboradores'
    )
    
    ativo = models.BooleanField(default=True, verbose_name="Colaborador Ativo?")
    excluido = models.BooleanField(default=False)

    def __str__(self):
        dep_nome = self.departamento.nome if self.departamento else "Sem Departamento"
        return f"{self.nome} - {self.cargo} ({dep_nome})"
    
class TermoResponsabilidade(models.Model):
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