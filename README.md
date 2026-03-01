# PDF Extractor API

API REST desenvolvida em **NestJS + TypeScript** para processar faturas de energia elétrica em PDF, extrair dados estruturados e fornecer dashboards de consumo e financeiro.

Em ambiente de desenvolvimento a extração é feita por **regex** sobre o texto do PDF. Em produção os dados são extraídos por um modelo de IA — por padrão o **Gemini** (Google GenAI), com suporte alternativo ao **Claude 3.5 Sonnet** (Anthropic) — com saída validada via schema Zod.

## Tecnologias usadas

| Categoria        | Tecnologia                                      |
| ---------------- | ----------------------------------------------- |
| Framework        | NestJS 11                                       |
| Linguagem        | TypeScript 5.7                                  |
| ORM              | Prisma 7 (PostgreSQL)                           |
| IA (produção)    | Google Gemini (padrão) · Anthropic Claude (alt) |
| Validação de env | Zod                                             |
| Validação de DTO | class-validator + class-transformer             |
| Documentação     | Swagger / OpenAPI (`@nestjs/swagger`)           |
| Logs             | Pino + Pino Pretty                              |
| Rate limiting    | `@nestjs/throttler`                             |
| Upload           | Multer (memoryStorage, interceptor customizado) |
| Linter/Formatter | Biome                                           |
| Testes           | Jest 30 + Supertest                             |

## Arquitetura

O projeto segue **Clean Architecture** com separação explícita entre camadas:

```
src/
├── app.module.ts
├── env.ts                          # Validação de variáveis de ambiente (Zod)
├── main.ts                         # Bootstrap, Swagger, CORS, pipes globais
│
├── application/                    # Regras de negócio (independente de framework)
│   └── invoices/
│       ├── dtos/                   # DTOs com validação (class-validator)
│       ├── entities/               # Entidade de domínio (InvoiceEntity)
│       ├── repositories/           # Contrato abstrato (InvoicesRepository)
│       ├── in-memory/              # Implementação in-memory (usada nos testes)
│       └── use-cases/
│           ├── create-invoice/
│           ├── get-invoices/
│           └── get-overview-invoices/
│
├── common/                         # Utilitários transversais
│   ├── adapters/api-logs/          # Adaptador de logs (Pino)
│   ├── interceptors/               # Interceptores de erro HTTP e upload
│   └── types/                      # Tipos de erro de domínio
│
└── infra/                          # Implementações concretas
    ├── database/
    │   └── prisma/
    │       ├── prisma.service.ts
    │       └── repositories/       # PrismaInvoicesRepository
    ├── http/
    │   ├── controllers/            # InvoicesController, HealthController
    │   └── http.module.ts
    └── providers/
        └── pdf-data-extractor/
            ├── fake-pdf-data-extractor.provider.ts      # Regex (dev)
            ├── gemini-pdf-data-extractor.provider.ts    # Gemini AI (prod, padrão)
            ├── antropic-pdf-data-extractor.provider.ts  # Claude AI (prod, alternativo)
            ├── types/              # Interface PDFDataExtractorProvider
            └── constants/          # Mapeamento NODE_ENV → implementação
```

### Princípios aplicados

- **Inversão de dependência**: use cases dependem da interface abstrata `InvoicesRepository` e `PDFDataExtractorProvider`, nunca de Prisma ou Anthropic diretamente.
- **Strategy Pattern via IoC**: o `ProviderModule` registra o provider de extração de PDF conforme `NODE_ENV` — regex em `development`, Gemini (ou Claude) em `production`.
- **Repository Pattern**: `PrismaInvoicesRepository` implementa o contrato de domínio, isolando o ORM da lógica de negócio.
- **Mixin Interceptor**: `UploadInterceptor` usa `mixin()` do NestJS para criar interceptores de upload tipados e reutilizáveis.

## Banco de Dados (Prisma + PostgreSQL)

### Schema

