# 🍗 FAST CHICKN

> **Seu pedido. Rápido. Fácil. Do seu jeito.**

Plataforma completa de delivery com três aplicações em um só projeto:

| Área | Rota | Quem acessa |
|---|---|---|
| App do cliente | `/` | Qualquer pessoa (pedidos exigem login) |
| Portal do parceiro | `/parceiro` | Contas do tipo `RESTAURANT` |
| Painel administrativo | `/admin` | Contas do tipo `ADMIN` |

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS · Supabase (PostgreSQL, Auth, Storage, Realtime) · Zod · Recharts · PWA.

---

## Sumário

1. [Funcionalidades](#funcionalidades)
2. [Arquitetura e segurança](#arquitetura-e-segurança)
3. [Estrutura de pastas](#estrutura-de-pastas)
4. [Como instalar](#como-instalar)
5. [Como configurar o Supabase](#como-configurar-o-supabase)
6. [Como criar o banco (migrations)](#como-criar-o-banco-migrations)
7. [Variáveis de ambiente](#variáveis-de-ambiente)
8. [Dados de demonstração (seed)](#dados-de-demonstração-seed)
9. [Rodar localmente](#rodar-localmente)
10. [Build](#build)
11. [Publicar na Vercel](#publicar-na-vercel)
12. [Integrações futuras](#integrações-futuras)
13. [Publicar no GitHub](#publicar-no-github)

---

## Funcionalidades

### Cliente
- Cadastro/login (Supabase Auth), perfil, múltiplos endereços (🏠 Casa, 💼 Trabalho, 📍 Outro) com **busca automática de CEP** (ViaCEP), endereço padrão e localização opcional (GPS) para calcular distâncias.
- Home com categorias, **carrossel de banners**, seções *Destaques, Entrega grátis, Promoções, Mais pedidos, Novidades* e lista completa.
- **Busca inteligente** (sem acento e sem diferenciar maiúsculas) em restaurantes **e** produtos + filtros (entrega grátis, promoções, mais bem avaliados, menor tempo, menor taxa, categoria).
- Página do restaurante: banner, logo, avaliação, tempo, distância, taxa, pedido mínimo, horários da semana, favoritar, avaliações recentes, busca no cardápio.
- **Personalização do produto**: tamanho, adicionais, molhos (regras de mínimo/máximo), remover ingredientes, quantidade, observação e preço atualizado em tempo real.
- Carrinho completo (persistido no navegador e sincronizado com a conta — tabelas `carts`/`cart_items`), cupom, pedido mínimo.
- Checkout com endereço, previsão de entrega, resumo, cupom, **PIX, crédito, débito, dinheiro (com troco) e pagamento na entrega**.
- **Acompanhamento em tempo real** (Supabase Realtime) com linha do tempo, previsão “deve chegar entre X e Y”, cancelamento enquanto não confirmado.
- Histórico com **Pedir novamente** e **Avaliar pedido** (nota geral, comida, entrega e comentário).
- Favoritos, cupons disponíveis, forma de pagamento preferida, ajuda (FAQ), configurações de notificação, sino de notificações em tempo real.

### Restaurante parceiro
- Cadastro da loja (fica **Pendente** até aprovação do admin).
- Dashboard: pedidos hoje, vendas hoje, ticket médio, em andamento, concluídos, cancelamentos + gráficos (vendas por dia, pedidos por horário, mais vendidos).
- **Gestão de pedidos em tempo real** com alerta sonoro e destaque “NOVO PEDIDO”: Aceitar / Recusar (com motivo) → Iniciar preparo → Pedido pronto → Saiu para entrega → Finalizar. Cada mudança atualiza o cliente na hora.
- Cardápio: criar/editar/excluir/**duplicar**/ativar-desativar produtos, **upload de fotos** (Supabase Storage), preço e preço promocional, ingredientes removíveis e **grupos de adicionais** (Tamanho, Adicionais, Molhos…).
- Categorias do cardápio, promoções (preço promocional + selo da loja), cupons próprios, financeiro (comissão e repasse estimado), relatórios com exportação CSV, avaliações com resposta, configurações (logo, banner, cor, taxas, tempos, pausar loja) e **horário por dia da semana** (inclui horários que passam da meia-noite).
- Fora do horário: a loja aparece como **Restaurante fechado** — cardápio visível, pedidos bloqueados **no banco**.

### Administrador
- Dashboard: usuários, restaurantes, pedidos, pedidos hoje, vendas, **GMV**, ticket médio, novos cadastros, receita de comissão + gráficos.
- Restaurantes: **aprovar, reprovar, suspender, bloquear, ativar**, destacar na home, editar dados, consultar vendas e pedidos.
- Usuários: bloquear/liberar, alterar papel. Pedidos: listar/filtrar/cancelar.
- Categorias, cupons (com **restaurantes participantes**), banners (com pré-visualização), financeiro (repasses por restaurante + CSV), relatórios e configurações (comissão, suporte, modo demonstração do PIX).

---

## Arquitetura e segurança

```
Navegador ──► Next.js (Server Components + Server Actions + Middleware)
                 │  valida entrada com Zod, usa a sessão do usuário
                 ▼
            Supabase (PostgREST + Auth + Storage + Realtime)
                 │  Row Level Security em TODAS as tabelas
                 ▼
            PostgreSQL — regras de negócio em funções (RPC)
```

- **Autorização nunca depende do frontend.** Três camadas: `middleware.ts` (redireciona), layouts/Server Actions (`requireRole`) e, por fim, **RLS** no PostgreSQL.
- **Preços são recalculados no servidor.** O carrinho envia apenas IDs e quantidades; a função `place_order` busca preços, valida opções (mínimo/máximo, disponibilidade), ingredientes, pedido mínimo, horário de funcionamento, cupom, bloqueio da conta e grava pedido, itens, pagamento e uso do cupom de forma atômica.
- **Transições de status** só pela função `update_order_status` (máquina de estados: o restaurante só avança etapas válidas; o cliente só cancela enquanto pendente). Histórico (`order_status_history`) e notificações são gerados por trigger.
- Um cliente **não** acessa `/admin` nem `/parceiro`; um parceiro **só vê** dados do próprio restaurante (`is_restaurant_member`); o admin vê tudo (`is_admin`).
- O papel `admin` **nunca** pode ser escolhido no cadastro — o trigger `handle_new_user` aceita apenas `client`/`restaurant`, e `protect_profile_columns` impede que um usuário altere o próprio papel ou desbloqueie a conta.
- Parceiros não alteram status, destaque, slug ou métricas do restaurante (`protect_restaurant_columns`).
- Storage: só a equipe do restaurante grava em `images/restaurants/<id>/…`; tipos e tamanho limitados (JPG/PNG/WEBP, 5 MB); as Server Actions só aceitam URLs do próprio bucket.
- Entradas sanitizadas (remoção de `<`/`>` e caracteres de controle), limites de tamanho em Zod **e** em `CHECK constraints`; redirecionamentos só para caminhos internos; CSV protegido contra injeção de fórmulas; cabeçalhos de segurança no `next.config.ts`.
- `SUPABASE_SERVICE_ROLE_KEY` **só** é usada pelo script de seed local. Nada secreto vai para o navegador ou para o repositório.

### Banco de dados

Migrations em [`supabase/migrations`](supabase/migrations):

| Arquivo | Conteúdo |
|---|---|
| `20260101000000_schema.sql` | Tipos, tabelas, PKs, FKs, constraints, índices (inclui índices trigram para busca) |
| `20260101000100_functions.sql` | Triggers, helpers de autorização, `place_order`, `update_order_status`, cupons, horários, PIX demo, avaliações, busca |
| `20260101000200_rls.sql` | Row Level Security, bucket de imagens e Realtime |

Tabelas: `profiles` (dados dos usuários de `auth.users`), `addresses`, `restaurants`, `restaurant_users`, `categories`, `menu_categories`, `products`, `product_options`, `product_option_items`, `favorites`, `carts`, `cart_items`, `orders`, `order_items`, `order_status_history`, `coupons`, `coupon_restaurants`, `coupon_uses`, `payments`, `reviews`, `banners`, `notifications`, `app_settings`.

> A tabela `users` da especificação corresponde a `auth.users`, gerenciada pelo Supabase Auth; os dados de perfil e o papel ficam em `public.profiles` (1:1).

---

## Estrutura de pastas

```
fast-chickn/
├── public/                 # ícones, service worker (sw.js)
├── scripts/seed.ts         # dados de demonstração
├── supabase/
│   ├── config.toml
│   └── migrations/         # SQL completo do banco
└── src/
    ├── app/
    │   ├── (shop)/         # app do cliente (home, busca, restaurante, carrinho, checkout, pedidos, conta…)
    │   ├── (auth)/         # login e cadastro
    │   ├── parceiro/       # portal do restaurante
    │   ├── admin/          # painel administrativo
    │   ├── actions/        # Server Actions (auth, account, orders, partner, admin)
    │   ├── api/            # rotas de API (webhook PIX — integração futura)
    │   └── auth/callback/  # confirmação de e-mail
    ├── components/         # ui, layout, cart, checkout, orders, restaurant, partner, admin, charts, shared
    ├── hooks/              # use-form-action
    ├── lib/                # supabase (client/server/middleware), auth, validation, hours, geo, constants, env
    ├── services/           # catalog, orders, stats, admin, payments (gateway PIX)
    ├── types/              # tipos de domínio
    ├── utils/              # format, sanitize, cn
    └── middleware.ts
```

---

## Como instalar

Pré-requisitos: **Node.js 18.18+** (recomendado 20+), npm e uma conta no [Supabase](https://supabase.com).

```bash
git clone https://github.com/SEU-USUARIO/fast-chickn.git
cd fast-chickn
npm install
cp .env.example .env.local
```

---

## Como configurar o Supabase

1. Crie um projeto em <https://supabase.com/dashboard> (região São Paulo recomendada).
2. Em **Project Settings → API**, copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (**somente** no `.env.local`, usada pelo seed)
3. Em **Authentication → URL Configuration**:
   - *Site URL*: `http://localhost:3000` (e depois a URL da Vercel)
   - *Redirect URLs*: `http://localhost:3000/auth/callback` e `https://SEU-DOMINIO/auth/callback`
4. (Opcional) Em **Authentication → Providers → Email**, desative “Confirm email” para testar mais rápido em desenvolvimento.

---

## Como criar o banco (migrations)

### Opção A — Supabase CLI (recomendado)

```bash
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase db push
```

### Opção B — SQL Editor

No painel do Supabase, abra **SQL Editor** e execute, **nesta ordem**, o conteúdo de:

1. `supabase/migrations/20260101000000_schema.sql`
2. `supabase/migrations/20260101000100_functions.sql`
3. `supabase/migrations/20260101000200_rls.sql`

### Opção C — Supabase local (Docker)

```bash
npx supabase start      # sobe Postgres, Auth, Storage e Studio locais
npx supabase db reset   # aplica todas as migrations do zero
```

Use as chaves exibidas por `supabase start` no `.env.local`.

O banco pode ser reconstruído do zero a qualquer momento só com essas migrations.

---

## Variáveis de ambiente

Veja [`.env.example`](.env.example).

| Variável | Onde é usada | Secreta? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | App | Não |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | App (protegida por RLS) | Não |
| `NEXT_PUBLIC_SITE_URL` | Links de confirmação de e-mail | Não |
| `NEXT_PUBLIC_DEFAULT_LAT` / `_LNG` | Ponto padrão para estimar distância | Não |
| `NEXT_PUBLIC_BRAND_LOGO_URL` | (Opcional) troca a logo textual por uma imagem | Não |
| `SUPABASE_SERVICE_ROLE_KEY` | **Apenas** `npm run db:seed` | **Sim** |
| `SEED_DEMO_PASSWORD` | Senha das contas de demonstração | **Sim** |
| `PAYMENT_PROVIDER`, `PAYMENT_GATEWAY_API_KEY`, `PAYMENT_WEBHOOK_SECRET` | Gateway PIX (futuro) | **Sim** |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Web Push (futuro) | Privada: **Sim** |

> Nunca crie variáveis secretas com prefixo `NEXT_PUBLIC_` — elas são enviadas ao navegador.

---

## Dados de demonstração (seed)

Com as migrations aplicadas e o `.env.local` preenchido (incluindo `SUPABASE_SERVICE_ROLE_KEY` e `SEED_DEMO_PASSWORD`):

```bash
npm run db:seed
```

Cria **10 categorias, 8 restaurantes fictícios, 50 produtos** com adicionais, **5 clientes** com endereço, **49 pedidos** (entregues nos últimos 14 dias + um em cada status atual + cancelado/recusado), avaliações, **5 cupons** (`FAST10`, `BEMVINDO`, `PIZZA20`, `CHICKEN5` e um expirado) e 3 banners.

Contas (senha = valor de `SEED_DEMO_PASSWORD`):

| Papel | E-mail |
|---|---|
| Admin | `admin@fastchickn.dev` |
| Parceiro (Chicken House) | `parceiro1@fastchickn.dev` (… até `parceiro8@`) |
| Clientes | `ana@`, `joao@`, `marina@`, `carlos@`, `beatriz@fastchickn.dev` |

Todas as marcas são fictícias. Não são usadas imagens de terceiros: sem foto, o app mostra ilustrações geradas (gradiente + emoji). Fotos reais podem ser enviadas pelo portal do parceiro.

**Para promover outro usuário a admin** (SQL Editor):

```sql
update public.profiles set role = 'admin' where email = 'voce@exemplo.com';
```

---

## Rodar localmente

```bash
npm run dev
```

Acesse <http://localhost:3000>.

Fluxo completo para testar: entre como `ana@…` → escolha um restaurante → personalize um produto → carrinho (cupom `FAST10`) → checkout → **Fazer pedido**. Em outra janela anônima, entre como `parceiro1@…` → **Pedidos** → *Aceitar* → *Iniciar preparo* → … → *Finalizar*. A tela da Ana atualiza sozinha; ao final, avalie o pedido.

---

## Build

```bash
npm run typecheck   # verificação de tipos
npm run lint
npm run build
npm start
```

---

## Publicar na Vercel

1. Envie o projeto para o GitHub (veja abaixo).
2. Em <https://vercel.com/new>, importe o repositório (framework detectado: Next.js).
3. Em **Environment Variables**, adicione `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `NEXT_PUBLIC_SITE_URL` (URL final, ex.: `https://fast-chickn.vercel.app`).
   **Não** adicione `SUPABASE_SERVICE_ROLE_KEY` — o app não precisa dela.
4. Deploy.
5. No Supabase, adicione a URL da Vercel em *Site URL* e `https://SEU-DOMINIO/auth/callback` em *Redirect URLs*.

---

## Publicar no Render

O repositório inclui um [`render.yaml`](render.yaml) (Blueprint).

1. Em <https://dashboard.render.com>, entre com o GitHub e clique em **New → Blueprint**.
2. Selecione o repositório `fast-chickn` e confirme.
3. Preencha as variáveis pedidas:
   - `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase → Project Settings → API)
   - `NEXT_PUBLIC_SITE_URL` = a URL do serviço (ex.: `https://fast-chickn.onrender.com`)
4. Clique em **Apply** e aguarde o build (alguns minutos).
5. No Supabase (**Authentication → URL Configuration**), adicione a URL do Render em *Site URL* e `https://fast-chickn.onrender.com/auth/callback` em *Redirect URLs*.

> **Não** cadastre `SUPABASE_SERVICE_ROLE_KEY` no Render — o site não usa essa chave.
> No plano gratuito, o serviço “dorme” após 15 minutos sem acesso; a primeira visita seguinte leva cerca de 50 segundos.

> As variáveis `NEXT_PUBLIC_*` entram no build. Se alterá-las depois, faça **Manual Deploy → Clear build cache & deploy**.

---

## Integrações futuras

Tudo abaixo já tem a arquitetura pronta e está claramente identificado no código:

| Recurso | Estado atual | Onde integrar |
|---|---|---|
| **PIX real** (QR Code, copia e cola, confirmação automática) | Ambiente de demonstração: QR Code fictício + botão “Simular pagamento aprovado”, controlado por `app_settings.demo_payments` | Implementar `PixGateway` em `src/services/payments/`, registrar em `index.ts`, configurar `PAYMENT_PROVIDER` e completar `src/app/api/payments/pix/webhook/route.ts` |
| **Cartão online / cartões salvos** | Crédito e débito são pagos na maquininha, na entrega | Gateway com tokenização (PCI) |
| **Web Push** (app fechado) | Notificações em tempo real no app + notificação do navegador com a aba aberta; `sw.js` já trata `push` e `notificationclick` | Gerar chaves VAPID, salvar inscrições e disparar a partir de um trigger/Edge Function em `notifications` |
| **Geocodificação de endereços** | Distância por GPS do cliente (opcional) ou ponto padrão da cidade | Serviço de geocoding no salvamento do endereço |
| **Repasse automático** | Repasse estimado nos painéis financeiros | Split de pagamento do gateway |

---

## Publicar no GitHub

```bash
git init
git add .
git commit -m "FAST CHICKN: plataforma de delivery"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/fast-chickn.git
git push -u origin main
```

O `.gitignore` já exclui `node_modules`, `.next` e todos os arquivos `.env*` (exceto `.env.example`).

---

## Identidade visual

- **Cores:** laranja “brasa” `#FF5A1F` (principal), amarelo “mostarda” `#FFC529` (destaques), grafite `#17130F` (texto/painéis).
- **Tipografia:** Plus Jakarta Sans, com a marca em itálico extra-negrito transmitindo velocidade.
- **Logo temporária:** `src/components/brand/logo.tsx` (marca em SVG + texto). Para usar a logo oficial, coloque o arquivo em `public/brand/` e defina `NEXT_PUBLIC_BRAND_LOGO_URL=/brand/logo.svg`.
