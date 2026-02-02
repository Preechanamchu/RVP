/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA - Signature Pad Component
 * Canvas-based digital signature capture for PDPA compliance
 * ══════════════════════════════════════════════════════════════════════════
 */

const SignaturePad = {
    canvas: null,
    ctx: null,
    isDrawing: false,
    lastX: 0,
    lastY: 0,

    /**
     * Initialize signature pad on a canvas element
     * @param {string} containerId - ID of the container element
     * @returns {HTMLElement}
     */
    init(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return null;

        container.innerHTML = `
            <div class="signature-pad-container">
                <p style="margin-bottom: var(--space-3); color: var(--neutral-500);">
                    กรุณาลงลายเซ็นด้านล่าง
                </p>
                <canvas class="signature-pad" id="signatureCanvas"></canvas>
                <div class="signature-actions">
                    <button type="button" class="btn btn-ghost btn-sm" onclick="SignaturePad.clear()">
                        ล้าง
                    </button>
                </div>
            </div>
        `;

        this.canvas = document.getElementById('signatureCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Set canvas size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // Setup drawing
        this.setupDrawing();

        return this.canvas;
    },

    /**
     * Resize canvas to fit container
     */
    resizeCanvas() {
        if (!this.canvas) return;
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width - 32; // Account for padding
        this.canvas.height = 200;
        this.ctx.strokeStyle = '#1A202C';
        this.ctx.lineWidth = 2;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
    },

    /**
     * Setup mouse/touch drawing events
     */
    setupDrawing() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseout', () => this.stopDrawing());

        // Touch events
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.startDrawing(e.touches[0]);
        });
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.draw(e.touches[0]);
        });
        this.canvas.addEventListener('touchend', () => this.stopDrawing());
    },

    /**
     * Start drawing
     * @param {MouseEvent|Touch} e 
     */
    startDrawing(e) {
        this.isDrawing = true;
        const rect = this.canvas.getBoundingClientRect();
        this.lastX = e.clientX - rect.left;
        this.lastY = e.clientY - rect.top;
    },

    /**
     * Draw on canvas
     * @param {MouseEvent|Touch} e 
     */
    draw(e) {
        if (!this.isDrawing) return;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.ctx.beginPath();
        this.ctx.moveTo(this.lastX, this.lastY);
        this.ctx.lineTo(x, y);
        this.ctx.stroke();

        this.lastX = x;
        this.lastY = y;
    },

    /**
     * Stop drawing
     */
    stopDrawing() {
        this.isDrawing = false;
    },

    /**
     * Clear the signature
     */
    clear() {
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    },

    /**
     * Check if signature is empty
     * @returns {boolean}
     */
    isEmpty() {
        if (!this.canvas) return true;
        const data = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height).data;
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] !== 0) return false;
        }
        return true;
    },

    /**
     * Get signature as data URL
     * @returns {string}
     */
    getDataUrl() {
        if (!this.canvas || this.isEmpty()) return null;
        return this.canvas.toDataURL('image/png');
    },

    /**
     * Load signature from Data URL
     * @param {string} dataUrl 
     */
    fromDataUrl(dataUrl) {
        if (!this.canvas || !this.ctx || !dataUrl) return;

        const img = new Image();
        img.onload = () => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(img, 0, 0);
        };
        img.src = dataUrl;
    }
};

/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA - Media Upload Component
 * Handles photo and video uploads with preview
 * ══════════════════════════════════════════════════════════════════════════
 */

