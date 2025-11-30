//Вершины(узлы)
let nodes = new vis.DataSet([]);
//Рёбра
let edges = new vis.DataSet([]);
//HTML элемент, где будет отрисовываться граф
let container = document.getElementById('myNetwork');

let network = null;
let editingNodeId = null;
let editingEdgeId = null;

// Переменные для обхода графа
let isTraversing = false;
let traversalTimeout = null;

// Конфигурация узлов по умолчанию
const NODE_CONFIG = {
    shape: 'circle',
    color: {
        background: '#97C2FC',
        border: '#2B7CE9',
        highlight: {
            background: '#D2E5FF',
            border: '#2B7CE9'
        },
        hover: {
            background: '#4ECDC4',
            border: '#00A896'
        }
    },
    font: {
        color: '#2c3e50',
        size: 14,
        face: 'Arial',
    },
    borderWidth: 2,
    shadow: true
};

// Конфигурация рёбер по умолчанию
const EDGE_CONFIG = {
    width: 2,
    smooth: false,
    font: {
        size: 14,
        align: 'middle'
    },
    color: {
        color: '#2B7CE9',
        highlight: '#FF6B6B',
        hover: '#4ECDC4'
    }
};

//Обьект с данными для визуализации
let data = {
    nodes: nodes,
    edges: edges
};

//Настройка визуализации
let options = {
    edges: {
        arrows: {
            to: { enabled: false, scaleFactor: 1 }
        },
        width: 2,
        smooth: false,
        font: {
            size: 14,
            align: 'middle'
        },
        color: {
            color: '#2B7CE9',
            highlight: '#FF6B6B',
            hover: '#4ECDC4'
        }
    },
    physics: {
        enabled: false
    },
    interaction: {
        //Можно перетаскивать узлы мышкой
        dragNodes: true,
        //Можно выделять элементы
        selectable: true,
        //При выделении узла подсвечиваются связанные рёбра
        selectConnectedEdges: true,
        //Подсветка при наведении
        hover: true,
        // Включение создания рёбер перетаскиванием
        navigationButtons: true,
        keyboard: true
    },
    manipulation: {
        enabled: false
    }
};

// Функция проверки веса на число
function isValidWeight(weight) {
    if (weight === null || weight === undefined || weight === '') {
        return true; // Пустой вес разрешен
    }
    
    // Проверяем, является ли значение числом
    const num = parseFloat(weight);
    return !isNaN(num) && isFinite(num);
}

function setupEventListeners() {
    // Обработка нажатия Enter в поле ввода вершины
    document.getElementById('nodeId').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            addNodeFromInput();
        }
    });

    // Обработка Enter в поле редактирования вершины
    document.getElementById('editNodeId').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            saveNodeEdit();
        }
    });

    // Обработка Escape для отмены редактирования вершины
    document.getElementById('editNodeId').addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            cancelNodeEdit();
        }
    });

    // Обработка клавиши Delete для удаления выделенного
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Delete') {
            e.preventDefault();
            removeSelected();
        }
        
    });

    // Обработчики для вершин
    document.getElementById('addNodeBtn').addEventListener('click', addNodeFromInput);
    document.getElementById('clearBtn').addEventListener('click', clearGraph);
    document.getElementById('editNodeBtn').addEventListener('click', startEditSelectedNode);
    document.getElementById('saveEditBtn').addEventListener('click', saveNodeEdit);
    document.getElementById('cancelEditBtn').addEventListener('click', cancelNodeEdit);

    // Обработчики для рёбер
    document.getElementById('addEdgeBtn').addEventListener('click', addEdgeFromInput);
    document.getElementById('editEdgeBtn').addEventListener('click', startEditSelectedEdge);
    document.getElementById('saveEdgeEditBtn').addEventListener('click', saveEdgeEdit);
    document.getElementById('cancelEdgeEditBtn').addEventListener('click', cancelEdgeEdit);

    // Обработка Enter в полях ввода рёбер
    document.getElementById('fromNode').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            addEdgeFromInput();
        }
    });

    document.getElementById('toNode').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            addEdgeFromInput();
        }
    });

    document.getElementById('edgeWeight').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            addEdgeFromInput();
        }
    });

    // Обработка Enter в поле редактирования рёбер
    document.getElementById('editEdgeWeight').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            saveEdgeEdit();
        }
    });

    // Обработка Escape для отмены редактирования ребра
    document.getElementById('editEdgeWeight').addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            cancelEdgeEdit();
        }
    });

    // Обработчики для обхода графа
    document.getElementById('bfsBtn').addEventListener('click', () => traverseGraph('BFS'));
    document.getElementById('dfsBtn').addEventListener('click', () => traverseGraph('DFS'));

    // Обработка Enter в поле начальной вершины
    document.getElementById('startNode').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            // По умолчанию запускаем BFS при Enter
            traverseGraph('BFS');
        }
    });

    // Обработчик для кнопки удаления
    document.getElementById('deleteSelectedBtn').addEventListener('click', removeSelectedWithAlert);

    // Глобальные обработчики клавиш для форм редактирования
    document.addEventListener('keydown', function (e) {
        // Escape для отмены редактирования (работает везде)
        if (e.key === 'Escape') {
            if (editingNodeId) {
                cancelNodeEdit();
            } else if (editingEdgeId) {
                cancelEdgeEdit();
            }
        }
        
        // Enter для сохранения (только когда форма открыта и поле в фокусе)
        if (e.key === 'Enter' && e.ctrlKey) {
            if (editingNodeId) {
                saveNodeEdit();
            } else if (editingEdgeId) {
                saveEdgeEdit();
            }
        }
    });
}

