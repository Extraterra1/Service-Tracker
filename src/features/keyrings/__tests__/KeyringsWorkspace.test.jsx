import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import KeyringsWorkspace from '../KeyringsWorkspace';
import { rankPlateOptions } from '../keyringSearch';

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

  it('fuzzy-matches plates despite missing separators and characters', () => {
    expect(rankPlateOptions(plates, 'bf7').map((option) => option.label)).toEqual(['BF-07-JZ']);
    expect(rankPlateOptions(plates, 'bf 07').map((option) => option.label)).toEqual(['BF-07-JZ']);
    expect(rankPlateOptions(plates, 'b07j').map((option) => option.label)).toEqual(['BF-07-JZ']);
  });

  it('ranks exact and contiguous matches ahead of loose subsequences', () => {
    const options = [
      { value: 'BAXF7', label: 'BA-XF-7' },
      { value: 'BF70AA', label: 'BF-70-AA' },
      { value: 'BF7', label: 'BF-7' }
    ];

    expect(rankPlateOptions(options, 'bf7').map((option) => option.label)).toEqual(['BF-7', 'BF-70-AA', 'BA-XF-7']);
  });

  it('searches and selects a plate from one combobox before generating its PDF', async () => {
    const user = userEvent.setup();
    render(<KeyringsWorkspace plateOptions={plates} />);

    expect(screen.getByRole('button', { name: 'Gerar PDF' })).toBeDisabled();
    const combobox = screen.getByRole('combobox', { name: 'Pesquisar matrícula' });
    expect(screen.queryByLabelText('Selecionar viatura')).not.toBeInTheDocument();
    await user.type(combobox, 'b07j');
    expect(screen.getByRole('option', { name: 'BF-07-JZ' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'AA-11-BB' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('option', { name: 'BF-07-JZ' }));
    expect(combobox).toHaveValue('BF-07-JZ');
    expect(screen.getAllByText('BF-07-JZ')).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: 'Gerar PDF' }));
    expect(downloadKeyringPdf).toHaveBeenCalledWith(['BF-07-JZ']);
  });

  it('adds multiple plates in order, ignores duplicates, and removes one pill', async () => {
    const user = userEvent.setup();
    const { container } = render(<KeyringsWorkspace plateOptions={plates} />);
    const combobox = screen.getByRole('combobox', { name: 'Pesquisar matrícula' });

    await user.type(combobox, 'BF');
    await user.click(screen.getByRole('option', { name: 'BF-07-JZ' }));
    await user.clear(combobox);
    await user.type(combobox, 'AA');
    await user.click(screen.getByRole('option', { name: 'AA-11-BB' }));
    await user.clear(combobox);
    await user.type(combobox, 'BF');
    await user.click(screen.getByRole('option', { name: 'BF-07-JZ' }));

    expect(screen.getAllByRole('button', { name: /Remover matrícula/ })).toHaveLength(2);
    expect(container.querySelectorAll('.keyring-strip')).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Remover matrícula BF-07-JZ' }));
    expect(screen.queryByRole('button', { name: 'Remover matrícula BF-07-JZ' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remover matrícula AA-11-BB' })).toBeInTheDocument();
  });

  it('supports keyboard selection, Escape, and focus reopening', async () => {
    const user = userEvent.setup();
    render(<KeyringsWorkspace plateOptions={plates} />);
    const combobox = screen.getByRole('combobox', { name: 'Pesquisar matrícula' });

    await user.click(combobox);
    expect(combobox).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{ArrowDown}{Enter}');
    expect(combobox).toHaveValue('BF-07-JZ');
    expect(combobox).toHaveAttribute('aria-expanded', 'false');

    await user.clear(combobox);
    await user.keyboard('{Escape}');
    expect(combobox).toHaveAttribute('aria-expanded', 'false');
    await user.tab();
    await user.click(combobox);
    expect(combobox).toHaveAttribute('aria-expanded', 'true');
  });

  it('survives the real pointer-down and blur ordering when selecting a result', async () => {
    const user = userEvent.setup();
    render(<KeyringsWorkspace plateOptions={plates} />);
    const combobox = screen.getByRole('combobox', { name: 'Pesquisar matrícula' });
    await user.type(combobox, 'BF');
    const option = screen.getByRole('option', { name: 'BF-07-JZ' });

    expect(fireEvent.pointerDown(option)).toBe(false);
    fireEvent.click(option);

    expect(screen.getByText('Selecionada')).toBeInTheDocument();
    expect(screen.getByText('BF-07-JZ', { selector: '.keyrings-selected-plate strong' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gerar PDF' })).toBeEnabled();
  });

  it('clears the selected plate from its pill', async () => {
    const user = userEvent.setup();
    render(<KeyringsWorkspace plateOptions={plates} />);
    const combobox = screen.getByRole('combobox', { name: 'Pesquisar matrícula' });
    await user.type(combobox, 'AA11');
    await user.click(screen.getByRole('option', { name: 'AA-11-BB' }));

    await user.click(screen.getByRole('button', { name: 'Remover matrícula AA-11-BB' }));

    expect(combobox).toHaveValue('');
    expect(screen.queryByText('Viatura selecionada')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gerar PDF' })).toBeDisabled();
    expect(screen.getByText('A matrícula aparece aqui')).toBeInTheDocument();
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

    await user.type(screen.getByRole('combobox', { name: 'Pesquisar matrícula' }), 'AA11');
    await user.click(screen.getByRole('option', { name: 'AA-11-BB' }));
    await user.click(screen.getByRole('button', { name: 'Gerar PDF' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Canvas indisponível');
    expect(screen.getByRole('button', { name: 'Gerar PDF' })).toBeEnabled();
  });
});
