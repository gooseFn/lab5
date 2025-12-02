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
    //для сворачивания и сохранения
    setupCollapsibleSections();
    setupMaxFlowAlgorithm();
    setupSaveLoadSystem();
    setupMSTAlgorithm();
    setupDijkstraAlgorithm();
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


function updateCollapseButtonText(isCollapsed) {
    const collapseBtn = document.getElementById('mainCollapseBtn');
    const collapseText = collapseBtn.querySelector('.collapse-text');
    const collapseIcon = collapseBtn.querySelector('.collapse-icon');

    if (isCollapsed) {
        collapseText.textContent = 'Показать панель управления';
        collapseIcon.textContent = '▶';
    } else {
        collapseText.textContent = 'Скрыть панель управления';
        collapseIcon.textContent = '▼';
    }
}







//
//
//начало второго пункта про  сети


// ============================================
// ИСПРАВЛЕННЫЙ АЛГОРИТМ МАКСИМАЛЬНОГО ПОТОКА
// ============================================

let flowData = {
    currentFlows: {}, // текущие потоки по рёбрам
    residualGraph: {}, // остаточная сеть
    maxFlow: 0,
    isRunning: false,
    timeout: null
};

// Исправленная инициализация
function setupMaxFlowAlgorithm() {
    const findBtn = document.getElementById('findMaxFlowBtn');
    const resetBtn = document.getElementById('resetFlowBtn');
    const sourceInput = document.getElementById('sourceNode');
    const sinkInput = document.getElementById('sinkNode');

    findBtn.addEventListener('click', findMaxFlow);
    resetBtn.addEventListener('click', resetFlow);

    // Автозаполнение при выборе вершин
    network.on('select', function (params) {
        const selectedNodes = network.getSelectedNodes();
        if (selectedNodes.length === 2) {
            if (!sourceInput.value) {
                sourceInput.value = selectedNodes[0];
            }
            if (!sinkInput.value) {
                sinkInput.value = selectedNodes[1];
            }
        } else if (selectedNodes.length === 1) {
            const nodeId = selectedNodes[0];
            if (!sourceInput.value) {
                sourceInput.value = nodeId;
            } else if (!sinkInput.value && sourceInput.value !== nodeId) {
                sinkInput.value = nodeId;
            }
        }
    });

    // Обработка Enter
    sourceInput.addEventListener('keypress', (e) => e.key === 'Enter' && findMaxFlow());
    sinkInput.addEventListener('keypress', (e) => e.key === 'Enter' && findMaxFlow());
}

// Основная функция алгоритма
async function findMaxFlow() {
    if (flowData.isRunning) {
        alert("Алгоритм уже выполняется!");
        return;
    }

    const source = document.getElementById('sourceNode').value.trim();
    const sink = document.getElementById('sinkNode').value.trim();
    const flowLog = document.getElementById('mstLogArea');

    // Проверка
    if (!source || !sink) {
        alert('Укажите источник (S) и сток (T)');
        return;
    }

    if (source === sink) {
        alert('Источник и сток должны быть разными вершинами');
        return;
    }

    const sourceNode = nodes.get(source);
    const sinkNode = nodes.get(sink);

    if (!sourceNode || !sinkNode) {
        alert('Одна из указанных вершин не существует');
        return;
    }

    // Инициализация
    flowData.isRunning = true;
    flowData.currentFlows = {};
    flowData.maxFlow = 0;
    flowData.residualGraph = buildResidualGraph();

    flowLog.value = '';
    logFlowStep(`🚀 Запуск алгоритма Форда-Фалкерсона (с BFS - алгоритм Эдмондса-Карпа)`);
    logFlowStep(`Источник: ${source}, Сток: ${sink}`);
    logFlowStep('────────────────────────────────────────────');

    // Сброс визуализации
    resetFlowVisualization();

    let iteration = 0;
    let pathFound = true;

    // Основной цикл алгоритма
    while (pathFound) {
        iteration++;

        // Поиск увеличивающего пути с помощью BFS
        const path = findAugmentingPathBFS(source, sink);

        if (!path || path.length === 0) {
            logFlowStep(`\n📭 Итерация ${iteration}: Увеличивающий путь не найден`);
            pathFound = false;
            break;
        }

        logFlowStep(`\n🔄 Итерация ${iteration}: Найден путь: ${path.join(' → ')}`);

        // Находим минимальную пропускную способность на пути
        const minCapacity = findMinCapacityOnPath(path);
        logFlowStep(`📏 Минимальная пропускная способность на пути: ${minCapacity}`);

        // Визуализация найденного пути (ШАГ 1: показать путь)
        await visualizePathStep(path, 'Найден увеличивающий путь', '#FFA500', 1000);

        // Обновляем остаточную сеть и потоки
        updateResidualGraph(path, minCapacity);
        flowData.maxFlow += minCapacity;

        // Визуализация обновления потоков (ШАГ 2: показать обновление)
        await visualizeFlowUpdate(path, minCapacity, 1000);

        logFlowStep(`💧 Добавлен поток: ${minCapacity}. Текущий максимальный поток: ${flowData.maxFlow}`);

        // Если достигли предела, выходим
        if (minCapacity === 0) break;
    }

    // Завершение
    flowData.isRunning = false;

    logFlowStep('\n✅ АЛГОРИТМ ЗАВЕРШЁН');
    logFlowStep(`📊 МАКСИМАЛЬНЫЙ ПОТОК: ${flowData.maxFlow}`);
    logFlowStep(`🔢 Выполнено итераций: ${iteration - 1}`);

    // Обновляем результаты
    document.getElementById('maxFlowValue').textContent = flowData.maxFlow;
    document.getElementById('stepsCount').textContent = iteration - 1;

    // Финальная визуализация
    visualizeFinalFlowState();
}

