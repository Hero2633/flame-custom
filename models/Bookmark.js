const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const Bookmark = sequelize.define(
  'Bookmark',
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    url: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    icon: {
      type: DataTypes.STRING,
      defaultValue: '',
    },
    isPublic: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
    },
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
  },
  {
    tableName: 'bookmarks',
  }
);

module.exports = Bookmark;
