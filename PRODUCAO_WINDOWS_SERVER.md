# 🖥️ Guia de Implantação no Windows Server 2012 (Execução Local 24/7)

Este guia orienta passo a passo como implantar e manter o dashboard **San Paolo ITView** rodando de forma definitiva, estável e segura no seu servidor **Windows Server 2012**, funcionando sem dependências na nuvem e com atualização automática em segundo plano.

---

## 🛠️ Como Funciona em Produção
Graças ao empacotamento que configuramos, **toda a aplicação roda em um único processo leve na porta 3008**:
- **Servidor Express (Backend):** Serve a API e os dados atualizados.
- **Vite React (Frontend):** Servido de forma estática compilada (super rápido e otimizado).
- **Background Auto-Sync Worker:** Sincroniza e busca novos chamados a cada 10 minutos rodando em segundo plano.

---

## 📋 Pré-requisitos no Servidor
1. **Node.js LTS (v18 ou v20):** [Baixar Node.js](https://nodejs.org/).
2. **Python (3.10 ou superior):** [Baixar Python](https://www.python.org/). *(Marque a opção "Add Python to PATH" durante a instalação).*
3. **Instalar Dependências de Sistema:**
   Abra o Prompt de Comando (cmd) ou PowerShell como **Administrador** no servidor e execute:
   ```powershell
   # Instalar dependências do Node
   npm install --production

   # Instalar dependências do Python
   pip install pandas openpyxl playwright python-dotenv

   # Instalar o navegador Chromium para o robô de sincronização
   python -m playwright install chromium
   ```

---

## ⚙️ Passo a Passo de Configuração

### 1. Compilar a Interface (Frontend)
Na sua máquina de desenvolvimento ou diretamente no servidor, execute o comando de compilação para gerar os arquivos estáticos de produção na pasta `dist`:
```powershell
npm run build
```
*(Isso cria a pasta `/dist` no projeto. O `server.js` detectará essa pasta automaticamente e servirá o site).*

### 2. Configurar Variáveis de Ambiente
Crie um arquivo chamado `.env` na pasta raiz do projeto no servidor com as suas credenciais de acesso à API do Athenas:
```env
ATHENAS_EMAIL=lucas.eduardo@sanpaologelato.com.br
ATHENAS_PASSWORD=sua_senha_secreta_aqui
```

### 3. Testar a Execução Manual
Antes de configurar para rodar em segundo plano, teste se tudo inicia perfeitamente rodando no CMD:
```powershell
node server.js
```
Acesse no navegador do servidor: **`http://localhost:3008`**. Se carregar o painel completo, a aplicação está 100% pronta!

---

## 🔄 Como Deixar Rodando Permanentemente (Segundo Plano)

Para garantir que o dashboard continue rodando mesmo se você deslogar do Remote Desktop (RDP) ou se o servidor for reiniciado, escolha um dos métodos abaixo:

### Método A: Usando PM2 (Recomendado - Padrão de Mercado)
O PM2 é um gerenciador de processos para Node.js que reinicia o aplicativo automaticamente se ele falhar.

1. Instale o PM2 globalmente:
   ```powershell
   npm install -g pm2
   ```
2. Inicie a aplicação:
   ```powershell
   pm2 start server.js --name "san-paolo-itview"
   ```
3. Garanta que o PM2 salve a lista de processos para reiniciar junto com o Windows:
   ```powershell
   pm2 save
   ```

*(Para monitorar o processo depois, você pode usar os comandos `pm2 status`, `pm2 logs` ou `pm2 stop san-paolo-itview`).*

---

### Método B: Usando o Agendador de Tarefas do Windows (Nativo)
Se preferir não instalar ferramentas adicionais, você pode configurar o próprio Windows Server para iniciar o projeto no boot.

1. Crie um arquivo chamado `iniciar_dashboard.bat` na pasta raiz do projeto com o seguinte conteúdo:
   ```bat
   @echo off
   cd /d "C:\Caminho\Para\A\Pasta\san-paolo-itview"
   node server.js
   ```
2. Abra o **Agendador de Tarefas** (*Task Scheduler*) do Windows Server.
3. Clique em **Criar Tarefa Básica...** (*Create Basic Task...*):
   - **Nome:** `San Paolo ITView Dashboard`
   - **Disparador:** Escolha **Ao iniciar o computador** (*When the computer starts*).
   - **Ação:** Escolha **Iniciar um programa** (*Start a program*).
   - **Script/Programa:** Clique em Procurar e selecione o arquivo `iniciar_dashboard.bat` que você criou.
4. Nas propriedades da tarefa criada, marque a opção **Executar independentemente de o usuário estar conectado ou não** (*Run whether user is logged on or not*) e selecione **Executar com privilégios mais altos** (*Run with highest privileges*).

Pronto! O dashboard iniciará sozinho no boot do Windows Server.

---

## 🔓 Liberar Acesso para Outros Computadores da Rede
Para que os outros computadores, TVs ou tablets na mesma rede possam acessar o painel, você só precisa liberar a porta **3008** no Firewall do Windows Server:

1. Abra o **Firewall do Windows com Segurança Avançada**.
2. Clique em **Regras de Entrada** (*Inbound Rules*) -> **Nova Regra...** (*New Rule...*).
3. Selecione **Porta** (*Port*) e clique em Avançar.
4. Escolha **TCP** e insira a porta específica: `3008`.
5. Selecione **Permitir a conexão** (*Allow the connection*).
6. Marque as opções de rede (Domínio, Particular) conforme as políticas da empresa.
7. Dê um nome para a regra (ex: `San Paolo ITView - Porta 3008`) e clique em Concluir.

### 🌐 Como os Usuários Acessam?
Agora qualquer pessoa na rede local poderá acessar o dashboard digitando o endereço:
👉 **`http://<IP-DO-SERVIDOR-WINDOWS>:3008`**

*(Exemplo: se o IP do seu servidor na rede for `192.168.1.100`, o endereço será `http://192.168.1.100:3008`).*
