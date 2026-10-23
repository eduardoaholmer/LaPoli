# LaPoli - Sistema de Gestão para Crochê

Aplicativo web instalável (PWA) para gestão de produtos artesanais de crochê, desenvolvido para uso em tablet e celular. Funciona 100% offline após a primeira carga, com todos os dados armazenados localmente no navegador.

## 🚀 Instalação

### Pré-requisitos
- Node.js 18 ou superior
- npm ou yarn

### Passos

1. **Instalar dependências**
```bash
npm install
```

2. **Iniciar em modo de desenvolvimento**
```bash
npm run dev
```
O aplicativo estará disponível em `http://localhost:5173`

3. **Build para produção**
```bash
npm run build
```
Os arquivos serão gerados na pasta `dist`

4. **Preview do build de produção**
```bash
npm run preview
```

5. **Rodar testes**
```bash
npm test
```

## 🌐 Publicação (GitHub Pages + domínio próprio)

O app é publicado como site estático, sem servidor, em **https://lapoli.eduardoaholmer.dev**. O deploy roda sozinho a cada push na `master` (`.github/workflows/deploy.yml`) e o arquivo `public/CNAME` mantém o domínio configurado.

> ⚠️ **Os dados ficam no navegador de cada endereço.** O que foi cadastrado em `eduardoaholmer.github.io/LaPoli/` (ou em outro endereço) **não aparece** no domínio novo. Faça a troca nesta ordem:

1. **Antes de tudo:** no endereço atual, abra Configurações → **Exportar todos os dados** e guarde o arquivo `.json`.
2. **DNS (Namecheap → Advanced DNS):** crie um registro `CNAME`, Host `lapoli`, Value `eduardoaholmer.github.io.` (não altera os registros existentes).
3. **GitHub → Settings → Pages → Custom domain:** informe `lapoli.eduardoaholmer.dev` e, quando o certificado for emitido, marque **Enforce HTTPS**.
4. **No domínio novo:** abra Configurações → **Importar backup** e escolha o arquivo do passo 1. Reinstale o PWA se já estava instalado.

Depois do passo 3, o endereço antigo passa a redirecionar para o novo; por isso o passo 1 vem primeiro.

Para desenvolvimento local o endereço é `http://localhost:5173/`.

## 📱 Como Instalar como PWA

1. Abra o aplicativo no navegador (Chrome, Edge ou Safari)
2. No menu do navegador, selecione "Instalar" ou "Adicionar à tela inicial"
3. O aplicativo será instalado e funcionará offline

## 🎯 Fluxo Recomendado de Uso

Ao abrir o app pela primeira vez, você verá um tutorial com 6 passos:

1. **Configurar parâmetros**
   - Acesse a tela "Mais" → "Configurações"
   - Defina o valor da hora de trabalho
   - Configure o percentual padrão do sinal (ex: 50%)
   - Defina a margem de lucro desejada
   - Personalize categorias, tipos de materiais e formas de pagamento

2. **Cadastrar Materiais e Compras**
   - Vá em "Estoque"
   - Registre as compras de materiais (fios, enchimento, olhos, etc.)
   - Informe quantidade comprada, valor pago e estoque mínimo
   - O sistema calcula automaticamente o custo unitário

3. **Cadastrar Produtos**
   - Vá em "Produtos"
   - Crie seus produtos (amigurumis, chaveiros, bolsas)
   - Adicione os materiais utilizados em cada produto
   - Informe tempo estimado de produção e preços
   - O sistema calcula automaticamente o custo total e a margem de lucro
   - ⚠️ Alerta visual quando margem abaixo da meta configurada

4. **Informar Materiais e Tempo**
   - Ao criar ou editar um produto, adicione todos os materiais usados
   - Informe a quantidade utilizada e, se desejar, vincule a uma compra específica
   - Informe o tempo estimado de produção
   - O custo de mão de obra é calculado automaticamente