//Инициализация графа после загрузики DOM
document.addEventListener('DOMContentLoaded', function () {
    let container = document.getElementById('myNetwork');
    network = new vis.Network(container, data, options);

    // Обработчик двойного клика
    network.on('doubleClick', function (params) {
        // Если кликнули по узлу
        if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            startEditNode(nodeId);
        }
        // Если кликнули по ребру
        else if (params.edges.length > 0) {
            const edgeId = params.edges[0];
            startEditEdge(edgeId);
        }
        // Если кликнули по пустому месту
        else {
            addNodeAtPosition(params.pointer.canvas);
        }
    });

    network.on('select', function (params) {
        updateEditButtonState();
        updateEdgeEditButtonState();
    });

    setupEventListeners();
    setupGraphUpdateListeners();
    updateEditButtonState();
    updateEdgeEditButtonState();
    updateAdjacencyMatrix();
    updateIncidenceMatrix();
});

function createNode(id, x = null, y = null) {
    const node = {
        id: id,
        label: id,
        ...NODE_CONFIG
    };

    if (x !== null && y !== null) {
        node.x = x;
        node.y = y;
    }
    return node;
}

function addNode(nodeId) {
    if (!nodeId || nodeId.toString().trim() === '') {
        alert("Введите ID вершины");
        return;
    }

    nodeId = nodeId.toString();

    if (nodes.get(nodeId)) {
        alert('Вершина с ID "' + nodeId + '" уже существует!');
        return;
    }

    const newNode = createNode(nodeId);
    nodes.add(newNode);
}

//Добавление вершины вручную с указанием любого id
function addNodeFromInput() {
    const nodeId = document.getElementById("nodeId").value.trim();
    if (nodeId) {
        addNode(nodeId);
        document.getElementById('nodeId').value = '';
    }
    else alert('Введите ID вершины');
}

function generateNodeId() {
    const existingNodes = nodes.get();
    if (existingNodes.length === 0) return "1";
    let maxId = 0;
    for (let node of existingNodes) {
        const id = parseInt(node.id);
        if (!isNaN(id) && id > maxId) {
            maxId = id;
        }
    }
    return (maxId + 1).toString();
}

function addNodeAtPosition(position) {
    const nodeId = generateNodeId();
    const newNode = createNode(nodeId, position.x, position.y);
    nodes.add(newNode);
}

function clearGraph() {
    if (confirm("Удалить граф?")) {
        nodes.clear()
        edges.clear()
        cancelNodeEdit();
        cancelEdgeEdit();
    }
}

function removeSelectedWithAlert() {
    const selectedNodes = network.getSelectedNodes();
    const selectedEdges = network.getSelectedEdges();

    if (selectedNodes.length === 0 && selectedEdges.length === 0) {
        alert("Не выделен объект для удаления!");
        return;
    }

    removeSelected();
}

