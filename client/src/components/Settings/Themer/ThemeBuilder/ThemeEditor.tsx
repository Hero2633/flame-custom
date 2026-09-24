import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';

// Redux
import { useSelector, useDispatch } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Theme } from '../../../../interfaces';
import { actionCreators } from '../../../../store';
import { State } from '../../../../store/reducers';

// Other
import { ActionIcons, CompactTable, Icon, ModalForm } from '../../../UI';

interface Props {
  modalHandler: () => void;
}

export const ThemeEditor = (props: Props): JSX.Element => {
  const { t } = useTranslation();
  const {
    theme: { userThemes },
  } = useSelector((state: State) => state);

  const { deleteTheme, editTheme } = bindActionCreators(
    actionCreators,
    useDispatch()
  );

  const updateHandler = (theme: Theme) => {
    props.modalHandler();
    editTheme(theme);
  };

  const deleteHandler = (theme: Theme) => {
    if (window.confirm(t('common.delete') + ` ${theme.name}?`)) {
      deleteTheme(theme.name);
    }
  };

  return (
    <ModalForm formHandler={() => {}} modalHandler={props.modalHandler}>
      <CompactTable headers={[t('common.name'), t('common.actions')]}>
        {userThemes.map((t, idx) => (
          <Fragment key={idx}>
            <span>{t.name}</span>
            <ActionIcons>
              <span onClick={() => updateHandler(t)}>
                <Icon icon="mdiPencil" />
              </span>
              <span onClick={() => deleteHandler(t)}>
                <Icon icon="mdiDelete" />
              </span>
            </ActionIcons>
          </Fragment>
        ))}
      </CompactTable>
    </ModalForm>
  );
};
