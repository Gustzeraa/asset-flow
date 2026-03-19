from django.db import models

# Create your models here.
class Colaborador(models.Model):
    nome = models.CharField(max_length=150)
    cpf = models.CharField(max_length=14, unique=True, null=True, blank=True, verbose_name="CPF")
    cargo = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    departamento = models.CharField(max_length=100)
    ativo = models.BooleanField(default=True, verbose_name="Colaborador Ativo?")

    def __str__(self):
        return f"{self.nome} - {self.cargo} ({self.departamento})"
    