function removeSelected() {
    const selectedNodes = network.getSelectedNodes();
    const selectedEdges = network.getSelectedEdges();

    if (editingNodeId && selectedNodes.includes(editingNodeId)) {
        cancelNodeEdit();
    }

    if (editingEdgeId && selectedEdges.includes(editingEdgeId)) {
        cancelEdgeEdit();
    }

    if (selectedNodes.length > 0) {
        nodes.remove(selectedNodes);
    }

    if (selectedEdges.length > 0) {
        edges.remove(selectedEdges);
    }

    updateAdjacencyMatrix();
    updateIncidenceMatrix();
}

function startEditSelectedNode() {
    const selectedNodes = network.getSelectedNodes();
    if (selectedNodes.length === 1) {
        startEditNode(selectedNodes[0]);
    }
    else if (selectedNodes.length === 0) {
        alert("Выберите вершину для редактирования");
    }
}

function startEditNode(nodeId) {
    const node = nodes.get(nodeId);
    if (!node) return;

    // Если уже редактируем ребро, отменяем
    if (editingEdgeId) {
        cancelEdgeEdit();
    }

    editingNodeId = nodeId;
    document.getElementById('editPanel').style.display = 'block';
    document.getElementById('editNodeId').value = node.label;
    document.getElementById('editNodeId').focus();
    document.getElementById('editNodeId').select();
    nodes.update({
        id: nodeId,
        color: {
            background: '#FFE66D',
            border: '#FF6B6B',
            highlight: {
                background: '#FFE66D',
                border: '#FF6B6B'
            }
        }
    });
}

function saveNodeEdit() {
    if (!editingNodeId) return;

    const newId = document.getElementById('editNodeId').value.trim();
    if (!newId) {
        alert("ID вершины не может быть пустым");
        return;
    }

    const existingNode = nodes.get(newId);
    if (existingNode && existingNode.id !== editingNodeId) {
        alert('Вершина с ID "' + newId + '" уже существует!');
        return;
    }
    nodes.update({
        id: editingNodeId,
        label: newId
    });
    nodes.update({
        id: editingNodeId,
        color: {
            background: '#97C2FC',
            border: '#2B7CE9',
            highlight: {
                background: '#D2E5FF',
                border: '#2B7CE9'
            }
        }
    });
    const oldId = editingNodeId;
    cancelNodeEdit();
}

function cancelNodeEdit() {
    if (editingNodeId) {
        nodes.update({
            id: editingNodeId,
            color: {
                background: '#97C2FC',
                border: '#2B7CE9',
                highlight: {
                    background: '#D2E5FF',
                    border: '#2B7CE9'
                }
            }
        });
    }
    editingNodeId = null;
    document.getElementById('editPanel').style.display = 'none';
    document.getElementById('editNodeId').value = '';
}

function updateEditButtonState() {
    const selectedNodes = network.getSelectedNodes();
    const editBtn = document.getElementById('editNodeBtn');

    if (selectedNodes.length === 1) {
        editBtn.disabled = false;
        editBtn.title = "Редактировать выбранную вершину";
    } else {
        editBtn.disabled = true;
        editBtn.title = selectedNodes.length === 0 ? 
            "Выберите вершину для редактирования" : 
            "Выберите только одну вершину";
    }
}

function updateEdgeEditButtonState() {
    const selectedEdges = network.getSelectedEdges();
    const editEdgeBtn = document.getElementById('editEdgeBtn');

    if (selectedEdges.length === 1) {
        editEdgeBtn.disabled = false;
        editEdgeBtn.title = "Редактировать выбранное ребро";
    } else {
        editEdgeBtn.disabled = true;
        editEdgeBtn.title = selectedEdges.length === 0 ? 
            "Выберите ребро для редактирования" : 
            "Выберите только одно ребро";
    }
}

