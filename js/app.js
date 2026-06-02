import { CONFIG } from './config.js';
import { countWords, generateId } from './utils.js';
import { saveLocal, loadLocal, searchYouTube } from './api.js';
import { UI } from './ui.js';

let state = { docs: [], currentDocId: null, theme: 'blue', isFocusMode: false };
let typingTimer;

let draggedNodeId = null;
let isLinkingMode = false;
let nodeWaitingForLink = null;

let drawHistory = [];
let historyStep = -1;
let isMainDrawingMode = false;
let isErasing = false;
let isDrawing = false;
let ctx = null; 

// --- Document Management ---
const createNewDocument = () => {
    const untitledCount = state.docs.filter(d => d.title && d.title.startsWith("Untitled")).length + 1;
    const newDoc = { 
        id: generateId(), 
        title: `Untitled Story ${untitledCount}`, 
        text: '', 
        nodes: [{ id: generateId(), x: 200, y: 200, text: 'Protagonist' }],
        edges: [], 
        drawingData: null 
    };
    state.docs.push(newDoc);
    state.currentDocId = newDoc.id;
    saveLocal(state);
    
    loadCurrentDocument();
    setTimeout(() => UI.getElements().docTitleInput.focus(), 50);
};

const loadCurrentDocument = () => {
    const doc = state.docs.find(d => d.id === state.currentDocId);
    if (!doc) return;
    
    if (!doc.title) doc.title = "Legacy Story"; 
    if (!doc.nodes) doc.nodes = [];
    if (!doc.edges) doc.edges = [];

    UI.setEditorData(doc.title, doc.text || "");
    UI.updateWordCount(countWords(doc.text || ""));
    UI.showEditor(); 
    
    drawHistory = [];
    historyStep = -1;
    initCanvas(); 
    renderBoard();
};

const deleteDocument = (id) => {
    state.docs = state.docs.filter(d => d.id !== id);
    if(state.currentDocId === id) state.currentDocId = null;
    saveLocal(state);
    refreshDashboard();
};

const refreshDashboard = () => {
    UI.getElements().docTitleInput.blur(); 
    if(isMainDrawingMode) document.getElementById('main-draw-btn').click(); 

    UI.renderDocGrid(state.docs, (id) => {
        state.currentDocId = id;
        loadCurrentDocument();
    }, deleteDocument);
    UI.showDashboard();
};

// --- Editor Logic ---
const handleTyping = () => {
    const els = UI.getElements();
    const doc = state.docs.find(d => d.id === state.currentDocId);
    if (!doc) return;

    doc.title = els.docTitleInput.value || "Untitled";
    doc.text = els.editor.innerHTML; 
    
    UI.updateWordCount(countWords(doc.text));
    saveLocal(state);

    if (state.isFocusMode) {
        document.body.classList.add('typing-focus');
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
            document.body.classList.remove('typing-focus');
        }, CONFIG.FOCUS_TIMEOUT_MS);
    }
};

const handlePaste = (e) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (let index in items) {
        const item = items[index];
        if (item.kind === 'file' && item.type.includes('image/')) {
            e.preventDefault(); 
            const blob = item.getAsFile();
            const reader = new FileReader();
            reader.onload = (event) => {
                document.execCommand("insertImage", false, event.target.result);
                handleTyping(); 
            };
            reader.readAsDataURL(blob);
        }
    }
};

// --- Main Editor Drawing Tools ---
const initCanvas = () => {
    const canvas = UI.getElements().drawLayer;
    const container = UI.getElements().mainContentArea;
    
    canvas.width = container.scrollWidth;
    canvas.height = container.scrollHeight;
    
    ctx = canvas.getContext('2d');
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = state.theme === 'dark' ? '#ffffff' : '#000000'; 

    const doc = state.docs.find(d => d.id === state.currentDocId);
    if (doc && doc.drawingData) {
        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0);
            saveStateToHistory(); 
        };
        img.src = doc.drawingData;
    } else {
        saveStateToHistory(); 
    }
};

const saveStateToHistory = () => {
    const canvas = UI.getElements().drawLayer;
    historyStep++;
    drawHistory.length = historyStep; 
    drawHistory.push(canvas.toDataURL());

    const doc = state.docs.find(d => d.id === state.currentDocId);
    if (doc) {
        doc.drawingData = canvas.toDataURL();
        saveLocal(state);
    }
};

