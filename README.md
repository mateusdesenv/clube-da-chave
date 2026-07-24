# Clube da Chave

Sistema full stack para organização de campeonatos de sinuca. O projeto é um
monorepo com frontend React/Vite, backend Node.js/TypeScript e persistência no
MongoDB. O `localStorage` continua sendo usado como cache de contingência.

## Estrutura

- `apps/web`: interface React, autenticação Google com Firebase e cache local;
- `apps/api`: regras de persistência, validação do token Firebase, servidor
  local e integração MongoDB;
- `api`: funções Node.js/TypeScript publicadas pela Vercel;
- banco `clube_da_chave`, com uma coleção por domínio do sistema.

## Recursos disponíveis

- cadastro de jogadores, campeonatos e inscrições;
- seeding manual, chaveamento e avanço até o campeão;
- regras por campeonato e placar completo por partida;
- estados de partida, chamada, pausa, conclusão, cancelamento e W.O.;
- agenda com mesas e detecção de conflitos;
- check-in, histórico de ações e observações;
- ranking calculado, modo público local e layouts de impressão;
- importação, exportação e exclusão individual por domínio;
- migração automática dos dados antigos do `localStorage`;
- sincronização do estado compartilhado com o backend.

## Execução local

Copie `.env.example` para `.env.local`, preencha as credenciais do Firebase e
defina `MONGODB_URI`. Também é possível apontar
`MONGODB_CREDENTIALS_FILE` para um arquivo seguro que já contenha essa URI.

```bash
npm install
npm run dev
```

O frontend fica em `http://127.0.0.1:5173` e a API em
`http://127.0.0.1:3001`.

Para validar a versão de produção:

```bash
npm run build
npm run preview
```

## Variáveis da Vercel

- `MONGODB_URI`
- `MONGODB_DATABASE=clube_da_chave`
- `FIREBASE_PROJECT_ID=clube-da-chave`
- todas as variáveis `VITE_FIREBASE_*` descritas em `.env.example`
