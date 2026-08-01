Fontes offline (core do Darkstar Forge)
=======================================

Arquivos .woff2 nesta pasta são empacotados com o app e usados sem internet
via local-fonts.css:

  Comfortaa, Noto Sans, EB Garamond, Source Sans 3, Cormorant Garamond

Os .ttf (se presentes) servem de fallback local e NÃO precisam ir pro git
(estão no .gitignore). O repositório versiona os .woff2.

Fontes extras no editor (Cinzel, Orbitron, etc.) ainda usam Google Fonts
quando houver rede — só as core do UI/cartas são 100% offline.
