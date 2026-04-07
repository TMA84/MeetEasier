import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TranslationsTab from './TranslationsTab';

const t = {
  translationLanguageLabel: 'Language',
  addLanguageButtonLabel: 'Add Language',
  addLanguagePlaceholder: 'e.g. fr',
  addLanguageHelp: 'Enter language code',
  removeLanguageButtonLabel: 'Remove Language',
  removeLanguageHelp: 'Cannot remove en/de',
  translationsSectionTitle: 'Translations',
  currentConfigTitle: 'Current Config',
  languagesLabel: 'Languages',
  adminLanguagesLabel: 'Admin Languages',
  lastUpdatedLabel: 'Last Updated',
  maintenanceTranslationsLabel: 'Maintenance',
  maintenanceTranslationsHelp: 'Maintenance help',
  maintenanceTitleLabel: 'Title',
  maintenanceBodyLabel: 'Body',
  advancedTranslationsToggleLabel: 'Advanced Editor',
  advancedTranslationsHelp: 'Edit JSON directly',
  maintenanceJsonLabel: 'Maintenance JSON',
  adminJsonLabel: 'Admin JSON',
  translationsSubmitButton: 'Save Translations',
  translationApiKeyLabel: 'Translation API Key',
  translationApiApiKeyNotConfigured: 'Not configured',
  translationApiTabLabel: 'Translation API',
  errorPrefix: 'Error:',
};

const baseProps = {
  isActive: true,
  t,
  availableTranslationLanguages: ['en', 'de', 'fr'],
  activeTranslationLanguage: 'en',
  currentTranslationApiHasApiKey: true,
  newTranslationLanguageCode: '',
  translationLanguageDraftError: '',
  i18nMessage: '',
  i18nMessageType: '',
  currentMaintenanceTranslations: { en: {}, de: {} },
  currentAdminTranslations: { en: {}, de: {} },
  i18nLastUpdated: '2024-01-01',
  collapsedTranslationGroups: {},
  selectedMaintenanceTranslation: { title: 'Maintenance', body: 'Under maintenance' },
  selectedAdminTranslation: { title: 'Admin Panel' },
  showAdvancedTranslationsEditor: false,
  maintenanceTranslationsText: '{}',
  adminTranslationsText: '{}',
  quickAdminTranslationGroups: [{ labelKey: 'generalGroup', keys: ['title', 'subtitle'] }],
  getLanguageDisplayName: (lang) => lang.toUpperCase(),
  onTranslationLanguageChange: vi.fn(),
  onNewTranslationLanguageChange: vi.fn(),
  onAddTranslationLanguage: vi.fn(),
  onRemoveTranslationLanguage: vi.fn(),
  onToggleTranslationGroup: vi.fn(),
  onMaintenanceTranslationFieldChange: vi.fn(),
  onAdminTranslationFieldChange: vi.fn(),
  onShowAdvancedEditorChange: vi.fn(),
  onMaintenanceTranslationsTextChange: vi.fn(),
  onAdminTranslationsTextChange: vi.fn(),
  onSubmit: vi.fn((e) => e.preventDefault()),
};