function addEdge(fromNodeId, toNodeId, weight = null, isDirected = false) {
    if (!fromNodeId || !toNodeId) {
        alert("Введите начальную и конечную вершины");
        return false;
    }

    const fromNode = nodes.get(fromNodeId);
    const toNode = nodes.get(toNodeId);

    if (!fromNode) {
        alert(`Вершина с ID "${fromNodeId}" не существует`);
        return false;
    }
    if (!toNode) {
        alert(`Вершина с ID "${toNodeId}" не существует`);
        return false;
    }

    // Проверка веса на число
    if (weight && weight.trim() !== '' && !isValidWeight(weight)) {
        alert('Вес ребра должен быть числом!');
        return false;
    }

    // Убрана проверка на петлю - теперь разрешены рёбра в саму себя

    // Проверка на существование ребра
    const existingEdges = edges.get();
    const edgeExists = existingEdges.some(edge =>
        edge.from === fromNodeId && edge.to === toNodeId
    );

    if (edgeExists) {
        alert(`Ребро между вершинами "${fromNodeId}" и "${toNodeId}" уже существует`);
        return false;
    }

    // Создание ребра
    const edge = {
        from: fromNodeId,
        to: toNodeId,
        ...EDGE_CONFIG
    };

    // Добавление веса если указан
    if (weight && weight.trim() !== '') {
        edge.label = weight.trim();
    }

    // Добавление стрелки если ребро направленное
    if (isDirected) {
        edge.arrows = {
            to: {
                enabled: true,
                scaleFactor: 1.2
            }
        };
    }

    // Особые настройки для петель (рёбер в саму себя)
    if (fromNodeId === toNodeId) {
        edge.selfReference = {
            angle: Math.PI / 8,
            size: 20
        };
        edge.smooth = {
            enabled: true,
            type: 'curvedCCW',
            roundness: 0.2
        };
    }

    edges.add(edge);

    updateAdjacencyMatrix();
    updateIncidenceMatrix();
    return true;
}

function addEdgeFromInput() {
    const fromNodeId = document.getElementById('fromNode').value.trim();
    const toNodeId = document.getElementById('toNode').value.trim();
    const weight = document.getElementById('edgeWeight').value;
    const isDirected = document.getElementById('directedEdge').checked;

    const success = addEdge(fromNodeId, toNodeId, weight, isDirected);

    // Очистка полей ввода только при успешном добавлении
    if (success) {
        document.getElementById('fromNode').value = '';
        document.getElementById('toNode').value = '';
        document.getElementById('edgeWeight').value = '';
        document.getElementById('directedEdge').checked = false;
    }
}

// Функции для редактирования рёбер
function startEditSelectedEdge() {
    const selectedEdges = network.getSelectedEdges();
    if (selectedEdges.length === 1) {
        startEditEdge(selectedEdges[0]);
    } else if (selectedEdges.length === 0) {
        alert("Выберите ребро для редактирования");
    } else {
        alert("Выберите только одно ребро для редактирования");
    }
}

function startEditEdge(edgeId) {
    const edge = edges.get(edgeId);
    if (!edge) return;

    // Если уже редактируем вершину, отменяем
    if (editingNodeId) {
        cancelNodeEdit();
    }

    editingEdgeId = edgeId;
    
    // Заполняем форму редактирования данными ребра
    document.getElementById('editEdgePanel').style.display = 'block';
    document.getElementById('editEdgeFrom').textContent = edge.from;
    document.getElementById('editEdgeTo').textContent = edge.to;
    document.getElementById('editEdgeWeight').value = edge.label || '';
    document.getElementById('editEdgeDirected').checked = edge.arrows && edge.arrows.to && edge.arrows.to.enabled;
    
    document.getElementById('editEdgeWeight').focus();
    document.getElementById('editEdgeWeight').select();
    
    // Подсвечиваем редактируемое ребро
    edges.update({
        id: edgeId,
        color: {
            color: '#FFE66D',
            highlight: '#FF6B6B',
            hover: '#FFE66D'
        },
        width: 4
    });
}

function saveEdgeEdit() {
    if (!editingEdgeId) return;

    const weight = document.getElementById('editEdgeWeight').value.trim();
    const isDirected = document.getElementById('editEdgeDirected').checked;

    // Проверка веса на число
    if (weight !== '' && !isValidWeight(weight)) {
        alert('Вес ребра должен быть числом!');
        return;
    }

    // Обновляем ребро
    const updateData = {
        id: editingEdgeId,
        arrows: isDirected ? {
            to: {
                enabled: true,
                scaleFactor: 1.2
            }
        } : { to: { enabled: false } }
    };

    // Обновляем вес если указан
    if (weight !== '') {
        updateData.label = weight;
    } else {
        updateData.label = undefined;
    }

    // Особые настройки для петель
    const edge = edges.get(editingEdgeId);
    if (edge.from === edge.to) {
        updateData.selfReference = {
            angle: Math.PI / 8,
            size: 20
        };
        updateData.smooth = {
            enabled: true,
            type: 'curvedCCW',
            roundness: 0.2
        };
    } else {
        updateData.smooth = false;
    }

    // Возвращаем стандартный цвет и ширину
    updateData.color = EDGE_CONFIG.color;
    updateData.width = EDGE_CONFIG.width;

    edges.update(updateData);
    
    cancelEdgeEdit();
    
    updateAdjacencyMatrix();
    updateIncidenceMatrix();
}