```prisma
model Invoice {
  id                                   String   @id @default(uuid())
  customer_number                      String
  reference_month                      String
  electrical_energy_quantity           Float
  electrical_energy_value              Float
  sceee_energy_without_icms_quantity   Float
  sceee_energy_without_icms_value      Float
  gdi_compensated_energy_quantity      Float
  gdi_compensated_energy_value         Float
  contrib_municipal_public_light_value Float
  electrical_energy_consumption_value  Float
  total_value_without_gd               Float
  gd_economy                           Float
  created_at                           DateTime @default(now())
  updated_at                           DateTime @updatedAt

  @@unique([customer_number, reference_month])
  @@map("invoices")
}
```

### Destaques

- **Reprocessamento idempotente**: o `create` usa `upsert` na chave composta `(customer_number, reference_month)` — enviar a mesma fatura duas vezes atualiza, não duplica.
- **Cursor pagination**: listagem de faturas com paginação por cursor (scroll infinito), evitando `OFFSET` em tabelas grandes.
- **Aggregation query**: o endpoint de overview usa `prisma.invoice.aggregate` com `_sum` em múltiplas colunas em uma única query.
- **Mapper bidirecional**: `toPrisma()` e `toDomain()` isolam a conversão entre snake_case do banco e camelCase do domínio.

## Endpoints

| Método | Rota                 | Descrição                                 |
| ------ | -------------------- | ----------------------------------------- |
| `GET`  | `/health`            | Healthcheck da API                        |
| `POST` | `/invoices`          | Upload de PDF → extração e persistência   |
| `GET`  | `/invoices`          | Listagem com filtros e cursor pagination  |
| `GET`  | `/invoices/overview` | Dashboard agregado (energia e financeiro) |

### Documentação interativa

Disponível em `https://pdf-extractor-c2io.onrender.com/api-docs` (Swagger UI) com todos os endpoints documentados, schemas de request/response e suporte a `Bearer Auth`.

## Extração de PDF

### Desenvolvimento (`FakePDFDataExtractorProvider`)

Extrai os campos via **expressões regulares** sobre o texto do PDF (pdf-parse v2). Valida se o arquivo é realmente uma fatura de energia verificando keywords obrigatórias (`kWh`, `fatura`, `scee`, `gd i`, etc.).

### Produção — Gemini (`GeminiPDFDataExtractorProvider`) — padrão

Envia o texto extraído do PDF ao **Gemini** via `@google/genai` com um prompt estruturado. A resposta é forçada ao formato JSON pelo `responseSchema` nativo da API, depois revalidada com Zod para garantir tipagem forte. Requer a variável `GEMINI_KEY`.

### Produção — Claude (`AnthropicPDFDataExtractorProvider`) — alternativo

Alternativa ao Gemini usando o **Claude 3.5 Sonnet** (Anthropic). A resposta é validada e parseada com `zodOutputFormat` do SDK Anthropic. Para trocar o provider em produção, basta alterar a entrada `production` em `pdf-data-extractor-use.constant.ts` para `AnthropicPDFDataExtractorProvider`. Requer a variável `ANTHROPIC_KEY`.

> Ambos os providers implementam a mesma interface `PDFDataExtractorProvider`, tornando a troca transparente para o restante da aplicação.

## Configuração de Ambiente

Variáveis validadas no boot com **Zod** — a aplicação encerra com mensagem de erro clara se alguma variável obrigatória estiver ausente.

```bash
cp backend/.env.example backend/.env
```

```env
NODE_ENV="development"          # development | production | test
PORT=5000
WHITELIST_REQUESTS=""           # Obrigatório em production (origens CORS separadas por vírgula)
GEMINI_KEY="your-gemini-key"    # Chave da API Google GenAI (provider padrão em production)
ANTHROPIC_KEY="sk-ant-..."      # Chave da API Anthropic (provider alternativo em production)
DATABASE_URL="postgresql://..."
```

> Em `production`, `WHITELIST_REQUESTS` é obrigatório (validação via `superRefine` no schema Zod). CORS é configurado dinamicamente com allowlist de origens.

## Segurança