describe('TranslationsTab coverage', () => {
  it('renders language tabs', () => {
    render(<TranslationsTab {...baseProps} />);
    expect(screen.getByText('EN')).toBeInTheDocument();
    expect(screen.getByText('DE')).toBeInTheDocument();
    expect(screen.getByText('FR')).toBeInTheDocument();
  });

  it('calls onTranslationLanguageChange when language tab clicked', () => {
    const onTranslationLanguageChange = vi.fn();
    render(<TranslationsTab {...baseProps} onTranslationLanguageChange={onTranslationLanguageChange} />);
    fireEvent.click(screen.getByText('FR'));
    expect(onTranslationLanguageChange).toHaveBeenCalledWith('fr');
  });

  it('shows API key warning when not configured', () => {
    render(<TranslationsTab {...baseProps} currentTranslationApiHasApiKey={false} />);
    expect(screen.getByText(/Not configured/)).toBeInTheDocument();
  });

  it('does not show API key warning when configured', () => {
    const { container } = render(<TranslationsTab {...baseProps} currentTranslationApiHasApiKey={true} />);
    expect(container.querySelector('.admin-message-warning')).toBeNull();
  });

  it('calls onNewTranslationLanguageChange when input changes', () => {
    const onNewTranslationLanguageChange = vi.fn();
    render(<TranslationsTab {...baseProps} onNewTranslationLanguageChange={onNewTranslationLanguageChange} />);
    const input = screen.getByPlaceholderText('e.g. fr');
    fireEvent.change(input, { target: { value: 'es' } });
    expect(onNewTranslationLanguageChange).toHaveBeenCalledWith('es');
  });

  it('calls onAddTranslationLanguage when add button clicked', () => {
    const onAddTranslationLanguage = vi.fn();
    render(<TranslationsTab {...baseProps} onAddTranslationLanguage={onAddTranslationLanguage} />);
    const addButtons = screen.getAllByText('Add Language');
    fireEvent.click(addButtons[addButtons.length - 1]); // click the button, not the heading
    expect(onAddTranslationLanguage).toHaveBeenCalled();
  });

  it('calls onRemoveTranslationLanguage when remove button clicked', () => {
    const onRemoveTranslationLanguage = vi.fn();
    render(<TranslationsTab {...baseProps} activeTranslationLanguage="fr" onRemoveTranslationLanguage={onRemoveTranslationLanguage} />);
    const removeButtons = screen.getAllByText('Remove Language').filter(el => el.tagName === 'BUTTON');
    fireEvent.click(removeButtons[0]);
    expect(onRemoveTranslationLanguage).toHaveBeenCalled();
  });

  it('disables remove button for en language', () => {
    render(<TranslationsTab {...baseProps} activeTranslationLanguage="en" />);
    const removeButtons = screen.getAllByText('Remove Language').filter(el => el.tagName === 'BUTTON');
    expect(removeButtons[0]).toBeDisabled();
  });

  it('disables remove button for de language', () => {
    render(<TranslationsTab {...baseProps} activeTranslationLanguage="de" />);
    const removeButtons = screen.getAllByText('Remove Language').filter(el => el.tagName === 'BUTTON');
    expect(removeButtons[0]).toBeDisabled();
  });

  it('shows translation language draft error', () => {
    render(<TranslationsTab {...baseProps} translationLanguageDraftError="Invalid code" />);
    expect(screen.getByText('Invalid code')).toBeInTheDocument();
  });

  it('shows i18n message', () => {
    render(<TranslationsTab {...baseProps} i18nMessage="Saved!" i18nMessageType="success" />);
    expect(screen.getByText('Saved!')).toBeInTheDocument();
  });

  it('toggles maintenance section', () => {
    const onToggleTranslationGroup = vi.fn();
    render(<TranslationsTab {...baseProps} onToggleTranslationGroup={onToggleTranslationGroup} />);
    fireEvent.click(screen.getByText('Maintenance'));
    expect(onToggleTranslationGroup).toHaveBeenCalledWith('maintenanceTranslationsSection');
  });

  it('hides maintenance fields when collapsed', () => {
    render(<TranslationsTab {...baseProps} collapsedTranslationGroups={{ maintenanceTranslationsSection: true }} />);
    expect(screen.queryByLabelText('Title')).toBeNull();
  });

  it('shows maintenance fields when expanded', () => {
    render(<TranslationsTab {...baseProps} collapsedTranslationGroups={{}} />);
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Body')).toBeInTheDocument();
  });

  it('calls onMaintenanceTranslationFieldChange when title changes', () => {
    const onMaintenanceTranslationFieldChange = vi.fn();
    render(<TranslationsTab {...baseProps} onMaintenanceTranslationFieldChange={onMaintenanceTranslationFieldChange} />);
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'New Title' } });
    expect(onMaintenanceTranslationFieldChange).toHaveBeenCalledWith('en', 'title', 'New Title');
  });

  it('renders admin translation groups', () => {
    render(<TranslationsTab {...baseProps} />);
    expect(screen.getByText('generalGroup')).toBeInTheDocument();
  });

  it('toggles admin translation group', () => {
    const onToggleTranslationGroup = vi.fn();
    render(<TranslationsTab {...baseProps} onToggleTranslationGroup={onToggleTranslationGroup} />);
    fireEvent.click(screen.getByText('generalGroup'));
    expect(onToggleTranslationGroup).toHaveBeenCalledWith('generalGroup');
  });

  it('shows admin translation fields when group expanded', () => {
    render(<TranslationsTab {...baseProps} collapsedTranslationGroups={{}} />);
    expect(screen.getByLabelText('title')).toBeInTheDocument();
  });

  it('hides admin translation fields when group collapsed', () => {
    render(<TranslationsTab {...baseProps} collapsedTranslationGroups={{ generalGroup: true }} />);
    expect(screen.queryByLabelText('title')).toBeNull();
  });

  it('calls onAdminTranslationFieldChange when field changes', () => {
    const onAdminTranslationFieldChange = vi.fn();
    render(<TranslationsTab {...baseProps} onAdminTranslationFieldChange={onAdminTranslationFieldChange} />);
    fireEvent.change(screen.getByLabelText('title'), { target: { value: 'New Admin' } });
    expect(onAdminTranslationFieldChange).toHaveBeenCalledWith('en', 'title', 'New Admin');
  });

  it('toggles advanced editor section', () => {
    const onToggleTranslationGroup = vi.fn();
    render(<TranslationsTab {...baseProps} onToggleTranslationGroup={onToggleTranslationGroup} />);
    const advancedHeaders = screen.getAllByText('Advanced Editor');
    // Click the collapsible header (h3 inside button)
    const headerButton = advancedHeaders[0].closest('button');
    if (headerButton) fireEvent.click(headerButton);
    else fireEvent.click(advancedHeaders[0]);
    expect(onToggleTranslationGroup).toHaveBeenCalledWith('advancedTranslationsSection');
  });

  it('shows advanced editor checkbox when section expanded', () => {
    render(<TranslationsTab {...baseProps} collapsedTranslationGroups={{}} />);
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThanOrEqual(1);
  });

  it('shows JSON textareas when advanced editor enabled', () => {
    render(<TranslationsTab {...baseProps} collapsedTranslationGroups={{}} showAdvancedTranslationsEditor={true} />);
    expect(screen.getByLabelText('Maintenance JSON')).toBeInTheDocument();
    expect(screen.getByLabelText('Admin JSON')).toBeInTheDocument();
  });

  it('hides JSON textareas when advanced editor disabled', () => {
    render(<TranslationsTab {...baseProps} collapsedTranslationGroups={{}} showAdvancedTranslationsEditor={false} />);
    expect(screen.queryByLabelText('Maintenance JSON')).toBeNull();
  });

  it('calls onShowAdvancedEditorChange when checkbox toggled', () => {
    const onShowAdvancedEditorChange = vi.fn();
    render(<TranslationsTab {...baseProps} collapsedTranslationGroups={{}} onShowAdvancedEditorChange={onShowAdvancedEditorChange} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    expect(onShowAdvancedEditorChange).toHaveBeenCalled();
  });

  it('calls onMaintenanceTranslationsTextChange when JSON textarea changes', () => {
    const onMaintenanceTranslationsTextChange = vi.fn();
    render(<TranslationsTab {...baseProps} collapsedTranslationGroups={{}} showAdvancedTranslationsEditor={true} onMaintenanceTranslationsTextChange={onMaintenanceTranslationsTextChange} />);
    fireEvent.change(screen.getByLabelText('Maintenance JSON'), { target: { value: '{"en":{}}' } });
    expect(onMaintenanceTranslationsTextChange).toHaveBeenCalledWith('{"en":{}}');
  });

  it('calls onAdminTranslationsTextChange when admin JSON textarea changes', () => {
    const onAdminTranslationsTextChange = vi.fn();
    render(<TranslationsTab {...baseProps} collapsedTranslationGroups={{}} showAdvancedTranslationsEditor={true} onAdminTranslationsTextChange={onAdminTranslationsTextChange} />);
    fireEvent.change(screen.getByLabelText('Admin JSON'), { target: { value: '{"en":{}}' } });
    expect(onAdminTranslationsTextChange).toHaveBeenCalledWith('{"en":{}}');
  });

  it('submit button disabled when nothing changed', () => {
    const currentMaint = { en: {} };
    const currentAdmin = { en: {} };
    render(<TranslationsTab {...baseProps}
      currentMaintenanceTranslations={currentMaint}
      currentAdminTranslations={currentAdmin}
      maintenanceTranslationsText={JSON.stringify(currentMaint, null, 2)}
      adminTranslationsText={JSON.stringify(currentAdmin, null, 2)}
    />);
    expect(screen.getByText('Save Translations')).toBeDisabled();
  });

  it('submit button enabled when translations changed', () => {
    render(<TranslationsTab {...baseProps}
      maintenanceTranslationsText='{"changed": true}'
      adminTranslationsText='{"changed": true}'
    />);
    expect(screen.getByText('Save Translations')).not.toBeDisabled();
  });

  it('shows current config values', () => {
    render(<TranslationsTab {...baseProps} />);
    // "en, de" appears in multiple places, use getAllByText
    const langTexts = screen.getAllByText('en, de');
    expect(langTexts.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('2024-01-01')).toBeInTheDocument();
  });

  it('shows chevron indicators for collapsed/expanded groups', () => {
    const { container } = render(<TranslationsTab {...baseProps} collapsedTranslationGroups={{ maintenanceTranslationsSection: true }} />);
    const chevrons = container.querySelectorAll('.admin-collapsible-chevron');
    expect(chevrons.length).toBeGreaterThan(0);
  });
});