const restoreCanvasState = (dataUrl) => {
    const canvas = UI.getElements().drawLayer;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0);
    img.src = dataUrl;
    
    const doc = state.docs.find(d => d.id === state.currentDocId);
    if (doc) { doc.drawingData = dataUrl; saveLocal(state); }
};

const setupDrawingTools = () => {
    const els = UI.getElements();

    els.mainDrawBtn.addEventListener('click', () => {
        isMainDrawingMode = !isMainDrawingMode;
        document.body.classList.toggle('main-drawing-mode', isMainDrawingMode);
        
        els.eraserBtn.classList.toggle('hidden', !isMainDrawingMode);
        els.undoBtn.classList.toggle('hidden', !isMainDrawingMode);
        els.redoBtn.classList.toggle('hidden', !isMainDrawingMode);
        els.clearBtn.classList.toggle('hidden', !isMainDrawingMode);

        if (isMainDrawingMode) {
            initCanvas();
            isErasing = false;
            els.eraserBtn.classList.remove('active');
            els.mainDrawBtn.classList.add('active');
            ctx.globalCompositeOperation = 'source-over'; 
            ctx.lineWidth = 3;
        } else {
            els.mainDrawBtn.classList.remove('active');
        }
    });

    els.eraserBtn.addEventListener('click', () => {
        isErasing = !isErasing;
        if (isErasing) {
            els.eraserBtn.classList.add('active');
            els.mainDrawBtn.classList.remove('active');
            ctx.globalCompositeOperation = 'destination-out'; 
            ctx.lineWidth = 20; 
        } else {
            els.eraserBtn.classList.remove('active');
            els.mainDrawBtn.classList.add('active');
            ctx.globalCompositeOperation = 'source-over'; 
            ctx.lineWidth = 3;
        }
    });

    els.undoBtn.addEventListener('click', () => {
        if (historyStep > 0) {
            historyStep--;
            restoreCanvasState(drawHistory[historyStep]);
        }
    });

    els.redoBtn.addEventListener('click', () => {
        if (historyStep < drawHistory.length - 1) {
            historyStep++;
            restoreCanvasState(drawHistory[historyStep]);
        }
    });
    
    els.clearBtn.addEventListener('click', () => {
        if (confirm("Erase all ink on this page?")) {
            ctx.clearRect(0, 0, els.drawLayer.width, els.drawLayer.height);
            saveStateToHistory();
        }
    });

    els.drawLayer.addEventListener('mousedown', (e) => {
        if (!isMainDrawingMode) return;
        isDrawing = true;
        ctx.beginPath();
        ctx.moveTo(e.offsetX, e.offsetY); 
    });

    els.drawLayer.addEventListener('mousemove', (e) => {
        if (!isDrawing || !isMainDrawingMode) return;
        ctx.lineTo(e.offsetX, e.offsetY);
        ctx.stroke();
    });

    els.drawLayer.addEventListener('mouseup', () => { if (isDrawing) { isDrawing = false; saveStateToHistory(); } });
    els.drawLayer.addEventListener('mouseleave', () => { if (isDrawing) { isDrawing = false; saveStateToHistory(); } });
};

// --- Character Board Logic ---
const renderBoard = () => {
    const doc = state.docs.find(d => d.id === state.currentDocId);
    const els = UI.getElements();
    if (!doc) return;
    
    els.nodeContainer.innerHTML = '';
    
    doc.nodes.forEach(node => {
        const div = document.createElement('div');
        div.className = `free-node ${nodeWaitingForLink === node.id ? 'selected-to-link' : ''}`;
        div.style.left = node.x + 'px'; div.style.top = node.y + 'px';
        div.id = `node-${node.id}`;

        const input = document.createElement('input');
        input.value = node.text;
        input.addEventListener('input', (e) => { node.text = e.target.value; saveLocal(state); });
        
        const delBtn = document.createElement('button');
        delBtn.className = 'delete-node-btn'; delBtn.textContent = 'Remove';
        delBtn.addEventListener('click', () => {
            doc.nodes = doc.nodes.filter(n => n.id !== node.id);
            doc.edges = doc.edges.filter(e => e.from !== node.id && e.to !== node.id);
            saveLocal(state); renderBoard();
        });

        div.appendChild(input); div.appendChild(delBtn);

        div.addEventListener('mousedown', (e) => {
            if (isLinkingMode) {
                if (!nodeWaitingForLink) nodeWaitingForLink = node.id;
                else if (nodeWaitingForLink !== node.id) {
                    doc.edges.push({ from: nodeWaitingForLink, to: node.id });
                    nodeWaitingForLink = null;
                    document.body.classList.remove('linking-mode'); 
                    isLinkingMode = false; saveLocal(state);
                }
                renderBoard();
            } else if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON') {
                draggedNodeId = node.id;
            }
        });
        els.nodeContainer.appendChild(div);
    });
    drawEdges();
};

