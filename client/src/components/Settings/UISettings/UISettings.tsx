import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../../../i18n';

// Redux
import { useDispatch, useSelector } from 'react-redux';
import { State } from '../../../store/reducers';
import { bindActionCreators } from 'redux';
import { actionCreators } from '../../../store';

// Typescript
import { UISettingsForm } from '../../../interfaces';

// UI
import { InputGroup, Button, SettingsHeadline } from '../../UI';

// Utils
import { uiSettingsTemplate, inputHandler } from '../../../utility';

export const UISettings = (): JSX.Element => {
  const { t, i18n } = useTranslation();
  const { loading, config } = useSelector((state: State) => state.config);

  const dispatch = useDispatch();
  const { updateConfig } = bindActionCreators(actionCreators, dispatch);

  // Initial state
  const [formData, setFormData] = useState<UISettingsForm>(uiSettingsTemplate);

  // Get config
  useEffect(() => {
    setFormData({
      ...config,
    });
  }, [loading]);

  // Form handler
  const formSubmitHandler = async (e: FormEvent) => {
    e.preventDefault();

    // Save settings
    await updateConfig(formData);

    // Update local page title
    document.title = formData.customTitle;
  };

  // Input handler
  const inputChangeHandler = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    options?: { isNumber?: boolean; isBool?: boolean }
  ) => {
    inputHandler<UISettingsForm>({
      e,
      options,
      setStateHandler: setFormData,
      state: formData,
    });
  };

  return (
    <form onSubmit={(e) => formSubmitHandler(e)}>
      {/* === LANGUAGE SECTION === */}
      <SettingsHeadline text={t('settings.interface.languageSection')} />
      <InputGroup>
        <label htmlFor="languageSelect">{t('settings.language.label')}</label>
        <select
          id="languageSelect"
          value={i18n.language || 'zh'}
          onChange={(e) => {
            const lang = e.target.value;
            changeLanguage(lang);
            if (lang === 'zh') {
              setFormData((prev) => ({
                ...prev,
                useAmericanDate: true,
                greetingsSchema: prev.greetingsSchema === 'Good evening!;Good afternoon!;Good morning!;Good night!' ? '晚上好!;下午好!;早上好!;深夜好!' : prev.greetingsSchema,
                daySchema: prev.daySchema === 'Sunday;Monday;Tuesday;Wednesday;Thursday;Friday;Saturday' ? '星期日;星期一;星期二;星期三;星期四;星期五;星期六' : prev.daySchema,
                monthSchema: prev.monthSchema === 'January;February;March;April;May;June;July;August;September;October;November;December' ? '01;02;03;04;05;06;07;08;09;10;11;12' : prev.monthSchema,
              }));
            } else if (lang === 'en') {
              setFormData((prev) => ({
                ...prev,
                useAmericanDate: false,
                greetingsSchema: prev.greetingsSchema === '晚上好!;下午好!;早上好!;深夜好!' ? 'Good evening!;Good afternoon!;Good morning!;Good night!' : prev.greetingsSchema,
                daySchema: prev.daySchema === '星期日;星期一;星期二;星期三;星期四;星期五;星期六' ? 'Sunday;Monday;Tuesday;Wednesday;Thursday;Friday;Saturday' : prev.daySchema,
                monthSchema: prev.monthSchema === '01;02;03;04;05;06;07;08;09;10;11;12' ? 'January;February;March;April;May;June;July;August;September;October;November;December' : prev.monthSchema,
              }));
            }
          }}
        >
          <option value="zh">{t('settings.language.zh')}</option>
          <option value="en">{t('settings.language.en')}</option>
        </select>
      </InputGroup>

      {/* === OTHER OPTIONS === */}
      <SettingsHeadline text={t('settings.interface.miscHeadline')} />
      {/* FONT SCALE */}
      <InputGroup>
        <label htmlFor="fontScale">{t('settings.interface.fontScale')}</label>
        <select
          id="fontScale"
          name="fontScale"
          value={formData.fontScale || '1.15'}
          onChange={(e) => {
            inputChangeHandler(e);
            document.documentElement.style.setProperty('--font-scale', e.target.value);
          }}
        >
          <option value="0.85">{t('settings.interface.fontScaleCompact')}</option>
          <option value="1.0">{t('settings.interface.fontScaleStandard')}</option>
          <option value="1.15">{t('settings.interface.fontScaleComfort')}</option>
          <option value="1.3">{t('settings.interface.fontScaleLarge')}</option>
        </select>
      </InputGroup>
      {/* PAGE TITLE */}
      <InputGroup>
        <label htmlFor="customTitle">{t('settings.interface.customTitle')}</label>
        <input
          type="text"
          id="customTitle"
          name="customTitle"
          placeholder="Flame"
          value={formData.customTitle}
          onChange={(e) => inputChangeHandler(e)}
        />
      </InputGroup>

      {/* === SEARCH OPTIONS === */}
      <SettingsHeadline text={t('settings.interface.searchHeadline')} />
      {/* HIDE SEARCHBAR */}
      <InputGroup>
        <label htmlFor="hideSearch">{t('settings.interface.hideSearch')}</label>
        <select
          id="hideSearch"
          name="hideSearch"
          value={formData.hideSearch ? 1 : 0}
          onChange={(e) => inputChangeHandler(e, { isBool: true })}
        >
          <option value={1}>{t('common.true')}</option>
          <option value={0}>{t('common.false')}</option>
        </select>
      </InputGroup>

      {/* AUTOFOCUS SEARCHBAR */}
      <InputGroup>
        <label htmlFor="disableAutofocus">
          {t('settings.interface.disableAutofocus')}
        </label>
        <select
          id="disableAutofocus"
          name="disableAutofocus"
          value={formData.disableAutofocus ? 1 : 0}
          onChange={(e) => inputChangeHandler(e, { isBool: true })}
        >
          <option value={1}>{t('common.true')}</option>
          <option value={0}>{t('common.false')}</option>
        </select>
      </InputGroup>

      {/* === HEADER OPTIONS === */}
      <SettingsHeadline text={t('settings.interface.headerHeadline')} />
      {/* HIDE HEADER */}
      <InputGroup>
        <label htmlFor="hideHeader">
          {t('settings.interface.hideHeader')}
        </label>
        <select
          id="hideHeader"
          name="hideHeader"
          value={formData.hideHeader ? 1 : 0}
          onChange={(e) => inputChangeHandler(e, { isBool: true })}
        >
          <option value={1}>{t('common.true')}</option>
          <option value={0}>{t('common.false')}</option>
        </select>
      </InputGroup>

      {/* HIDE DATE */}
      <InputGroup>
        <label htmlFor="hideDate">{t('settings.interface.hideDate')}</label>
        <select
          id="hideDate"
          name="hideDate"
          value={formData.hideDate ? 1 : 0}
          onChange={(e) => inputChangeHandler(e, { isBool: true })}
        >
          <option value={1}>{t('common.true')}</option>
          <option value={0}>{t('common.false')}</option>
        </select>
      </InputGroup>

      {/* HIDE TIME */}
      <InputGroup>
        <label htmlFor="showTime">{t('settings.interface.hideTime')}</label>
        <select
          id="showTime"
          name="showTime"
          value={formData.showTime ? 1 : 0}
          onChange={(e) => inputChangeHandler(e, { isBool: true })}
        >
          <option value={0}>{t('common.true')}</option>
          <option value={1}>{t('common.false')}</option>
        </select>
      </InputGroup>

      {/* DATE FORMAT */}
      <InputGroup>
        <label htmlFor="useAmericanDate">
          {t('settings.interface.dateFormatting')}
        </label>
        <select
          id="useAmericanDate"
          name="useAmericanDate"
          value={formData.useAmericanDate ? 1 : 0}
          onChange={(e) => inputChangeHandler(e, { isBool: true })}
        >
          <option value={1}>{t('settings.interface.formatAmerican')}</option>
          <option value={0}>{t('settings.interface.formatStandard')}</option>
        </select>
      </InputGroup>

      {/* CUSTOM GREETINGS */}
      <InputGroup>
        <label htmlFor="greetingsSchema">
          {t('settings.interface.customGreetings')}
        </label>
        <input
          type="text"
          id="greetingsSchema"
          name="greetingsSchema"
          placeholder={i18n.language === 'zh' ? '晚上好!;下午好!;早上好!;深夜好!' : 'Good day;Hi;Bye!'}
          value={formData.greetingsSchema}
          onChange={(e) => inputChangeHandler(e)}
        />
        <span>
          {t('settings.interface.greetingsHint')}
        </span>
      </InputGroup>

      {/* CUSTOM DAYS */}
      <InputGroup>
        <label htmlFor="daySchema">
          {t('settings.interface.customDays')}
        </label>
        <input
          type="text"
          id="daySchema"
          name="daySchema"
          placeholder={i18n.language === 'zh' ? '星期日;星期一;星期二...' : 'Sunday;Monday;Tuesday'}
          value={formData.daySchema}
          onChange={(e) => inputChangeHandler(e)}
        />
        <span>{t('settings.interface.daysHint')}</span>
      </InputGroup>

      {/* CUSTOM MONTHS */}
      <InputGroup>
        <label htmlFor="monthSchema">
          {t('settings.interface.customMonths')}
        </label>
        <input
          type="text"
          id="monthSchema"
          name="monthSchema"
          placeholder={i18n.language === 'zh' ? '01;02;03...' : 'January;February;March'}
          value={formData.monthSchema}
          onChange={(e) => inputChangeHandler(e)}
        />
        <span>{t('settings.interface.monthsHint')}</span>
      </InputGroup>

      {/* === SECTIONS OPTIONS === */}
      <SettingsHeadline text={t('settings.interface.sectionsHeadline')} />
      {/* HIDE APPS */}
      <InputGroup>
        <label htmlFor="hideApps">{t('settings.interface.hideApps')}</label>
        <select
          id="hideApps"
          name="hideApps"
          value={formData.hideApps ? 1 : 0}
          onChange={(e) => inputChangeHandler(e, { isBool: true })}
        >
          <option value={1}>{t('common.true')}</option>
          <option value={0}>{t('common.false')}</option>
        </select>
      </InputGroup>

      {/* HIDE BOOKMARK CATEGORIES */}
      <InputGroup>
        <label htmlFor="hideCategories">
          {t('settings.interface.hideCategories')}
        </label>
        <select
          id="hideCategories"
          name="hideCategories"
          value={formData.hideCategories ? 1 : 0}
          onChange={(e) => inputChangeHandler(e, { isBool: true })}
        >
          <option value={1}>{t('common.true')}</option>
          <option value={0}>{t('common.false')}</option>
        </select>
      </InputGroup>

      <Button>{t('common.save')}</Button>
    </form>
  );
};