5. **Registrar Pedidos**
   - Vá em "Pedidos"
   - Crie novos pedidos vinculando aos produtos cadastrados
   - O sinal é calculado automaticamente (50% por padrão, mas pode ser editado)
   - Acompanhe o status do pedido (orçamento, produção, entrega)
   - Botão para abrir WhatsApp diretamente com o cliente

6. **Acompanhar no Painel**
   - Acesse o "Painel" para ver indicadores em tempo real
   - Filtre por período (hoje, 7 dias, mês atual, etc.)
   - Visualize faturamento, custos, lucro e margem
   - Veja produtos mais vendidos e materiais com estoque baixo

## 💾 Backup e Restauração

### Exportar Dados (Backup)
1. Vá em "Mais" → "Configurações"
2. Clique em "Exportar Dados (Backup)"
3. Um arquivo JSON será baixado com todos os seus dados
4. Salve em local seguro

### Importar Dados (Restaurar)
1. Vá em "Mais" → "Configurações"
2. Clique em "Importar Dados (Restaurar)"
3. Selecione o arquivo JSON de backup
4. O app validará o arquivo e mostrará o que será substituído
5. ⚠️ Um backup automático será criado antes da importação
6. Confirme para restaurar

### Excluir Dados de Exemplo
1. Vá em "Mais" → "Configurações"
2. Clique em "Excluir Dados de Exemplo"
3. Todos os dados marcados como exemplo serão removidos

## 📊 Cálculos Implementados

### Custo do Produto
- **Custo unitário** = valor pago na compra ÷ quantidade comprada
- **Custo utilizado** = quantidade utilizada × custo unitário
- **Custo total dos materiais** = soma de todos os materiais utilizados
- **Custo de mão de obra** = horas trabalhadas × valor da hora
- **Custo total** = materiais + mão de obra + outros custos
- **Lucro** = preço cobrado − custo total
- **Margem de lucro** = lucro ÷ preço cobrado × 100
- **Diferença entre preço sugerido e cobrado** = preço cobrado − preço sugerido
- ⚠️ Alerta visual quando margem abaixo da meta configurada

### Estoque
- **Quantidade restante** = comprada − consumo registrado
- **Percentual utilizado** = (comprada − restante) ÷ comprada × 100
- **Valor em estoque** = quantidade restante × custo unitário
- **Considera materiais com e sem lote vinculado**
- ⚠️ **Importante**: O estoque é calculado dinamicamente em tempo real com base nos materiais usados nos produtos. Não é um valor persistido no banco de dados. Isso garante que o estoque esteja sempre correto, mas significa que o cálculo é feito a cada exibição.

### Pedidos
- **Sinal** = preço combinado × percentual padrão (configurável)
- **Saldo restante** = preço combinado − sinal pago

## ✅ Validação de Cálculos (Teste)

### Cenário de Teste
Produto: Leão Amigurumi
- Fio de algodão: 150g a R$ 0,09/g = R$ 13,50
- Enchimento: 200g a R$ 0,03/g = R$ 6,00
- Olhos: 2 unidades a R$ 0,50/un = R$ 1,00
- Mão de obra: 8h a R$ 30/h = R$ 240,00
- **Custo total**: R$ 260,50
- **Preço**: R$ 100,00
- **Lucro**: R$ -160,50 (preço abaixo do custo)
- **Margem**: -160,5%

Pedido:
- Preço combinado: R$ 100,00
- Sinal (50%): R$ 50,00
- Saldo restante: R$ 50,00

### Resultados Esperados
Os dados de exemplo incluídos no aplicativo demonstram esses cálculos. Acesse a tela de produtos para ver o "Leão Amigurumi" de exemplo.

### Testes Automatizados
O projeto inclui testes unitários para as funções de cálculo. Rode `npm test` para executar todos os testes.

