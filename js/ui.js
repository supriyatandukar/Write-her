let els = {};

export const UI = {
    init: () => {
        els = {
            body: document.body, 
            editor: document.getElementById('editor'),
            docTitleInput: document.getElementById('doc-title-input'),
            docGrid: document.getElementById('doc-grid'), 
            dashboardView: document.getElementById('dashboard-view'),
            editorView: document.getElementById('editor-view'),
            wordCount: document.getElementById('word-count'),
            themeSelect: document.getElementById('theme-select'), 
            ytContainer: document.getElementById('yt-iframe-container'),
            ytResults: document.getElementById('yt-results'), 
            focusBtn: document.getElementById('floating-focus-btn'),
            
            // Sidebar & Canvas
            sidebar: document.getElementById('sidebar'),
            mainContentArea: document.getElementById('main-content-area'),
            drawLayer: document.getElementById('main-draw-layer'),
            
            // Drawing Tools
            mainDrawBtn: document.getElementById('main-draw-btn'),
            eraserBtn: document.getElementById('eraser-btn'),
            undoBtn: document.getElementById('undo-btn'),
            redoBtn: document.getElementById('redo-btn'),
            clearBtn: document.getElementById('clear-draw-btn'),

            // Board
            treeModal: document.getElementById('tree-modal'), 
            nodeContainer: document.getElementById('node-container'),
            svgLines: document.getElementById('svg-lines')
        };
    },
    getElements: () => els,
    updateWordCount: (count) => els.wordCount.textContent = count > 0 ? `${count} words` : '',
    setTheme: (theme) => els.body.setAttribute('data-theme', theme),
    
showDashboard: () => {
        els.dashboardView.classList.remove('hidden');
        els.editorView.classList.add('hidden');
        els.wordCount.textContent = ""; 
        
        // --- NEW: Hide all drawing tools on the Dashboard ---
        els.mainDrawBtn.classList.add('hidden');
        els.eraserBtn.classList.add('hidden');
        els.undoBtn.classList.add('hidden');
        els.redoBtn.classList.add('hidden');
        els.clearBtn.classList.add('hidden');
    },
    
    showEditor: () => {
        els.dashboardView.classList.add('hidden');
        els.editorView.classList.remove('hidden');
        
        // --- NEW: Bring back only the main Draw button for the Editor ---
        els.mainDrawBtn.classList.remove('hidden');
    },

    setEditorData: (title, html) => {
        els.docTitleInput.value = title;
        els.editor.innerHTML = html;
    },

    toggleTreeModal: (show) => els.treeModal.classList.toggle('hidden', !show),
    toggleSidebar: () => els.sidebar.classList.toggle('collapsed'),

    // Library Grid Rendering
    renderDocGrid: (docs, onDocClick, onDeleteClick) => {
        els.docGrid.innerHTML = '';
        docs.forEach(doc => {
            const card = document.createElement('div');
            card.className = 'story-card';
            
            const plainText = doc.text.replace(/<[^>]*>?/gm, '');
            const preview = plainText.substring(0, 100) || "Empty document...";

            card.innerHTML = `
                <h3>${doc.title}</h3>
                <div class="story-preview" style="opacity: 0.6; font-size: 0.9rem; margin-top: 10px;">${preview}</div>
            `;
            
            const delBtn = document.createElement('button');
            delBtn.className = 'delete-story-btn';
            delBtn.textContent = '🗑️';
            delBtn.onclick = (e) => {
                e.stopPropagation(); 
                if(confirm("Delete this story permanently?")) onDeleteClick(doc.id);
            };

            card.appendChild(delBtn);
            card.addEventListener('click', () => onDocClick(doc.id));
            els.docGrid.appendChild(card);
        });
    },

    renderYouTubeResults: (videos, onVideoClick) => {
        els.ytResults.innerHTML = '';
        els.ytResults.classList.remove('hidden');
        videos.forEach(video => {
            const item = document.createElement('div');
            item.className = 'yt-result-item';
            item.innerHTML = `<img src="${video.snippet.thumbnails.default.url}"> <span>${video.snippet.title}</span>`;
            item.addEventListener('click', () => { els.ytResults.classList.add('hidden'); onVideoClick(video.id.videoId); });
            els.ytResults.appendChild(item);
        });
    },
    embedYouTubeVideo: (videoId) => els.ytContainer.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>`
};