const MediaUpload = {
    instances: {}, // Store state for each container: { files: [], onChange: func, options: {} }

    /**
     * Initialize media upload component
     * @param {string} containerId 
     * @param {object} options 
     */
    init(containerId, options = {}) {
        // Initialize instance state
        this.instances[containerId] = {
            files: [],
            onChange: options.onChange,
            options: options
        };

        const container = document.getElementById(containerId);
        if (!container) return;

        // Determine accept type and hint based on options.acceptTypes
        let acceptAttr = 'image/*,application/pdf';
        let hintText = 'รองรับ JPG, PNG, WEBP, PDF';

        if (options.acceptTypes) {
            // Check if it's video types
            const isVideoOnly = options.acceptTypes.some(t => t.includes('video'));
            const isImageOnly = options.acceptTypes.some(t => t.includes('image'));
            const isDocument = options.acceptTypes.some(t => t.includes('pdf') || t.includes('word') || t.includes('excel'));

            if (isVideoOnly && !isImageOnly) {
                acceptAttr = 'video/*';
                hintText = 'รองรับ MP4, MOV, AVI, WMV, FLV, WEBM';
            } else if (isDocument) {
                acceptAttr = 'image/*,' + options.acceptTypes.join(',');
                hintText = 'รองรับ JPG, PNG, WEBP, PDF, Word, Excel';
            } else if (options.acceptVideo) {
                acceptAttr = 'image/*,video/*';
                hintText = 'รองรับ JPG, PNG, WEBP, MP4, MOV, AVI, WMV, FLV, WEBM';
            } else {
                acceptAttr = options.acceptTypes.join(',');
            }
        } else if (options.acceptVideo) {
            acceptAttr = 'image/*,video/*';
            hintText = 'รองรับ JPG, PNG, WEBP, MP4, MOV, AVI, WMV, FLV, WEBM';
        }

        container.innerHTML = `
            <div class="upload-zone" id="${containerId}Zone">
                <button type="button" class="upload-select-btn">
                    ${Icons.upload}
                    <span>Select files</span>
                </button>
                <input type="file" id="${containerId}Input" multiple accept="${acceptAttr}" style="display:none" onchange="MediaUpload.handleFiles('${containerId}', this.files)">
            </div>
            <div class="upload-preview" id="${containerId}Preview"></div>
        `;

        this.setupEvents(containerId, options);
    },

    /**
     * Load existing files
     * @param {Array} files 
     * Note: This method is legacy/singleton-style. Prefer restoreFiles for specific container.
     */
    loadFiles(files) {
        console.warn('MediaUpload.loadFiles is deprecated. Use restoreFiles(containerId, files) instead.');
    },

    /**
     * Setup upload events
     * @param {string} containerId 
     * @param {object} options 
     */
    setupEvents(containerId, options) {
        const zone = document.getElementById(`${containerId}Zone`);
        const input = document.getElementById(`${containerId}Input`);
        const preview = document.getElementById(`${containerId}Preview`);

        // Click to upload
        zone.addEventListener('click', () => input.click());

        // Drag and drop
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('dragover');
        });
        zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('dragover');
            this.handleFiles(containerId, e.dataTransfer.files);
        });
    },

    /**
     * Handle selected files
     * @param {string} containerId
     * @param {FileList} fileList 
     */
    async handleFiles(containerId, fileList) {
        const instance = this.instances[containerId];
        if (!instance) return;

        const preview = document.getElementById(`${containerId}Preview`);

        // Define allowed document types
        const ALLOWED_DOC_TYPES = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];

        for (const file of fileList) {
            // Validate file size
            if (file.size > CONFIG.MAX_FILE_SIZE) {
                Toast.error(`ไฟล์ ${file.name} มีขนาดใหญ่เกินไป (สูงสุด 10MB)`);
                continue;
            }

            // Validate file type
            const isImage = CONFIG.ALLOWED_IMAGE_TYPES.includes(file.type);
            const isVideo = CONFIG.ALLOWED_VIDEO_TYPES.includes(file.type);
            const isDocument = ALLOWED_DOC_TYPES.includes(file.type);

            if (!isImage && !isVideo && !isDocument) {
                Toast.error(`ไฟล์ ${file.name} ไม่รองรับ`);
                continue;
            }

            // Convert to data URL
            const dataUrl = await Helpers.fileToDataUrl(file);

            // Determine file type
            let fileType = 'document';
            if (isImage) fileType = 'photo';
            else if (isVideo) fileType = 'video';

            const fileData = {
                id: Helpers.generateId(),
                name: file.name,
                type: fileType,
                dataUrl,
                size: file.size
            };

            instance.files.push(fileData);
            this.renderPreviewItem(containerId, preview, fileData);
        }

        if (instance.onChange) {
            instance.onChange(instance.files);
        }
    },

    /**
     * Render preview item
     * @param {string} containerId
     * @param {HTMLElement} preview 
     * @param {object} file 
     */
    renderPreviewItem(containerId, preview, file) {
        const item = document.createElement('div');
        item.className = 'upload-preview-item';
        item.id = `preview-${file.id}`;

        // Common buttons HTML
        const viewBtn = `<button type="button" class="upload-preview-view" onclick="MediaUpload.openViewer('${containerId}', '${file.id}')" title="ดูไฟล์">👁️</button>`;
        const removeBtn = `<button type="button" class="upload-preview-remove" onclick="MediaUpload.removeFile('${containerId}', '${file.id}')" title="ลบ">✕</button>`;

        if (file.type === 'photo') {
            item.innerHTML = `
                <img src="${file.dataUrl}" alt="${Helpers.escapeHtml(file.name)}">
                <div class="upload-preview-actions">
                    ${viewBtn}
                    ${removeBtn}
                </div>
            `;
        } else if (file.type === 'video') {
            item.innerHTML = `
                <video src="${file.dataUrl}" style="width:100%;height:100%;object-fit:cover;"></video>
                <div class="upload-preview-overlay">🎬</div>
                <div class="upload-preview-actions">
                    ${viewBtn}
                    ${removeBtn}
                </div>
            `;
        } else {
            // Document type (PDF, Word, Excel, etc.)
            const iconMap = {
                'pdf': '📕',
                'doc': '📘',
                'docx': '📘',
                'xls': '📗',
                'xlsx': '📗'
            };
            const ext = file.name ? file.name.split('.').pop().toLowerCase() : 'file';
            const icon = iconMap[ext] || '📄';
            const displayName = file.name && file.name.length > 15 ? file.name.substring(0, 12) + '...' : (file.name || 'Document');

            item.innerHTML = `
                <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;background:var(--neutral-100);padding:var(--space-2);">
                    <span style="font-size:2rem;">${icon}</span>
                    <span style="font-size:var(--font-size-xs);color:var(--neutral-600);text-align:center;word-break:break-all;margin-top:var(--space-1);">${Helpers.escapeHtml(displayName)}</span>
                </div>
                <div class="upload-preview-actions">
                    ${viewBtn}
                    ${removeBtn}
                </div>
            `;
        }

        preview.appendChild(item);
    },

    /**
     * Open MediaViewer for files in a container
     * @param {string} containerId
     * @param {string} fileId - ID of the file to start viewing
     */
    openViewer(containerId, fileId) {
        const instance = this.instances[containerId];
        if (!instance || !instance.files || instance.files.length === 0) {
            Toast.warning('ไม่มีไฟล์ให้แสดง');
            return;
        }

        // Find the index of the clicked file
        const fileIndex = instance.files.findIndex(f => f.id === fileId);
        const startIndex = fileIndex >= 0 ? fileIndex : 0;

        // Determine media type based on container ID or file types
        const firstFile = instance.files[0];
        let mediaType = 'photo';
        if (containerId.includes('video') || firstFile.type === 'video') {
            mediaType = 'video';
        } else if (containerId.includes('document') || firstFile.type === 'document') {
            mediaType = 'document';
        }

        // Open MediaViewer
        if (typeof MediaViewer !== 'undefined') {
            MediaViewer.open(instance.files, startIndex, mediaType);
        } else {
            console.error('MediaViewer not loaded');
            Toast.error('ไม่สามารถเปิดตัวแสดงไฟล์ได้');
        }
    },

    /**
     * Remove a file
     * @param {string} containerId
     * @param {string} fileId 
     */
    removeFile(containerId, fileId) {
        const instance = this.instances[containerId];
        if (!instance) return;

        instance.files = instance.files.filter(f => f.id !== fileId);
        const item = document.getElementById(`preview-${fileId}`);
        if (item) item.remove();

        if (instance.onChange) {
            instance.onChange(instance.files);
        }
    },

    // Alias for compatibility/clarity
    removeFileFromContainer(containerId, fileId) {
        this.removeFile(containerId, fileId);
    },

    /**
     * Get all uploaded files
     * @param {string} containerId
     * @returns {Array}
     */
    getFiles(containerId) {
        return this.instances[containerId]?.files || [];
    },

    /**
     * Clear all files
     * @param {string} containerId
     */
    clear(containerId) {
        if (!containerId || !this.instances[containerId]) return;

        this.instances[containerId].files = [];
        const preview = document.getElementById(`${containerId}Preview`);
        if (preview) preview.innerHTML = '';

        if (this.instances[containerId].onChange) {
            this.instances[containerId].onChange([]);
        }
    },

    /**
     * Restore files to a specific container (for edit mode)
     * @param {string} containerId - ID of the container
     * @param {Array} files - Array of file objects to restore
     */
    restoreFiles(containerId, files) {
        if (!files || !Array.isArray(files) || files.length === 0) return;

        const instance = this.instances[containerId];
        if (!instance) {
            console.warn(`MediaUpload: Container ${containerId} not initialized before restore.`);
            return;
        }

        const preview = document.getElementById(`${containerId}Preview`);
        if (!preview) return;

        for (const file of files) {
            // Create preview item for each file
            const fileData = {
                id: file.id || Helpers.generateId(),
                name: file.caption || file.name || 'Untitled',
                type: file.type || 'photo',
                dataUrl: file.dataUrl,
                size: file.size || 0,
                isExisting: true
            };

            // Add to instance state if not exists
            if (!instance.files.find(f => f.id === fileData.id)) {
                instance.files.push(fileData);
                this.renderPreviewItem(containerId, preview, fileData);
            }
        }

        if (instance.onChange) {
            instance.onChange(instance.files);
        }
    }
};