### Teste de Performance
Para testar o app com muitos dados (200 produtos, 500 compras, 1000 pedidos):
1. Abra o app no navegador
2. Abra o console do navegador (F12)
3. Copie o conteúdo do arquivo `scripts/generate-test-data.ts`
4. Cole no console e pressione Enter
5. Os dados serão gerados automaticamente

Para limpar os dados de teste, vá em Configurações → Excluir Dados de Exemplo ou limpe os dados do navegador.

## 🎨 Características

### Design Mobile-First
- Navegação inferior em dispositivos móveis
- Menu lateral em tablets e desktops
- Alvos de toque mínimos de 44px
- Botão flutuante "+" para adicionar itens
- Formulários em tela cheia (mobile) ou painel lateral (tablet)
- Tela de boas-vindas com tutorial de 6 passos

### Paleta de Cores
- Rosa avermelhado (#e85d75) - primário (baseado no logo)
- Verde (#7eb87e) - secundário (baseado no logo)
- Fundo levemente rosado (#fef9f9)
- Cores de status: verde (ok), amarelo (atenção), vermelho (erro)

### Funcionalidades
- ✅ Cálculos automáticos de custos e lucros
- ✅ Controle de estoque com alertas de nível baixo
- ✅ Gestão de pedidos com status e prazos
- ✅ Gráficos de faturamento, custos e lucro
- ✅ Backup e restauração de dados com validação
- ✅ Backup automático antes de importar
- ✅ Funcionamento offline (PWA)
- ✅ Dados de exemplo incluídos
- ✅ Integração com WhatsApp
- ✅ Armazenamento persistente solicitado ao navegador
- ✅ Alerta visual quando margem abaixo da meta
- ✅ Lembrete de backup a cada 7 dias
- ✅ Testes automatizados para cálculos

## 🛠️ Stack Tecnológico

- **Frontend**: React 18 + TypeScript
- **Build**: Vite
- **PWA**: vite-plugin-pwa + Workbox
- **Banco de Dados**: IndexedDB via Dexie
- **Gráficos**: Recharts
- **Ícones**: Lucide React
- **Roteamento**: React Router
- **Testes**: Vitest + Testing Library + jsdom

## 📝 Estrutura do Projeto

```
src/
├── components/      # Componentes reutilizáveis (Button, Input, Card, Modal, etc.)
├── screens/         # Telas do aplicativo (Dashboard, Orders, Products, Stock, Settings, Welcome)
├── data/           # Camada de dados (db.ts, services.ts)
├── calculations/   # Funções de cálculo puras e testes
├── test/           # Configuração de testes
├── types/          # Definições de tipos TypeScript
├── utils/          # Utilitários (theme, hooks)
└── App.tsx         # Componente principal com rotas
```

## 🔒 Privacidade e Segurança

- Todos os dados ficam armazenados localmente no navegador (IndexedDB)
- Nenhum dado é enviado para servidores externos
- Funciona completamente offline após a primeira carga
- Backup é gerado localmente como arquivo JSON
- Import de backup valida o arquivo antes de restaurar
- Backup automático criado antes de importar para evitar perda de dados
- Armazenamento persistente solicitado ao navegador para evitar perda de dados

## 📱 Compatibilidade

- Navegadores modernos (Chrome, Edge, Firefox, Safari)
- Android 8+ e iOS 12+
- Instalável como PWA em dispositivos móveis
- Responsivo para mobile, tablet e desktop

## 🐛 Troubleshooting

### Dados não aparecem após reload
- Verifique se o navegador permite IndexedDB
- Tente limpar o cache e recarregar

### PWA não instala
- Verifique se está usando HTTPS ou localhost
- Alguns navegadores exigem HTTPS para instalação

### Cálculos incorretos
- Verifique as configurações (valor da hora, percentual do sinal)
- Confirme se os materiais estão vinculados corretamente aos produtos

## 📄 Licença

Este projeto foi desenvolvido para uso pessoal da LaPoli.

---

Desenvolvido com ❤️ para LaPoli - Produtos Artesanais de Crochê
