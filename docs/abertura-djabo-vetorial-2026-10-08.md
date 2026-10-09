# Identidade Djabo — abertura vetorial, 08/10/2026

Direção vigente: preto e branco, letras próprias em “Djabo”, com minúsculas. O usuário aprovou o D cortado; rejeitou o primeiro rosto de diabo e o corte aplicado nele. A nova face angular é uma proposta ainda sem aprovação artística.

Sequência de 6,1 segundos: o D aparece sozinho; um corte diagonal atravessa APENAS essa letra; o D recua suavemente para a posição da assinatura e “jabo” desliza e se revela à direita; depois o rosto de diabo aparece inteiro à esquerda. “Developed by” fica acima do nome. Pausa de leitura e saída para o menu. A face não recebe corte ou divisão. Pode pular com toque/clique ou tecla e respeita movimento reduzido.

Fontes editáveis: `wordmark.svg`, `devil.svg`, versões `-black.svg` para fundo claro e composição `lockup.svg`. Fundo transparente. O nome é desenhado em curvas, sem dependência de fonte instalada; a assinatura secundária usa Inter incluída no jogo. Os arquivos `monogram.svg` são a proposta anterior do D isolado, preservada como histórico.

Implementação: `src/ui/intro/BrandIntro.svelte`, `brand.ts`. A abertura automática usa o mesmo componente que o replay “Abertura Djabo” no menu, rota `#/abertura`. A antiga `#/abertura-3d` abre esta versão vetorial. O mascote 3D rejeitado está somente arquivado, sem uso nesta abertura.

Versão: 3.12.5. QA pelo Electron e pelo lançador real, em perfil isolado: abertura automática, sequência D/nome/face, repetição, pausa, navegação temporal, modo sem controles, janela de 430 px, movimento reduzido, tecla para pular e ausência de erros. Compilação e tipagem passaram. O pacote 3.12.5 foi executado pelo lançador real e todos os testes passaram, sem erros. Capturas do aplicativo e prévia `abertura.mp4` guardadas nesta pasta; janela de 430 px conferida visualmente. Passar nas verificações técnicas não representa aprovação artística.
