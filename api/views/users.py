import json
from django.http import JsonResponse
from django.contrib.auth.models import User
from django.views.decorators.http import require_http_methods

# ---------------------------------------------------------
# Rota Principal: /api/users/ (Lista todos ou Cria um novo)
# ---------------------------------------------------------
@require_http_methods(["GET", "POST"])
def users_collection(request):
    # Trava de segurança: só superuser entra
    if not request.user.is_superuser:
        return JsonResponse({"error": "Acesso negado"}, status=403)

    if request.method == "GET":
        users = User.objects.all().order_by('-id')
        data = []
        for u in users:
            data.append({
                "id": u.id,
                "name": u.get_full_name() or u.username,
                "email": u.email,
                "role": "admin" if u.is_superuser else "operador",
                "status": "ativo" if u.is_active else "inativo"
            })
        return JsonResponse(data, safe=False)

    elif request.method == "POST":
        try:
            body = json.loads(request.body)
            email = body.get("email")
            name = body.get("name", "")
            password = body.get("password")
            role = body.get("role", "operador")
            status = body.get("status", "ativo")

            if not email or not password:
                return JsonResponse({"error": "E-mail e senha são obrigatórios."}, status=400)
            
            # Evita criar duplicados
            if User.objects.filter(username=email).exists():
                return JsonResponse({"error": "Este e-mail já está em uso."}, status=400)

            # Usamos o email como username (padrão em sistemas modernos)
            user = User.objects.create_user(username=email, email=email, password=password)
            
            # O Django separa nome e sobrenome, então vamos dividir a string
            name_parts = name.split(" ", 1)
            user.first_name = name_parts[0]
            if len(name_parts) > 1:
                user.last_name = name_parts[1]
                
            user.is_superuser = (role == 'admin')
            user.is_staff = (role == 'admin') # Permite acessar o painel /admin do Django
            user.is_active = (status == 'ativo')
            user.save()

            return JsonResponse({"message": "Usuário criado com sucesso", "id": user.id}, status=201)
            
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)


# ---------------------------------------------------------
# Rota Específica: /api/users/<id>/ (Atualiza ou Deleta)
# ---------------------------------------------------------
@require_http_methods(["PUT", "DELETE"])
def user_detail(request, user_id):
    if not request.user.is_superuser:
        return JsonResponse({"error": "Acesso negado"}, status=403)

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return JsonResponse({"error": "Usuário não encontrado."}, status=404)

    if request.method == "PUT":
        try:
            body = json.loads(request.body)
            
            # Atualiza o Nome
            name = body.get("name", user.get_full_name())
            name_parts = name.split(" ", 1)
            user.first_name = name_parts[0]
            if len(name_parts) > 1:
                user.last_name = name_parts[1]
            else:
                user.last_name = ""

            # Atualiza Email/Username
            new_email = body.get("email")
            if new_email:
                user.email = new_email
                user.username = new_email
                
            # Atualiza Permissões
            role = body.get("role")
            if role:
                user.is_superuser = (role == 'admin')
                user.is_staff = (role == 'admin')
                
            # Atualiza Status
            status = body.get("status")
            if status:
                user.is_active = (status == 'ativo')
                
            # 🚀 Só atualiza a senha se a pessoa tiver digitado algo no React
            password = body.get("password")
            if password:
                user.set_password(password) # set_password garante a criptografia
                
            user.save()
            return JsonResponse({"message": "Usuário atualizado com sucesso."})
            
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    elif request.method == "DELETE":
        # 🚀 Trava extra: Impede o administrador de excluir a própria conta sem querer!
        if user.id == request.user.id:
            return JsonResponse({"error": "Você não pode excluir sua própria conta!"}, status=400)
            
        user.delete()
        return JsonResponse({"message": "Usuário excluído com sucesso."})