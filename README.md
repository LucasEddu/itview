# San Paolo ITView - Dashboard de Chamados TI

Dashboard interativo para gestão e análise de chamados técnicos, integrado ao Athenas Messenger.

## Funcionalidades Principais

- **Análise de Performance**: KPIs de total de chamados, TMA (Tempo Médio de Atendimento), TMF (Tempo Médio de Fila) e CSAT.
- **Mapa de Criticidade**: Visualização geográfica (Heatmap) da densidade de chamados por regional e tecnologia (Athenas, Degust, Hardware).
- **Visualização de Base**: Acesso espelhado aos dados brutos para auditoria.
- **Sincronização Automática**: Botão integrado que automatiza o download de relatórios via Playwright e processa os dados em tempo real.
- **Modo Dark/Light**: Interface adaptável com tema profissional.
- **Modo TV**: Layout otimizado para monitoramento em telas de operação.

## Tecnologias Utilizadas

- **Frontend**: React, Vite, Framer Motion, Recharts, Lucide React, Leaflet.
- **Backend**: Node.js, Express.
- **Automação**: Python, Playwright, Pandas.

## Configuração

1. Instale as dependências:
   ```bash
   npm install
   pip install requests playwright pandas openpyxl python-dotenv
   python -m playwright install chromium
   ```
2. Configure o arquivo `.env`:
   ```env
   ATHENAS_EMAIL=seu_email
   ATHENAS_PASSWORD=sua_senha
   ```
3. Execute o projeto:
   ```bash
   npm run dev
   ```

Desenvolvido para San Paolo Gelato.
