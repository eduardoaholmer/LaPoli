import React from 'react';

interface State {
  error: Error | null;
}

/**
 * Última rede de segurança: se algo quebrar ao desenhar o app, mostra uma explicação e como seguir
 * em vez de uma tela em branco.
 */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Erro ao desenhar o LaPoli:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <main role="alert" style={{ maxWidth: 520, margin: '0 auto', padding: '48px 24px', fontFamily: 'var(--font-sans, system-ui, sans-serif)' }}>
        <h1 style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: 28, marginBottom: 12 }}>Não foi possível abrir o LaPoli</h1>
        <p style={{ lineHeight: 1.6 }}>Algo impediu o aplicativo de iniciar neste navegador. Isso costuma acontecer quando o link é aberto dentro de outro aplicativo (WhatsApp, Instagram) ou em uma aba privada, que bloqueiam o armazenamento.</p>
        <ul style={{ lineHeight: 1.8, paddingLeft: 20 }}>
          <li>Abra o endereço direto no Chrome ou no Safari.</li>
          <li>Se estiver em aba privada, abra em uma aba normal.</li>
          <li>Seus dados não foram apagados.</li>
        </ul>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()} style={{ marginTop: 8 }}>
          Tentar de novo
        </button>
        <details style={{ marginTop: 24, fontSize: 13, opacity: 0.75 }}>
          <summary>Detalhes técnicos</summary>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{error.message}</pre>
        </details>
      </main>
    );
  }
}
