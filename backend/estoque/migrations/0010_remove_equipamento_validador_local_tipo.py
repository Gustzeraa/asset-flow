from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('estoque', '0009_equipamento_centro_de_custo_equipamento_data_compra_and_more'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='equipamento',
            name='validador',
        ),
        migrations.RemoveField(
            model_name='equipamento',
            name='local',
        ),
        migrations.RemoveField(
            model_name='equipamento',
            name='tipo',
        ),
    ]