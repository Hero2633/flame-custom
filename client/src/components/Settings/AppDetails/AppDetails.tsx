import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';

// UI
import { Button, SettingsHeadline } from '../../UI';
import { AuthForm } from './AuthForm/AuthForm';
import classes from './AppDetails.module.css';

// Store
import { useSelector } from 'react-redux';
import { State } from '../../../store/reducers';

// Other
import { checkVersion } from '../../../utility';

export const AppDetails = (): JSX.Element => {
  const { t } = useTranslation();
  const { isAuthenticated } = useSelector((state: State) => state.auth);

  return (
    <Fragment>
      <SettingsHeadline text={t('settings.auth.headline')} />
      <AuthForm />

      {isAuthenticated && (
        <Fragment>
          <hr className={classes.separator} />

          <div>
            <SettingsHeadline text={t('settings.auth.versionHeadline')} />
            <p className={classes.text}>
              <a
                href="https://github.com/pawelmalak/flame"
                target="_blank"
                rel="noreferrer"
              >
                Flame
              </a>{' '}
              {t('settings.auth.versionText')} {process.env.REACT_APP_VERSION}
            </p>

            <p className={classes.text}>
              <a
                href="https://github.com/pawelmalak/flame/blob/master/CHANGELOG.md"
                target="_blank"
                rel="noreferrer"
              >
                {t('settings.auth.seeChangelog')}
              </a>
            </p>

            <Button click={() => checkVersion(true)}>
              {t('settings.auth.checkForUpdates')}
            </Button>
          </div>
        </Fragment>
      )}
    </Fragment>
  );
};
