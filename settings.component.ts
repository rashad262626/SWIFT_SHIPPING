import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingDto, SettingsService } from '../../core/services/settings/settings.service';

interface SettingField {
  key: string;
  label: string;
  description: string;
  type: 'text' | 'number' | 'email' | 'tel' | 'textarea' | 'toggle' | 'select';
  value: string;
  originalValue: string;
  icon: string;
  options?: { label: string; value: string }[];
  suffix?: string;
  placeholder?: string;
}

interface CodeGroup {
  key: string;
  label: string;
  icon: string;
  color: string;
  prefixField?: SettingField;
  digitsField?: SettingField;
  separatorField?: SettingField;
  preview: string;
}

interface SettingGroup {
  key: string;
  label: string;
  icon: string;
  color: string;
  fields: SettingField[];
}

@Component({
  selector: 'app-settings',
  standalone: false,
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  loading = true;
  saving = false;
  savingKey = '';
  saveSuccess = false;
  saveError = '';
  activeTab: 'General' | 'CodeFormat' = 'General';

  allSettings: SettingDto[] = [];

  // General Fields
  generalFields: SettingField[] = [];

  // Code Groups
  codeGroups: CodeGroup[] = [
    {
      key: 'Customer',
      label: 'كود العميل',
      icon: 'fa-user-tag',
      color: '#3b82f6',
      preview: ''
    },
    {
      key: 'Fund',
      label: 'كود الصندوق',
      icon: 'fa-wallet',
      color: '#10b981',
      preview: ''
    },
    {
      key: 'Shipment',
      label: 'كود الشحنة',
      icon: 'fa-truck',
      color: '#b51427',
      preview: ''
    }
  ];

  private separatorOptions = [
    { label: 'بدون فاصل', value: '' },
    { label: '  —  شرطة  ( - )', value: '-' },
    { label: '  /  مائلة  ( / )', value: '/' },
    { label: '  _  سفلية  ( _ )', value: '_' }
  ];

  private generalMeta: Record<string, Partial<SettingField>> = {
    CompanyName: {
      label: 'اسم الشركة',
      type: 'text',
      icon: 'fa-building',
      placeholder: 'أدخل اسم الشركة'
    },
    CompanyPhone: {
      label: 'رقم الهاتف',
      type: 'tel',
      icon: 'fa-phone',
      placeholder: '07xxxxxxxxx'
    },
    CompanyAddress: {
      label: 'عنوان الشركة',
      type: 'textarea',
      icon: 'fa-map-marker-alt',
      placeholder: 'أدخل عنوان الشركة التفصيلي'
    },
    CompanyLogo: {
      label: 'رابط الشعار',
      type: 'text',
      icon: 'fa-image',
      placeholder: 'https://example.com/logo.png'
    },
    CompanyEmail: {
      label: 'البريد الإلكتروني',
      type: 'email',
      icon: 'fa-envelope',
      placeholder: 'info@company.com'
    },
    CompanyWebsite: {
      label: 'الموقع الإلكتروني',
      type: 'text',
      icon: 'fa-globe',
      placeholder: 'https://www.company.com'
    }
  };

  constructor(private settingsService: SettingsService) {}

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.loading = true;
    this.saveError = '';

    this.settingsService.getAll().subscribe({
      next: (data) => {
        this.allSettings = data;
        this.buildGeneralFields(data.filter(s => s.settingGroup === 'General'));
        this.buildCodeGroups(data.filter(s => s.settingGroup === 'CodeFormat'));
        this.loading = false;
      },
      error: () => {
        this.saveError = 'تعذر تحميل الإعدادات، يرجى المحاولة مجدداً';
        this.loading = false;
      }
    });
  }

  private buildGeneralFields(settings: SettingDto[]): void {
    this.generalFields = settings.map(s => {
      const meta = this.generalMeta[s.settingKey] || {};
      return {
        key: s.settingKey,
        label: meta.label || this.prettifyKey(s.settingKey),
        description: s.description || '',
        type: meta.type || 'text',
        value: s.settingValue ?? '',
        originalValue: s.settingValue ?? '',
        icon: meta.icon || 'fa-cog',
        placeholder: meta.placeholder || ''
      } as SettingField;
    });
  }

  private buildCodeGroups(settings: SettingDto[]): void {
    this.codeGroups.forEach(group => {
      const prefix = settings.find(s => s.settingKey === `${group.key}CodePrefix`);
      const digits = settings.find(s => s.settingKey === `${group.key}CodeDigits`);
      const separator = settings.find(s => s.settingKey === `${group.key}CodeSeparator`);

      if (prefix) {
        group.prefixField = {
          key: prefix.settingKey,
          label: 'البادئة',
          description: prefix.description || '',
          type: 'text',
          value: prefix.settingValue ?? '',
          originalValue: prefix.settingValue ?? '',
          icon: 'fa-tag',
          placeholder: group.key.substring(0, 3).toUpperCase()
        };
      }

      if (digits) {
        group.digitsField = {
          key: digits.settingKey,
          label: 'عدد الخانات',
          description: digits.description || '',
          type: 'number',
          value: digits.settingValue ?? '',
          originalValue: digits.settingValue ?? '',
          icon: 'fa-hashtag',
          suffix: 'خانة',
          placeholder: '4'
        };
      }

      if (separator) {
        group.separatorField = {
          key: separator.settingKey,
          label: 'الفاصل',
          description: separator.description || '',
          type: 'select',
          value: separator.settingValue ?? '',
          originalValue: separator.settingValue ?? '',
          icon: 'fa-minus',
          options: this.separatorOptions
        };
      }

      this.updatePreview(group);
    });
  }

  updatePreview(group: CodeGroup): void {
    const prefix = group.prefixField?.value || 'XXX';
    const sep = group.separatorField?.value || '';
    const digits = parseInt(group.digitsField?.value || '4', 10);
    const num = '0'.repeat(Math.max(1, Math.min(digits, 8))) + '1';
    group.preview = `${prefix}${sep}${num.slice(-digits)}`;
  }

  // ===== GENERAL SAVE =====
  get generalHasChanges(): boolean {
    return this.generalFields.some(f => f.value !== f.originalValue);
  }

  get generalChangesCount(): number {
    return this.generalFields.filter(f => f.value !== f.originalValue).length;
  }

  resetGeneral(): void {
    this.generalFields.forEach(f => f.value = f.originalValue);
  }

  saveGeneral(): void {
    if (!this.generalHasChanges || this.saving) return;

    this.saving = true;
    this.savingKey = 'general';
    this.saveSuccess = false;
    this.saveError = '';

    const changed = this.generalFields
      .filter(f => f.value !== f.originalValue)
      .map(f => ({ settingKey: f.key, settingValue: f.value }));

    this.settingsService.updateGroup({ settings: changed }).subscribe({
      next: () => {
        this.saving = false;
        this.savingKey = '';
        this.saveSuccess = true;
        this.generalFields.forEach(f => f.originalValue = f.value);
        setTimeout(() => this.saveSuccess = false, 3000);
      },
      error: (err) => {
        this.saving = false;
        this.savingKey = '';
        this.saveError = err?.error?.message || 'حدث خطأ أثناء الحفظ';
      }
    });
  }

  // ===== CODE GROUP SAVE =====
  codeGroupHasChanges(group: CodeGroup): boolean {
    const fields = this.getCodeGroupFields(group);
    return fields.some(f => f.value !== f.originalValue);
  }

  getCodeGroupFields(group: CodeGroup): SettingField[] {
    return [group.prefixField, group.digitsField, group.separatorField]
      .filter(Boolean) as SettingField[];
  }

  resetCodeGroup(group: CodeGroup): void {
    this.getCodeGroupFields(group).forEach(f => f.value = f.originalValue);
    this.updatePreview(group);
  }

  saveCodeGroup(group: CodeGroup): void {
    if (!this.codeGroupHasChanges(group) || this.saving) return;

    this.saving = true;
    this.savingKey = group.key;
    this.saveSuccess = false;
    this.saveError = '';

    const changed = this.getCodeGroupFields(group)
      .filter(f => f.value !== f.originalValue)
      .map(f => ({ settingKey: f.key, settingValue: f.value }));

    this.settingsService.updateGroup({ settings: changed }).subscribe({
      next: () => {
        this.saving = false;
        this.savingKey = '';
        this.saveSuccess = true;
        this.getCodeGroupFields(group).forEach(f => f.originalValue = f.value);
        setTimeout(() => this.saveSuccess = false, 3000);
      },
      error: (err) => {
        this.saving = false;
        this.savingKey = '';
        this.saveError = err?.error?.message || 'حدث خطأ أثناء الحفظ';
      }
    });
  }

  // ===== HELPERS =====
  resetField(field: SettingField, group?: CodeGroup): void {
    field.value = field.originalValue;
    if (group) this.updatePreview(group);
  }

  setTab(tab: 'General' | 'CodeFormat'): void {
    this.activeTab = tab;
    this.saveSuccess = false;
    this.saveError = '';
  }

  getSeparatorLabel(value: string): string {
    return this.separatorOptions.find(o => o.value === value)?.label || 'بدون فاصل';
  }

  getTotalChanges(): number {
    const generalChanges = this.generalChangesCount;
    const codeChanges = this.codeGroups.reduce(
      (sum, g) => sum + this.getCodeGroupFields(g).filter(f => f.value !== f.originalValue).length,
      0
    );
    return generalChanges + codeChanges;
  }

  private prettifyKey(key: string): string {
    return key.replace(/([A-Z])/g, ' $1').trim();
  }

  // أضفهما داخل الـ class
incrementDigits(group: CodeGroup): void {
  const current = parseInt(group.digitsField!.value || '1', 10);
  if (current < 10) {
    group.digitsField!.value = String(current + 1);
    this.updatePreview(group);
  }
}

decrementDigits(group: CodeGroup): void {
  const current = parseInt(group.digitsField!.value || '1', 10);
  if (current > 1) {
    group.digitsField!.value = String(current - 1);
    this.updatePreview(group);
  }
}
}