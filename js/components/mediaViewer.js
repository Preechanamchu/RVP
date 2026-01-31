/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA - Professional Media Viewer Component
 * Cinema-style popup for viewing documents, photos, and videos
 * Features: Zoom, Pan, Rotate 360°, Download single and all
 * Supports: JPG, PNG, WEBP, PDF, MP4, MOV
 * ══════════════════════════════════════════════════════════════════════════
 */

const MediaViewer = {
    isOpen: false,
    currentIndex: 0,
    mediaItems: [],
    mediaType: 'photo', // 'photo', 'document', 'video'
    zoom: 1,
    rotation: 0,
    panX: 0,
    panY: 0,
    isDragging: false,
    startX: 0,
    startY: 0,

    // File extension mappings
    imageExtensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'],
    documentExtensions: ['pdf'],
    videoExtensions: ['mp4', 'mov', 'avi', 'webm', 'mkv'],

    /**
     * Get file extension from filename or dataUrl
     */
    getFileExtension(item) {
        if (item.name) {
            return item.name.split('.').pop().toLowerCase();
        }
        if (item.dataUrl) {
            // Try to extract from data URL mime type
            const match = item.dataUrl.match(/data:(\w+)\/(\w+)/);
            if (match) return match[2].toLowerCase();
        }
        return '';
    },

    /**
     * Check if file is PDF
     */
    isPDF(item) {
        const ext = this.getFileExtension(item);
        return ext === 'pdf' || (item.dataUrl && item.dataUrl.includes('application/pdf'));
    },

    /**
     * Check if file is image
     */
    isImage(item) {
        const ext = this.getFileExtension(item);
        return this.imageExtensions.includes(ext) ||
            (item.dataUrl && item.dataUrl.startsWith('data:image/'));
    },

    /**
     * Open the media viewer
     * @param {Array} items - Array of media items {dataUrl, name, type}
     * @param {number} startIndex - Starting index
     * @param {string} mediaType - 'photo', 'document', or 'video'
     */
    open(items, startIndex = 0, mediaType = 'photo') {
        if (!items || items.length === 0) {
            Toast.warning('ไม่มีไฟล์ให้แสดง');
            return;
        }

        this.mediaItems = items;
        this.currentIndex = startIndex;
        this.mediaType = mediaType;
        this.resetView();
        this.render();
        this.isOpen = true;
        document.body.style.overflow = 'hidden';
    },

    /**
     * Reset view settings
     */
    resetView() {
        this.zoom = 1;
        this.rotation = 0;
        this.panX = 0;
        this.panY = 0;
    },

    /**
     * Close the viewer
     */
    close() {
        const viewer = document.getElementById('mediaViewerOverlay');
        if (viewer) {
            viewer.classList.add('closing');
            setTimeout(() => {
                viewer.remove();
                this.isOpen = false;
                document.body.style.overflow = '';
            }, 300);
        }
        // Cleanup event listeners
        document.removeEventListener('mousemove', this.boundMouseMove);
        document.removeEventListener('mouseup', this.boundMouseUp);
        document.removeEventListener('keydown', this.boundKeyDown);
    },

    /**
     * Get type-specific accent class
     */
    getTypeClass() {
        switch (this.mediaType) {
            case 'photo': return 'media-type-photo';
            case 'document': return 'media-type-document';
            case 'video': return 'media-type-video';
            default: return 'media-type-photo';
        }
    },

    /**
     * Render the viewer
     */
    render() {
        const currentItem = this.mediaItems[this.currentIndex];

        // Check if viewer already exists
        const existing = document.getElementById('mediaViewerOverlay');
        if (existing) {
            this.updateContent(currentItem);
            return;
        }

        const typeLabel = this.mediaType === 'photo' ? '📷 ภาพถ่าย' :
            this.mediaType === 'document' ? '📄 เอกสาร' : '🎬 วิดีโอ';
        const typeClass = this.getTypeClass();

        const overlay = document.createElement('div');
        overlay.id = 'mediaViewerOverlay';
        overlay.className = `media-viewer-overlay ${typeClass}`;
        overlay.innerHTML = `
            <div class="media-viewer-backdrop" onclick="MediaViewer.close()">
                <div class="media-viewer-film-grain"></div>
            </div>
            
            <div class="media-viewer-container">
                <!-- Cinematic top border -->
                <div class="media-viewer-letterbox media-viewer-letterbox-top"></div>
                
                <!-- Header -->
                <div class="media-viewer-header">
                    <div class="media-viewer-title">
                        <span class="media-viewer-type-badge" id="mvTypeBadge">${typeLabel}</span>
                        <span class="media-viewer-filename" id="mvFilename">${Helpers.escapeHtml(currentItem.name || 'ไฟล์ ' + (this.currentIndex + 1))}</span>
                        <span class="media-viewer-counter" id="mvCounter">${this.currentIndex + 1} / ${this.mediaItems.length}</span>
                    </div>
                    <div class="media-viewer-header-actions">
                        <button class="media-viewer-btn media-viewer-btn-download" onclick="MediaViewer.downloadCurrent()" title="ดาวน์โหลดไฟล์นี้">
                            <span class="media-viewer-btn-icon">⬇️</span>
                            <span class="media-viewer-btn-text">ดาวน์โหลด</span>
                        </button>
                        <button class="media-viewer-btn media-viewer-btn-download-all" onclick="MediaViewer.downloadAll()" title="ดาวน์โหลดทั้งหมด">
                            <span class="media-viewer-btn-icon">📦</span>
                            <span class="media-viewer-btn-text">ดาวน์โหลดทั้งหมด</span>
                        </button>
                        <button class="media-viewer-close" onclick="MediaViewer.close()" title="ปิด">
                            <span>✕</span>
                        </button>
                    </div>
                </div>

                <!-- Main Content Area with 16:9 Aspect Ratio -->
                <div class="media-viewer-main">
                    <!-- Ambient glow background -->
                    <div class="media-viewer-ambient-glow"></div>
                    
                    <!-- Navigation Arrow Left -->
                    ${this.mediaItems.length > 1 ? `
                        <button class="media-viewer-nav media-viewer-nav-prev" id="mvPrevBtn" onclick="MediaViewer.prev()">
                            <span class="nav-icon">❮</span>
                        </button>
                    ` : ''}

                    <!-- Media Display Area - 16:9 Container -->
                    <div class="media-viewer-content" id="mediaViewerContent">
                        <div class="media-viewer-content-wrapper" id="mvContentWrapper">
                            ${this.renderMediaContent(currentItem)}
                        </div>
                    </div>

                    <!-- Navigation Arrow Right -->
                    ${this.mediaItems.length > 1 ? `
                        <button class="media-viewer-nav media-viewer-nav-next" id="mvNextBtn" onclick="MediaViewer.next()">
                            <span class="nav-icon">❯</span>
                        </button>
                    ` : ''}
                </div>

                <!-- Controls Bar - Cinema Style -->
                <div class="media-viewer-controls">
                    <div class="media-viewer-controls-inner">
                        <div class="media-viewer-control-group">
                            <button class="media-viewer-control-btn" onclick="MediaViewer.zoomOut()" title="ซูมออก">
                                <span class="control-icon">🔍</span>
                                <span class="control-text">−</span>
                            </button>
                            <div class="media-viewer-level-display">
                                <span class="media-viewer-zoom-level">${Math.round(this.zoom * 100)}%</span>
                            </div>
                            <button class="media-viewer-control-btn" onclick="MediaViewer.zoomIn()" title="ซูมเข้า">
                                <span class="control-icon">🔍</span>
                                <span class="control-text">+</span>
                            </button>
                        </div>
                        
                        <div class="media-viewer-control-divider"></div>
                        
                        <div class="media-viewer-control-group">
                            <button class="media-viewer-control-btn" onclick="MediaViewer.rotateLeft()" title="หมุนซ้าย 90°">
                                <span class="control-icon">↺</span>
                                <span class="control-text">หมุนซ้าย</span>
                            </button>
                            <div class="media-viewer-level-display">
                                <span class="media-viewer-rotation-level">${this.rotation}°</span>
                            </div>
                            <button class="media-viewer-control-btn" onclick="MediaViewer.rotateRight()" title="หมุนขวา 90°">
                                <span class="control-text">หมุนขวา</span>
                                <span class="control-icon">↻</span>
                            </button>
                        </div>

                        <div class="media-viewer-control-divider"></div>

                        <div class="media-viewer-control-group">
                            <button class="media-viewer-control-btn media-viewer-control-btn-reset" onclick="MediaViewer.resetView(); MediaViewer.updateTransform();" title="รีเซ็ตมุมมอง">
                                <span class="control-icon">🔄</span>
                                <span class="control-text">รีเซ็ต</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Thumbnail Strip - Film Strip Style -->
                ${this.mediaItems.length > 1 ? `
                    <div class="media-viewer-thumbnails">
                        <div class="media-viewer-film-strip">
                            <div class="film-strip-sprocket left"></div>
                            <div class="media-viewer-thumbs-container" id="mvThumbContainer">
                                ${this.renderThumbnailsList()}
                            </div>
                            <div class="film-strip-sprocket right"></div>
                        </div>
                    </div>
                ` : ''}
                
                <!-- Cinematic bottom border -->
                <div class="media-viewer-letterbox media-viewer-letterbox-bottom"></div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Add event listeners
        this.addEventListeners();

        // Animate in
        requestAnimationFrame(() => {
            overlay.classList.add('visible');
            this.updateNavButtons();
        });
    },

    /**
     * Update content without re-rendering overlay
     */
    updateContent(currentItem) {
        // Update Header Info
        const typeLabel = this.mediaType === 'photo' ? '📷 ภาพถ่าย' :
            this.mediaType === 'document' ? '📄 เอกสาร' : '🎬 วิดีโอ';

        document.getElementById('mvTypeBadge').textContent = typeLabel;
        document.getElementById('mvFilename').textContent = currentItem.name || 'ไฟล์ ' + (this.currentIndex + 1);
        document.getElementById('mvCounter').textContent = `${this.currentIndex + 1} / ${this.mediaItems.length}`;

        // Update Media Content
        const wrapper = document.getElementById('mvContentWrapper');
        if (wrapper) {
            wrapper.innerHTML = this.renderMediaContent(currentItem);
        }

        // Update Thumbnails
        const thumbContainer = document.getElementById('mvThumbContainer');
        if (thumbContainer) {
            thumbContainer.innerHTML = this.renderThumbnailsList();
        }

        // Update Nav Buttons
        this.updateNavButtons();

        // Reset Transform Display
        this.updateTransform();
    },

    /**
     * Helper to render thumbnails HTML
     */
    renderThumbnailsList() {
        return this.mediaItems.map((item, idx) => `
            <div class="media-viewer-thumb ${idx === this.currentIndex ? 'active' : ''}" 
                 onclick="MediaViewer.goTo(${idx})">
                ${this.renderThumbnail(item, idx)}
                <div class="thumb-frame-number">${idx + 1}</div>
            </div>
        `).join('');
    },

    /**
     * Update navigation buttons state
     */
    updateNavButtons() {
        // Infinite loop - buttons always enabled if more than 1 item
        // The check for items.length > 1 is done in the template rendering
        // So we just ensure we remove 'disabled' class here if it somehow got added
        const prevBtn = document.getElementById('mvPrevBtn');
        const nextBtn = document.getElementById('mvNextBtn');

        if (prevBtn) prevBtn.classList.remove('disabled');
        if (nextBtn) nextBtn.classList.remove('disabled');
    },

    /**
     * Render media content based on type
     */
    renderMediaContent(item) {
        const transform = `transform: scale(${this.zoom}) rotate(${this.rotation}deg) translate(${this.panX}px, ${this.panY}px);`;

        // For videos
        if (this.mediaType === 'video') {
            return `
                <div class="media-viewer-video-container" id="mediaViewerMediaContainer">
                    <video id="mediaViewerMedia" class="media-viewer-video" 
                           style="${transform}" controls autoplay>
                        <source src="${item.dataUrl}" type="video/mp4">
                        Your browser does not support video playback.
                    </video>
                </div>
            `;
        }

        // For documents - check if PDF
        if (this.mediaType === 'document') {
            if (this.isPDF(item)) {
                // PDF - use embed/iframe for viewing
                return `
                    <div class="media-viewer-pdf-container" id="mediaViewerMediaContainer">
                        <embed id="mediaViewerMedia" class="media-viewer-pdf"
                               src="${item.dataUrl}" 
                               type="application/pdf"
                               style="${transform}">
                    </div>
                `;
            } else {
                // Image document (JPG, PNG, WEBP)
                return `
                    <img id="mediaViewerMedia" class="media-viewer-image media-viewer-document-image" 
                         src="${item.dataUrl}" 
                         alt="${Helpers.escapeHtml(item.name || '')}"
                         style="${transform}"
                         draggable="false">
                `;
            }
        }

        // For photos
        return `
            <img id="mediaViewerMedia" class="media-viewer-image" 
                 src="${item.dataUrl}" 
                 alt="${Helpers.escapeHtml(item.name || '')}"
                 style="${transform}"
                 draggable="false">
        `;
    },

    /**
     * Render thumbnail
     */
    renderThumbnail(item, index) {
        if (this.mediaType === 'video') {
            return `<div class="media-viewer-thumb-video"><span class="thumb-icon">🎬</span></div>`;
        } else if (this.mediaType === 'document') {
            if (this.isPDF(item)) {
                return `<div class="media-viewer-thumb-doc"><span class="thumb-icon">📕</span></div>`;
            } else {
                return `<img src="${item.dataUrl}" alt="" draggable="false">`;
            }
        } else {
            return `<img src="${item.dataUrl}" alt="" draggable="false">`;
        }
    },



    handleKeyDown(e) {
        if (!this.isOpen) return;

        switch (e.key) {
            case 'Escape':
                this.close();
                break;
            case 'ArrowLeft':
                this.prev();
                break;
            case 'ArrowRight':
                this.next();
                break;
            case '+':
            case '=':
                this.zoomIn();
                break;
            case '-':
                this.zoomOut();
                break;
            case 'r':
            case 'R':
                this.rotateRight();
                break;
            case 'l':
            case 'L':
                this.rotateLeft();
                break;
            case '0':
                this.resetView();
                this.updateTransform();
                break;
        }
    },

    /**
     * Add event listeners for pan functionality
     */
    addEventListeners() {
        const content = document.getElementById('mediaViewerContent');
        const media = document.getElementById('mediaViewerMedia');
        const wrapper = document.getElementById('mvContentWrapper');
        const thumbStrip = document.querySelector('.media-viewer-thumbnails');

        // Bound functions for cleanup
        this.boundMouseMove = this.handleMouseMove.bind(this);
        this.boundMouseUp = this.handleMouseUp.bind(this);
        this.boundKeyDown = this.handleKeyDown.bind(this);

        // 1. Main Media Panning/Swiping
        if (wrapper) {
            wrapper.addEventListener('mousedown', (e) => {
                this.isDragging = true;
                this.startX = e.clientX - this.panX;
                this.startY = e.clientY - this.panY;

                if (media) media.style.cursor = 'grabbing';
                wrapper.style.cursor = 'grabbing';

                e.preventDefault();
            });
        }

        // 2. Thumbnail Strip Horizontal Dragging
        if (thumbStrip) {
            thumbStrip.style.cursor = 'grab';

            thumbStrip.addEventListener('mousedown', (e) => {
                this.isThumbDragging = true;
                this.thumbStartX = e.pageX - thumbStrip.offsetLeft;
                this.thumbScrollLeft = thumbStrip.scrollLeft;
                thumbStrip.style.cursor = 'grabbing';
                e.preventDefault();
            });

            thumbStrip.addEventListener('mouseleave', () => {
                if (this.isThumbDragging) {
                    this.isThumbDragging = false;
                    thumbStrip.style.cursor = 'grab';
                }
            });
        }

        // Global listeners for drag movement
        document.addEventListener('mousemove', this.boundMouseMove);
        document.addEventListener('mouseup', this.boundMouseUp);

        // Wheel zoom
        if (content) {
            content.addEventListener('wheel', (e) => {
                e.preventDefault();
                if (e.deltaY < 0) {
                    this.zoomIn();
                } else {
                    this.zoomOut();
                }
            });
        }

        // Keyboard navigation
        document.addEventListener('keydown', this.boundKeyDown);
    },

    handleMouseMove(e) {
        // Handle Main Media Dragging
        if (this.isDragging) {
            e.preventDefault();

            let newPanX = e.clientX - this.startX;
            let newPanY = e.clientY - this.startY;

            if (this.zoom > 1) {
                // Panning Mode (Free movement)
                this.panX = newPanX;
                this.panY = newPanY;
            } else {
                // Swipe Mode (Horizontal only)
                this.panX = newPanX;
                this.panY = 0; // Lock vertical
            }

            this.updateTransform();
        }

        // Handle Thumbnail Strip Dragging
        if (this.isThumbDragging) {
            e.preventDefault();
            const slider = document.querySelector('.media-viewer-thumbnails');
            if (slider) {
                const x = e.pageX - slider.offsetLeft;
                const walk = (x - this.thumbStartX) * 2;
                slider.scrollLeft = this.thumbScrollLeft - walk;
            }
        }
    },

    handleMouseUp() {
        if (this.isDragging) {
            this.isDragging = false;

            const media = document.getElementById('mediaViewerMedia');
            const wrapper = document.getElementById('mvContentWrapper');
            if (media) media.style.cursor = 'grab';
            if (wrapper) wrapper.style.cursor = 'grab';

            // Swipe Navigation Logic (only if zoomed out)
            if (this.zoom === 1) {
                const swipeThreshold = 100;

                if (this.panX < -swipeThreshold) {
                    this.next();
                } else if (this.panX > swipeThreshold) {
                    this.prev();
                } else {
                    // Snap back
                    if (this.panX !== 0) {
                        this.panX = 0;
                        this.panY = 0;
                        this.updateTransform();
                    }
                }
            }
        }

        // Thumbnail strip dragging end
        if (this.isThumbDragging) {
            this.isThumbDragging = false;
            const slider = document.querySelector('.media-viewer-thumbnails');
            if (slider) slider.style.cursor = 'grab';
        }
    },

    /**
     * Update media transform
     */
    updateTransform() {
        const media = document.getElementById('mediaViewerMedia');
        if (media) {
            media.style.transform = `scale(${this.zoom}) rotate(${this.rotation}deg) translate(${this.panX}px, ${this.panY}px)`;
        }
        // Update zoom level display
        const zoomDisplay = document.querySelector('.media-viewer-zoom-level');
        if (zoomDisplay) {
            zoomDisplay.textContent = `${Math.round(this.zoom * 100)}%`;
        }
        // Update rotation display
        const rotDisplay = document.querySelector('.media-viewer-rotation-level');
        if (rotDisplay) {
            rotDisplay.textContent = `${this.rotation}°`;
        }
    },

    /**
     * Zoom controls
     */
    zoomIn() {
        this.zoom = Math.min(this.zoom + 0.25, 5);
        this.updateTransform();
    },

    zoomOut() {
        this.zoom = Math.max(this.zoom - 0.25, 0.25);
        this.updateTransform();
    },

    /**
     * Rotation controls
     */
    rotateLeft() {
        this.rotation = (this.rotation - 90) % 360;
        if (this.rotation < 0) this.rotation += 360;
        this.updateTransform();
    },

    rotateRight() {
        this.rotation = (this.rotation + 90) % 360;
        this.updateTransform();
    },

    /**
     * Navigation
     */
    prev() {
        if (this.mediaItems.length <= 1) return;

        if (this.currentIndex > 0) {
            this.currentIndex--;
        } else {
            // Infinite loop - go to last
            this.currentIndex = this.mediaItems.length - 1;
        }
        this.resetView();
        this.updateContent(this.mediaItems[this.currentIndex]);
    },

    next() {
        if (this.mediaItems.length <= 1) return;

        if (this.currentIndex < this.mediaItems.length - 1) {
            this.currentIndex++;
        } else {
            // Infinite loop - go to first
            this.currentIndex = 0;
        }
        this.resetView();
        this.updateContent(this.mediaItems[this.currentIndex]);
    },

    goTo(index) {
        if (index >= 0 && index < this.mediaItems.length) {
            this.currentIndex = index;
            this.resetView();
            this.updateContent(this.mediaItems[this.currentIndex]);
        }
    },

    /**
     * Download current file
     */
    downloadCurrent() {
        const item = this.mediaItems[this.currentIndex];
        this.downloadFile(item.dataUrl, item.name || `file_${this.currentIndex + 1}`);
        Toast.success('กำลังดาวน์โหลด...');
    },

    /**
     * Download all files
     */
    async downloadAll() {
        Toast.info(`กำลังดาวน์โหลด ${this.mediaItems.length} ไฟล์...`);

        for (let i = 0; i < this.mediaItems.length; i++) {
            const item = this.mediaItems[i];
            await this.downloadFile(item.dataUrl, item.name || `file_${i + 1}`);
            // Small delay between downloads
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        Toast.success('ดาวน์โหลดทั้งหมดสำเร็จ');
    },

    /**
     * Download a single file
     */
    downloadFile(dataUrl, filename) {
        return new Promise((resolve) => {
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(resolve, 100);
        });
    },

    /**
     * Open photo viewer (convenience method)
     */
    openPhotos(photos, startIndex = 0) {
        this.open(photos, startIndex, 'photo');
    },

    /**
     * Open document viewer (convenience method)
     */
    openDocuments(documents, startIndex = 0) {
        this.open(documents, startIndex, 'document');
    },

    /**
     * Open video viewer (convenience method)
     */
    openVideos(videos, startIndex = 0) {
        this.open(videos, startIndex, 'video');
    }
};

// Make it globally accessible
window.MediaViewer = MediaViewer;
