import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

// Redux
import { useDispatch, useSelector } from 'react-redux';
import { State } from '../../../store/reducers';
import { bindActionCreators } from 'redux';
import { actionCreators } from '../../../store';

// Typescript
import { DockerSettingsForm } from '../../../interfaces';

// UI
import { InputGroup, Button, SettingsHeadline } from '../../UI';

// Utils
import { inputHandler, dockerSettingsTemplate } from '../../../utility';

export const DockerSettings = (): JSX.Element => {
  const { t } = useTranslation();
  const { loading, config } = useSelector((state: State) => state.config);

  const dispatch = useDispatch();
  const { updateConfig } = bindActionCreators(actionCreators, dispatch);

  // Initial state
  const [formData, setFormData] = useState<DockerSettingsForm>(
    dockerSettingsTemplate
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
  };

  // Input handler
  const inputChangeHandler = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    options?: { isNumber?: boolean; isBool?: boolean }
  ) => {
    inputHandler<DockerSettingsForm>({
      e,
      options,
      setStateHandler: setFormData,
      state: formData,
    });
  };

  return (
    <form onSubmit={(e) => formSubmitHandler(e)}>
      <SettingsHeadline text={t('settings.docker.headline')} />
      {/* CUSTOM DOCKER SOCKET HOST */}
      <InputGroup>
        <label htmlFor="dockerHost">{t('settings.docker.dockerHost')}</label>
        <input
          type="text"
          id="dockerHost"
          name="dockerHost"
          placeholder="dockerHost:port"
          value={formData.dockerHost}
          onChange={(e) => inputChangeHandler(e)}
        />
      </InputGroup>

      {/* USE DOCKER API */}
      <InputGroup>
        <label htmlFor="dockerApps">{t('settings.docker.useDocker')}</label>
        <select
          id="dockerApps"
          name="dockerApps"
          value={formData.dockerApps ? 1 : 0}
          onChange={(e) => inputChangeHandler(e, { isBool: true })}
        >
          <option value={1}>{t('common.true')}</option>
          <option value={0}>{t('common.false')}</option>
        </select>
      </InputGroup>

      {/* UNPIN DOCKER APPS */}
      <InputGroup>
        <label htmlFor="unpinStoppedApps">
          {t('settings.docker.unpinStopped')}
        </label>
        <select
          id="unpinStoppedApps"
          name="unpinStoppedApps"
          value={formData.unpinStoppedApps ? 1 : 0}
          onChange={(e) => inputChangeHandler(e, { isBool: true })}
        >
          <option value={1}>{t('common.true')}</option>
          <option value={0}>{t('common.false')}</option>
        </select>
      </InputGroup>

      {/* KUBERNETES SETTINGS */}
      <SettingsHeadline text={t('settings.docker.kubernetesHeadline')} />
      {/* USE KUBERNETES */}
      <InputGroup>
        <label htmlFor="kubernetesApps">{t('settings.docker.useKubernetes')}</label>
        <select
          id="kubernetesApps"
          name="kubernetesApps"
          value={formData.kubernetesApps ? 1 : 0}
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
