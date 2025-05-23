// JavaScript for the share.html page

let currentCid = null;
let currentFilename = null;
let currentFilesize = null;

// Base64URL encoding/decoding functions for URL compression
function base64UrlEncode(str) {
    return btoa(unescape(encodeURIComponent(str)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

function base64UrlDecode(str) {
    // Add padding
    str += '='.repeat((4 - str.length % 4) % 4);
    // Replace URL-safe characters
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    return decodeURIComponent(escape(atob(str)));
}

// Update page language elements specific to share page
function updateSharePageLanguage() {
    // Set html lang
    document.getElementById('htmlLang').setAttribute('lang', window.currentLang || 'en');
    // loading
    document.getElementById('loadingText').textContent = _t('accessing-file');
    // passphrase
    const passInput = document.getElementById('passphrase');
    if (passInput) passInput.placeholder = _t('passphrase-placeholder');
    document.getElementById('unlockButton').textContent = _t('passphrase-submit');
    document.getElementById('downloadButtonText').textContent = _t('download-button') || 'Download';
    document.getElementById('returnHomeText').textContent = _t('return-home');
    // Gateway selector label
    document.getElementById('shareGatewaySelectLabel').innerHTML = _t('gateway-selector');
    // fileUrlDisplay title
    document.getElementById('fileUrlDisplay').title = _t('copy-share-link');
    
    // Set password toggle button title
    const passwordToggle = document.querySelector('.password-toggle');
    if (passwordToggle) {
        passwordToggle.title = _t('show-password');
    }
    
    // Update sponsor text elements
    document.querySelectorAll('.sponsors-section [data-translate]').forEach(element => {
        const key = element.getAttribute('data-translate');
        element.textContent = _t(key);
    });
}

// Check URL parameters and determine if it's an encrypted share or direct CID
function processShareUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Show loading indicator
    document.getElementById('loadingIndicator').style.display = 'flex';
    
    if (urlParams.has('share')) {
        // Encrypted share
        const encryptedPayload = urlParams.get('share');
        document.getElementById('passphraseForm').style.display = 'block';
        
        // Handle unlock button click
        document.getElementById('unlockButton').addEventListener('click', function() {
            const passphrase = document.getElementById('passphrase').value;
            if (!passphrase) {
                document.getElementById('errorMessage').textContent = _t('passphrase-placeholder');
                return;
            }
            
            const decrypted = decryptData(encryptedPayload, passphrase);
            if (decrypted && decrypted.cid && decrypted.filename) {
                // Successfully decrypted
                document.getElementById('errorMessage').textContent = '';
                displayFileDetails(decrypted.cid, decrypted.filename, decrypted.size);
            } else {
                document.getElementById('errorMessage').textContent = _t('passphrase-incorrect');
                document.getElementById('passphrase').value = '';
            }
        });
        
        // Allow entering passphrase with Enter key
        document.getElementById('passphrase').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                document.getElementById('unlockButton').click();
            }
        });
        
        document.getElementById('loadingIndicator').style.display = 'none';
        
    } else if (urlParams.has('d')) {
        // New compressed format: ?d=base64url_encoded_data
        try {
            const compressedData = urlParams.get('d');
            const decodedJson = base64UrlDecode(compressedData);
            const data = JSON.parse(decodedJson);
            
            if (data.c && data.f) { // cid and filename
                displayFileDetails(data.c, data.f, data.s || 0);
            } else {
                throw new Error('Invalid compressed data format');
            }
        } catch (e) {
            console.error('Failed to decode compressed share link:', e);
            // Fall back to error display
            document.getElementById('loadingIndicator').style.display = 'none';
            document.getElementById('passphraseForm').style.display = 'none';
            document.getElementById('fileDetails').style.display = 'block';
            document.getElementById('fileIcon').innerHTML = '<i class="fas fa-exclamation-circle" style="font-size: 60px; color: #f56c6c;"></i>';
            document.getElementById('fileName').textContent = _t('decryption-failed');
            document.getElementById('fileSize').textContent = _t('selected-files-invalid');
            document.getElementById('downloadButton').style.display = 'none';
        }
        
    } else if (urlParams.has('cid') && urlParams.has('filename')) {
        // Legacy public file format (keep for backward compatibility)
        const cid = urlParams.get('cid');
        const filename = decodeURIComponent(urlParams.get('filename'));
        const filesize = urlParams.get('size') || 0;
        
        // Display file details directly
        displayFileDetails(cid, filename, filesize);
    } else {
        // Invalid URL parameters
        document.getElementById('loadingIndicator').style.display = 'none';
        document.getElementById('passphraseForm').style.display = 'none';
        document.getElementById('fileDetails').style.display = 'block';
        document.getElementById('fileIcon').innerHTML = '<i class="fas fa-exclamation-circle" style="font-size: 60px; color: #f56c6c;"></i>';
        document.getElementById('fileName').textContent = _t('decryption-failed');
        document.getElementById('fileSize').textContent = _t('selected-files-invalid');
        document.getElementById('downloadButton').style.display = 'none';
    }
}

