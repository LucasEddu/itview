# 🚀 Guia de Implantação no Vercel (100% Cloud-Serverless)

Este guia orienta na implantação do dashboard **San Paolo ITView** na nuvem do **Vercel** de forma 100% gratuita, sem servidores físicos e com atualização automática de 10 em 10 minutos rodando em segundo plano.

---

## 📋 Pré-requisitos
1. Uma conta gratuita no [Vercel](https://vercel.com).
2. O código do seu projeto enviado para um repositório no **GitHub**, **GitLab** ou **Bitbucket**.

---

## ⚙️ Passo a Passo de Configuração no Vercel

### 1. Criar o Projeto no Vercel
1. Acesse o seu painel do Vercel e clique em **Add New...** -> **Project**.
2. Importe o repositório do seu GitHub contendo o código do **san-paolo-itview**.
3. Na seção **Build & Development Settings**, o Vercel detectará automaticamente que é um projeto **Vite**. Não é preciso alterar nenhuma configuração padrão.

---

### 2. Configurar o Armazenamento Vercel Blob (Banco de Dados)
Como funções serverless são efêmeras, usaremos o **Vercel Blob** para armazenar e ler o histórico acumulado do `data.json`.
1. Dentro da página do seu projeto no Vercel, acesse a aba **Storage** no topo.
2. Selecione **Vercel Blob** (banco de arquivos) e clique em **Create**.
3. Prossiga com a criação rápida aceitando os termos (é 100% gratuito e suporta até 250MB, o que é mais do que suficiente para nosso JSON de ~1.5MB).
4. O Vercel gerará e conectará automaticamente a variável de ambiente `BLOB_READ_WRITE_TOKEN` ao seu projeto!

---

### 3. Configurar as Variáveis de Ambiente da API Athenas
Precisamos cadastrar as credenciais de acesso para que as funções de sincronização na nuvem consigam autenticar na API Athenas.
1. No painel do projeto no Vercel, vá em **Settings** -> **Environment Variables**.
2. Adicione as seguintes variáveis:
   *   `ATHENAS_EMAIL`: `lucas.eduardo@sanpaologelato.com.br`
   *   `ATHENAS_PASSWORD`: `Kokuten.10`
3. Clique em **Save**.

---

### 4. Realizar o Deploy!
1. Vá para a aba **Deployments** e clique nos três pontinhos do seu deploy atual, escolhendo **Redeploy** (ou simplesmente faça um `git push` no seu repositório para disparar uma nova compilação automática).
2. O Vercel vai compilar o frontend React e implantar automaticamente os endpoints `/api/data` e `/api/sync` como funções serverless integradas!

---

## 🕒 Como Funciona a Atualização Automática (Cron Job)?
Nós já criamos o arquivo `vercel.json` no repositório. Ele configura uma instrução de cron para que a nuvem do Vercel faça uma requisição para `/api/sync` de forma autônoma de **10 em 10 minutos**!

*   **Verificar as Execuções do Cron:**
    1. Vá em **Settings** -> **Cron Jobs** no painel do Vercel.
    2. Você verá o cron ativo apontando para `/api/sync` com a frequência agendada.
    3. É possível clicar em **Run** manualmente a qualquer hora para testar ou forçar uma sincronização!
*   **Monitorar os Logs:**
    1. Vá em **Logs** no painel do Vercel.
    2. Selecione a aba correspondente para visualizar as saídas das funções `/api/sync` e `/api/data` em tempo real. Os logs mostrarão o login bem-sucedido, quantidade de chamados carregados e a velocidade do processamento!

---

## ⚡ Botão "Sincronizar" no Dashboard
Ao abrir o painel, caso você não queira esperar a próxima rodada automática do cron (que ocorre de 10 em 10 minutos), você pode clicar no botão **Sincronizar** no cabeçalho do dashboard! 
Isso disparará uma chamada imediata para `/api/sync`, atualizará os dados no Vercel Blob e atualizará os gráficos na tela em segundos de forma totalmente transparente!
