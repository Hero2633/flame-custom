// React
import { useState, useEffect, FormEvent, ChangeEvent, Fragment } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

// Typescript
import { Query, GeneralForm } from '../../../interfaces';

// Components
import { CustomQueries } from './CustomQueries/CustomQueries';

// UI
import { Button, SettingsHeadline, InputGroup } from '../../UI';

// Utils
import { inputHandler, generalSettingsTemplate } from '../../../utility';

// Data
import searchQueries from '../../../utility/searchQueries.json';

// Redux
import { State } from '../../../store/reducers';
import { bindActionCreators } from 'redux';
import { actionCreators } from '../../../store';

export const GeneralSettings = (): JSX.Element => {
  const { t } = useTranslation();
  const {
    config: { loading, customQueries, config },
    bookmarks: { categories },
  } = useSelector((state: State) => state);

  const dispatch = useDispatch();
  const { updateConfig, sortApps, sortCategories, sortBookmarks } =
    bindActionCreators(actionCreators, dispatch);

  const queries = searchQueries.queries;

  // Initial state
  const [formData, setFormData] = useState<GeneralForm>(
    generalSettingsTemplate
  );

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

    // Sort entities with new settings
    if (formData.useOrdering !== config.useOrdering) {
      sortApps();
      sortCategories();

      for (let { id } of categories) {
        sortBookmarks(id);
      }
    }
  };

  // Input handler
  const inputChangeHandler = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    options?: { isNumber?: boolean; isBool?: boolean }
  ) => {
    inputHandler<GeneralForm>({
      e,
      options,
      setStateHandler: setFormData,
      state: formData,
    });
  };

  return (
    <Fragment>
      <form
        onSubmit={(e) => formSubmitHandler(e)}
        style={{ marginBottom: '30px' }}
      >
        {/* === GENERAL OPTIONS === */}
        <SettingsHeadline text={t('settings.general.headline')} />
        {/* SORT TYPE */}
        <InputGroup>
          <label htmlFor="useOrdering">{t('settings.general.sortingType')}</label>
          <select
            id="useOrdering"
            name="useOrdering"
            value={formData.useOrdering}
            onChange={(e) => inputChangeHandler(e)}
          >
            <option value="createdAt">{t('settings.general.byCreationDate')}</option>
            <option value="name">{t('settings.general.alphabeticalOrder')}</option>
            <option value="orderId">{t('settings.general.customOrder')}</option>
          </select>
        </InputGroup>

        {/* === APPS OPTIONS === */}
        <SettingsHeadline text={t('settings.general.appsHeadline')} />
        {/* PIN APPS */}
        <InputGroup>
          <label htmlFor="pinAppsByDefault">
            {t('settings.general.pinAppsByDefault')}
          </label>
          <select
            id="pinAppsByDefault"
            name="pinAppsByDefault"
            value={formData.pinAppsByDefault ? 1 : 0}
            onChange={(e) => inputChangeHandler(e, { isBool: true })}
          >
            <option value={1}>{t('common.true')}</option>
            <option value={0}>{t('common.false')}</option>
          </select>
        </InputGroup>

        {/* APPS OPPENING */}
        <InputGroup>
          <label htmlFor="appsSameTab">{t('settings.general.appsSameTab')}</label>
          <select
            id="appsSameTab"
            name="appsSameTab"
            value={formData.appsSameTab ? 1 : 0}
            onChange={(e) => inputChangeHandler(e, { isBool: true })}
          >
            <option value={1}>{t('common.true')}</option>
            <option value={0}>{t('common.false')}</option>
          </select>
        </InputGroup>

        {/* === BOOKMARKS OPTIONS === */}
        <SettingsHeadline text={t('settings.general.bookmarksHeadline')} />
        {/* PIN CATEGORIES */}
        <InputGroup>
          <label htmlFor="pinCategoriesByDefault">
            {t('settings.general.pinCategoriesByDefault')}
          </label>
          <select
            id="pinCategoriesByDefault"
            name="pinCategoriesByDefault"
            value={formData.pinCategoriesByDefault ? 1 : 0}
            onChange={(e) => inputChangeHandler(e, { isBool: true })}
          >
            <option value={1}>{t('common.true')}</option>
            <option value={0}>{t('common.false')}</option>
          </select>
        </InputGroup>

        {/* BOOKMARKS OPPENING */}
        <InputGroup>
          <label htmlFor="bookmarksSameTab">
            {t('settings.general.bookmarksSameTab')}
          </label>
          <select
            id="bookmarksSameTab"
            name="bookmarksSameTab"
            value={formData.bookmarksSameTab ? 1 : 0}
            onChange={(e) => inputChangeHandler(e, { isBool: true })}
          >
            <option value={1}>{t('common.true')}</option>
            <option value={0}>{t('common.false')}</option>
          </select>
        </InputGroup>

        {/* === SEARCH OPTIONS === */}
        <SettingsHeadline text={t('settings.general.searchHeadline')} />
        <InputGroup>
          <label htmlFor="defaultSearchProvider">{t('settings.general.primarySearchProvider')}</label>
          <select
            id="defaultSearchProvider"
            name="defaultSearchProvider"
            value={formData.defaultSearchProvider}
            onChange={(e) => inputChangeHandler(e)}
          >
            {[...queries, ...customQueries].map((query: Query, idx) => {
              const isCustom = idx >= queries.length;

              return (
                <option key={idx} value={query.prefix}>
                  {isCustom && '+'} {query.name}
                </option>
              );
            })}
          </select>
        </InputGroup>

        {formData.defaultSearchProvider === 'l' && (
          <InputGroup>
            <label htmlFor="secondarySearchProvider">
              {t('settings.general.secondarySearchProvider')}
            </label>
            <select
              id="secondarySearchProvider"
              name="secondarySearchProvider"
              value={formData.secondarySearchProvider}
              onChange={(e) => inputChangeHandler(e)}
            >
              {[...queries, ...customQueries].map((query: Query, idx) => {
                const isCustom = idx >= queries.length;

                return (
                  <option key={idx} value={query.prefix}>
                    {isCustom && '+'} {query.name}
                  </option>
                );
              })}
            </select>
            <span>
              {t('settings.general.secondarySearchHint')}
            </span>
          </InputGroup>
        )}

        <InputGroup>
          <label htmlFor="searchSameTab">
            {t('settings.general.searchSameTab')}
          </label>
          <select
            id="searchSameTab"
            name="searchSameTab"
            value={formData.searchSameTab ? 1 : 0}
            onChange={(e) => inputChangeHandler(e, { isBool: true })}
          >
            <option value={1}>{t('common.true')}</option>
            <option value={0}>{t('common.false')}</option>
          </select>
        </InputGroup>

        <Button>{t('common.save')}</Button>
      </form>

      {/* CUSTOM QUERIES */}
      <SettingsHeadline text={t('settings.general.customSearchProviders')} />
      <CustomQueries />
    </Fragment>
  );
};