// Построение остаточной сети
function buildResidualGraph() {
    const graph = {};
    const allEdges = edges.get();

    // Инициализация для всех вершин
    nodes.get().forEach(node => {
        graph[node.id] = {};
    });

    // Заполнение рёбрами
    allEdges.forEach(edge => {
        const from = edge.from;
        const to = edge.to;
        const capacity = parseFloat(edge.label) || 1;
        const isDirected = edge.arrows && edge.arrows.to && edge.arrows.to.enabled;

        // Прямое ребро
        if (!graph[from]) graph[from] = {};
        graph[from][to] = {
            capacity: capacity,
            flow: 0,
            directed: isDirected,
            edgeId: edge.id
        };

        // Обратное ребро (для остаточной сети)
        if (!graph[to]) graph[to] = {};
        if (!graph[to][from]) {
            graph[to][from] = {
                capacity: 0,
                flow: 0,
                directed: false,
                edgeId: null
            };
        }
    });

    return graph;
}

// BFS для поиска увеличивающего пути
function findAugmentingPathBFS(source, sink) {
    const queue = [[source]];
    const visited = new Set([source]);

    while (queue.length > 0) {
        const path = queue.shift();
        const node = path[path.length - 1];

        if (node === sink) {
            return path;
        }

        const neighbors = Object.keys(flowData.residualGraph[node] || {});

        for (const neighbor of neighbors) {
            const edge = flowData.residualGraph[node][neighbor];
            if (!visited.has(neighbor) && edge.capacity - edge.flow > 0) {
                visited.add(neighbor);
                queue.push([...path, neighbor]);
            }
        }
    }

    return null;
}

// Нахождение минимальной пропускной способности на пути
function findMinCapacityOnPath(path) {
    let minCapacity = Infinity;

    for (let i = 0; i < path.length - 1; i++) {
        const from = path[i];
        const to = path[i + 1];
        const edge = flowData.residualGraph[from][to];
        const available = edge.capacity - edge.flow;

        if (available < minCapacity) {
            minCapacity = available;
        }
    }

    return minCapacity === Infinity ? 0 : minCapacity;
}

// Обновление остаточной сети
function updateResidualGraph(path, minCapacity) {
    for (let i = 0; i < path.length - 1; i++) {
        const from = path[i];
        const to = path[i + 1];

        // Обновляем прямое ребро
        if (flowData.residualGraph[from][to]) {
            flowData.residualGraph[from][to].flow += minCapacity;
        }

        // Обновляем обратное ребро
        if (flowData.residualGraph[to][from]) {
            flowData.residualGraph[to][from].flow -= minCapacity;
        }

        // Сохраняем поток в текущих потоках
        const edgeKey = `${from}-${to}`;
        flowData.currentFlows[edgeKey] =
            (flowData.currentFlows[edgeKey] || 0) + minCapacity;
    }
}

// Визуализация шага - подсветка пути
async function visualizePathStep(path, message, color, delay) {
    const flowLog = document.getElementById('mstLogArea');
    flowLog.value += `🎯 ${message}\n`;
    flowLog.scrollTop = flowLog.scrollHeight;

    // Подсвечиваем вершины пути
    for (const nodeId of path) {
        highlightNode(nodeId, color, '#FF0000');
    }

    // Подсвечиваем рёбра пути
    for (let i = 0; i < path.length - 1; i++) {
        const from = path[i];
        const to = path[i + 1];

        // Ищем оригинальное ребро
        const edge = findOriginalEdge(from, to);
        if (edge) {
            highlightEdge(edge.id, color, '#FF0000', 4);
        }
    }

    // Ждём для визуализации
    await sleep(delay);

    // Возвращаем вершинам обычный цвет (кроме последнего шага)
    for (const nodeId of path) {
        if (path[path.length - 1] !== nodeId) { // Не сбрасываем цвет стоку
            resetNodeColor(nodeId);
        }
    }
}

// Визуализация обновления потоков
async function visualizeFlowUpdate(path, minCapacity, delay) {
    // Обновляем визуализацию рёбер с новыми потоками
    for (let i = 0; i < path.length - 1; i++) {
        const from = path[i];
        const to = path[i + 1];

        const edge = findOriginalEdge(from, to);
        if (edge) {
            const edgeKey = `${from}-${to}`;
            const currentFlow = flowData.currentFlows[edgeKey] || 0;
            const capacity = parseFloat(edge.label) || 1;
            const percentage = Math.min(100, (currentFlow / capacity) * 100);

            // Определяем цвет в зависимости от загруженности
            let color;
            if (percentage >= 90) color = '#FF0000';
            else if (percentage >= 50) color = '#FFA500';
            else color = '#32CD32';

            // Обновляем ребро
            edges.update({
                id: edge.id,
                color: {
                    color: color,
                    highlight: color
                },
                width: Math.max(2, Math.min(6, percentage / 20)),
                label: `${currentFlow}/${capacity}`
            });
        }
    }

    await sleep(delay);
}

// Финальная визуализация
function visualizeFinalFlowState() {
    const allEdges = edges.get();

    allEdges.forEach(edge => {
        const edgeKey = `${edge.from}-${edge.to}`;
        const flow = flowData.currentFlows[edgeKey] || 0;
        const capacity = parseFloat(edge.label) || 1;

        if (flow > 0) {
            const percentage = (flow / capacity) * 100;
            let color;

            if (percentage >= 90) color = '#FF0000';
            else if (percentage >= 50) color = '#FFA500';
            else color = '#32CD32';

            edges.update({
                id: edge.id,
                color: {
                    color: color,
                    highlight: color
                },
                width: Math.max(2, Math.min(6, percentage / 20)),
                label: `${flow}/${capacity}`
            });
        }
    });
}

// Вспомогательные функции
function findOriginalEdge(from, to) {
    const allEdges = edges.get();
    return allEdges.find(e =>
        (e.from === from && e.to === to) ||
        (!e.arrows && e.from === to && e.to === from) // Для ненаправленных
    );
}

