import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useWaveBackground } from './useWaveBackground';

function Control({ name }: { name: string }) {
  const { config, setEnabled, setWaveColor } = useWaveBackground();
  return <div><output aria-label={name}>{config.enabled ? 'on' : 'off'} {config.waveColor}</output><button onClick={() => setEnabled(!config.enabled)}>Basculer {name}</button><button onClick={() => setWaveColor('#38bdf8')}>Bleu {name}</button></div>;
}

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); localStorage.clear(); });

describe('Shared animated-background preferences', () => {
  it('updates menu and page instances together and persists the preference', () => {
    render(<><Control name="menu" /><Control name="page" /></>);
    fireEvent.click(screen.getByText('Basculer menu'));
    expect(screen.getByLabelText('menu')).toHaveTextContent('off');
    expect(screen.getByLabelText('page')).toHaveTextContent('off');
    expect(JSON.parse(localStorage.getItem('trading-journal-wave-bg-v4')!).enabled).toBe(false);
    fireEvent.click(screen.getByText('Bleu page'));
    expect(screen.getByLabelText('menu')).toHaveTextContent('#38bdf8');
    expect(screen.getByLabelText('page')).toHaveTextContent('#38bdf8');
  });

  it('keeps existing saved colors and honors disabling the animation', () => {
    localStorage.setItem('trading-journal-wave-bg-v4', JSON.stringify({ enabled: false, waveColor: '#c084fc', veil: 0.7 }));
    render(<Control name="page" />);
    expect(screen.getByLabelText('page')).toHaveTextContent('off #c084fc');
  });
});