function cancelEdgeEdit() {
    if (editingEdgeId) {
        // Возвращаем стандартный цвет и ширину
        edges.update({
            id: editingEdgeId,
            color: EDGE_CONFIG.color,
            width: EDGE_CONFIG.width
        });
    }
    
    editingEdgeId = null;
    document.getElementById('editEdgePanel').style.display = 'none';
    document.getElementById('editEdgeWeight').value = '';
    document.getElementById('editEdgeDirected').checked = false;
}

// Функции для работы с графом

function traverseGraph(method) {
    if (isTraversing) {
        alert("Обход уже выполняется!");
        return;
    }

    const startNodeId = document.getElementById('startNode').value.trim();
    let startNode = null;

    // Определяем начальную вершину
    if (startNodeId) {
        startNode = nodes.get(startNodeId);
        if (!startNode) {
            alert(`Вершина с ID "${startNodeId}" не существует!`);
            return;
        }
    } else {
        // Берём первую вершину если не указана
        const allNodes = nodes.get();
        if (allNodes.length === 0) {
            alert("Граф пуст! Добавьте вершины.");
            return;
        }
        startNode = allNodes[0];
        document.getElementById('startNode').value = startNode.id;
    }

    // Очищаем лог
    document.getElementById('logArea').value = '';

    // Запускаем обход
    if (method === 'BFS') {
        breadthFirstSearch(startNode.id);
    } else {
        depthFirstSearch(startNode.id);
    }
}

function breadthFirstSearch(startNodeId) {
    isTraversing = true;
    const visited = new Set();
    const queue = [{ nodeId: startNodeId, level: 0, parent: null }];
    const logArea = document.getElementById('logArea');
    let step = 0;

    // Сбрасываем цвета всех вершин
    resetNodeColors();

    function processNext() {
        if (queue.length === 0) {
            isTraversing = false;
            logArea.value += 'Обход в ширину завершён!\n';
            return;
        }

        const { nodeId, level, parent } = queue.shift();

        if (!visited.has(nodeId)) {
            visited.add(nodeId);

            // Подсвечиваем вершину
            highlightNode(nodeId, '#FF6B6B', '#FF0000');

            // Логируем посещение с информацией о родителе
            const parentInfo = parent ? `(родитель - ${parent})` : '(родитель - отсутствует)';
            logArea.value += `Посещена вершина - ${nodeId} (Уровень ${level}) ${parentInfo}\n`;
            logArea.scrollTop = logArea.scrollHeight;

            // Находим соседей
            const neighbors = getNeighbors(nodeId);
            neighbors.forEach(neighborId => {
                if (!visited.has(neighborId)) {
                    queue.push({
                        nodeId: neighborId,
                        level: level + 1,
                        parent: nodeId
                    });
                }
            });
        }

        // Следующий шаг с задержкой
        traversalTimeout = setTimeout(processNext, 1000);
    }

    processNext();
}

function depthFirstSearch(startNodeId) {
    isTraversing = true;
    const visited = new Set();
    const stack = [{ nodeId: startNodeId, level: 0 }];
    const logArea = document.getElementById('logArea');

    // Сбрасываем цвета всех вершин
    resetNodeColors();

    function processNext() {
        if (stack.length === 0) {
            isTraversing = false;
            logArea.value += 'Обход в глубину завершён!\n';
            return;
        }

        const { nodeId, level } = stack.pop();

        if (!visited.has(nodeId)) {
            visited.add(nodeId);

            // Подсвечиваем вершину
            highlightNode(nodeId, '#FF6B6B', '#FF0000');

            // Логируем посещение
            logArea.value += `Посещена вершина - ${nodeId} (уровень ${level})\n`;
            logArea.scrollTop = logArea.scrollHeight;

            // Находим соседей и добавляем в стек в обратном порядке
            const neighbors = getNeighbors(nodeId);
            for (let i = neighbors.length - 1; i >= 0; i--) {
                const neighborId = neighbors[i];
                if (!visited.has(neighborId)) {
                    stack.push({ nodeId: neighborId, level: level + 1 });
                }
            }
        }

        // Следующий шаг с задержкой
        traversalTimeout = setTimeout(processNext, 1000);
    }

    processNext();
}

