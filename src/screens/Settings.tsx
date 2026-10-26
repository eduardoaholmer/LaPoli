import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Calculator, Check, Download, FileSpreadsheet, History, Info, Play, ShieldCheck, Tag, Trash2, Upload } from 'lucide-react';
import { backupService, settingsService } from '../data/services';
import type { Settings } from '../types';
import { formatDate } from '../calculations';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Input, Select } from '../components/Input';
import { ListEditor } from '../components/ListEditor';
import { Alert } from '../components/ui';
import { ConfirmDialog, Modal } from '../components/Modal';
import { ScreenLayout } from '../components/ScreenLayout';
import { SkeletonGrid } from '../components/Skeleton';
import { notify } from '../utils/notify';
import { useLeaveWarning } from '../utils/leaveWarning';
import { backupStatus } from '../utils/backup';
import { storage } from '../utils/storage';
import { PinSettings } from './PinSettings';
import { CloudSection } from '../components/CloudLogin';
import { useCloudUser } from '../data/cloudSession';

interface ImportPreview {
  text: string;
  fileName: string;
  products: number;
  purchases: number;
  orders: number;
}

export const SettingsScreen: React.FC = () => {
  const cloudUser = useCloudUser();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saved, setSaved] = useState<string>('');
  const [showExport, setShowExport] = useState(false);
  const [showDeleteExamples, setShowDeleteExamples] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dirty = !!settings && JSON.stringify(settings) !== saved;
  useLeaveWarning(dirty);

  // Trocar de tela sem tocar em "Salvar" perdia a alteração sem aviso: agora salva ao sair, com "Desfazer"
  const latest = useRef({ settings, saved, dirty });
  useEffect(() => {
    latest.current = { settings, saved, dirty };
  });
  useEffect(
    () => () => {
      const { settings: current, saved: before, dirty: pending } = latest.current;
      if (!pending || !current || !before) return;
      const previous = JSON.parse(before) as Settings;
      const changed = (Object.keys(current) as (keyof Settings)[]).filter(k => JSON.stringify(current[k]) !== JSON.stringify(previous[k]));
      void settingsService.update(current).then(() =>
        notify({
          type: 'success',
          message: 'Configurações salvas ao sair',
          onUndo: async () => {
            await settingsService.update(Object.fromEntries(changed.map(k => [k, previous[k]])) as Partial<Settings>);
            notify({ type: 'info', message: 'Configurações como estavam antes' });
          }
        })
      );
    },
    []
  );

  const load = async () => {
    const s = await settingsService.initializeDefault();
    setSettings(s);
    setSaved(JSON.stringify(s));
  };

  useEffect(() => {
    void load();
  }, []);

  if (!settings) {
    return (
      <ScreenLayout title="Configurações e backup">
        <SkeletonGrid count={2} columns={2} />
      </ScreenLayout>
    );
  }

  const set = (patch: Partial<Settings>) => setSettings(s => (s ? { ...s, ...patch } : s));
  const reminderDays = settings.backupEveryDays ?? 7;
  const { days, due } = backupStatus(settings.lastBackupDate, reminderDays, new Date(), storage.get('lapoli_has_data') === 'true');

  const save = async () => {
    await settingsService.update(settings);
    await load();
    notify({ type: 'success', message: 'Configurações salvas', detail: 'Valem para novos produtos e pedidos. Os existentes não mudam.' });
  };

  /** A senha é gravada na hora (sem esperar "Salvar") e a tela passa a considerá-la já salva, para não desfazê-la depois. */
  const changePin = async (patch: Partial<Pick<Settings, 'pinHash' | 'pinSalt' | 'pinIterations'>>) => {
    await settingsService.update(patch);
    setSettings(s => (s ? { ...s, ...patch } : s));
    setSaved(prev => JSON.stringify({ ...JSON.parse(prev), ...patch }));
  };

  const exportNow = async () => {
    const data = await backupService.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lapoli-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    await settingsService.update({ lastBackupDate: new Date() });
    storage.set('lapoli_last_backup', Date.now().toString());
    setShowExport(false);
    await load();
    notify({ type: 'success', message: 'Backup exportado', detail: 'O arquivo foi salvo na pasta de downloads.' });
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const validation = await backupService.validateBackup(data);
      if (!validation.valid) {
        notify({ type: 'error', message: 'Arquivo inválido', detail: validation.error });
        return;
      }
      setPreview({ text, fileName: file.name, products: data.products.length, purchases: data.purchases.length, orders: data.orders.length });
    } catch (error) {
      notify({ type: 'error', message: error instanceof SyntaxError ? 'Este arquivo não é um backup do LaPoli, ou está danificado' : 'Não foi possível ler o arquivo', detail: error instanceof Error && !(error instanceof SyntaxError) ? error.message : undefined });
    }
  };

  const runImport = async () => {
    if (!preview) return;
    setImporting(true);
    try {
      // importData já baixa um backup de segurança antes de substituir (e restaura se algo falhar)
      await backupService.importData(preview.text);
      window.location.reload();
    } catch (error) {
      setImporting(false);
      notify({ type: 'error', message: 'Erro ao importar', detail: error instanceof Error ? error.message : undefined });
    }
  };

  const deleteExamples = async () => {
    await backupService.deleteAllExamples();
    window.location.reload();
  };

  const showTutorial = () => (window as unknown as { showTutorial?: () => void }).showTutorial?.();

  const exportCsv = async () => {
    await backupService.exportToCSV();
    notify({ type: 'info', message: 'Planilha exportada', detail: 'Abre no Excel ou no Google Planilhas.' });
  };

  return (
    <ScreenLayout
      title="Configurações e backup"
      subtitle="Os valores que o LaPoli usa nos cálculos e a segurança dos seus dados."
      action={
        <Button icon={<Check size={18} />} onClick={save} disabled={!dirty}>
          Salvar alterações
        </Button>
      }
    >
      {cloudUser?.isLoggedIn ? (
        <Alert tone="success" icon={<ShieldCheck size={22} />} title="Seus dados estão na nuvem">
          Tudo o que você cadastra fica neste aparelho e na sua conta ({cloudUser.email}). Se o aparelho for trocado ou o navegador limpar os dados, é só entrar de novo. O backup em arquivo continua valendo como cópia extra.
        </Alert>
      ) : (
        <Alert tone="info" icon={<ShieldCheck size={22} />} title="Seus dados ficam apenas neste aparelho">
          Enquanto você não entra com o seu e-mail na nuvem (logo abaixo), <b>você é a responsável pelas cópias de segurança</b>. Se o navegador limpar os dados do site ou o aparelho for trocado, só um arquivo de backup traz tudo de volta.
        </Alert>
      )}

      <div className="grid g-main-side mt-16">
        <div className="stack">
          <CloudSection />
          <section className="card backup-card">
            <div className="card-head">
              <h2><ShieldCheck size={20} /> Backup</h2>
              {due ? <Badge variant="warning" icon={<AlertTriangle size={13} />}>Backup atrasado</Badge> : <Badge variant="success" icon={<Check size={13} />}>Em dia</Badge>}
            </div>
            <div className={`backup-last ${due ? 'due' : ''}`}>
              <span className={`dot-ic ${due ? 'w' : 's'}`}><History size={22} /></span>
              <div>
                <div className="small muted">Último backup</div>
                {settings.lastBackupDate ? (
                  <>
                    <b style={{ fontSize: 17 }}>{formatDate(settings.lastBackupDate)}</b>
                    <span className="muted"> · {days === 0 ? 'hoje' : `há ${days} dia${days === 1 ? '' : 's'}`}</span>
                  </>
                ) : (
                  <b style={{ fontSize: 17 }}>Nunca feito</b>
                )}
              </div>
            </div>
            <div className="grid g-2 mt-16">
              <Button size="lg" icon={<Download size={20} />} onClick={() => setShowExport(true)}>Fazer backup de tudo</Button>
              <Button size="lg" variant="secondary" icon={<Upload size={20} />} onClick={() => fileRef.current?.click()}>Importar backup…</Button>
            </div>
            <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={onFile} />
            <div className="mt-16" style={{ maxWidth: 340 }}>
              <Select label="Lembrete periódico" value={String(reminderDays)} onChange={e => set({ backupEveryDays: parseInt(e.target.value) })} help="O lembrete aparece aqui, sem notificações insistentes." fullWidth>
                <option value="7">A cada 7 dias</option>
                <option value="14">A cada 14 dias</option>
                <option value="30">A cada 30 dias</option>
                <option value="0">Nunca</option>
              </Select>
            </div>
            <p className="small muted mt-16"><Info size={14} style={{ verticalAlign: -2 }} /> Dica: guarde o arquivo em um pendrive ou envie para você mesma por e-mail. Ele contém dados de clientes — guarde com cuidado.</p>
          </section>

          <PinSettings settings={settings} onChange={changePin} />

          <section className="card">
            <div className="card-head"><h2><Calculator size={20} /> Valores padrão</h2></div>
            <div className="form-grid">
              <Input label="Valor da sua hora de trabalho" type="number" min={0} step="0.5" inputMode="decimal" prefix="R$" suffix="/ hora" value={settings.hourlyRate} onChange={e => set({ hourlyRate: parseFloat(e.target.value) || 0 })} help="Usado no custo de todos os produtos." fullWidth />
              <Input label="Meta de margem de lucro" type="number" min={0} max={95} step="1" suffix="%" value={settings.desiredProfitMargin} onChange={e => set({ desiredProfitMargin: parseFloat(e.target.value) || 0 })} help="Margem = lucro ÷ preço de venda. Abaixo disso o produto recebe alerta." fullWidth />
              <Input label="Percentual padrão do sinal" type="number" min={0} max={100} step="1" suffix="%" value={settings.defaultSignalPercent} onChange={e => set({ defaultSignalPercent: parseFloat(e.target.value) || 0 })} help="Sugerido ao criar um pedido." fullWidth />
              <Input label="Horas de crochê por dia" type="number" min={0.5} step="0.5" suffix="h/dia" value={settings.hoursPerDay ?? 3} onChange={e => set({ hoursPerDay: parseFloat(e.target.value) || 3 })} help="Usado para sugerir a data de entrega." fullWidth />
              <Input label="Saldo inicial em caixa" type="number" step="0.01" inputMode="decimal" prefix="R$" value={settings.openingCash ?? 0} onChange={e => set({ openingCash: parseFloat(e.target.value) || 0 })} help="Quanto você já tinha em caixa antes de começar a registrar no Financeiro." fullWidth />
            </div>
          </section>

          <section className="card">
            <div className="card-head"><h2><Tag size={20} /> Categorias e listas</h2></div>
            <div className="form-grid">
              <ListEditor label="Categorias de produtos" items={settings.productCategories} onChange={productCategories => set({ productCategories })} placeholder="Ex.: Chaveiro" />
              <ListEditor label="Tipos de materiais" items={settings.materialTypes} onChange={materialTypes => set({ materialTypes: materialTypes as Settings['materialTypes'] })} placeholder="Ex.: linha" />
              <ListEditor label="Unidades de medida" items={settings.units} onChange={units => set({ units })} placeholder="Ex.: centímetros" />
              <ListEditor label="Formas de pagamento" items={settings.paymentMethods} onChange={paymentMethods => set({ paymentMethods })} placeholder="Ex.: Pix" />
              <div className="full">
                <ListEditor label="Fornecedores e lojas" items={settings.suppliers} onChange={suppliers => set({ suppliers })} placeholder="Ex.: Armarinho do centro" />
              </div>
            </div>
          </section>
        </div>

        <div className="stack">
          <section className="card">
            <div className="card-head"><h2>Outras ações</h2></div>
            <div className="stack-sm">
              <Button variant="secondary" icon={<FileSpreadsheet size={18} />} onClick={exportCsv} fullWidth>Exportar planilha (Excel)</Button>
              <Button variant="secondary" icon={<Play size={18} />} onClick={showTutorial} fullWidth>Ver tutorial novamente</Button>
              <Button variant="danger" icon={<Trash2 size={18} />} onClick={() => setShowDeleteExamples(true)} fullWidth>Excluir dados de exemplo</Button>
            </div>
          </section>
        </div>
      </div>

      <Modal isOpen={showExport} onClose={() => setShowExport(false)} title="Exportar backup" size="sm" footer={<><Button variant="secondary" onClick={() => setShowExport(false)}>Cancelar</Button><Button icon={<Download size={18} />} onClick={exportNow}>Baixar backup</Button></>}>
        <p className="muted" style={{ lineHeight: 1.7 }}>Isso salva um arquivo de backup com todos os seus dados: produtos, compras, pedidos e configurações. Mantenha o arquivo em local seguro.</p>
      </Modal>

      <Modal
        isOpen={!!preview}
        onClose={() => !importing && setPreview(null)}
        title="Arquivo validado"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPreview(null)} disabled={importing}>Cancelar</Button>
            <Button variant="danger" className="btn-danger-solid" onClick={runImport} disabled={importing}>{importing ? 'Importando…' : 'Substituir meus dados'}</Button>
          </>
        }
      >
        {preview && (
          <>
            <Alert tone="success" icon={<Check size={20} />} title={`${preview.fileName} está íntegro`} />
            <div className="rows mt-16">
              {[`${preview.products} produtos`, `${preview.purchases} compras de material`, `${preview.orders} pedidos`, 'Configurações e categorias'].map(t => (
                <div className="li" key={t} style={{ padding: '8px 0' }}>
                  <span className="dot-ic s" style={{ width: 28, height: 28 }}><Check size={16} /></span>
                  <span>{t}</span>
                </div>
              ))}
            </div>
            <Alert tone="warning" icon={<AlertTriangle size={20} />} title="Isto substitui os dados atuais" className="mt-16">
              Tudo o que está neste aparelho será trocado pelo conteúdo do arquivo.
            </Alert>
            <Alert tone="info" icon={<ShieldCheck size={20} />} title="Backup de segurança automático" className="mt-16">
              Antes de substituir, o LaPoli baixa uma cópia dos dados atuais. Se algo falhar na importação, ele restaura sozinho.
            </Alert>
          </>
        )}
      </Modal>

      <ConfirmDialog isOpen={showDeleteExamples} title="Excluir dados de exemplo?" confirmLabel="Excluir exemplos" danger onClose={() => setShowDeleteExamples(false)} onConfirm={deleteExamples}>
        Isso exclui todos os produtos, compras e pedidos marcados como exemplo. Esta ação não pode ser desfeita.
      </ConfirmDialog>
      {dirty && (
        <div className="save-bar" role="status">
          <span>Você tem alterações não salvas.</span>
          <Button size="sm" variant="ghost" onClick={() => setSettings(JSON.parse(saved))}>Descartar</Button>
          <Button size="sm" icon={<Check size={16} />} onClick={save}>Salvar</Button>
        </div>
      )}
    </ScreenLayout>
  );
};
