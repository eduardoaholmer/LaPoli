import React, { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { colors, spacing } from '../utils/theme';
import { ArrowRight } from 'lucide-react';

export const WelcomeScreen: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('lapoli_welcome_seen');
    if (!hasSeenWelcome) {
      setShowWelcome(true);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      localStorage.setItem('lapoli_welcome_seen', 'true');
      setShowWelcome(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('lapoli_welcome_seen', 'true');
    setShowWelcome(false);
  };

  if (!showWelcome) return null;

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    zIndex: 1000,
    padding: spacing.lg,
    overflowY: 'auto'
  };

  const contentStyle: React.CSSProperties = {
    maxWidth: '600px',
    margin: '0 auto',
    paddingTop: spacing.xl
  };

  const stepStyle: React.CSSProperties = {
    marginBottom: spacing.xl
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '28px',
    fontWeight: 700,
    color: colors.primary,
    marginBottom: spacing.lg,
    textAlign: 'center'
  };

  const stepNumberStyle: React.CSSProperties = {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: colors.primary,
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: 700,
    marginBottom: spacing.md
  };

  const stepTitleStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: 600,
    color: colors.text,
    marginBottom: spacing.sm
  };

  const stepDescriptionStyle: React.CSSProperties = {
    fontSize: '16px',
    color: colors.textLight,
    lineHeight: 1.6
  };

  const progressStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl
  };

  const dotStyle: React.CSSProperties = {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: colors.border
  };

  const activeDotStyle: React.CSSProperties = {
    ...dotStyle,
    backgroundColor: colors.primary
  };

  const buttonContainerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.xl
  };

  const steps = [
    {
      title: 'Configurar parâmetros',
      description: 'Acesse a tela "Mais" → "Configurações" e defina o valor da hora de trabalho, o percentual padrão do sinal (recomendado 50%) e a margem de lucro desejada. Personalize também as categorias de produtos, tipos de materiais e formas de pagamento.'
    },
    {
      title: 'Cadastrar materiais e compras',
      description: 'Vá em "Estoque" e registre as compras de materiais (fios, enchimento, olhos, etc.). Informe a quantidade comprada, o valor pago e o estoque mínimo. O sistema calcula automaticamente o custo unitário.'
    },
    {
      title: 'Cadastrar produtos e receitas',
      description: 'Em "Produtos", crie seus produtos de crochê. Adicione os materiais utilizados em cada produto, informando a quantidade e, se desejar, vincule a uma compra específica. O sistema calcula o custo total e a margem de lucro.'
    },
    {
      title: 'Informar materiais e tempo',
      description: 'Ao criar ou editar um produto, adicione todos os materiais usados e informe o tempo estimado de produção. O custo de mão de obra é calculado automaticamente baseado no valor da hora configurado.'
    },
    {
      title: 'Registrar pedidos dos clientes',
      description: 'Em "Pedidos", crie novos pedidos vinculando aos produtos cadastrados. O sinal é calculado automaticamente (50% por padrão, mas pode ser editado). Acompanhe o status do pedido (orçamento, produção, entrega).'
    },
    {
      title: 'Acompanhar no painel',
      description: 'Acesse o "Painel" para ver indicadores em tempo real: faturamento, custos, lucro, margem média, pedidos em aberto e concluídos, produtos mais vendidos e materiais com estoque baixo. Filtre por período para analisar diferentes intervalos.'
    }
  ];

  return (
    <div style={containerStyle}>
      <div style={contentStyle}>
        <h1 style={titleStyle}>Bem-vindo ao LaPoli! 🧶</h1>
        
        <div style={progressStyle}>
          {steps.map((_, index) => (
            <div 
              key={index} 
              style={index <= currentStep ? activeDotStyle : dotStyle}
            />
          ))}
        </div>

        <Card>
          <div style={stepStyle}>
            <div style={stepNumberStyle}>{currentStep + 1}</div>
            <h2 style={stepTitleStyle}>{steps[currentStep].title}</h2>
            <p style={stepDescriptionStyle}>{steps[currentStep].description}</p>
          </div>
        </Card>

        <div style={buttonContainerStyle}>
          <Button variant="ghost" onClick={handleSkip}>
            Pular
          </Button>
          <Button onClick={handleNext}>
            {currentStep === steps.length - 1 ? 'Começar' : 'Próximo'}
            <ArrowRight size={20} />
          </Button>
        </div>
      </div>
    </div>
  );
};