function getNeighbors(nodeId) {
    const neighbors = new Set();
    const allEdges = edges.get();

    allEdges.forEach(edge => {
        // Для ненаправленных рёбер
        if (!edge.arrows || !edge.arrows.to || !edge.arrows.to.enabled) {
            if (edge.from === nodeId) neighbors.add(edge.to);
            if (edge.to === nodeId) neighbors.add(edge.from);
        }
        // Для направленных рёбер - только исходящие
        else {
            if (edge.from === nodeId) neighbors.add(edge.to);
        }
    });

    return Array.from(neighbors);
}

function highlightNode(nodeId, backgroundColor, borderColor) {
    nodes.update({
        id: nodeId,
        color: {
            background: backgroundColor,
            border: borderColor,
            highlight: {
                background: backgroundColor,
                border: borderColor
            }
        }
    });
}

function resetNodeColors() {
    // Останавливаем текущий обход если есть
    if (traversalTimeout) {
        clearTimeout(traversalTimeout);
        traversalTimeout = null;
    }

    // Возвращаем все вершины к исходному цвету
    const allNodes = nodes.get();
    allNodes.forEach(node => {
        nodes.update({
            id: node.id,
            color: {
                background: '#97C2FC',
                border: '#2B7CE9',
                highlight: {
                    background: '#D2E5FF',
                    border: '#2B7CE9'
                }
            }
        });
    });
}

// Функции для таблицы смежности

