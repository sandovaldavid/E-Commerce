import {DataTypes} from 'sequelize';
import {sequelize} from './index.js';
import User from './user.js';
import Product from './product.js';

const Review = sequelize.define('Review', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  review_text: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  timestamps: false,
});

Review.belongsTo(User, {foreignKey: 'usuario_id'});
Review.belongsTo(Product, {foreignKey: 'producto_id'});

export default Review;


