import '../styles/admin.css';
import '../styles/notifications.css';

import { initAdminAuth } from './admin-auth.js';
import { initNavigation } from './admin-navigation.js';
import { initWysiwygEditors } from './admin-wysiwyg.js';
import { initProductsSection } from './admin-products.js';
import { initBlogsSection } from './admin-blogs.js';
import { initCategoriesSection } from './admin-categories.js';
import { initRatingsSection } from './admin-ratings.js';
import { initImagesSection } from './admin-images.js';
import { initOrdersSection } from './admin-orders.js';

document.addEventListener('DOMContentLoaded', async () => {
  initNavigation();
  initWysiwygEditors();
  await initAdminAuth();
  await initCategoriesSection();
  await initProductsSection();
  await initBlogsSection();
  await initRatingsSection();
  await initImagesSection();
  await initOrdersSection();
});
