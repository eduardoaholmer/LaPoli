import React, { useState, useEffect } from 'react';
import { settingsService } from '../data/services';
import type { Settings } from '../types';
import { Input, TextArea } from '../components/Input';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Modal } from '../components/Modal';
import { ScreenLayout } from '../components/ScreenLayout';
import { colors, spacing, borderRadius, typography } from '../utils/theme';
import { Download, Upload, Trash2, Save, AlertTriangle } from 'lucide-react';

export const SettingsScreen: React.FC = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeleteExamplesModal, setShowDeleteExamplesModal] = useState(false);
  const [showBackupReminder, setShowBackupReminder] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    // Mostrar lembrete de backup a cada 7 dias (apenas após carregar settings)
    if (settings) {
      const lastBackup = settings.lastBackupDate;
      if (lastBackup) {
        const daysSinceBackup = Math.floor((Date.now() - new Date(lastBackup).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceBackup >= 7) {
          setShowBackupReminder(true);
        }
      } else {
        // Só mostra lembrete se nunca fez backup
        const hasData = localStorage.getItem('lapoli_has_data');
        if (hasData === 'true') {
          setShowBackupReminder(true);
        }
      }
    }
  }, [settings]);

  const loadSettings = async () => {
    const s = await settingsService.initializeDefault();
    setSettings(s);
  };

  const handleSave = async () => {
    if (settings) {
      await settingsService.update(settings);
      setIsEditing(false);
    }
  };

  const handleExport = async () => {
    const { backupService, settingsService } = await import('../data/services');
    const data = await backupService.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lapoli-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    // Atualizar data do último backup
    await settingsService.update({ lastBackupDate: new Date() });
    localStorage.setItem('lapoli_last_backup', new Date().getTime().toString());
    setShowBackupModal(false);
    setShowBackupReminder(false);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const text = await file.text();
      const { backupService } = await import('../data/services');
      
      // Validar antes de confirmar
      try {
        const data = JSON.parse(text);
        const validation = await backupService.validateBackup(data);
        if (!validation.valid) {
          alert(`Arquivo inválido: ${validation.error}`);
          return;
        }
        
        const confirmMessage = `ATENÇÃO: Isso irá substituir TODOS os dados atuais pelos dados do backup.\n\n` +
          `Produtos no backup: ${data.products.length}\n` +
          `Compras no backup: ${data.purchases.length}\n` +
          `Pedidos no backup: ${data.orders.length}\n\n` +
          `Um backup automático será criado antes da importação.\n\n` +
          `Deseja continuar?`;
        
        if (!window.confirm(confirmMessage)) {
          return;
        }
        
        await backupService.importData(text);
        setShowImportModal(false);
        window.location.reload();
      } catch (error) {
        if (error instanceof SyntaxError) {
          alert('Arquivo JSON inválido ou corrompido');
        } else {
          alert(`Erro ao importar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
      }
    }
  };

  const handleDeleteExamples = async () => {
    const { backupService } = await import('../data/services');
    await backupService.deleteAllExamples();
    setShowDeleteExamplesModal(false);
    window.location.reload();
  };

  const handleShowTutorial = () => {
    if ((window as any).showTutorial) {
      (window as any).showTutorial();
    }
  };

  const handleExportCSV = async () => {
    const { backupService } = await import('../data/services');
    const service = backupService as any;
    if (service.exportToCSV) {
      await service.exportToCSV();
    }
  };

  if (!settings) return <div>Carregando...</div>;

  const sectionStyle: React.CSSProperties = {
    marginBottom: spacing.xl
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: typography.fontSize.h2, // 24px
    fontWeight: typography.fontWeight.semibold, // 600
    color: colors.text,
    marginBottom: spacing.md,
    letterSpacing: typography.letterSpacing.tight // -0.02em
  };

  const formStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: spacing.md
  };

  const reminderStyle: React.CSSProperties = {
    fontSize: typography.fontSize.body, // 14px
    color: colors.warning,
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: `${colors.warning}12`,
    borderRadius: borderRadius.md, // 12px
    borderLeft: `4px solid ${colors.warning}`,
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm
  };

  const headerContent = isEditing ? (
    <Button onClick={handleSave} icon={<Save size={20} />}>
      Salvar
    </Button>
  ) : null;

  return (
    <ScreenLayout
      title="Configurações"
      subtitle="Configure os parâmetros básicos do sistema: valor da hora de trabalho, percentual padrão do sinal e margem de lucro desejada."
      action={headerContent}
    >
      {showBackupReminder && (
        <div style={reminderStyle}>
          <AlertTriangle size={20} />
          <span>Lembre-se de fazer backup regularmente dos seus dados!</span>
          <Button size="sm" variant="ghost" onClick={() => setShowBackupReminder(false)}>
            ✕
          </Button>
        </div>
      )}

      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Parâmetros Financeiros</h2>
        <Card>
          <div style={formStyle}>
            <Input
              label="Valor da hora de trabalho (R$)"
              type="number"
              step="0.01"
              inputMode="decimal"
              value={settings.hourlyRate}
              onChange={(e: any) => setSettings({ ...settings, hourlyRate: parseFloat(e.target.value) || 0 })}
              disabled={!isEditing}
              fullWidth
            />
            <Input
              label="Percentual padrão do sinal (%)"
              type="number"
              step="1"
              value={settings.defaultSignalPercent}
              onChange={(e: any) => setSettings({ ...settings, defaultSignalPercent: parseFloat(e.target.value) || 0 })}
              disabled={!isEditing}
              fullWidth
            />
            <Input
              label="Margem de lucro desejada (%)"
              type="number"
              step="1"
              value={settings.desiredProfitMargin}
              onChange={(e: any) => setSettings({ ...settings, desiredProfitMargin: parseFloat(e.target.value) || 0 })}
              disabled={!isEditing}
              fullWidth
            />
          </div>
        </Card>
      </div>

      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Categorias e Tipos</h2>
        <Card>
          <div style={formStyle}>
            <div>
              <TextArea
                label="Categorias de produtos (uma por linha)"
                value={settings.productCategories.join('\n')}
                onChange={(e: any) => setSettings({
                  ...settings,
                  productCategories: e.target.value.split('\n').filter((c: string) => c.trim())
                })}
                disabled={!isEditing}
                fullWidth
              />
            </div>
            <div>
              <TextArea
                label="Tipos de materiais (um por linha)"
                value={settings.materialTypes.join('\n')}
                onChange={(e: any) => setSettings({
                  ...settings,
                  materialTypes: e.target.value.split('\n').filter((t: string) => t.trim()) as any
                })}
                disabled={!isEditing}
                fullWidth
              />
            </div>
            <div>
              <TextArea
                label="Unidades de medida (uma por linha)"
                value={settings.units.join('\n')}
                onChange={(e: any) => setSettings({
                  ...settings,
                  units: e.target.value.split('\n').filter((u: string) => u.trim())
                })}
                disabled={!isEditing}
                fullWidth
              />
            </div>
          </div>
        </Card>
      </div>

      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Formas de Pagamento e Fornecedores</h2>
        <Card>
          <div style={formStyle}>
            <div>
              <TextArea
                label="Formas de pagamento (uma por linha)"
                value={settings.paymentMethods.join('\n')}
                onChange={(e: any) => setSettings({
                  ...settings,
                  paymentMethods: e.target.value.split('\n').filter((p: string) => p.trim())
                })}
                disabled={!isEditing}
                fullWidth
              />
            </div>
            <div>
              <TextArea
                label="Fornecedores e lojas (um por linha)"
                value={settings.suppliers.join('\n')}
                onChange={(e: any) => setSettings({
                  ...settings,
                  suppliers: e.target.value.split('\n').filter((s: string) => s.trim())
                })}
                disabled={!isEditing}
                fullWidth
              />
            </div>
          </div>
        </Card>
      </div>

      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Backup e Restauração</h2>
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            <Button
              onClick={() => setIsEditing(!isEditing)}
              variant="ghost"
              fullWidth
            >
              {isEditing ? 'Cancelar Edição' : 'Editar Configurações'}
            </Button>
            <Button
              onClick={() => setShowBackupModal(true)}
              icon={<Download size={20} />}
              fullWidth
            >
              Exportar Dados (Backup)
            </Button>
            <Button
              onClick={() => setShowImportModal(true)}
              icon={<Upload size={20} />}
              variant="secondary"
              fullWidth
            >
              Importar Dados (Restaurar)
            </Button>
            <Button
              onClick={() => setShowDeleteExamplesModal(true)}
              icon={<Trash2 size={20} />}
              variant="danger"
              fullWidth
            >
              Excluir Dados de Exemplo
            </Button>
            <Button
              onClick={handleShowTutorial}
              variant="ghost"
              fullWidth
            >
              Ver Tutorial Novamente
            </Button>
            <Button
              onClick={handleExportCSV}
              variant="ghost"
              fullWidth
            >
              Exportar para CSV/Excel
            </Button>
          </div>
        </Card>
      </div>

      <Modal isOpen={showBackupModal} onClose={() => setShowBackupModal(false)}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: spacing.lg, fontSize: typography.fontSize.body, color: colors.textLight, lineHeight: typography.lineHeight.relaxed }}>
            Isso irá baixar um arquivo JSON com todos os seus dados. Mantenha este arquivo em local seguro.
          </p>
          <Button onClick={handleExport} fullWidth>
            Confirmar Exportação
          </Button>
        </div>
      </Modal>

      <Modal isOpen={showImportModal} onClose={() => setShowImportModal(false)}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: spacing.lg, fontSize: typography.fontSize.body, color: colors.textLight, lineHeight: typography.lineHeight.relaxed }}>
            Isso irá substituir todos os dados atuais pelos dados do arquivo selecionado. Esta ação não pode ser desfeita.
          </p>
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            style={{ marginBottom: spacing.lg, width: '100%' }}
          />
        </div>
      </Modal>

      <Modal isOpen={showDeleteExamplesModal} onClose={() => setShowDeleteExamplesModal(false)}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: spacing.lg, fontSize: typography.fontSize.body, color: colors.textLight, lineHeight: typography.lineHeight.relaxed }}>
            Isso irá excluir todos os dados marcados como exemplo. Esta ação não pode ser desfeita.
          </p>
          <Button onClick={handleDeleteExamples} variant="danger" fullWidth>
            Confirmar Exclusão
          </Button>
        </div>
      </Modal>
    </ScreenLayout>
  );
};