// Display file details and setup download button
function displayFileDetails(cid, filename, filesize) {
    currentCid = cid;
    currentFilename = filename;
    currentFilesize = filesize;

    // Hide passphrase form if it was shown
    document.getElementById('passphraseForm').style.display = 'none';
    document.getElementById('loadingIndicator').style.display = 'none';
    
    // Get icon based on file type or folder
    let fileIcon;
    if (filename.endsWith('/')) {
        fileIcon = '<svg class="icon" viewBox="0 0 24 24" width="48" height="48"><path d="M10 4H2v16h20V6H12l-2-2z" fill="#f7ba2a"/><path d="M2 20V4h8l2 2h10v14z" fill="none"/></svg>';
    } else {
        fileIcon = getFileTypeIcon(filename);
    }
    document.getElementById('fileIcon').innerHTML = fileIcon;
    
    // Set file details (strip trailing slash for display if folder)
    let displayName = filename.endsWith('/') ? filename.slice(0, -1) : filename;
    document.getElementById('fileName').textContent = displayName;
    if (filesize && filesize > 0) {
        document.getElementById('fileSize').textContent = _t('file-size', { size: formatBytes(filesize) });
    } else {
        document.getElementById('fileSize').textContent = '';
    }
    
    // Populate gateway selector
    const gatewaySelect = document.getElementById('shareGatewaySelect');
    gatewaySelect.innerHTML = ''; // Clear existing options
    commonGateways.forEach(gw => {
        const option = document.createElement('option');
        option.value = gw.value;
        option.textContent = gw.text;
        gatewaySelect.appendChild(option);
    });
    // Set default gateway
    if (commonGateways.length > 0) {
        gatewaySelect.value = commonGateways[1].value; // cdn.ipfsscan.io as default
    }
    
    // Update URL display and download button based on selected gateway
    updateFileAccessLinks();
    
    // Add event listener for gateway change
    gatewaySelect.addEventListener('change', updateFileAccessLinks);
    
    // Show file details
    document.getElementById('fileDetails').style.display = 'block';
    
    // Enable copy to clipboard for file URL
    document.getElementById('fileUrlDisplay').addEventListener('click', function() {
        this.select();
        copyToClipboard(this.value)
            .then(() => {
                showToast(_t('copied-format', {format: _t('copy-share-link')}), 'success');
            })
            .catch(() => {
                showToast(_t('clipboard-error'), 'error');
            });
    });
}

// Function to update file URL display and download button link
function updateFileAccessLinks() {
    if (!currentCid || !currentFilename) return;

    const selectedGatewayBase = document.getElementById('shareGatewaySelect').value;
    const encodedFilename = encodeURIComponent(currentFilename);
    const fileUrl = `${selectedGatewayBase}/ipfs/${currentCid}?filename=${encodedFilename}`;
    
    document.getElementById('fileUrlDisplay').value = fileUrl;
    document.getElementById('downloadButton').setAttribute('data-url', fileUrl); // 不再直接设置 href
}

// 强制下载文件的函数
async function forceDownloadFile(url, filename, btn) {
    try {
        btn.classList.add('disabled');
        btn.querySelector('span').textContent = _t('download-progress') || 'Downloading...';
        // 显示loading
        document.getElementById('loadingIndicator').style.display = 'flex';

        const response = await fetch(url);
        if (!response.ok) throw new Error('Network error');
        const blob = await response.blob();

        // 创建临时a标签下载
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            URL.revokeObjectURL(a.href);
            document.body.removeChild(a);
        }, 100);

    } catch (e) {
        showToast(_t('download-error'), 'error');
    } finally {
        btn.classList.remove('disabled');
        btn.querySelector('span').textContent = _t('download-button') || 'Download';
        document.getElementById('loadingIndicator').style.display = 'none';
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize language first to ensure _t is ready
    if (window.initializeLanguage) {
        window.currentLang = window.initializeLanguage(); // Ensure currentLang is set
    }
    updateSharePageLanguage();
    processShareUrl();

    // Bind download button event
    const downloadBtn = document.getElementById('downloadButton');
    downloadBtn.addEventListener('click', function(e) {
        e.preventDefault();
        const url = this.getAttribute('data-url');
        const filename = currentFilename;
        if (url && filename) {
            forceDownloadFile(url, filename, this);
        }
    });
});
