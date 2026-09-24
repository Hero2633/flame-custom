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

  const [useCustomIcon, toggleUseCustomIcon] = useState<boolean>(false);
  const [customIcon, setCustomIcon] = useState<File | null>(null);

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
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    options?: { isNumber?: boolean; isBool?: boolean }
  ) => {
    inputHandler<NewBookmark>({
      e,
      options,
      setStateHandler: setFormData,
      state: formData,
    });
  };

  const fileChangeHandler = (e: ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files) {
      setCustomIcon(e.target.files[0]);
    }
  };

  // Bookmarks form handler
  const formSubmitHandler = (e: FormEvent): void => {
    e.preventDefault();

    for (let field of ['name', 'url', 'icon'] as const) {
      if (/^ +$/.test(formData[field])) {
        createNotification({
          title: t('common.error'),
          message: t('apps.fieldEmptyError', { field }),
        });

        return;
      }
    }

    const createFormData = (): FormData => {
      const data = new FormData();
      if (customIcon) {
        data.append('icon', customIcon);
      }
      data.append('name', formData.name);
      data.append('url', formData.url);
      data.append('categoryId', `${formData.categoryId}`);
      data.append('isPublic', `${formData.isPublic ? 1 : 0}`);

      return data;
    };

    const checkCategory = (): boolean => {
      if (formData.categoryId < 0) {
        createNotification({
          title: t('common.error'),
          message: t('bookmarks.selectCategoryError'),
        });

        return false;
      }

      return true;
    };

    if (!bookmark) {
      // add new bookmark
      if (!checkCategory()) return;

      if (formData.categoryId < 0) {
        createNotification({
          title: t('common.error'),
          message: t('bookmarks.selectCategoryError'),
        });
        return;
      }

      if (customIcon) {
        const data = createFormData();
        addBookmark(data);
      } else {
        addBookmark(formData);
      }

      setFormData({
        ...newBookmarkTemplate,
        categoryId: formData.categoryId,
        isPublic: formData.isPublic,
      });
    } else {
      // update
      if (!checkCategory()) return;

      if (customIcon) {
        const data = createFormData();
        updateBookmark(bookmark.id, data, {
          prev: bookmark.categoryId,
          curr: formData.categoryId,
        });
      } else {
        updateBookmark(bookmark.id, formData, {
          prev: bookmark.categoryId,
          curr: formData.categoryId,
        });
      }

      modalHandler();
    }

    setFormData({ ...newBookmarkTemplate, categoryId: formData.categoryId });
    setCustomIcon(null);
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

      {/* ICON */}
      {!useCustomIcon ? (
        // mdi
        <InputGroup>
          <label htmlFor="icon">{t('apps.appIcon')}</label>
          <input
            type="text"
            name="icon"
            id="icon"
            placeholder="book-open-outline"
            value={formData.icon}
            onChange={(e) => inputChangeHandler(e)}
          />
          <span>
            {t('apps.iconReference')}
            <a href="https://materialdesignicons.com/" target="blank">
              {' '}
              {t('apps.clickReference')}
            </a>
          </span>
          <span
            onClick={() => toggleUseCustomIcon(!useCustomIcon)}
            className={classes.Switch}
          >
            {t('apps.switchToUpload')}
          </span>
        </InputGroup>
      ) : (
        // custom
        <InputGroup>
          <label htmlFor="icon">{t('apps.appIcon')}</label>
          <input
            type="file"
            name="icon"
            id="icon"
            onChange={(e) => fileChangeHandler(e)}
            accept=".jpg,.jpeg,.png,.svg,.ico"
          />
          <span
            onClick={() => {
              setCustomIcon(null);
              toggleUseCustomIcon(!useCustomIcon);
            }}
            className={classes.Switch}
          >
            {t('apps.switchToMDI')}
          </span>
        </InputGroup>
      )}

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
