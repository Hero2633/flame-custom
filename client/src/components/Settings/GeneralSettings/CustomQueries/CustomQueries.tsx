import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';

// Redux
import { useDispatch, useSelector } from 'react-redux';
import { State } from '../../../../store/reducers';
import { bindActionCreators } from 'redux';
import { actionCreators } from '../../../../store';

// Typescript
import { Query } from '../../../../interfaces';

// UI
import { Modal, Icon, Button, CompactTable, ActionIcons } from '../../../UI';

// Components
import { QueriesForm } from './QueriesForm';

export const CustomQueries = (): JSX.Element => {
  const { t } = useTranslation();
  const { customQueries, config } = useSelector((state: State) => state.config);

  const dispatch = useDispatch();
  const { deleteQuery, createNotification } = bindActionCreators(
    actionCreators,
    dispatch
  );

  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [editableQuery, setEditableQuery] = useState<Query | null>(null);

  const updateHandler = (query: Query) => {
    setEditableQuery(query);
    setModalIsOpen(true);
  };

  const deleteHandler = (query: Query) => {
    const currentProvider = config.defaultSearchProvider;
    const isCurrent = currentProvider === query.prefix;

    if (isCurrent) {
      createNotification({
        title: t('common.error'),
        message: t('search.cannotDeleteActive'),
      });
    } else if (
      window.confirm(t('common.delete') + '?')
    ) {
      deleteQuery(query.prefix);
    }
  };

  return (
    <Fragment>
      <Modal
        isOpen={modalIsOpen}
        setIsOpen={() => setModalIsOpen(!modalIsOpen)}
      >
        {editableQuery ? (
          <QueriesForm
            modalHandler={() => setModalIsOpen(!modalIsOpen)}
            query={editableQuery}
          />
        ) : (
          <QueriesForm modalHandler={() => setModalIsOpen(!modalIsOpen)} />
        )}
      </Modal>

      <section>
        {customQueries.length ? (
          <CompactTable headers={[t('common.name'), t('search.prefix'), t('common.actions')]}>
            {customQueries.map((q: Query, idx) => (
              <Fragment key={idx}>
                <span>{q.name}</span>
                <span>{q.prefix}</span>
                <ActionIcons>
                  <span onClick={() => updateHandler(q)}>
                    <Icon icon="mdiPencil" />
                  </span>
                  <span onClick={() => deleteHandler(q)}>
                    <Icon icon="mdiDelete" />
                  </span>
                </ActionIcons>
              </Fragment>
            ))}
          </CompactTable>
        ) : (
          <></>
        )}

        <Button
          click={() => {
            setEditableQuery(null);
            setModalIsOpen(true);
          }}
        >
          {t('search.addQuery')}
        </Button>
      </section>
    </Fragment>
  );
};
