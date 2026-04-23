import { getDb } from '../../firebase-config.js';

/**
 * Servicio para gestionar stock de artículos
 * Descuenta automáticamente stock basado en recetas de productos
 */

const getFirestore = () => window.firebase.firestore;
const getFirebaseRef = () => getFirestore().doc;
const getFieldValue = () => getFirestore().fieldValue;

/**
 * Calcula el descuento total de stock necesario para una orden
 * @param {Object} product - Documento del producto con receta
 * @param {number} quantity - Cantidad de productos a vender
 * @returns {Array} Array de { articulo_id, cantidad_a_descontar, unidad }
 */
export const calculateStockDeduction = (product, quantity = 1) => {
  const receta = product.receta || product.related_blogs || [];
  if (!receta || receta.length === 0) return [];

  return receta.map((item) => ({
    articulo_id: item.articulo_id || item.id,
    articulo_nombre: item.articulo_nombre || item.title || 'Sin nombre',
    cantidad_a_descontar: (item.cantidad || 100) * quantity,
    unidad: item.unidad || 'gramos'
  }));
};

/**
 * Valida que hay suficiente stock disponible para una orden
 * @param {Object} db - Firestore database instance
 * @param {Object} product - Documento del producto
 * @param {number} quantity - Cantidad de productos a vender
 * @returns {Promise<{ valid: boolean, message?: string }>}
 */
export const validateStockAvailable = async (db, product, quantity = 1) => {
  try {
    if (!product || !db) {
      return {
        valid: false,
        message: 'Error: Datos del producto o base de datos inválidos'
      };
    }

    const deductions = calculateStockDeduction(product, quantity);
    if (deductions.length === 0) {
      return { valid: true }; // Sin receta, no hay restricción
    }

    const firestore = getFirestore();
    const getDoc = firestore.getDoc;
    const doc = firestore.doc;
    const collection = firestore.collection;

    const articlesRef = collection(db, 'blogs');
    
    for (const deduction of deductions) {
      try {
        const articleDocRef = doc(articlesRef, deduction.articulo_id);
        const docSnap = await getDoc(articleDocRef);
        
        if (!docSnap.exists()) {
          return {
            valid: false,
            message: `Artículo "${deduction.articulo_nombre}" no encontrado en el sistema.`
          };
        }

        const article = docSnap.data();
        const currentStock = article.stock || 0;
        
        if (currentStock < deduction.cantidad_a_descontar) {
          return {
            valid: false,
            message: `Stock insuficiente de "${deduction.articulo_nombre}": necesitas ${deduction.cantidad_a_descontar} ${deduction.unidad}, tienes ${currentStock}.`
          };
        }
      } catch (itemError) {
        console.error(`Error validando artículo ${deduction.articulo_id}:`, itemError);
        return {
          valid: false,
          message: `Error al verificar stock de "${deduction.articulo_nombre}"`
        };
      }
    }

    return { valid: true };
  } catch (error) {
    console.error('Error validando stock:', error);
    return {
      valid: false,
      message: 'Error al validar el stock. Intenta de nuevo.'
    };
  }
};

/**
 * Descuenta stock automáticamente basado en la receta del producto
 * @param {Object} db - Firestore database instance
 * @param {string} productId - ID del producto
 * @param {number} quantity - Cantidad de productos vendidos
 * @returns {Promise<{ success: boolean, deducted?: Array, message?: string }>}
 */
