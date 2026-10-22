// Script para gerar dados de teste - deve ser executado no console do navegador
// Abra o app, abra o console do navegador (F12), cole este código e pressione Enter

declare global {
  interface Window {
    generateTestData: () => Promise<void>;
  }
}

window.generateTestData = async () => {
  const { db } = await import('../src/data/db');
  const { generateId } = await import('../src/types');
  
  const materialTypes = ['fio', 'linha', 'enchimento', 'olhos', 'botão', 'argola', 'embalagem', 'acessório', 'outro'];
  const productCategories = ['Amigurumi', 'Chaveiro', 'Bolsa', 'Acessório', 'Outro'];
  const orderStatuses = [
    'Cliente escolhendo o produto',
    'Orçamento enviado',
    'Aguardando pagamento do sinal',
    'Sinal recebido',
    'Aguardando compra de materiais',
    'Materiais comprados',
    'Em produção',
    'Produção concluída',
    'Aguardando entrega',
    'Entregue',
    'Cancelado'
  ];

  const materials = [
    'Fio de algodão', 'Fio de acrílico', 'Fio de lã', 'Enchimento fibra', 'Enchimento espuma',
    'Olhos 6mm', 'Olhos 8mm', 'Olhos 10mm', 'Olhos 12mm', 'Botão 1cm', 'Botão 1.5cm',
    'Argola 2cm', 'Argola 3cm', 'Etiqueta', 'Embalagem cellophane', 'Fita de cetim',
    'Linha de costura', 'Agulha 2mm', 'Agulha 2.5mm', 'Agulha 3mm', 'Agulha 3.5mm'
  ];

  const productNames = [
    'Leão amigurumi', 'Ursinho polar', 'Coelho', 'Gato', 'Cachorro', 'Elefante', 'Girafa',
    'Chaveiro flor', 'Chaveiro estrela', 'Chaveiro coração', 'Chaveiro ursinho',
    'Bolsa pequena', 'Bolsa média', 'Bolsa grande', 'Carteira', 'Necessaire',
    'Poncho', 'Cachecol', 'Luvas', 'Gorro', 'Meias'
  ];

  const clientNames = [
    'Maria Silva', 'João Santos', 'Ana Costa', 'Pedro Lima', 'Julia Oliveira',
    'Carlos Ferreira', 'Fernanda Rodrigues', 'Ricardo Almeida', 'Patricia Martins',
    'Lucas Pereira', 'Camila Souza', 'Bruno Carvalho', 'Amanda Rocha', 'Felipe Nunes',
    'Beatriz Dias', 'Gabriel Mendes', 'Larissa Moreira', 'Thiago Barros', 'Renata Farias'
  ];

  function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function randomFloat(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  function randomChoice<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  function randomDate(start: Date, end: Date): Date {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  }

  console.log('🚀 Gerando dados de teste para performance...');
  
  // Gerar produtos
  console.log('📦 Gerando 200 produtos...');
  const products = [];
  for (let i = 0; i < 200; i++) {
    const materialCount = randomInt(2, 5);
    const productMaterials = [];
    
    for (let j = 0; j < materialCount; j++) {
      const quantityUsed = randomFloat(10, 200);
      const unitCost = randomFloat(0.01, 1);
      productMaterials.push({
        id: generateId(),
        materialId: generateId(),
        material: randomChoice(materials),
        type: randomChoice(materialTypes),
        unit: randomChoice(['gramas', 'metros', 'unidades', 'centímetros']),
        quantityUsed,
        unitCost,
        totalCost: quantityUsed * unitCost
      });
    }
    
    const suggestedPrice = randomFloat(50, 300);
    const usualPrice = suggestedPrice * randomFloat(0.8, 1.2);
    
    products.push({
      id: generateId(),
      name: `${randomChoice(productNames)} #${i + 1}`,
      category: randomChoice(productCategories),
      description: `Produto de teste gerado automaticamente`,
      size: randomChoice(['P', 'M', 'G', 'Único']),
      suggestedPrice,
      usualPrice,
      estimatedTime: randomFloat(2, 10),
      actualTime: randomFloat(2, 10),
      active: Math.random() > 0.1,
      materials: productMaterials,
      createdAt: randomDate(new Date('2024-01-01'), new Date()),
      updatedAt: new Date(),
      isExample: false
    });
  }
  await db.products.bulkAdd(products);
  console.log('✅ 200 produtos criados');
  
  // Gerar compras
  console.log('🛒 Gerando 500 compras...');
  const purchases = [];
  for (let i = 0; i < 500; i++) {
    const quantityPurchased = randomFloat(100, 1000);
    const totalPaid = randomFloat(20, 200);
    const unitCost = totalPaid / quantityPurchased;
    const quantityRemaining = randomFloat(0, quantityPurchased);
    const percentUsed = ((quantityPurchased - quantityRemaining) / quantityPurchased) * 100;
    
    let status: 'disponível' | 'parcialmente usado' | 'esgotado' | 'reservado';
    if (quantityRemaining <= 0) status = 'esgotado';
    else if (quantityRemaining < quantityPurchased) status = 'parcialmente usado';
    else status = 'disponível';
    
    purchases.push({
      id: generateId(),
      date: randomDate(new Date('2024-01-01'), new Date()),
      material: randomChoice(materials),
      type: randomChoice(materialTypes),
      brand: randomChoice(['Marca A', 'Marca B', 'Marca C', 'Genérico']),
      color: randomChoice(['Branco', 'Preto', 'Vermelho', 'Azul', 'Amarelo', 'Verde', 'Rosa']),
      unit: randomChoice(['gramas', 'metros', 'unidades', 'centímetros']),
      quantityPurchased,
      quantityRemaining,
      percentUsed,
      totalPaid,
      unitCost,
      store: randomChoice(['Loja A', 'Loja B', 'Mercado Livre', 'Shopee']),
      paymentMethod: randomChoice(['Pix', 'Cartão de crédito', 'Dinheiro']),
      installments: Math.random() > 0.5 ? randomInt(1, 3) : undefined,
      installmentValue: Math.random() > 0.5 ? randomFloat(10, 100) : undefined,
      minStock: randomInt(50, 200),
      status,
      paymentStatus: randomChoice(['a pagar', 'parcial', 'quitado']),
      observations: `Compra de teste #${i + 1}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      isExample: false
    });
  }
  await db.purchases.bulkAdd(purchases);
  console.log('✅ 500 compras criadas');
  
  // Gerar pedidos
  console.log('📋 Gerando 1000 pedidos...');
  const orders = [];
  for (let i = 0; i < 1000; i++) {
    const product = randomChoice(products);
    const agreedPrice = product.usualPrice * randomFloat(0.9, 1.1);
    const signalAmount = agreedPrice * 0.5;
    const remainingBalance = agreedPrice - signalAmount;
    
    const orderDate = randomDate(new Date('2024-01-01'), new Date());
    const deadline = new Date(orderDate);
    deadline.setDate(deadline.getDate() + randomInt(7, 30));
    
    orders.push({
      id: generateId(),
      date: orderDate,
      clientName: randomChoice(clientNames),
      clientPhone: `119${randomInt(10000000, 99999999)}`,
      product: product.name,
      productId: product.id,
      customizations: Math.random() > 0.5 ? 'Personalização de teste' : undefined,
      size: product.size,
      quantity: randomInt(1, 3),
      deadline,
      agreedPrice,
      signalAmount,
      signalPaymentDate: Math.random() > 0.3 ? orderDate : undefined,
      remainingBalance,
      finalPaymentDate: Math.random() > 0.5 ? deadline : undefined,
      paymentMethod: randomChoice(['Pix', 'Cartão de crédito', 'Dinheiro']),
      status: randomChoice(orderStatuses),
      paymentStatus: randomChoice(['pendente', 'sinal pago', 'pago', 'cancelado']),
      needsMaterialPurchase: Math.random() > 0.7,
      materialsPurchased: Math.random() > 0.6,
      productionStartDate: Math.random() > 0.5 ? orderDate : undefined,
      completionDate: Math.random() > 0.4 ? deadline : undefined,
      deliveryDate: Math.random() > 0.3 ? deadline : undefined,
      observations: `Pedido de teste #${i + 1}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      isExample: false
    });
  }
  await db.orders.bulkAdd(orders);
  console.log('✅ 1000 pedidos criados');
  
  console.log('🎉 Dados de teste gerados com sucesso!');
  console.log('📊 Total:');
  console.log(`   - 200 produtos`);
  console.log(`   - 500 compras`);
  console.log(`   - 1000 pedidos`);
  console.log('');
  console.log('⚠️  Para limpar os dados de teste, vá em Configurações → Excluir Dados de Exemplo');
  console.log('   ou limpe os dados do navegador.');
};

console.log('📝 Para gerar dados de teste, execute: window.generateTestData()');
