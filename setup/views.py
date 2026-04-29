from pathlib import Path

from django.conf import settings
from django.http import Http404
from django.shortcuts import render


def frontend_app(request, *_args, **_kwargs):
    index_path = Path(settings.FRONTEND_DIST_DIR) / 'index.html'
    if not index_path.exists():
        raise Http404('Frontend build nao encontrado. Execute npm run build em frontend/.')

    return render(request, 'index.html')