export const deductStockFromRecipe = async (db, productId, quantity = 1) => {
  try {
    // Validar inputs
    if (!db || !productId) {
      return {
        success: false,
        message: 'Error: ID del producto o base de datos inválidos'
      };
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return {
        success: false,
        message: 'Error: La cantidad debe ser un número entero positivo'
      };
    }

    const firestore = getFirestore();
    const getDoc = firestore.getDoc;
    const updateDoc = firestore.updateDoc;
    const doc = firestore.doc;
    const collection = firestore.collection;

    // 1. Obtener el producto
    const productDocRef = doc(collection(db, 'products'), productId);
    const productSnap = await getDoc(productDocRef);

    if (!productSnap.exists()) {
      return {
        success: false,
        message: 'Producto no encontrado en la base de datos'
      };
    }

    const product = productSnap.data();
    const deductions = calculateStockDeduction(product, quantity);

    if (deductions.length === 0) {
      return {
        success: true,
        deducted: [],
        message: 'Sin artículos para descontar (producto sin receta)'
      };
    }

    // 2. Validar stock
    const validation = await validateStockAvailable(db, product, quantity);
    if (!validation.valid) {
      return {
        success: false,
        message: validation.message
      };
    }

    // 3. Descontar stock de cada artículo
    const articlesRef = collection(db, 'blogs');
    const deducted = [];
    const failed = [];

    for (const deduction of deductions) {
      try {
        const articleDocRef = doc(articlesRef, deduction.articulo_id);
        const articleSnap = await getDoc(articleDocRef);

        if (articleSnap.exists()) {
          const article = articleSnap.data();
          const newStock = Math.max(0, (article.stock || 0) - deduction.cantidad_a_descontar);

          // Actualizar stock en Firestore
          await updateDoc(articleDocRef, {
            stock: newStock,
            updated_at: firestore.serverTimestamp()
          });

          deducted.push({
            articulo_id: deduction.articulo_id,
            articulo_nombre: deduction.articulo_nombre,
            stock_anterior: article.stock || 0,
            stock_descontado: deduction.cantidad_a_descontar,
            stock_nuevo: newStock,
            unidad: deduction.unidad
          });
        } else {
          failed.push(deduction.articulo_nombre);
        }
      } catch (itemError) {
        console.error(`Error actualizando artículo ${deduction.articulo_id}:`, itemError);
        failed.push(deduction.articulo_nombre);
      }
    }

    if (failed.length > 0) {
      return {
        success: deducted.length > 0,
        deducted,
        message: `Stock descontado para ${deducted.length} artículos, pero falló en: ${failed.join(', ')}`
      };
    }

    return {
      success: true,
      deducted,
      message: `Stock descontado exitosamente para ${deducted.length} artículos`
    };
  } catch (error) {
    console.error('Error descontando stock:', error);
    return {
      success: false,
      message: `Error al descontar stock: ${error.message}`
    };
  }
};

/**
 * Verifica si el stock de un artículo está bajo
 * @param {Object} article - Documento del artículo
 * @returns {boolean} true si stock <= cantidad_minima
 */
export const isStockBelowMinimum = (article) => {
  if (!article) return false;
  const stock = article.stock || 0;
  const minimum = article.cantidad_minima || 0;
  return stock <= minimum;
};

/**
 * Obtiene todos los artículos con stock bajo
 * @param {Object} db - Firestore database instance
 * @returns {Promise<Array>} Array de artículos con stock bajo
 */
export const getLowStockArticles = async (db) => {
  try {
    const firestore = getFirestore();
    const collection = firestore.collection;
    const getDocs = firestore.getDocs;

    const articlesRef = collection(db, 'blogs');
    const snapshot = await getDocs(articlesRef);

    const lowStock = [];
    snapshot.forEach((docSnap) => {
      const article = docSnap.data();
      article.id = docSnap.id;
      
      if (isStockBelowMinimum(article)) {
        lowStock.push(article);
      }
    });

    // Ordenar por urgencia (stock más bajo primero)
    lowStock.sort((a, b) => (a.stock || 0) - (b.stock || 0));

    return lowStock;
  } catch (error) {
    console.error('Error obteniendo artículos con stock bajo:', error);
    return [];
  }
};

/**
 * Revierte el descuento de stock (para cancelaciones de órdenes)
 * @param {Object} db - Firestore database instance
 * @param {string} productId - ID del producto
 * @param {number} quantity - Cantidad de productos a revertir
 * @returns {Promise<{ success: boolean, message?: string }>}
 */
export const revertStockDeduction = async (db, productId, quantity = 1) => {
  try {
    const firestore = getFirestore();
    const getDoc = firestore.getDoc;
    const updateDoc = firestore.updateDoc;
    const doc = firestore.doc;
    const collection = firestore.collection;

    const productDocRef = doc(collection(db, 'products'), productId);
    const productSnap = await getDoc(productDocRef);

    if (!productSnap.exists()) {
      return {
        success: false,
        message: 'Producto no encontrado'
      };
    }

    const product = productSnap.data();
    const deductions = calculateStockDeduction(product, quantity);

    if (deductions.length === 0) {
      return {
        success: true,
        message: 'Sin artículos para revertir'
      };
    }

    const articlesRef = collection(db, 'blogs');

    for (const deduction of deductions) {
      const articleDocRef = doc(articlesRef, deduction.articulo_id);
      const articleSnap = await getDoc(articleDocRef);

      if (articleSnap.exists()) {
        const article = articleSnap.data();
        const newStock = (article.stock || 0) + deduction.cantidad_a_descontar;

        await updateDoc(articleDocRef, {
          stock: newStock,
          updated_at: firestore.serverTimestamp()
        });
      }
    }

    return {
      success: true,
      message: 'Stock revertido exitosamente'
    };
  } catch (error) {
    console.error('Error revirtiendo stock:', error);
    return {
      success: false,
      message: `Error al revertir stock: ${error.message}`
    };
  }
};

export const __testables = {
  calculateStockDeduction,
  isStockBelowMinimum
};
