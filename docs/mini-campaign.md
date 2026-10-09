# A Última Brasa — mini-campanha de teste

Acesso: menu **Campanha**, ou `/#/campanha`. A duração pretendida é cerca de cinco minutos, variando com a leitura e o deck escolhido.

O Void Sun devora lembranças. Nara pede que o herói recupere a brasa que preserva a memória da vila. Uma única missão passa por caixas bloqueando a trilha, três ecos fracos, a recuperação da brasa, um duelo com o vigia e o reacendimento do farol.

## Controles

- WASD ou setas: caminhar, incluindo diagonais; Shift: correr.
- Clique ou F: golpe na direção do cursor; E: conversar/interagir.
- Botão direito pressionado: defender na direção do cursor.
- Espaço: salto visual, sem atravessar obstáculos nem conceder invulnerabilidade.
- Alternativa: botão “Usar clique para andar”. Clicar em um objeto aproxima o herói e realiza uma interação/golpe. Cada golpe exige nova ação.

## Regras do teste

Exploração: 12 de vida, caixas e ecos com 4 de vida, golpes de 2. Os ecos anunciam o ataque; é possível afastar-se ou defender. Ao cair, o herói retorna ao refúgio conservando passagens abertas e inimigos derrotados.

Duelo: baralho real do herói com as artes atuais, nível 1, jogador começa, vida limitada a 24; vigia com 18 de vida, golpe 3 e defesa zero. O baralho do vigia exclui curas e empurrões, e sua inteligência escolhe entre ações sem movimento, evitando prolongar este encontro curto. Os outros modos e configurações salvas não mudam.

Progresso local em `voidsun.campaign.last-ember.v1`, independente do tutorial. Batalha em andamento é retomada pelo encontro, não pelo turno exato. A missão concluída permanece concluída; “Jogar novamente” reinicia somente esta aventura.

## Visual e movimento

Artes existentes de cenário, heróis e criaturas, com pedestal e caixas desenhados em canvas. Nenhuma imagem nova gerada e nenhuma prévia de corpo/cosmético ativada. Profundidade pelos pés, alvos e objetivos no chão, sombras, efeitos de golpe e iluminação do farol. Qualidade baixa e movimento reduzido respeitados.

Direção acompanha o deslocamento efetivo; velocidade suavizada, diagonais normalizadas, colisão por passos curtos e caminho sem cortar cantos. A fase do andar segue a distância percorrida. A campanha usa explicitamente o compositor de camadas com o ciclo completo LPC (oito quadros de passos, excluindo a pose parada). As poses ilustradas estáticas não são usadas como caminhada. A direção diagonal movimenta o herói normalmente, usando a vista lateral disponível no acervo de quatro vistas. Os golpes respeitam a duração completa de cada animação; os quadros são carregados previamente. Uma arte nova com oito vistas reais e ciclos completos ainda precisa ser produzida e validada antes de substituir esse acervo.

Versão empacotada 3.10.4 inclui a campanha. O atalho do aplicativo escolhe o AppImage mais recente em release; é necessário fechar a versão anterior e abrir pelo mesmo atalho.

## Diálogos e efeitos

Balões pretos com opacidade de 78%, texto branco, acima de quem fala. As respostas ficam dentro do balão; clique ou teclas 1–3 para escolher. Enter/E avança páginas sem confirmar escolhas automaticamente. Ajuda e recusa mantêm a missão disponível. A aura existente dos NPCs é preservada e não é herdada pelo balão. Objetos interativos também recebem destaque apenas na arte. Caixas quebradas produzem lascas que giram, caem, quicam e repousam antes de desaparecer.
