import axios from 'axios';
import { store } from '../store/store';
import { createNotification } from '../store/action-creators';
import i18n from '../i18n';

export const checkVersion = async (isForced: boolean = false) => {
  try {
    const res = await axios.get<string>(
      'https://raw.githubusercontent.com/pawelmalak/flame/master/client/.env'
    );

    const githubVersion = res.data
      .split('\n')
      .map((pair) => pair.split('='))[0][1];

    if (githubVersion !== process.env.REACT_APP_VERSION) {
      store.dispatch<any>(
        createNotification({
          title: i18n.t('common.info'),
          message: i18n.t('settings.auth.newVersionAvailable'),
          url: 'https://github.com/pawelmalak/flame/blob/master/CHANGELOG.md',
        })
      );
    } else if (isForced) {
      store.dispatch<any>(
        createNotification({
          title: i18n.t('common.info'),
          message: i18n.t('settings.auth.latestVersion'),
        })
      );
    }
  } catch (err) {
    console.log(err);
  }
};