function highlightEdge(edgeId, color, borderColor, width) {
    edges.update({
        id: edgeId,
        color: {
            color: color,
            highlight: color
        },
        width: width
    });
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

function resetNodeColor(nodeId) {
    nodes.update({
        id: nodeId,
        color: NODE_CONFIG.color
    });
}

function resetFlowVisualization() {
    const allEdges = edges.get();
    allEdges.forEach(edge => {
        edges.update({
            id: edge.id,
            color: EDGE_CONFIG.color,
            width: EDGE_CONFIG.width,
            label: edge.label || undefined
        });
    });

    const allNodes = nodes.get();
    allNodes.forEach(node => {
        resetNodeColor(node.id);
    });
}

function logFlowStep(message) {
    const flowLog = document.getElementById('mstLogArea');
    flowLog.value += message + '\n';
    flowLog.scrollTop = flowLog.scrollHeight;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Сброс алгоритма
function resetFlow() {
    if (flowData.timeout) {
        clearTimeout(flowData.timeout);
        flowData.timeout = null;
    }

    flowData.isRunning = false;
    flowData.currentFlows = {};
    flowData.residualGraph = {};
    flowData.maxFlow = 0;

    document.getElementById('sourceNode').value = '';
    document.getElementById('sinkNode').value = '';
    document.getElementById('maxFlowValue').textContent = '0';
    document.getElementById('stepsCount').textContent = '0';
    document.getElementById('mstLogArea').value = '';

    resetFlowVisualization();

    logFlowStep('✖️ Алгоритм потока сброшен');
}














// ============================================
// АЛГОРИТМ ДЕЙКСТРЫ - КРАТЧАЙШИЙ ПУТЬ
// ============================================

let dijkstraData = {
    isRunning: false,
    timeout: null,
    distances: {},
    previous: {},
    visited: new Set(),
    path: []
};

// Инициализация алгоритма Дейкстры
function setupDijkstraAlgorithm() {
    const findBtn = document.getElementById('findShortestPathBtn');
    const resetBtn = document.getElementById('resetPathBtn');
    const startInput = document.getElementById('startPathNode');
    const endInput = document.getElementById('endPathNode');
    const considerDirections = document.getElementById('considerDirections');

    findBtn.addEventListener('click', findShortestPath);
    resetBtn.addEventListener('click', resetDijkstra);

    // Автозаполнение при выборе вершин
    network.on('select', function(params) {
        const selectedNodes = network.getSelectedNodes();
        if (selectedNodes.length === 2) {
            if (!startInput.value) {
                startInput.value = selectedNodes[0];
            }
            if (!endInput.value) {
                endInput.value = selectedNodes[1];
            }
        } else if (selectedNodes.length === 1) {
            const nodeId = selectedNodes[0];
            if (!startInput.value) {
                startInput.value = nodeId;
            } else if (!endInput.value && startInput.value !== nodeId) {
                endInput.value = nodeId;
            }
        }
    });

    // Обработка Enter
    startInput.addEventListener('keypress', (e) => e.key === 'Enter' && findShortestPath());
    endInput.addEventListener('keypress', (e) => e.key === 'Enter' && findShortestPath());
}

// Основная функция алгоритма Дейкстры
async function findShortestPath() {
    if (dijkstraData.isRunning) {
        alert("Алгоритм уже выполняется!");
        return;
    }

    const startNode = document.getElementById('startPathNode').value.trim();
    const endNode = document.getElementById('endPathNode').value.trim();
    const considerDirections = document.getElementById('considerDirections').checked;
    const pathLog = document.getElementById('pathLogArea');

    // Проверка входных данных
    if (!startNode || !endNode) {
        alert('Укажите начальную и конечную вершины');
        return;
    }

    if (startNode === endNode) {
        alert('Начальная и конечная вершины должны быть разными');
        return;
    }

    const startVertex = nodes.get(startNode);
    const endVertex = nodes.get(endNode);

    if (!startVertex || !endVertex) {
        alert('Одна из указанных вершин не существует');
        return;
    }

    // Проверка на отрицательные веса
    if (hasNegativeWeights()) {
        alert('⚠️ Обнаружены рёбра с отрицательным весом!\nАлгоритм Дейкстры не гарантирует корректность при отрицательных весах.\nРекомендуется удалить отрицательные веса или использовать алгоритм Беллмана-Форда.');
        if (!confirm('Продолжить выполнение алгоритма Дейкстры?')) {
            return;
        }
    }

    // Инициализация
    dijkstraData.isRunning = true;
    dijkstraData.distances = {};
    dijkstraData.previous = {};
    dijkstraData.visited = new Set();
    dijkstraData.path = [];
    
    const allNodes = nodes.get();
    const priorityQueue = new PriorityQueue((a, b) => a.distance - b.distance);
    
    // Очистка лога и сброс визуализации
    pathLog.value = '';
    resetDijkstraVisualization();
    
    // Логирование начала
    logPathStep(`🚀 Запуск алгоритма Дейкстры для поиска кратчайшего пути`);
    logPathStep(`Начальная вершина: ${startNode}, Конечная вершина: ${endNode}`);
    logPathStep(`Учитывать направленность: ${considerDirections ? 'да' : 'нет'}`);
    logPathStep('────────────────────────────────────────────');

    // Инициализация расстояний
    allNodes.forEach(node => {
        dijkstraData.distances[node.id] = node.id === startNode ? 0 : Infinity;
        dijkstraData.previous[node.id] = null;
    });

    // Добавляем начальную вершину в очередь
    priorityQueue.push({ id: startNode, distance: 0 });
    
    // Визуализация начальной вершины
    highlightVertex(startNode, 'dijkstra-current');
    logPathStep(`Шаг 1: Начинаем с вершины ${startNode} (расстояние = 0)`);

    let step = 1;
    let found = false;

    // Основной цикл алгоритма
    while (!priorityQueue.isEmpty()) {
        step++;
        
        // Извлекаем вершину с минимальным расстоянием
        const current = priorityQueue.pop();
        
        // Если уже посетили эту вершину, пропускаем
        if (dijkstraData.visited.has(current.id)) {
            continue;
        }

        // Помечаем как посещённую
        dijkstraData.visited.add(current.id);
        
        // Визуализация: текущая вершина
        highlightVertex(current.id, 'dijkstra-current');
        logPathStep(`\nШаг ${step}: Обрабатываем вершину ${current.id} (расстояние = ${current.distance})`);

        // Если достигли конечной вершины
        if (current.id === endNode) {
            found = true;
            logPathStep(`✅ Достигнута конечная вершина ${endNode}!`);
            break;
        }

        // Получаем соседей текущей вершины
        const neighbors = getNeighborsDejcstra(current.id, considerDirections);
        
        // Визуализация: рассматриваемые рёбра
        const consideredEdges = [];
        
        // Обход всех соседей
        for (const neighbor of neighbors) {
            const edge = neighbor.edge;
            const neighborId = neighbor.nodeId;
            const edgeWeight = neighbor.weight;
            
            // Пропускаем уже посещённых соседей
            if (dijkstraData.visited.has(neighborId)) {
                continue;
            }

            // Визуализация: подсвечиваем рассматриваемое ребро
            highlightEdge(edge.id, 'dijkstra-considered');
            consideredEdges.push(edge.id);
            
            // Вычисляем новое расстояние
            const newDistance = current.distance + edgeWeight;
            
            logPathStep(`  → Рассматриваем ребро ${current.id} → ${neighborId} (вес: ${edgeWeight})`);
            logPathStep(`    Текущее расстояние до ${neighborId}: ${dijkstraData.distances[neighborId]}`);
            logPathStep(`    Новое расстояние: ${current.distance} + ${edgeWeight} = ${newDistance}`);

            // Если нашли более короткий путь
            if (newDistance < dijkstraData.distances[neighborId]) {
                dijkstraData.distances[neighborId] = newDistance;
                dijkstraData.previous[neighborId] = current.id;
                
                // Добавляем в очередь с новым расстоянием
                priorityQueue.push({ id: neighborId, distance: newDistance });
                
                // Визуализация: обновлённая вершина
                highlightVertex(neighborId, 'dijkstra-updated');
                logPathStep(`    ✓ Обновляем расстояние до ${neighborId} = ${newDistance}`);
            } else {
                logPathStep(`    ✗ Расстояние не улучшается`);
            }

            // Задержка для визуализации
            await sleep(500);
        }

        // После обработки соседей возвращаем рёбрам обычный цвет
        await sleep(500);
        consideredEdges.forEach(edgeId => {
            resetEdgeColor(edgeId);
        });

        // Текущую вершину отмечаем как обработанную
        highlightVertex(current.id, 'dijkstra-visited');
        
        // Задержка между вершинами
        await sleep(1000);
    }

    // Завершение алгоритма
    dijkstraData.isRunning = false;
    
    if (found) {
        // Восстанавливаем путь
        const path = reconstructPath(endNode);
        const pathLength = dijkstraData.distances[endNode];
        
        logPathStep(`\n✅ ПУТЬ НАЙДЕН!`);
        logPathStep(`Длина пути: ${pathLength}`);
        logPathStep(`Вершин в пути: ${path.length}`);
        logPathStep(`Путь: ${path.join(' → ')}`);
        
        // Обновляем результаты
        document.getElementById('pathLength').textContent = pathLength;
        document.getElementById('pathVerticesCount').textContent = path.length;
        document.getElementById('pathSequence').textContent = path.join(' → ');
        
        // Визуализация финального пути
        await visualizeFinalPath(path);
    } else {
        logPathStep(`\n❌ Путь из ${startNode} в ${endNode} не найден!`);
        document.getElementById('pathLength').textContent = '∞';
        document.getElementById('pathVerticesCount').textContent = '0';
        document.getElementById('pathSequence').textContent = 'Путь не найден';
    }
    
    logPathStep('\n🏁 АЛГОРИТМ ЗАВЕРШЁН');
}

//Для Дейкстры
function getNeighborsDejcstra(nodeId, considerDirections) {
    const neighbors = [];
    const allEdges = edges.get();
    
    allEdges.forEach(edge => {
        // Проверяем, связано ли ребро с текущей вершиной
        if (edge.from === nodeId || edge.to === nodeId) {
            const isDirected = edge.arrows && edge.arrows.to && edge.arrows.to.enabled;
            
            // Если учитываем направленность и ребро направленное
            if (considerDirections && isDirected) {
                // Для направленного ребра только исходящие рёбра
                if (edge.from === nodeId) {
                    const weight = parseFloat(edge.label) || 1;
                    neighbors.push({
                        nodeId: edge.to,
                        edge: edge,
                        weight: weight
                    });
                }
            } else {
                // Для ненаправленных или если не учитываем направленность
                const neighborId = edge.from === nodeId ? edge.to : edge.from;
                const weight = parseFloat(edge.label) || 1;
                neighbors.push({
                    nodeId: neighborId,
                    edge: edge,
                    weight: weight
                });
            }
        }
    });
    
    return neighbors;
}
//Для BFS и DFS
function getNeighbors(nodeId, options = {}) {
    const {
        considerDirections = true,      // По умолчанию учитываем направленность
        includeEdgeData = false,        // По умолчанию только ID
        onlyUndirected = false          // По умолчанию все рёбра
    } = options;

    const allEdges = edges.get();
    const result = [];

    allEdges.forEach(edge => {
        const isDirected = edge.arrows && edge.arrows.to && edge.arrows.to.enabled;
        
        // Для Прима - пропускаем направленные рёбра
        if (onlyUndirected && isDirected) {
            return;
        }

        // Проверяем связь с текущей вершиной
        if (edge.from === nodeId || edge.to === nodeId) {
            const neighborId = edge.from === nodeId ? edge.to : edge.from;
            
            // Для направленных рёбер с учетом направленности
            if (considerDirections && isDirected) {
                // Только исходящие рёбра (от текущей вершины)
                if (edge.from === nodeId) {
                    if (includeEdgeData) {
                        const weight = parseFloat(edge.label) || 1;
                        result.push({
                            nodeId: neighborId,
                            edge: edge,
                            weight: weight,
                            isDirected: true
                        });
                    } else {
                        result.push(neighborId);
                    }
                }
            } else {
                // Для ненаправленных или без учета направленности
                if (includeEdgeData) {
                    const weight = parseFloat(edge.label) || 1;
                    result.push({
                        nodeId: neighborId,
                        edge: edge,
                        weight: weight,
                        isDirected: isDirected && edge.from === nodeId
                    });
                } else {
                    result.push(neighborId);
                }
            }
        }
    });

    // Фильтруем только существующие вершины
    const filteredResult = includeEdgeData 
        ? result.filter(item => nodes.get(item.nodeId))
        : result.filter(id => nodes.get(id));

    return filteredResult;
}

// Восстановление пути от конечной вершины к начальной
function reconstructPath(endNode) {
    const path = [];
    let currentNode = endNode;
    
    while (currentNode !== null) {
        path.unshift(currentNode);
        currentNode = dijkstraData.previous[currentNode];
    }
    
    return path;
}

// Визуализация финального пути
async function visualizeFinalPath(path) {
    // Подсвечиваем вершины пути
    for (const nodeId of path) {
        highlightVertex(nodeId, 'dijkstra-final-path');
    }
    
    // Подсвечиваем рёбра пути с задержкой
    for (let i = 0; i < path.length - 1; i++) {
        const from = path[i];
        const to = path[i + 1];
        
        // Ищем ребро между вершинами
        const edge = findEdgeBetween(from, to);
        if (edge) {
            highlightEdge(edge.id, 'dijkstra-final-path');
            
            // Добавляем на ребро информацию о накопленном расстоянии
            const accumulatedDistance = dijkstraData.distances[to];
            edges.update({
                id: edge.id,
                label: `${accumulatedDistance}`,
                font: {
                    size: 16,
                    color: '#FFFFFF',
                    strokeWidth: 2,
                    strokeColor: '#000000'
                }
            });
            
            await sleep(500);
        }
    }
}

// Поиск ребра между двумя вершинами
function findEdgeBetween(from, to) {
    const allEdges = edges.get();
    return allEdges.find(edge => 
        (edge.from === from && edge.to === to) ||
        (edge.from === to && edge.to === from)
    );
}

// Подсветка вершины
function highlightVertex(nodeId, className) {
    let colorConfig;
    
    switch(className) {
        case 'dijkstra-current':
            colorConfig = {
                background: '#FF6B6B',
                border: '#FF0000'
            };
            break;
        case 'dijkstra-updated':
            colorConfig = {
                background: '#FFD700',
                border: '#FFA500'
            };
            break;
        case 'dijkstra-final-path':
            colorConfig = {
                background: '#27ae60',
                border: '#219a52'
            };
            break;
        case 'dijkstra-visited':
            colorConfig = {
                background: '#BDC3C7',
                border: '#95A5A6'
            };
            break;
        default:
            colorConfig = NODE_CONFIG.color;
    }
    
    nodes.update({
        id: nodeId,
        color: {
            background: colorConfig.background,
            border: colorConfig.border,
            highlight: {
                background: colorConfig.background,
                border: colorConfig.border
            }
        }
    });
}

// Подсветка ребра
function highlightEdge(edgeId, className) {
    let color, width;
    
    switch(className) {
        case 'dijkstra-considered':
            color = '#FFA500';
            width = 3;
            break;
        case 'dijkstra-final-path':
            color = '#27ae60';
            width = 4;
            break;
        default:
            color = EDGE_CONFIG.color.color;
            width = EDGE_CONFIG.width;
    }
    
    edges.update({
        id: edgeId,
        color: {
            color: color,
            highlight: color
        },
        width: width
    });
}

// Сброс цвета ребра
function resetEdgeColor(edgeId) {
    edges.update({
        id: edgeId,
        color: EDGE_CONFIG.color,
        width: EDGE_CONFIG.width
    });
}

// Проверка на отрицательные веса
function hasNegativeWeights() {
    const allEdges = edges.get();
    return allEdges.some(edge => {
        const weight = parseFloat(edge.label);
        return weight < 0;
    });
}

// Логирование шагов
function logPathStep(message) {
    const pathLog = document.getElementById('pathLogArea');
    pathLog.value += message + '\n';
    pathLog.scrollTop = pathLog.scrollHeight;
}

// Сброс визуализации Дейкстры
function resetDijkstraVisualization() {
    // Останавливаем текущий алгоритм
    if (dijkstraData.timeout) {
        clearTimeout(dijkstraData.timeout);
        dijkstraData.timeout = null;
    }
    
    dijkstraData.isRunning = false;
    
    // Возвращаем все вершины к исходному виду
    const allNodes = nodes.get();
    allNodes.forEach(node => {
        nodes.update({
            id: node.id,
            color: NODE_CONFIG.color
        });
    });
    
    // Возвращаем все рёбра к исходному виду
    const allEdges = edges.get();
    allEdges.forEach(edge => {
        edges.update({
            id: edge.id,
            color: EDGE_CONFIG.color,
            width: EDGE_CONFIG.width,
            label: edge.label || undefined,
            font: EDGE_CONFIG.font
        });
    });
}

// Сброс всего алгоритма
function resetDijkstra() {
    resetDijkstraVisualization();
    
    dijkstraData = {
        isRunning: false,
        timeout: null,
        distances: {},
        previous: {},
        visited: new Set(),
        path: []
    };
    
    // Очищаем поля
    document.getElementById('startPathNode').value = '';
    document.getElementById('endPathNode').value = '';
    document.getElementById('pathLength').textContent = '0';
    document.getElementById('pathVerticesCount').textContent = '0';
    document.getElementById('pathSequence').textContent = 'Путь не найден';
    document.getElementById('pathLogArea').value = '';
    
    logPathStep('✖️ Поиск пути сброшен');
}

// Утилита для задержки
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}















// ============================================
// СОХРАНЕНИЕ И ЗАГРУЗКА ГРАФА
// ============================================


// Экспорт графа в JSON файл
function exportGraphToFile() {
    const graphName = document.getElementById('graphName').value.trim() || 'graph';
    const graphData = getGraphData();

    const dataStr = JSON.stringify(graphData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `${graphName}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

// Загрузка графа из файла
function loadGraphFromFile() {
    const fileInput = document.getElementById('graphFile');
    const loadPositions = document.getElementById('loadPositions').checked;
    const loadWeights = document.getElementById('loadWeights').checked;

    if (!fileInput.files || fileInput.files.length === 0) {
        alert('Выберите файл для загрузки');
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function (event) {
        try {
            const graphData = JSON.parse(event.target.result);
            loadGraphData(graphData, loadPositions, loadWeights);
        } catch (error) {
            alert('Ошибка при чтении файла: ' + error.message);
        }
    };

    reader.readAsText(file);
}

// Обработчик выбора файла
function handleFileSelect(event) {
    const fileInput = event.target;
    const fileName = document.getElementById('fileName');
    const loadBtn = document.getElementById('loadGraphBtn');

    if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        fileName.textContent = file.name;
        fileName.style.color = '#27ae60';
        loadBtn.disabled = false;
    } else {
        fileName.textContent = 'Файл не выбран';
        fileName.style.color = '#6c757d';
        loadBtn.disabled = true;
    }
}


//
//ЗАГРУЗКА И СОХРАНЕНИЕ ГРАФА
//

function setupSaveLoadSystem() {
    const saveBtn = document.getElementById('saveGraphBtn');
    const chooseBtn = document.getElementById('chooseFileBtn');
    const loadBtn = document.getElementById('loadGraphBtn');
    const fileInput = document.getElementById('graphFile');

    // Сохранить граф в файл
    saveBtn.addEventListener('click', saveGraphToFile);

    // Выбрать файл
    chooseBtn.addEventListener('click', () => {
        fileInput.click();
    });

    // Загрузить граф
    loadBtn.addEventListener('click', () => {
        if (fileInput.files.length > 0) {
            loadGraphFromFile();
        }
    });

    // Обработчик выбора файла
    fileInput.addEventListener('change', function () {
        if (this.files.length > 0) {
            loadBtn.disabled = false;
        } else {
            loadBtn.disabled = true;
        }
    });
}

// Сохранить граф в файл (автоматически, без вопросов)
function saveGraphToFile() {
    // Генерируем имя файла с датой
    const date = new Date();
    const fileName = `graph_${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}_${date.getHours()}-${date.getMinutes()}.json`;

    // Получаем данные графа (все настройки автоматически)
    const graphData = getGraphData();

    const dataStr = JSON.stringify(graphData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', fileName);
    linkElement.click();
}

// Загрузить граф из файла
function loadGraphFromFile() {
    const fileInput = document.getElementById('graphFile');

    if (!fileInput.files || fileInput.files.length === 0) {
        alert('Сначала выберите файл графа');
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function (event) {
        try {
            const graphData = JSON.parse(event.target.result);
            // Загружаем все настройки автоматически
            loadGraphData(graphData);
        } catch (error) {
            alert('Ошибка при чтении файла: ' + error.message);
        }
    };

    reader.readAsText(file);
}

// Получить полные данные графа (все настройки автоматически)
function getGraphData() {
    return {
        name: `Сохраненный граф от ${new Date().toLocaleString()}`,
        timestamp: new Date().toISOString(),
        nodes: nodes.get().map(node => ({
            id: node.id,
            label: node.label,
            x: node.x,          // Всегда сохраняем позиции
            y: node.y
        })),
        edges: edges.get().map(edge => ({
            from: edge.from,
            to: edge.to,
            weight: edge.label || null,       // Всегда сохраняем вес
            directed: edge.arrows && edge.arrows.to && edge.arrows.to.enabled, // Всегда сохраняем направленность
            // Для петель
            isLoop: edge.from === edge.to
        })),
        metadata: {
            version: '1.0',
            savedAt: new Date().toLocaleString(),
            totalNodes: nodes.length,
            totalEdges: edges.length
        }
    };
}

// Загрузить данные графа (все настройки автоматически)
function loadGraphData(graphData) {
    // Очистка текущего графа
    nodes.clear();
    edges.clear();

    // Загрузка вершин (все настройки)
    if (graphData.nodes) {
        graphData.nodes.forEach(node => {
            const newNode = {
                id: node.id,
                label: node.label || node.id,
                ...NODE_CONFIG
            };

            // Всегда загружаем позиции, если они есть
            if (node.x !== undefined && node.y !== undefined) {
                newNode.x = node.x;
                newNode.y = node.y;
            }

            nodes.add(newNode);
        });
    }

    // Загрузка рёбер (все настройки)
    if (graphData.edges) {
        graphData.edges.forEach(edge => {
            const newEdge = {
                from: edge.from,
                to: edge.to,
                ...EDGE_CONFIG
            };

            // Всегда загружаем вес
            if (edge.weight) {
                newEdge.label = edge.weight;
            }

            // Всегда загружаем направленность
            if (edge.directed) {
                newEdge.arrows = {
                    to: {
                        enabled: true,
                        scaleFactor: 1.2
                    }
                };
            }

            // Для петель
            if (edge.from === edge.to || edge.isLoop) {
                newEdge.selfReference = {
                    angle: Math.PI / 8,
                    size: 20
                };
                newEdge.smooth = {
                    enabled: true,
                    type: 'curvedCCW',
                    roundness: 0.2
                };
            }

            edges.add(newEdge);
        });
    }

    // Обновление таблиц
    updateAdjacencyMatrix();
    updateIncidenceMatrix();

    // Простое уведомление
    alert('Граф успешно загружен!');
}












// Функция для инициализации сворачивания всех секций
function setupCollapsibleSections() {
    // Получаем все кнопки сворачивания
    const collapseButtons = document.querySelectorAll('.collapse-btn');

    // Обработчик для кнопок сворачивания
    collapseButtons.forEach(button => {
        button.addEventListener('click', function (e) {
            e.stopPropagation();

            const sectionType = this.getAttribute('data-section');
            const section = document.getElementById(`${sectionType}-section`);

            // Переключаем состояние свернутости
            section.classList.toggle('collapsed');

            // Меняем иконку кнопки
            this.textContent = section.classList.contains('collapsed') ? '▶' : '▼';

            // Сохраняем состояние в localStorage
            saveSectionState(sectionType, section.classList.contains('collapsed'));

            // Если таблицы были скрыты, обновить их при разворачивании
            if (!section.classList.contains('collapsed')) {
                if (sectionType === 'graph-management') {
                    setTimeout(() => {
                        updateAdjacencyMatrix();
                        updateIncidenceMatrix();
                    }, 300);
                }
            }
        });
    });

    // Обработчик для клика по заголовку
    document.querySelectorAll('.section-header').forEach(header => {
        header.addEventListener('click', function (e) {
            if (!e.target.classList.contains('collapse-btn')) {
                const button = this.querySelector('.collapse-btn');
                if (button) {
                    button.click();
                }
            }
        });
    });

    // Восстанавливаем состояние секций из localStorage
    restoreSectionStates();
}

function saveSectionState(sectionType, isCollapsed) {
    localStorage.setItem(`graph_editor_section_${sectionType}`, isCollapsed);
}

function restoreSectionStates() {
    const sections = ['graph-management', 'max-flow', 'mst', 'shortest-path', 'save-load']; // Добавили 'mst', // Добавили 'shortest-path'

    sections.forEach(sectionType => {
        const section = document.getElementById(`${sectionType}-section`);
        const button = section?.querySelector('.collapse-btn');
        const isCollapsed = localStorage.getItem(`graph_editor_section_${sectionType}`) === 'true';

        if (section && button && isCollapsed) {
            section.classList.add('collapsed');
            button.textContent = '▶';
        }
    });
}




// ============================================
// АЛГОРИТМ ПРИМА - МИНИМАЛЬНОЕ ОСТОВНОЕ ДЕРЕВО
// ============================================

let mstEdges = []; // Хранит рёбра минимального остовного дерева
let mstRunning = false;
let mstTimeout = null;

// Инициализация алгоритма Прима
function setupMSTAlgorithm() {
    const findBtn = document.getElementById('findMSTBtn');
    const resetBtn = document.getElementById('resetMSTBtn');
    const startNodeInput = document.getElementById('mstStartNode');
    const mstLog = document.getElementById('mstLogArea');

    // Обработчики кнопок
    findBtn.addEventListener('click', findMinimumSpanningTree);
    resetBtn.addEventListener('click', resetMST);

    // Автоматическое заполнение поля при выборе вершины
    network.on('select', function (params) {
        const selectedNodes = network.getSelectedNodes();
        if (selectedNodes.length === 1 && !mstRunning) {
            const nodeId = selectedNodes[0];
            if (!startNodeInput.value) {
                startNodeInput.value = nodeId;
            }
        }
    });

    // Обработчик Enter для поля ввода
    startNodeInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') findMinimumSpanningTree();
    });
}

// Алгоритм Прима для нахождения минимального остовного дерева
function findMinimumSpanningTree() {
    if (mstRunning) {
        alert("Алгоритм уже выполняется!");
        return;
    }

    const startNodeId = document.getElementById('mstStartNode').value.trim();
    let startNode = null;

    // Определяем начальную вершину
    const allNodes = nodes.get();
    if (allNodes.length === 0) {
        alert("Граф пуст! Добавьте вершины.");
        return;
    }

    if (startNodeId) {
        startNode = nodes.get(startNodeId);
        if (!startNode) {
            alert(`Вершина с ID "${startNodeId}" не существует!`);
            return;
        }
    } else {
        // Берём первую вершину если не указана
        startNode = allNodes[0];
        document.getElementById('mstStartNode').value = startNode.id;
    }

    // Инициализация
    mstRunning = true;
    mstEdges = [];
    const visited = new Set([startNode.id]);
    const candidateEdges = new PriorityQueue((a, b) => a.weight - b.weight);
    const mstLog = document.getElementById('mstLogArea');
    let totalWeight = 0;
    let step = 0;

    // Очищаем лог и таблицу
    mstLog.value = '';
    clearMSTTable();

    // Сбрасываем предыдущую визуализацию
    resetMSTVisualization();

    // Логируем начало
    logMSTStep(`Начинаем алгоритм Прима для минимального остовного дерева`);
    logMSTStep(`Начальная вершина: ${startNode.id}`);

    // Добавляем все рёбра из начальной вершины в кандидаты
    addEdgesToQueue(startNode.id, candidateEdges, visited);

    function processNext() {
        if (candidateEdges.isEmpty()) {
            // Алгоритм завершён
            mstRunning = false;

            // Проверяем, все ли вершины в дереве
            const allNodesIds = new Set(allNodes.map(n => n.id));
            if (visited.size !== allNodesIds.size) {
                logMSTStep(`\n⚠️ Внимание: граф не связный!`);
                logMSTStep(`Остовное дерево построено только для ${visited.size} из ${allNodesIds.size} вершин`);
            }

            logMSTStep(`\n✅ Минимальное остовное дерево построено!`);
            logMSTStep(`Суммарный вес: ${totalWeight}`);
            logMSTStep(`Количество рёбер: ${mstEdges.length}`);

            // Обновляем итоговые результаты
            document.getElementById('mstTotalWeight').textContent = totalWeight.toFixed(2);
            document.getElementById('mstEdgesCount').textContent = mstEdges.length;

            updateMSTTable();
            return;
        }

        // Извлекаем ребро с минимальным весом
        const candidate = candidateEdges.pop();

        // Проверяем, не создаст ли это ребро цикл (обе вершины уже посещены)
        if (visited.has(candidate.from) && visited.has(candidate.to)) {
            // Пропускаем это ребро и переходим к следующему
            setTimeout(processNext, 500);
            return;
        }

        step++;

        // Определяем новую вершину
        const newVertex = visited.has(candidate.from) ? candidate.to : candidate.from;

        // Добавляем ребро в MST
        mstEdges.push(candidate);
        visited.add(newVertex);
        totalWeight += candidate.weight;

        // Логируем шаг
        logMSTStep(`\nШаг ${step}: Добавлено ребро ${candidate.from} — ${candidate.to} (вес: ${candidate.weight})`);
        logMSTStep(`Новая вершина в дереве: ${newVertex}`);
        logMSTStep(`Текущий суммарный вес: ${totalWeight}`);

        // Визуализация: подсвечиваем выбранное ребро
        highlightMSTEdge(candidate.edgeId, candidate.weight, step);

        // Добавляем рёбра из новой вершины в очередь кандидатов
        addEdgesToQueue(newVertex, candidateEdges, visited);

        // Следующий шаг с задержкой
        mstTimeout = setTimeout(processNext, 1000);
    }

    // Запускаем обработку
    processNext();
}

// Добавление рёбер в очередь кандидатов
function addEdgesToQueue(vertexId, queue, visited) {
    const allEdges = edges.get();

    allEdges.forEach(edge => {
        // Пропускаем направленные рёбра для MST
        const isDirected = edge.arrows && edge.arrows.to && edge.arrows.to.enabled;
        if (isDirected) return;

        // Проверяем, инцидентно ли ребро текущей вершине
        if (edge.from === vertexId || edge.to === vertexId) {
            const otherVertex = edge.from === vertexId ? edge.to : edge.from;

            // Если другая вершина ещё не посещена, добавляем ребро в очередь
            if (!visited.has(otherVertex)) {
                const weight = parseFloat(edge.label) || 1;
                queue.push({
                    from: edge.from,
                    to: edge.to,
                    weight: weight,
                    edgeId: edge.id
                });

                // Временно подсвечиваем кандидатов
                highlightCandidateEdge(edge.id);
            }
        }
    });
}

// Приоритетная очередь (минимальная куча)
class PriorityQueue {
    constructor(comparator = (a, b) => a - b) {
        this.heap = [];
        this.comparator = comparator;
    }

    push(item) {
        this.heap.push(item);
        this._siftUp();
    }

    pop() {
        if (this.heap.length === 0) return null;
        if (this.heap.length === 1) return this.heap.pop();

        const result = this.heap[0];
        this.heap[0] = this.heap.pop();
        this._siftDown();
        return result;
    }

    isEmpty() {
        return this.heap.length === 0;
    }

    _siftUp() {
        let node = this.heap.length - 1;
        while (node > 0) {
            const parent = Math.floor((node - 1) / 2);
            if (this.comparator(this.heap[node], this.heap[parent]) < 0) {
                [this.heap[node], this.heap[parent]] = [this.heap[parent], this.heap[node]];
                node = parent;
            } else {
                break;
            }
        }
    }

    _siftDown() {
        let node = 0;
        const length = this.heap.length;

        while (true) {
            let leftChild = 2 * node + 1;
            let rightChild = 2 * node + 2;
            let swap = null;

            if (leftChild < length && this.comparator(this.heap[leftChild], this.heap[node]) < 0) {
                swap = leftChild;
            }

            if (rightChild < length) {
                if ((swap === null && this.comparator(this.heap[rightChild], this.heap[node]) < 0) ||
                    (swap !== null && this.comparator(this.heap[rightChild], this.heap[leftChild]) < 0)) {
                    swap = rightChild;
                }
            }

            if (swap === null) break;

            [this.heap[node], this.heap[swap]] = [this.heap[swap], this.heap[node]];
            node = swap;
        }
    }
}

// Визуализация: подсветка рёбер MST
function highlightMSTEdge(edgeId, weight, step) {
    edges.update({
        id: edgeId,
        color: {
            color: '#27ae60',
            highlight: '#27ae60',
            hover: '#27ae60'
        },
        width: 4,
        label: `[${step}] ${weight}`
    });

    // Добавляем класс для CSS
    const edgeElement = document.querySelector(`[data-edge-id="${edgeId}"]`);
    if (edgeElement) {
        edgeElement.classList.add('mst-edge');
    }
}

// Временная подсветка кандидатов
function highlightCandidateEdge(edgeId) {
    edges.update({
        id: edgeId,
        color: {
            color: '#f39c12',
            highlight: '#f39c12'
        },
        width: 3
    });

    // Через некоторое время возвращаем стандартный цвет (если ребро не выбрано)
    setTimeout(() => {
        const edge = edges.get(edgeId);
        // Если ребро не в MST, возвращаем стандартный цвет
        if (edge && edge.color && edge.color.color === '#f39c12') {
            edges.update({
                id: edgeId,
                color: EDGE_CONFIG.color,
                width: EDGE_CONFIG.width
            });
        }
    }, 800);
}

// Сброс визуализации MST
function resetMSTVisualization() {
    // Останавливаем текущий алгоритм
    if (mstTimeout) {
        clearTimeout(mstTimeout);
        mstTimeout = null;
    }

    mstRunning = false;

    // Возвращаем все рёбра к исходному виду
    const allEdges = edges.get();
    allEdges.forEach(edge => {
        edges.update({
            id: edge.id,
            color: EDGE_CONFIG.color,
            width: EDGE_CONFIG.width,
            label: edge.label || undefined
        });
    });
}

// Сброс всего MST
function resetMST() {
    resetMSTVisualization();
    mstEdges = [];

    // Очищаем поля
    document.getElementById('mstStartNode').value = '';
    document.getElementById('mstTotalWeight').textContent = '0';
    document.getElementById('mstEdgesCount').textContent = '0';
    document.getElementById('mstLogArea').value = '';

    clearMSTTable();

    logMSTStep('Остовное дерево сброшено');
}

// Логирование шагов MST
function logMSTStep(message) {
    const mstLog = document.getElementById('mstLogArea');
    mstLog.value += message + '\n';
    mstLog.scrollTop = mstLog.scrollHeight;
}

// Обновление таблицы рёбер MST
function updateMSTTable() {
    const tableBody = document.querySelector('#mstEdgesTable tbody');

    mstEdges.forEach((edge, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${edge.from} — ${edge.to}</td>
            <td><strong>${edge.weight}</strong></td>
        `;
        tableBody.appendChild(row);
    });
}

// Очистка таблицы MST
function clearMSTTable() {
    const tableBody = document.querySelector('#mstEdgesTable tbody');
    tableBody.innerHTML = '';
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