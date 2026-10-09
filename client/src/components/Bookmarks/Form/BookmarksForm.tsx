import { useState, ChangeEvent, useEffect, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

// Redux
import { useDispatch, useSelector } from 'react-redux';
import { State } from '../../../store/reducers';
import { bindActionCreators } from 'redux';
import { actionCreators } from '../../../store';

// Typescript
import { Bookmark, Category, NewBookmark } from '../../../interfaces';

// UI
import { ModalForm, InputGroup, Button } from '../../UI';

// CSS
import classes from './Form.module.css';

// Utils
import { inputHandler, newBookmarkTemplate } from '../../../utility';

interface Props {
  modalHandler: () => void;
  bookmark?: Bookmark;
}

export const BookmarksForm = ({
  bookmark,
  modalHandler,
}: Props): JSX.Element => {
  const { t } = useTranslation();
  const { categories } = useSelector((state: State) => state.bookmarks);

  const dispatch = useDispatch();
  const { addBookmark, updateBookmark, createNotification } =
    bindActionCreators(actionCreators, dispatch);

  const [formData, setFormData] = useState<NewBookmark>(newBookmarkTemplate);

  // Load bookmark data if provided for editing
  useEffect(() => {
    if (bookmark) {
      setFormData({ ...bookmark });
    } else {
      setFormData(newBookmarkTemplate);
    }
  }, [bookmark]);

  const inputChangeHandler = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
    options?: { isNumber?: boolean; isBool?: boolean }
  ) => {
    inputHandler<NewBookmark>({
      e,
      options,
      setStateHandler: setFormData,
      state: formData,
    });
  };

  // Bookmarks form handler
  const formSubmitHandler = (e: FormEvent): void => {
    e.preventDefault();

    for (let field of ['name', 'url'] as const) {
      if (/^ +$/.test(formData[field])) {
        createNotification({
          title: t('common.error'),
          message: t('apps.fieldEmptyError', { field }),
        });

        return;
      }
    }

    if (formData.categoryId < 0) {
      createNotification({
        title: t('common.error'),
        message: t('bookmarks.selectCategoryError'),
      });

      return;
    }

    if (!bookmark) {
      // add new bookmark
      addBookmark(formData);
      setFormData({
        ...newBookmarkTemplate,
        categoryId: formData.categoryId,
        isPublic: formData.isPublic,
      });
    } else {
      // update
      updateBookmark(bookmark.id, formData, {
        prev: bookmark.categoryId,
        curr: formData.categoryId,
      });
      modalHandler();
    }

    setFormData({ ...newBookmarkTemplate, categoryId: formData.categoryId });
  };

  return (
    <ModalForm modalHandler={modalHandler} formHandler={formSubmitHandler}>
      {/* NAME */}
      <InputGroup>
        <label htmlFor="name">{t('bookmarks.bookmarkName')}</label>
        <input
          type="text"
          name="name"
          id="name"
          placeholder="Reddit"
          required
          value={formData.name}
          onChange={(e) => inputChangeHandler(e)}
        />
      </InputGroup>

      {/* URL */}
      <InputGroup>
        <label htmlFor="url">{t('bookmarks.bookmarkUrl')}</label>
        <input
          type="text"
          name="url"
          id="url"
          placeholder="reddit.com"
          required
          value={formData.url}
          onChange={(e) => inputChangeHandler(e)}
        />
      </InputGroup>

      {/* CATEGORY */}
      <InputGroup>
        <label htmlFor="categoryId">{t('bookmarks.bookmarkCategory')}</label>
        <select
          name="categoryId"
          id="categoryId"
          required
          onChange={(e) => inputChangeHandler(e, { isNumber: true })}
          value={formData.categoryId}
        >
          <option value={-1}>{t('bookmarks.selectCategory')}</option>
          {categories.map((category: Category): JSX.Element => {
            return (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            );
          })}
        </select>
      </InputGroup>

      {/* DESCRIPTION / NOTES */}
      <InputGroup>
        <label htmlFor="description">{t('bookmarks.bookmarkDescription')}</label>
        <textarea
          name="description"
          id="description"
          className={classes.Textarea}
          placeholder="账号/密码/私密备忘等 (支持回车多行输入，选填)"
          rows={3}
          value={formData.description || ''}
          onChange={(e) => inputChangeHandler(e)}
        />
        <span>{t('bookmarks.bookmarkDescriptionHint')}</span>
      </InputGroup>

      {/* VISIBILTY */}
      <InputGroup>
        <label htmlFor="isPublic">{t('common.visibility')}</label>
        <select
          id="isPublic"
          name="isPublic"
          value={formData.isPublic ? 1 : 0}
          onChange={(e) => inputChangeHandler(e, { isBool: true })}
        >
          <option value={1}>{t('apps.publicOption')}</option>
          <option value={0}>{t('apps.privateOption')}</option>
        </select>
      </InputGroup>

      <Button>
        {bookmark
          ? t('bookmarks.updateBookmark')
          : t('bookmarks.addNewBookmark')}
      </Button>
    </ModalForm>
  );
};
