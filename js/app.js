document.addEventListener('DOMContentLoaded', () => {
    // State
    let allDocuments = [];
    let currentCategory = 'all';
    let searchQuery = '';

    // DOM Elements
    const searchInput = document.getElementById('searchInput');
    const categoryList = document.getElementById('categoryList');
    const documentList = document.getElementById('documentList');
    const resultCount = document.getElementById('resultCount');
    const pdfModal = document.getElementById('pdfModal');
    const modalTitle = document.getElementById('modalTitle');
    const pdfFrame = document.getElementById('pdfFrame');
    const closeModal = document.getElementById('closeModal');
    const mdContainer = document.getElementById('mdContainer');

    // Fetch Data
    fetch('data/docs.json')
        .then(response => response.json())
        .then(data => {
            allDocuments = data;
            initCategories();
            renderDocuments();
        })
        .catch(err => {
            console.error('Failed to load documents:', err);
            documentList.innerHTML = '<div class="error">未加载数据库</div>';
        });

    // Initialize Categories
    function initCategories() {
        const categories = new Set(allDocuments.map(doc => doc.category));
        
        categories.forEach(cat => {
            const li = document.createElement('li');
            li.textContent = cat;
            li.dataset.category = cat;
            li.addEventListener('click', () => {
                // Update active state
                document.querySelectorAll('.category-list li').forEach(el => el.classList.remove('active'));
                li.classList.add('active');
                
                // Filter
                currentCategory = cat;
                renderDocuments();
            });
            categoryList.appendChild(li);
        });

        // "All" category event
        categoryList.querySelector('[data-category="all"]').addEventListener('click', (e) => {
            document.querySelectorAll('.category-list li').forEach(el => el.classList.remove('active'));
            e.target.classList.add('active');
            currentCategory = 'all';
            renderDocuments();
        });
    }

    // Render Documents
    function renderDocuments() {
        // Filter
        let filtered = allDocuments.filter(doc => {
            const matchesCategory = currentCategory === 'all' || doc.category === currentCategory;
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch = !searchQuery || 
                                  doc.title.toLowerCase().includes(searchLower);
            return matchesCategory && matchesSearch;
        });

        // Update count
        resultCount.textContent = `找到 ${filtered.length} 个文档`;

        // Clear list
        documentList.innerHTML = '';

        if (filtered.length === 0) {
            documentList.innerHTML = '<div class="no-results">未搜索到匹配的项目</div>';
            return;
        }

        // Create elements
        const fragment = document.createDocumentFragment();
        filtered.forEach(doc => {
            const card = document.createElement('div');
            card.className = 'doc-card';
            card.onclick = () => openPreview(doc);

            const meta = document.createElement('div');
            meta.className = 'doc-meta';
            meta.innerHTML = `<span class="doc-category">${doc.category}</span> <span>${doc.date}</span>`;

            const title = document.createElement('h3');
            title.className = 'doc-title';
            title.textContent = doc.title;

            card.appendChild(meta);
            card.appendChild(title);
            fragment.appendChild(card);
        });

        documentList.appendChild(fragment);
    }

    // Search Handler (Debounced)
    let timeout = null;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            searchQuery = e.target.value.trim();
            renderDocuments();
        }, 300);
    });

    // Modal Functions
    function openPreview(doc) {
        modalTitle.textContent = doc.title;
        const lower = (doc.file || '').toLowerCase();
        if (lower.endsWith('.md')) {
            pdfFrame.src = '';
            pdfFrame.style.display = 'none';
            mdContainer.style.display = 'block';
            fetch(doc.file)
                .then(r => r.text())
                .then(text => {
                    const html = typeof marked !== 'undefined' && marked.parse ? marked.parse(text) : text;
                    mdContainer.innerHTML = html;
                    pdfModal.classList.add('show');
                    pdfModal.setAttribute('aria-hidden', 'false');
                    document.body.style.overflow = 'hidden';
                })
                .catch(() => {
                    mdContainer.innerHTML = '<div class="error">无法加载 Markdown 文档。</div>';
                    pdfModal.classList.add('show');
                    pdfModal.setAttribute('aria-hidden', 'false');
                    document.body.style.overflow = 'hidden';
                });
        } else {
            pdfFrame.style.display = 'block';
            mdContainer.style.display = 'none';
            mdContainer.innerHTML = '';
            pdfFrame.src = doc.file;
            pdfModal.classList.add('show');
            pdfModal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
        }
    }

    function closePreview() {
        pdfModal.classList.remove('show');
        pdfModal.setAttribute('aria-hidden', 'true');
        pdfFrame.src = '';
        pdfFrame.style.display = 'block';
        mdContainer.innerHTML = '';
        mdContainer.style.display = 'none';
        document.body.style.overflow = '';
    }

    closeModal.addEventListener('click', closePreview);
    
    // Close on click outside
    pdfModal.addEventListener('click', (e) => {
        if (e.target === pdfModal) {
            closePreview();
        }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && pdfModal.classList.contains('show')) {
            closePreview();
        }
    });

    // Prevent pinch-zoom on the main page (iOS Safari workaround)
    document.addEventListener('gesturestart', function(e) {
        // Allow gesture on iframe (PDF viewer) if it bubbles, otherwise prevent
        if (e.target.tagName !== 'IFRAME') {
            e.preventDefault();
        }
    });
});
