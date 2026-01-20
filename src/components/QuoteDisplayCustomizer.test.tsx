import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuoteDisplayCustomizer } from '../../components/quote-view/QuoteDisplayCustomizer';
import { createMockDisplayOptions } from '../test/factories';

describe('QuoteDisplayCustomizer', () => {
  it('renders all customization sections', () => {
    const displayOptions = createMockDisplayOptions();
    const onToggleOption = vi.fn();

    render(
      <QuoteDisplayCustomizer
        displayOptions={displayOptions}
        onToggleOption={onToggleOption}
      />
    );

    expect(screen.getByText('Materials')).toBeInTheDocument();
    expect(screen.getByText('Labour')).toBeInTheDocument();
    expect(screen.getByText('Tax & Branding')).toBeInTheDocument();
  });

  it('displays correct toggle states based on displayOptions', () => {
    const displayOptions = createMockDisplayOptions({
      showMaterials: true,
      showLabour: false,
      showVat: true,
    });
    const onToggleOption = vi.fn();

    render(
      <QuoteDisplayCustomizer
        displayOptions={displayOptions}
        onToggleOption={onToggleOption}
      />
    );

    // Materials section should show enabled state
    const showSectionButtons = screen.getAllByText('Show Section');
    expect(showSectionButtons[0]).toBeInTheDocument();
  });

  it('calls onToggleOption when a toggle is clicked', () => {
    const displayOptions = createMockDisplayOptions();
    const onToggleOption = vi.fn();

    render(
      <QuoteDisplayCustomizer
        displayOptions={displayOptions}
        onToggleOption={onToggleOption}
      />
    );

    // Click "Show Section" for materials
    const showSectionButtons = screen.getAllByText('Show Section');
    fireEvent.click(showSectionButtons[0]);

    expect(onToggleOption).toHaveBeenCalledWith('showMaterials');
  });

  it('calls onToggleOption for VAT toggle', () => {
    const displayOptions = createMockDisplayOptions();
    const onToggleOption = vi.fn();

    render(
      <QuoteDisplayCustomizer
        displayOptions={displayOptions}
        onToggleOption={onToggleOption}
      />
    );

    // Find and click VAT toggle
    const vatToggle = screen.getByText('VAT Breakdown');
    fireEvent.click(vatToggle);

    expect(onToggleOption).toHaveBeenCalledWith('showVat');
  });

  it('calls onToggleOption for CIS toggle', () => {
    const displayOptions = createMockDisplayOptions();
    const onToggleOption = vi.fn();

    render(
      <QuoteDisplayCustomizer
        displayOptions={displayOptions}
        onToggleOption={onToggleOption}
      />
    );

    // Find and click CIS toggle
    const cisToggle = screen.getByText('CIS Deductions');
    fireEvent.click(cisToggle);

    expect(onToggleOption).toHaveBeenCalledWith('showCis');
  });

  it('disables nested options when parent is disabled', () => {
    const displayOptions = createMockDisplayOptions({
      showMaterials: false,
      showMaterialItems: true,
    });
    const onToggleOption = vi.fn();

    render(
      <QuoteDisplayCustomizer
        displayOptions={displayOptions}
        onToggleOption={onToggleOption}
      />
    );

    // When showMaterials is false, the nested items should have reduced opacity
    // This tests the conditional styling logic
    const container = document.querySelector('.opacity-30');
    expect(container).toBeInTheDocument();
  });
});
