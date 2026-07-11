import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import KeyringsWorkspace from '../KeyringsWorkspace';

const downloadKeyringPdf = vi.fn();
vi.mock('../keyringPdf', async (importOriginal) => ({
  ...(await importOriginal()),
  downloadKeyringPdf: (...arguments_) => downloadKeyringPdf(...arguments_)
}));

const plates = [
  { value: 'BF07JZ', label: 'BF-07-JZ' },
  { value: 'AA11BB', label: 'AA-11-BB' }
];

describe('KeyringsWorkspace', () => {
  beforeEach(() => downloadKeyringPdf.mockReset());

  it('searches the fleet, selects a plate, and generates its PDF', async () => {
    const user = userEvent.setup();
    render(<KeyringsWorkspace plateOptions={plates} />);

    expect(screen.getByRole('button', { name: 'Gerar PDF' })).toBeDisabled();
    await user.type(screen.getByLabelText('Pesquisar matrícula'), 'BF');
    expect(screen.getByRole('option', { name: 'BF-07-JZ' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'AA-11-BB' })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Selecionar viatura'), 'BF07JZ');
    expect(screen.getAllByText('BF-07-JZ')).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: 'Gerar PDF' }));
    expect(downloadKeyringPdf).toHaveBeenCalledWith('BF-07-JZ');
  });

  it('shows explicit loading, empty, and fleet error states', () => {
    const { rerender } = render(<KeyringsWorkspace loading plateOptions={[]} />);
    expect(screen.getByText('A carregar viaturas…')).toBeInTheDocument();

    rerender(<KeyringsWorkspace plateOptions={[]} />);
    expect(screen.getByText('Não foram encontradas viaturas no histórico.')).toBeInTheDocument();

    rerender(<KeyringsWorkspace plateOptions={[]} error="Falha de ligação" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Falha de ligação');
  });

  it('recovers from a PDF generation error', async () => {
    downloadKeyringPdf.mockRejectedValueOnce(new Error('Canvas indisponível'));
    const user = userEvent.setup();
    render(<KeyringsWorkspace plateOptions={plates} />);

    await user.selectOptions(screen.getByLabelText('Selecionar viatura'), 'AA11BB');
    await user.click(screen.getByRole('button', { name: 'Gerar PDF' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Canvas indisponível');
    expect(screen.getByRole('button', { name: 'Gerar PDF' })).toBeEnabled();
  });
});