function updateAdjacencyMatrix() {
    const matrixContainer = document.getElementById('adjacencyMatrix');
    matrixContainer.innerHTML = '';

    const allNodes = nodes.get();
    const allEdges = edges.get();

    if (allNodes.length === 0) {
        matrixContainer.innerHTML = '<p>Граф пуст</p>';
        return;
    }

    // Сортируем узлы для consistent отображения
    allNodes.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));

    const table = document.createElement('table');

    // Создаем заголовок таблицы
    const headerRow = document.createElement('tr');
    const emptyHeader = document.createElement('th');
    emptyHeader.textContent = '→';
    headerRow.appendChild(emptyHeader);

    allNodes.forEach(node => {
        const th = document.createElement('th');
        th.textContent = node.id;
        th.title = `Вершина ${node.id}`;
        headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    // Заполняем таблицу данными
    allNodes.forEach(fromNode => {
        const row = document.createElement('tr');
        const rowHeader = document.createElement('th');
        rowHeader.textContent = fromNode.id;
        rowHeader.title = `Вершина ${fromNode.id}`;
        row.appendChild(rowHeader);

        allNodes.forEach(toNode => {
            const cell = document.createElement('td');

            // Ищем рёбра между fromNode и toNode
            const edgesBetween = allEdges.filter(edge =>
                edge.from === fromNode.id && edge.to === toNode.id
            );

            // Для ненаправленных рёбер также проверяем обратное направление
            const reverseEdges = allEdges.filter(edge =>
                edge.to === fromNode.id && edge.from === toNode.id &&
                (!edge.arrows || !edge.arrows.to || !edge.arrows.to.enabled)
            );

            let displayText = '';
            let titleText = '';

            if (edgesBetween.length > 0) {
                const edge = edgesBetween[0];
                const isDirected = edge.arrows && edge.arrows.to && edge.arrows.to.enabled;
                const weight = edge.label || '';

                displayText = weight || (isDirected ? '→' : '•');
                titleText = `${fromNode.id} ${isDirected ? '→' : '↔'} ${toNode.id}${weight ? ` (вес: ${weight})` : ''}`;

                if (isDirected) {
                    cell.classList.add('directed-edge');
                } else {
                    cell.classList.add('undirected-edge');
                }
            } else if (reverseEdges.length > 0) {
                // Для ненаправленных рёбер показываем связь в обе стороны
                const edge = reverseEdges[0];
                const weight = edge.label || '';

                displayText = weight || '•';
                titleText = `${fromNode.id} ↔ ${toNode.id}${weight ? ` (вес: ${weight})` : ''}`;
                cell.classList.add('undirected-edge');
            }

            cell.textContent = displayText;
            cell.title = titleText;

            // Стиль для петель (диагональные элементы)
            if (fromNode.id === toNode.id) {
                cell.classList.add('self-loop');
            }

            row.appendChild(cell);
        });
        table.appendChild(row);
    });

    matrixContainer.appendChild(table);
}

// Функция для обновления таблицы инцидентности
function updateIncidenceMatrix() {
    const matrixContainer = document.getElementById('incidenceMatrix');
    matrixContainer.innerHTML = '';

    const allNodes = nodes.get();
    const allEdges = edges.get();

    if (allNodes.length === 0) {
        matrixContainer.innerHTML = '<p>Граф пуст</p>';
        return;
    }

    // Сортируем узлы и рёбра для consistent отображения
    allNodes.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));
    
    const table = document.createElement('table');
    
    // Создаем заголовок таблицы - рёбра
    const headerRow = document.createElement('tr');
    const emptyHeader = document.createElement('th');
    emptyHeader.textContent = 'Вершины \\ Рёбра';
    headerRow.appendChild(emptyHeader);

    allEdges.forEach((edge, index) => {
        const th = document.createElement('th');
        const edgeLabel = edge.label ? `${edge.from}-${edge.to} (${edge.label})` : `${edge.from}-${edge.to}`;
        th.textContent = edgeLabel;
        th.title = `Ребро: ${edge.from} → ${edge.to}${edge.label ? ` (вес: ${edge.label})` : ''}`;
        headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    // Заполняем таблицу данными
    allNodes.forEach(node => {
        const row = document.createElement('tr');
        const rowHeader = document.createElement('th');
        rowHeader.textContent = node.id;
        rowHeader.title = `Вершина ${node.id}`;
        row.appendChild(rowHeader);

        allEdges.forEach(edge => {
            const cell = document.createElement('td');
            let value = '0';
            let cellClass = '';
            let title = `Вершина ${node.id} не инцидентна ребру ${edge.from}-${edge.to}`;

            const isDirected = edge.arrows && edge.arrows.to && edge.arrows.to.enabled;
            const isLoop = edge.from === edge.to;

            if (isLoop && node.id === edge.from) {
                // Петля
                value = '↻';
                cellClass = 'self-loop';
                title = `Петля: вершина ${node.id} инцидентна сама себе`;
            } else if (isDirected) {
                // Направленное ребро
                if (node.id === edge.from) {
                    value = '1';
                    cellClass = 'directed-out';
                    title = `Начало направленного ребра: ${edge.from} → ${edge.to}`;
                } else if (node.id === edge.to) {
                    value = '-1';
                    cellClass = 'directed-in';
                    title = `Конец направленного ребра: ${edge.from} → ${edge.to}`;
                }
            } else {
                // Ненаправленное ребро
                if (node.id === edge.from || node.id === edge.to) {
                    value = '2';
                    cellClass = 'undirected';
                    title = `Ненаправленное ребро: ${edge.from} — ${edge.to}`;
                }
            }

            cell.textContent = value;
            cell.className = cellClass;
            cell.title = title;
            row.appendChild(cell);
        });
        table.appendChild(row);
    });

    matrixContainer.appendChild(table);
}

// Вызывать updateAdjacencyMatrix при изменениях графа
function setupGraphUpdateListeners() {
    // Обновлять таблицу при добавлении/удалении узлов и рёбер
    nodes.on('*', () => {
        updateAdjacencyMatrix();
        updateIncidenceMatrix();
    });
    edges.on('*', () => {
        updateAdjacencyMatrix();
        updateIncidenceMatrix();
    });
}

window.addNode = addNode;
window.addNodeFromInput = addNodeFromInput;
window.clearGraph = clearGraph;
window.removeSelected = removeSelected;
window.addEdge = addEdge;
window.addEdgeFromInput = addEdgeFromInput;
window.startEditSelectedEdge = startEditSelectedEdge;
window.saveEdgeEdit = saveEdgeEdit;
window.cancelEdgeEdit = cancelEdgeEdit;
window.traverseGraph = traverseGraph;
window.breadthFirstSearch = breadthFirstSearch;
window.depthFirstSearch = depthFirstSearch;
window.removeSelectedWithAlert = removeSelectedWithAlert;
window.updateAdjacencyMatrix = updateAdjacencyMatrix;