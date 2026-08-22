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
                # Devolve o username exato que a pessoa usa para logar
                "name": u.username, 
                "email": u.email,
                "role": "admin" if u.is_superuser else "operador",
                "status": "ativo" if u.is_active else "inativo"
            })
        return JsonResponse(data, safe=False)

    elif request.method == "POST":
        try:
            body = json.loads(request.body)
            
            # Pega o 'username' ou o 'name' que vier do React
            username = body.get("username") or body.get("name")
            email = body.get("email", "")
            password = body.get("password")
            
            role = str(body.get("role", "operador")).lower().strip()
            status = str(body.get("status", "ativo")).lower().strip()

            if not username or not password:
                return JsonResponse({"error": "Usuário e senha são obrigatórios."}, status=400)
            
            # Verifica duplicidade pelo username agora (e não mais pelo e-mail)
            if User.objects.filter(username=username).exists():
                return JsonResponse({"error": "Este nome de usuário já está em uso."}, status=400)

            # Cria o usuário com o username real que a pessoa digitou
            user = User.objects.create_user(username=username, email=email, password=password)
                
            user.is_superuser = (role == 'admin')
            user.is_staff = (role == 'admin') 
            user.is_active = (status in ['ativo', 'true', '1']) 
            user.save()

            return JsonResponse({"message": "Usuário criado com sucesso", "id": user.id}, status=201)
            
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)


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
            
            # Atualiza o Username (se vier 'username' ou 'name')
            new_username = body.get("username") or body.get("name")
            if new_username:
                # Confirma se o novo username não bate com o de outro cara já cadastrado
                if User.objects.filter(username=new_username).exclude(id=user.id).exists():
                    return JsonResponse({"error": "Este nome de usuário já existe no sistema."}, status=400)
                user.username = new_username

            # Atualiza Email
            new_email = body.get("email")
            if new_email:
                user.email = new_email
                
            # Atualiza Permissões
            role = body.get("role")
            if role:
                role_clean = str(role).lower().strip()
                user.is_superuser = (role_clean == 'admin')
                user.is_staff = (role_clean == 'admin')
                
            # Atualiza Status
            status = body.get("status")
            if status:
                status_clean = str(status).lower().strip()
                user.is_active = (status_clean in ['ativo', 'true', '1'])
                
            # Atualiza Senha (apenas se digitou algo)
            password = body.get("password")
            if password:
                user.set_password(password)
                
            user.save()
            return JsonResponse({"message": "Usuário atualizado com sucesso."})
            
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    elif request.method == "DELETE":
        if user.id == request.user.id:
            return JsonResponse({"error": "Você não pode excluir sua própria conta!"}, status=400)
            
        user.delete()
        return JsonResponse({"message": "Usuário excluído com sucesso."})