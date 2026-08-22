from django.db import models
from rh.models import Colaborador

class Contracheque(models.Model):
    STATUS_CHOICES = (
        ('pendente', 'Pendente de Assinatura'),
        ('assinado', 'Assinado Digitalmente'),
    )

    colaborador = models.ForeignKey(
        Colaborador,
        on_delete=models.CASCADE,
        related_name='contracheques',
        verbose_name='Colaborador'
    )
    mes_referencia = models.DateField(
        verbose_name='Mês de Referência',
        help_text='Use sempre o dia 01 do mês para padronizar. Ex: 2026-06-01'
    )
    arquivo_pdf = models.FileField(
        upload_to='contracheques/%Y/%m/', 
        verbose_name='Arquivo PDF'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pendente',
        verbose_name='Status'
    )
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Contracheque'
        verbose_name_plural = 'Contracheques'
        ordering = ['-mes_referencia']
        unique_together = ['colaborador', 'mes_referencia'] 

    def __str__(self):
        return f"{self.colaborador.nome} - {self.mes_referencia.strftime('%m/%Y')}"


class AceiteDigital(models.Model):
    contracheque = models.OneToOneField(
        Contracheque,
        on_delete=models.CASCADE,
        related_name='aceite_digital',
        verbose_name='Contracheque'
    )
    data_hora_aceite = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Data e Hora Exata do Aceite'
    )
    ip_origem = models.GenericIPAddressField(verbose_name='Endereço IP')
    user_agent = models.TextField(verbose_name='Navegador e OS (User Agent)')

    class Meta:
        verbose_name = 'Aceite Digital'
        verbose_name_plural = 'Aceites Digitais'

    def __str__(self):
        return f"Aceite de {self.contracheque.colaborador.nome} em {self.data_hora_aceite.strftime('%d/%m/%Y %H:%M')}"