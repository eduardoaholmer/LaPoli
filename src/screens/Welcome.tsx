import React, { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { colors, spacing, borderRadius, typography, transitions } from '../utils/theme';
import { storage } from '../utils/storage';
import { ArrowRight } from 'lucide-react';

export const WelcomeScreen: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    const hasSeenWelcome = storage.get('lapoli_welcome_seen');
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
      storage.set('lapoli_welcome_seen', 'true');
      setShowWelcome(false);
    }
  };

  const handleSkip = () => {
    storage.set('lapoli_welcome_seen', 'true');
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

  // três passos curtos; o que antes era um alert() sobre os dados no aparelho virou o último passo
  const steps = [
    {
      title: 'Registre o que você compra',
      description: 'Em "Estoque", anote cada compra de fio, enchimento ou olhos: quantos novelos e quanto pagou. O LaPoli calcula o custo por grama e avisa quando algo está acabando.'
    },
    {
      title: 'Monte seus produtos e pedidos',
      description: 'Em "Produtos", diga quanto material e quantas horas cada peça leva: o custo e o preço sugerido saem sozinhos. Em "Pedidos", registre a encomenda, o sinal e acompanhe até a entrega.'
    },
    {
      title: 'Seus dados ficam neste aparelho',
      description: 'Tudo fica salvo só aqui, sem internet. Se trocar de celular ou limpar o navegador, os dados somem. Faça backup de vez em quando em "Mais" → "Configurações e backup".'
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
