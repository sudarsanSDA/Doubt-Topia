document.addEventListener('DOMContentLoaded', () => {
    const fileListElement = document.getElementById('file-list');
    const breadcrumbsElement = document.getElementById('breadcrumbs');
    const pdfViewer = document.getElementById('pdf-viewer'); // The iframe
    const pdfPlaceholder = document.getElementById('pdf-placeholder'); // The <p> tag
    const currentFolderNameElement = document.getElementById('current-folder-name');
    // const pdfViewerContainer = document.getElementById('pdf-viewer-container'); // May not be needed for this logic

    let fullFileStructure = [];
    let currentPath = []; // Array of folder names (e.g., ["R20", "CSE"])

    // Simple mobile detection
    // More robust detection might involve checking screen width as well or using a library,
    // but this is often sufficient for distinguishing desktop from touch devices.
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    // Initial setup based on device type
    if (isMobile) {
        if (pdfViewer) pdfViewer.style.display = 'none'; // Ensure iframe is hidden on mobile
        if (pdfPlaceholder) {
            pdfPlaceholder.textContent = "Select a PDF from the list. It will open in a new tab.";
            pdfPlaceholder.style.display = 'block'; // Ensure placeholder is visible
        }
    } else {
        // Desktop: placeholder is initially visible, iframe hidden
        if (pdfViewer) pdfViewer.style.display = 'none';
        if (pdfPlaceholder) pdfPlaceholder.style.display = 'block';
    }

    // Fetch the structure data
    fetch('structure.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} - Did you run generate_structure.py?`);
            }
            return response.json();
        })
        .then(data => {
            fullFileStructure = data;
            renderCurrentView(); // Initial render of the root
        })
        .catch(error => {
            console.error("Error loading or parsing structure.json:", error);
            fileListElement.innerHTML = `<li>Error loading file structure. Please check console and ensure structure.json is valid and accessible. Details: ${error.message}</li>`;
        });

    function getCurrentItemsToDisplay() {
        let items = fullFileStructure;
        for (const folderName of currentPath) {
            const folder = items.find(item => item.type === 'folder' && item.name === folderName);
            if (folder && folder.children) {
                items = folder.children;
            } else {
                return []; // Path segment not found
            }
        }
        return items;
    }

    function renderCurrentView() {
        fileListElement.innerHTML = ''; // Clear previous list
        renderBreadcrumbs();

        const itemsToDisplay = getCurrentItemsToDisplay();
        const currentFolderDisplayName = currentPath.length > 0 ? currentPath[currentPath.length - 1] : "Root";
        currentFolderNameElement.textContent = currentFolderDisplayName;

        // Add "Up a level" link if not at root
        if (currentPath.length > 0) {
            const upLi = document.createElement('li');
            upLi.textContent = '⬆️ .. (Up a level)';
            upLi.classList.add('folder');
            upLi.addEventListener('click', () => {
                currentPath.pop();
                // Reset PDF viewer/placeholder state when navigating up
                if (!isMobile) {
                    if (pdfViewer) pdfViewer.src = ""; // Clear iframe
                    if (pdfViewer) pdfViewer.style.display = 'none';
                    if (pdfPlaceholder) pdfPlaceholder.style.display = 'block';
                    if (pdfPlaceholder) pdfPlaceholder.textContent = "Select a PDF to view it here."; // Reset placeholder
                } else {
                    if (pdfPlaceholder) pdfPlaceholder.textContent = "Select a PDF from the list. It will open in a new tab.";
                }
                renderCurrentView();
            });
            fileListElement.appendChild(upLi);
        }

        if (itemsToDisplay.length === 0 && currentPath.length > 0) {
             const emptyLi = document.createElement('li');
             emptyLi.textContent = '(This folder is empty or contains no PDFs)';
             emptyLi.style.fontStyle = 'italic';
             // emptyLi.style.color = '#888'; // Color removed per request
             fileListElement.appendChild(emptyLi);
        }


        itemsToDisplay.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item.name;

            if (item.type === 'folder') {
                li.classList.add('folder');
                li.addEventListener('click', () => {
                    currentPath.push(item.name);
                    renderCurrentView();
                });
            } else if (item.type === 'file') {
                li.classList.add('file');
                li.addEventListener('click', () => {
                    handlePdfSelection(item.path, item.name);
                });

                // Add download link (always available)
                const downloadLink = document.createElement('a');
                downloadLink.href = item.path; // Path from JSON is already correct
                downloadLink.textContent = 'Download'; // CSS handles icon
                downloadLink.setAttribute('download', item.name);
                downloadLink.onclick = (e) => e.stopPropagation(); // Prevent li click when download is clicked
                li.appendChild(downloadLink);
            }
            fileListElement.appendChild(li);
        });
    }

    function renderBreadcrumbs() {
        breadcrumbsElement.innerHTML = '';
        const rootLink = document.createElement('a');
        rootLink.href = '#';
        rootLink.textContent = 'Root';
        rootLink.addEventListener('click', (e) => {
            e.preventDefault();
            currentPath = [];
            // Reset PDF viewer/placeholder state when going to root
            if (!isMobile) {
                if (pdfViewer) pdfViewer.src = "";
                if (pdfViewer) pdfViewer.style.display = 'none';
                if (pdfPlaceholder) pdfPlaceholder.style.display = 'block';
                if (pdfPlaceholder) pdfPlaceholder.textContent = "Select a PDF to view it here.";
            } else {
                if (pdfPlaceholder) pdfPlaceholder.textContent = "Select a PDF from the list. It will open in a new tab.";
            }
            renderCurrentView();
        });
        breadcrumbsElement.appendChild(rootLink);

        let pathAccumulatorForBreadcrumbs = [];
        currentPath.forEach((folderName, index) => {
            breadcrumbsElement.appendChild(document.createTextNode(' / '));
            pathAccumulatorForBreadcrumbs.push(folderName);
            if (index < currentPath.length - 1) {
                const pathLink = document.createElement('a');
                pathLink.href = '#';
                pathLink.textContent = folderName;
                const capturedPath = [...pathAccumulatorForBreadcrumbs]; // Closure for correct path
                pathLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    currentPath = capturedPath;
                    renderCurrentView();
                });
                breadcrumbsElement.appendChild(pathLink);
            } else {
                // Current folder in breadcrumbs is just text
                const currentSpan = document.createElement('span');
                currentSpan.textContent = folderName;
                breadcrumbsElement.appendChild(currentSpan);
            }
        });
    }

    function handlePdfSelection(pdfPathFromJSON, pdfName) {
        const webFriendlyPath = pdfPathFromJSON.replace(/\\/g, '/');
        const encodedPath = encodeURI(webFriendlyPath); // For URLs with spaces etc.

        if (isMobile) {
            // Mobile: Open in a new tab
            window.open(encodedPath, '_blank');
            // Update placeholder text to give feedback
            if (pdfPlaceholder) {
                pdfPlaceholder.textContent = `'${pdfName}' opened in a new tab. Select another PDF or navigate.`;
                pdfPlaceholder.style.display = 'block'; // Ensure it's visible
            }
            if (pdfViewer) pdfViewer.style.display = 'none'; // Ensure iframe remains hidden
        } else {
            // Desktop: Use iframe
            if (pdfViewer) {
                pdfViewer.src = encodedPath;
                pdfViewer.style.display = 'block';
            }
            if (pdfPlaceholder) {
                pdfPlaceholder.style.display = 'none';
            }
        }
        console.log("Handling PDF:", webFriendlyPath, "Mobile:", isMobile, "Name:", pdfName);
    }
});