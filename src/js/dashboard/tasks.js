import { db } from '../../firebase-config.js';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp } from 'firebase/firestore';

const tasksCollectionRef = collection(db, 'tasks');
let currentTasks = []; // Para mantener el estado de las tareas cargadas

// Elementos del DOM
const tasksListElement = document.getElementById('tasks-list');
const taskModalElement = document.getElementById('task-modal');
const taskFormElement = document.getElementById('task-form');
const modalTitleElement = document.getElementById('modal-title');
const taskIdInput = document.getElementById('task-id');
const emptyTasksElement = document.getElementById('empty-tasks');
const loadingIndicator = document.querySelector('.loading-indicator');

// Función para mostrar/ocultar el indicador de carga
const showLoading = (show) => {
    if (loadingIndicator) loadingIndicator.style.display = show ? 'block' : 'none';
};

// Función para mostrar/ocultar el mensaje de tareas vacías
const showEmptyState = (show) => {
    if (emptyTasksElement) emptyTasksElement.style.display = show ? 'flex' : 'none';
};

// Cargar tareas desde Firestore
export const loadTasks = async (userId) => {
    showLoading(true);
    showEmptyState(false);
    if (!tasksListElement) return;
    tasksListElement.innerHTML = ''; // Limpiar lista antes de cargar
    try {
        const q = query(tasksCollectionRef, where("userId", "==", userId), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        currentTasks = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        displayTasks(currentTasks);
    } catch (error) {
        console.error("Error al cargar tareas: ", error);
        if (tasksListElement) tasksListElement.innerHTML = '<p class="error-message">Error al cargar las tareas.</p>';
    }
    showLoading(false);
};

// Mostrar tareas en el DOM
export const displayTasks = (tasksToDisplay) => {
    if (!tasksListElement) return;
    tasksListElement.innerHTML = ''; // Limpiar la lista actual
    if (tasksToDisplay.length === 0) {
        showEmptyState(true);
        return;
    }
    showEmptyState(false);

    tasksToDisplay.forEach(task => {
        const taskItem = document.createElement('div');
        taskItem.classList.add('task-item');
        if (task.completed) {
            taskItem.classList.add('completed');
        }
        taskItem.dataset.id = task.id;

        const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Sin fecha';

        taskItem.innerHTML = `
            <div class="task-item-header">
                <h3>${task.title}</h3>
                <div class="task-item-actions">
                    <input type="checkbox" class="task-status-checkbox" ${task.completed ? 'checked' : ''} title="Marcar como completada">
                    <button class="btn-icon edit-task-btn" title="Editar tarea"><i class="bi bi-pencil-square"></i></button>
                    <button class="btn-icon delete-task-btn" title="Eliminar tarea"><i class="bi bi-trash"></i></button>
                </div>
            </div>
            <p class="task-description">${task.description || 'Sin descripción'}</p>
            <p class="task-due-date">Vencimiento: ${dueDate}</p>
        `;
        tasksListElement.appendChild(taskItem);
    });
};

// Filtrar tareas
export const filterTasks = (filter) => {
    let filteredTasks = [];
    if (filter === 'all') {
        filteredTasks = currentTasks;
    } else if (filter === 'pending') {
        filteredTasks = currentTasks.filter(task => !task.completed);
    } else if (filter === 'completed') {
        filteredTasks = currentTasks.filter(task => task.completed);
    }
    displayTasks(filteredTasks);
};

// Abrir modal de tarea (para crear o editar)
export const openTaskModal = (taskId = null) => {
    if (!taskModalElement || !taskFormElement || !modalTitleElement || !taskIdInput) return;
    taskFormElement.reset();
    if (taskId) {
        modalTitleElement.textContent = 'Editar Tarea';
        const task = currentTasks.find(t => t.id === taskId);
        if (task) {
            document.getElementById('task-title').value = task.title;
            document.getElementById('task-description').value = task.description || '';
            document.getElementById('task-due-date').value = task.dueDate || '';
            taskIdInput.value = taskId;
        }
    } else {
        modalTitleElement.textContent = 'Nueva Tarea';
        taskIdInput.value = '';
    }
    taskModalElement.style.display = 'block';
};

// Cerrar modal de tarea
export const closeTaskModal = () => {
    if (taskModalElement) taskModalElement.style.display = 'none';
};

// Guardar tarea (nueva o existente)
export const saveTask = async (event, userId) => {
    event.preventDefault();
    if (!userId) {
        alert('Debes iniciar sesión para guardar tareas.');
        return;
    }

    const title = document.getElementById('task-title').value;
    const description = document.getElementById('task-description').value;
    const dueDate = document.getElementById('task-due-date').value;
    const id = document.getElementById('task-id').value;

    if (!title) {
        alert('El título de la tarea es obligatorio.');
        return;
    }

    const taskData = {
        userId,
        title,
        description,
        dueDate,
        completed: false, // Por defecto, las tareas nuevas no están completadas
    };

    try {
        if (id) {
            // Actualizar tarea existente
            const taskRef = doc(db, 'tasks', id);
            // No actualizamos createdAt, solo updatedAt si es necesario
            const existingTask = currentTasks.find(t => t.id === id);
            await updateDoc(taskRef, { 
                ...taskData,
                completed: existingTask ? existingTask.completed : false, // Mantenemos el estado completed
                updatedAt: serverTimestamp()
            });
        } else {
            // Crear nueva tarea
            await addDoc(tasksCollectionRef, { 
                ...taskData, 
                createdAt: serverTimestamp() 
            });
        }
        closeTaskModal();
        loadTasks(userId); // Recargar tareas
    } catch (error) {
        console.error("Error al guardar la tarea: ", error);
        alert('Error al guardar la tarea.');
    }
};

// Eliminar tarea
export const deleteTask = async (taskId, userId) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta tarea?')) return;
    try {
        await deleteDoc(doc(db, 'tasks', taskId));
        loadTasks(userId); // Recargar tareas
    } catch (error) {
        console.error("Error al eliminar la tarea: ", error);
        alert('Error al eliminar la tarea.');
    }
};

// Cambiar estado de completado de una tarea
export const toggleTaskStatus = async (taskId, userId, completed) => {
    try {
        const taskRef = doc(db, 'tasks', taskId);
        await updateDoc(taskRef, { 
            completed: completed,
            updatedAt: serverTimestamp()
        });
        loadTasks(userId); // Recargar tareas para reflejar el cambio visualmente
    } catch (error) {
        console.error("Error al actualizar estado de la tarea: ", error);
        alert('Error al actualizar el estado de la tarea.');
    }
};

// Setup inicial de event listeners (si es necesario fuera del manejador de auth)
export const setupEventListeners = () => {
    // Podrías mover aquí listeners que no dependan directamente del estado de auth,
    // pero en este caso, la mayoría están ligados al usuario logueado.
};