- **Rate limiting** global: 100 requisições por minuto por IP (`@nestjs/throttler`).
- **CORS restrito** em produção: apenas origens em `WHITELIST_REQUESTS` são permitidas.
- **ValidationPipe global** com `whitelist: true` e `forbidNonWhitelisted: true` — queries e bodies com campos extras retornam `400`.
- **Upload seguro**: MIME type validado (`application/pdf` apenas), limite de 10 MB, armazenamento em memória (sem disco).
- **Interceptores de erro**: cada tipo de erro de domínio (`BadRequestError`, `NotFoundError`, etc.) é mapeado para o HTTP status correto por um interceptor dedicado.

## Testes

```bash
cd backend
npm test          # Roda todos os testes
npm run test:cov  # Com relatório de cobertura
npm run test:watch
```

### Cobertura

4 suítes de teste cobrindo as camadas de **use case**, **provider** e **controller HTTP**:

| Arquivo                         | O que testa                                          |
| ------------------------------- | ---------------------------------------------------- |
| `create-invoice.spec.ts`        | Use case + FakePDFDataExtractorProvider + PDFs reais |
| `get-invoices.spec.ts`          | Use case de listagem com filtros e in-memory repo    |
| `get-overview-invoices.spec.ts` | Use case de agregação com in-memory repo             |
| `invoices.controller.spec.ts`   | Controller HTTP (supertest, mocks de use cases)      |

### Estratégias de teste

- **In-memory repository**: `InMemoryInvoicesRepository` permite testar use cases sem banco de dados.
- **Mock de `pdf-parse`**: a biblioteca usa `pdfjs-dist` internamente (incompatível com Jest). O mock substitui a classe `PDFParse` por uma implementação que retorna fixtures de texto pré-extraído, distinguindo os PDFs por tamanho e assinatura de byte (`buffer[14638]`).
- **PDFs reais**: os testes de integração com `FakePDFDataExtractorProvider` usam faturas reais de `test/pdf/`, validando extração e cálculo de campos derivados com valores exatos.
- **Testes de contrato HTTP**: `invoices.controller.spec.ts` usa `@nestjs/testing` + `supertest` para testar routing, status codes, validation pipe, interceptores de erro e upload de arquivo.

### Exemplos de cenários testados

- Cálculo correto de `electricalEnergyConsumptionValue`, `totalValueWithoutGD` e `gdEconomy`
- Reprocessamento idempotente (upsert): enviar a mesma fatura atualiza sem duplicar
- Rejeição de arquivo que não é fatura de energia
- Rejeição de arquivo sem buffer
- `400` para cursor inválido (não-UUID), size não-numérico e query params desconhecidos
- `415` para upload de arquivo não-PDF
- Cursor de paginação retornado corretamente

## Como Rodar

### Pré-requisitos

- Node.js 20+
- PostgreSQL (ou Docker)

### Instalação

```bash
cd backend
npm install
```

### Banco de dados

```bash
npm run db:migrate    # Cria/aplica migrations (dev)
npm run db:deploy     # Aplica migrations (produção)
npm run prisma:studio # Abre o Prisma Studio
```

### Desenvolvimento

```bash
npm run dev
```

### Produção

```bash
npm run build
npm run prod
```

## Scripts

| Script                  | Descrição                        |
| ----------------------- | -------------------------------- |
| `npm run dev`           | Servidor com hot reload          |
| `npm run build`         | Compilação TypeScript            |
| `npm run prod`          | Executa build compilado          |
| `npm test`              | Roda os testes                   |
| `npm run test:cov`      | Testes com cobertura             |
| `npm run lint`          | Formata com Biome                |
| `npm run db:migrate`    | Cria migration (dev)             |
| `npm run db:deploy`     | Aplica migrations (prod)         |
| `npm run db:reset`      | Reset do banco (com confirmação) |
| `npm run prisma:studio` | Abre Prisma Studio               |

## Agradecimentos

Agradeço à **Lumi** pela oportunidade de participar deste desafio técnico. Foi uma experiência muito enriquecedora construir este projeto e demonstrar minhas habilidades com desenvolvimento moderno em Node.js.

## Licença

MIT
