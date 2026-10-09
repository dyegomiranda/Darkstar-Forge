# Campo clássico e amostra isométrica

Solo → seleção de personagens → Visão do campo → Isométrica (teste). Clássica é o padrão para novas preferências e para encontros da campanha. A preferência do solo é persistida separadamente das regras de batalha.

Clássica restaura slots arredondados, personagens olhando norte/sul um para o outro e cenário completo sem a ampliação de 155%.

A amostra usa terreno desenhado em camadas com projeção ortográfica, piso contínuo, ruínas baixas, pilares e vegetação reaproveitada do atlas existente. Slots são marcas no chão; seus hitboxes acompanham os polígonos projetados. Sprites, informações e cartas permanecem em pé. Não é uma câmera 3D rotacionável nem a arte final aprovada. As demais opções de mapa alteram a paleta, mas ainda não têm cenários isométricos exclusivos.

Água em shader WebGL com correntes cruzadas, ondulações, reflexos estilizados e espuma calculada na borda do terreno; fallback estático se WebGL indisponível. Folhagem com vento e raiz ancorada. Renderização ambiental limitada a 30 Hz (15 Hz na qualidade baixa), pausada com a página oculta e respeitando movimento reduzido.

Efeitos de habilidades separam fogo, gelo, luz, sombra, natureza, arcano, aço e projéteis. Perfil determinado pelo nome/identificador da carta, com variação estável; cura tem perfil de luz. São famílias iniciais de efeitos, não animações individuais já desenhadas para todas as cartas. O registro permite perfis autorais por habilidade na próxima etapa. Não apresentar esse acervo como acabamento equivalente a Sword of Convallaria.
