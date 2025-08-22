import { getDb } from '../../firebase-config';

const TASKS_COLLECTION = 'tasks';

/**
 * Obtener todas las tareas de un usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise} - Resultado de la operación
 */
export const getUserTasks = async (userId) => {
    try {
        const db = await getDb();
        const { collection, query, where, orderBy, getDocs } = await import('firebase/firestore');
        const tasksQuery = query(
            collection(db, TASKS_COLLECTION),
            where('userId', '==', userId),
            orderBy('completed', 'asc'),
            orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(tasksQuery);
        const tasks = [];
        
        querySnapshot.forEach((doc) => {
            tasks.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return { success: true, tasks };
    } catch (error) {
        console.error('Error al obtener tareas:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Crear una nueva tarea
 * @param {string} userId - ID del usuario
 * @param {object} taskData - Datos de la tarea
 * @returns {Promise} - Resultado de la operación
 */
export const createTask = async (userId, taskData) => {
    try {
        const db = await getDb();
        const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
        const docRef = await addDoc(collection(db, TASKS_COLLECTION), {
            ...taskData,
            userId,
            completed: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        
        return { 
            success: true, 
            task: {
                id: docRef.id,
                ...taskData,
                userId,
                completed: false
            }
        };
    } catch (error) {
        console.error('Error al crear tarea:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Actualizar una tarea existente
 * @param {string} taskId - ID de la tarea
 * @param {object} taskData - Datos actualizados de la tarea
 * @returns {Promise} - Resultado de la operación
 */
export const updateTask = async (taskId, taskData) => {
    try {
        const db = await getDb();
        const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
        const taskRef = doc(db, TASKS_COLLECTION, taskId);
        await updateDoc(taskRef, {
            ...taskData,
            updatedAt: serverTimestamp()
        });
        
        return { 
            success: true, 
            task: {
                id: taskId,
                ...taskData
            }
        };
    } catch (error) {
        console.error('Error al actualizar tarea:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Marcar una tarea como completada o pendiente
 * @param {string} taskId - ID de la tarea
 * @param {boolean} completed - Estado de completado
 * @returns {Promise} - Resultado de la operación
 */
export const toggleTaskCompletion = async (taskId, completed) => {
    try {
        const db = await getDb();
        const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
        const taskRef = doc(db, TASKS_COLLECTION, taskId);
        await updateDoc(taskRef, {
            completed,
            updatedAt: serverTimestamp()
        });
        
        return { success: true };
    } catch (error) {
        console.error('Error al cambiar estado de la tarea:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Eliminar una tarea
 * @param {string} taskId - ID de la tarea
 * @returns {Promise} - Resultado de la operación
 */
export const deleteTask = async (taskId) => {
    try {
    const db = await getDb();
    const { deleteDoc, doc } = await import('firebase/firestore');
    await deleteDoc(doc(db, TASKS_COLLECTION, taskId));
        return { success: true };
    } catch (error) {
        console.error('Error al eliminar tarea:', error);
        return { success: false, error: error.message };
    }
};