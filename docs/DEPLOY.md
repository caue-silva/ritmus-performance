# Publicação (Supabase + Vercel)

Passo a passo para colocar o Ritmus no ar. Faça na ordem. Nenhuma chave secreta vai para o repositório (ele é público).

## 1. Supabase (banco, login e fotos)

1. Em https://supabase.com/dashboard crie um projeto:
   - **Nome:** ritmus-performance
   - **Região:** South America (São Paulo)
   - Guarde a senha do banco num gerenciador de senhas.
2. Aplique o banco (migrations). **Rode dentro da pasta do projeto** (`cd ~/Desktop/Ritmus`): fora dela o `db push` não encontra as migrations e não envia nada.
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref-do-projeto>
   npx supabase db push
   ```
   O `<ref-do-projeto>` está na URL do painel: `supabase.com/dashboard/project/<ref>`.
   Isso cria tabelas, regras de acesso (RLS), funções, o espaço das fotos e os dados iniciais (textos, mensagens, funcionamento). **Não** rode o seed: ele é só para testes.
3. **Authentication → Sign In / Providers → Email:**
   - desligue **Confirm email** (o sistema não envia e-mails);
   - desligue **Allow new users to sign up** (contas só pelo Gabriel, na tela Equipe).
4. **Authentication → URL Configuration:** em **Site URL**, coloque o endereço do app na Vercel (passo 2), por exemplo `https://ritmus-performance-navy.vercel.app`.
5. **Project Settings → API Keys:** você vai precisar da **URL do projeto**, da **publishable key** e da **secret key**.

## 2. Vercel (o app)

1. O projeto **ritmus-performance** já existe na Vercel e está ligado ao repositório: cada `git push` na `main` publica sozinho. (Framework: Next.js. Proteção por login da Vercel só nos deploys de teste, para o endereço principal ficar aberto a personais e alunos.)
2. Em **Settings → Environment Variables**, cadastre para *Production* (e *Preview*, se quiser testar pull requests):

   | Variável | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | publishable key |
   | `SUPABASE_SECRET_KEY` | secret key (**nunca** com `NEXT_PUBLIC_`) |
   | `NEXT_PUBLIC_SITE_URL` | endereço final do app (ex.: `https://ritmus-performance-navy.vercel.app`) |

3. Depois de cadastrar as variáveis, publique de novo (**Deployments → ⋯ → Redeploy** no último deploy). Endereço atual: `https://ritmus-performance-navy.vercel.app`. Se mudar o domínio depois, atualize `NEXT_PUBLIC_SITE_URL` e a **Site URL** do Supabase: ela é usada nos links de cadastro enviados pelo WhatsApp.

## 3. Primeira conta (Gabriel)

Crie um arquivo **local** `.env.production.local` (ignorado pelo git) com as mesmas variáveis do passo 2 e rode:

```bash
npx tsx scripts/create-admin.ts --env .env.production.local --email <email-do-gabriel> --nome "Gabriel Paiva" --whatsapp <ddd+numero>
```

O script mostra uma senha temporária **uma única vez**. O Gabriel entra com ela e cria a própria senha. Depois, apague o `.env.production.local` se não for mais usar.

## 4. Primeiros ajustes no app (Gabriel)

1. **Ajustes → Pix:** tipo da chave, chave, nome do recebedor e cidade.
2. **Ajustes → Horários e feriados:** funcionamento, quem dá aula em cada horário e feriados.
3. **Equipe → Novo personal:** contas dos personais (senha temporária enviada pelo WhatsApp).
4. **Ajustes → Textos legais:** substituir os textos provisórios pelos validados juridicamente.
5. No celular de cada um: abrir o app e instalar na tela inicial (Minha conta → App no celular).

## Checklist antes de divulgar

- [ ] **Limpar a demonstração** (dados fictícios e contas `@ritmus.test`) antes de cadastrar dados reais.

- [ ] Fazer um cadastro de teste pelo link e excluir os dados depois (ficha do aluno → LGPD).
- [ ] Pagar 1 centavo de teste com o Pix copia e cola gerado pelo app (confere a chave e o nome).
- [ ] Logo: trocar pelo arquivo original quando chegar (`npm run logo -- caminho/do/logo`), fazer commit e publicar de novo.
- [ ] Textos legais validados juridicamente.

## Atualizações futuras

- **Mudou o código:** basta `git push`; a Vercel publica sozinha.
- **Mudou o banco** (nova migration): `npx supabase db push` antes ou junto com o deploy.
