# Clube da Chave

Sistema frontend-first para organização de campeonatos de sinuca. Todos os
dados operacionais ficam no navegador e podem ser importados ou exportados em
JSON.

## Recursos disponíveis

- cadastro de jogadores, campeonatos e inscrições;
- seeding manual, chaveamento e avanço até o campeão;
- regras por campeonato e placar completo por partida;
- estados de partida, chamada, pausa, conclusão, cancelamento e W.O.;
- agenda com mesas e detecção de conflitos;
- check-in, histórico local de ações e observações;
- ranking calculado, modo público local e layouts de impressão;
- importação, exportação e exclusão individual por domínio;
- migração automática dos dados antigos do `localStorage`.

## Execução local

```bash
npm install
npm run dev
```

Para validar a versão de produção:

```bash
npm run build
npm run preview
```
