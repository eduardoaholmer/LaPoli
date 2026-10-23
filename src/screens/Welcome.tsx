import React, { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { colors, spacing, borderRadius, typography, transitions } from '../utils/theme';
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

  // Função para forçar exibição do tutorial
  const showTutorial = () => {
    setShowWelcome(true);
    setCurrentStep(0);
  };

  // Expor função globalmente para ser chamada de outros componentes
  useEffect(() => {
    (window as any).showTutorial = showTutorial;
    return () => {
      delete (window as any).showTutorial;
    };
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
    fontSize: typography.fontSize.display, // 32px
    fontWeight: typography.fontWeight.bold, // 700
    color: colors.primaryText,
    marginBottom: spacing.lg,
    textAlign: 'center',
    fontFamily: typography.fontFamily.serif, // Serifada
    letterSpacing: typography.letterSpacing.tight // -0.02em
  };

  const stepNumberStyle: React.CSSProperties = {
    width: '40px',
    height: '40px',
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryAction,
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: typography.fontSize.h2, // 24px
    fontWeight: typography.fontWeight.bold, // 700
    marginBottom: spacing.md,
    fontFamily: typography.fontFamily.serif // Serifada
  };

  const stepTitleStyle: React.CSSProperties = {
    fontSize: typography.fontSize.h2, // 24px
    fontWeight: typography.fontWeight.semibold, // 600
    color: colors.text,
    marginBottom: spacing.sm,
    letterSpacing: typography.letterSpacing.tight // -0.02em
  };

  const stepDescriptionStyle: React.CSSProperties = {
    fontSize: typography.fontSize.bodyLarge, // 16px
    color: colors.textLight,
    lineHeight: typography.lineHeight.relaxed // 1.75
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
    borderRadius: borderRadius.full,
    backgroundColor: colors.border,
    transition: `all ${transitions.normal}`
  };

  const activeDotStyle: React.CSSProperties = {
    ...dotStyle,
    backgroundColor: colors.primaryAction
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
      description: 'Abra "Mais" → "Configurações" e defina o valor da hora de trabalho, o percentual padrão do sinal (recomendado 50%) e a margem de lucro desejada. Personalize também as categorias de produtos, tipos de materiais e formas de pagamento.'
    },
    {
      title: 'Cadastrar materiais e compras',
      description: 'Vá em "Estoque" e registre as compras de materiais (fios, enchimento, olhos, etc.). Para fio, informe quantos novelos comprou e quanto cada um tem (ex.: 2 novelos de 100 g), o valor pago e o estoque mínimo. O sistema calcula automaticamente o custo por grama.'
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
      description: 'Acesse a "Visão geral" para ver o que exige ação: pedidos atrasados, estoque baixo e margens fora da meta. No topo, faturamento, caixa e lucro aparecem separados, e você filtra por período.'
    }
  ];

  return (
    <div style={containerStyle}>
      <div style={contentStyle}>
        <h1 style={titleStyle}>Bem-vinda ao LaPoli</h1>
        
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