const drawEdges = () => {
    const doc = state.docs.find(d => d.id === state.currentDocId);
    const svg = UI.getElements().svgLines;
    svg.innerHTML = ''; 
    if (!doc || !doc.edges) return;

    doc.edges.forEach(edge => {
        const fromNode = doc.nodes.find(n => n.id === edge.from);
        const toNode = doc.nodes.find(n => n.id === edge.to);
        if (fromNode && toNode) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', fromNode.x + 60); line.setAttribute('y1', fromNode.y + 30);
            line.setAttribute('x2', toNode.x + 60); line.setAttribute('y2', toNode.y + 30);
            svg.appendChild(line);
        }
    });
};

const setupBoardEvents = () => {
    document.getElementById('open-tree-btn').addEventListener('click', () => { UI.toggleTreeModal(true); renderBoard(); });
    document.getElementById('close-tree-btn').addEventListener('click', () => { UI.toggleTreeModal(false); isLinkingMode = false; document.body.classList.remove('linking-mode'); });
    document.getElementById('add-node-btn').addEventListener('click', () => {
        const doc = state.docs.find(d => d.id === state.currentDocId);
        doc.nodes.push({ id: generateId(), x: 100, y: 100, text: 'New Note' });
        saveLocal(state); renderBoard();
    });
    document.getElementById('link-nodes-btn').addEventListener('click', () => {
        isLinkingMode = !isLinkingMode; nodeWaitingForLink = null;
        document.body.classList.toggle('linking-mode', isLinkingMode); renderBoard();
    });
    document.getElementById('board-canvas').addEventListener('mousemove', (e) => {
        if (draggedNodeId) {
            const doc = state.docs.find(d => d.id === state.currentDocId);
            const node = doc.nodes.find(n => n.id === draggedNodeId);
            if (node) { node.x += e.movementX; node.y += e.movementY; renderBoard(); }
        }
    });
    document.getElementById('board-canvas').addEventListener('mouseup', () => { if (draggedNodeId) { draggedNodeId = null; saveLocal(state); } });
};

// --- Boot ---
const setupEvents = () => {
    const els = UI.getElements();

    els.editor.addEventListener('input', handleTyping);
    els.docTitleInput.addEventListener('input', handleTyping);
    els.editor.addEventListener('paste', handlePaste);
    
    document.getElementById('toggle-sidebar-btn').addEventListener('click', UI.toggleSidebar);
    document.getElementById('home-btn').addEventListener('click', refreshDashboard);
    document.getElementById('new-doc-btn').addEventListener('click', createNewDocument);
    
    els.themeSelect.addEventListener('change', (e) => { 
        state.theme = e.target.value; UI.setTheme(state.theme); saveLocal(state); 
        if (ctx) ctx.strokeStyle = state.theme === 'dark' ? '#ffffff' : '#000000'; 
    });

    els.focusBtn.addEventListener('click', () => {
        state.isFocusMode = !state.isFocusMode;
        els.focusBtn.textContent = `Focus: ${state.isFocusMode ? 'ON' : 'OFF'}`;
        els.focusBtn.classList.toggle('on', state.isFocusMode);
    });

    document.getElementById('yt-search-btn').addEventListener('click', async () => {
        const query = document.getElementById('yt-search').value;
        const videos = await searchYouTube(query);
        if (videos.length > 0) UI.renderYouTubeResults(videos, UI.embedYouTubeVideo);
    });

    setupDrawingTools();
    setupBoardEvents();
};

const boot = () => {
    UI.init();
    const savedData = loadLocal();
    if (savedData && savedData.docs && savedData.docs.length > 0) {
        state = savedData;
        refreshDashboard();
    } else {
        createNewDocument();
    }
    
    UI.setTheme(state.theme);
    UI.getElements().themeSelect.value = state.theme;
    setupEvents();
};

document.addEventListener('DOMContentLoaded', boot);