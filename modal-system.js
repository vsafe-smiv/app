/**
 * ===================================================================
 * MODERN MODAL/POPUP SYSTEM
 * ระบบ Modal ทันสมัยแทนที่ alert, confirm, prompt ของบราวเซอร์
 * ===================================================================
 */

const modalSystem = (() => {
  let container = null;

  function initContainer() {
    if (container) return;
    container = document.createElement('div');
    container.id = 'modal-container';
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 9999;
      pointer-events: none;
    `;
    document.body.appendChild(container);
  }

  function createOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0);
      backdrop-filter: blur(0px);
      animation: overlayFadeIn 0.3s ease-out forwards;
      z-index: 9998;
    `;
    return overlay;
  }

  function createModal(options = {}) {
    const {
      type = 'alert',
      title = '',
      message = '',
      icon = '',
      buttons = [],
      input = false,
      inputType = 'text',
      inputPlaceholder = '',
      closeOnOverlay = false,
      onClose = null
    } = options;

    const modal = document.createElement('div');
    modal.className = `modal modal-${type}`;
    modal.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.95);
      background: white;
      border-radius: 16px;
      padding: 2rem;
      max-width: 90%;
      width: 100%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 28px 70px rgba(3, 26, 49, 0.22);
      animation: modalSlideIn 0.3s ease-out forwards;
      z-index: 9999;
      font-family: 'Prompt', sans-serif;
    `;

    let html = '';

    // Icon
    if (icon) {
      html += `
        <div class="modal-icon modal-icon-${icon}" style="
          font-size: 3rem;
          text-align: center;
          margin-bottom: 1rem;
          animation: iconBounce 0.6s ease-out;
        ">${getIconEmoji(icon, type)}</div>
      `;
    }

    // Title
    if (title) {
      html += `
        <h2 class="modal-title" style="
          margin: 0 0 0.5rem;
          font-size: 1.5rem;
          font-weight: 700;
          color: #062b4d;
          text-align: center;
        ">${title}</h2>
      `;
    }

    // Message
    if (message) {
      html += `
        <p class="modal-message" style="
          margin: 0 0 1.5rem;
          font-size: 0.95rem;
          color: #63778c;
          text-align: center;
          line-height: 1.6;
        ">${message}</p>
      `;
    }

    // Input field
    if (input) {
      html += `
        <input type="${inputType}" id="modal-input" placeholder="${inputPlaceholder}" style="
          width: 100%;
          padding: 0.75rem 1rem;
          margin-bottom: 1.5rem;
          border: 2px solid #d8e6f1;
          border-radius: 8px;
          font-family: inherit;
          font-size: 0.95rem;
          transition: border-color 0.2s;
        " />
      `;
    }

    // Buttons
    html += '<div class="modal-buttons" style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">';
    buttons.forEach(btn => {
      const btnClass = btn.type === 'primary' ? 'modal-btn-primary' : btn.type === 'danger' ? 'modal-btn-danger' : 'modal-btn-secondary';
      html += `
        <button class="modal-btn ${btnClass}" data-action="${btn.action}" style="
          padding: 0.75rem 1.75rem;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          font-size: 0.9rem;
          font-family: inherit;
          transition: all 0.2s;
          ${btn.type === 'primary' ? 'background: #07847f; color: white;' : ''}
          ${btn.type === 'danger' ? 'background: #d3202f; color: white;' : ''}
          ${btn.type === 'secondary' ? 'background: #f0f4f8; color: #062b4d;' : ''}
        ">${btn.label}</button>
      `;
    });
    html += '</div>';

    modal.innerHTML = html;

    // Attach event listeners
    modal.querySelectorAll('.modal-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const inputValue = document.getElementById('modal-input')?.value || '';
        closeModal();
        if (buttons.find(b => b.action === action)?.callback) {
          buttons.find(b => b.action === action).callback(action === 'confirm' ? inputValue : true);
        }
      });
    });

    if (closeOnOverlay) {
      const overlay = document.querySelector('.modal-overlay');
      if (overlay) {
        overlay.addEventListener('click', () => {
          closeModal();
          if (onClose) onClose();
        });
      }
    }

    return modal;
  }

  function getIconEmoji(icon, type) {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ⓘ',
      question: '?',
      alert: '!',
      delete: '🗑',
      save: '💾'
    };
    return icons[icon] || '•';
  }

  function closeModal() {
    const modal = document.querySelector('.modal');
    const overlay = document.querySelector('.modal-overlay');
    if (modal) {
      modal.style.animation = 'modalSlideOut 0.2s ease-in forwards';
      setTimeout(() => modal.remove(), 200);
    }
    if (overlay) {
      overlay.style.animation = 'overlayFadeOut 0.2s ease-in forwards';
      setTimeout(() => overlay.remove(), 200);
    }
  }

  return {
    alert: (title, message, icon = 'alert') => {
      return new Promise(resolve => {
        initContainer();
        const overlay = createOverlay();
        const modal = createModal({
          type: 'alert',
          title,
          message,
          icon,
          buttons: [
            { label: 'ตกลง', type: 'primary', action: 'ok', callback: () => resolve(true) }
          ],
          closeOnOverlay: true,
          onClose: () => resolve(false)
        });
        container.appendChild(overlay);
        container.appendChild(modal);
        document.getElementById('modal-input')?.focus();
      });
    },

    confirm: (title, message, icon = 'question') => {
      return new Promise(resolve => {
        initContainer();
        const overlay = createOverlay();
        const modal = createModal({
          type: 'confirm',
          title,
          message,
          icon,
          buttons: [
            { label: 'ยกเลิก', type: 'secondary', action: 'cancel', callback: () => resolve(false) },
            { label: 'ตกลง', type: 'primary', action: 'confirm', callback: () => resolve(true) }
          ],
          closeOnOverlay: true,
          onClose: () => resolve(false)
        });
        container.appendChild(overlay);
        container.appendChild(modal);
      });
    },

    prompt: (title, message, defaultValue = '', icon = 'info') => {
      return new Promise(resolve => {
        initContainer();
        const overlay = createOverlay();
        const modal = createModal({
          type: 'prompt',
          title,
          message,
          icon,
          input: true,
          inputPlaceholder: defaultValue,
          buttons: [
            { label: 'ยกเลิก', type: 'secondary', action: 'cancel', callback: () => resolve(null) },
            { label: 'ตกลง', type: 'primary', action: 'confirm', callback: (value) => resolve(value || defaultValue) }
          ],
          closeOnOverlay: true,
          onClose: () => resolve(null)
        });
        container.appendChild(overlay);
        container.appendChild(modal);
        const input = document.getElementById('modal-input');
        if (input) {
          input.value = defaultValue;
          input.focus();
          input.select();
        }
      });
    },

    success: (title, message = '') => {
      return modalSystem.alert(title, message, 'success');
    },

    error: (title, message = '') => {
      return modalSystem.alert(title, message, 'error');
    },

    warning: (title, message = '') => {
      return modalSystem.alert(title, message, 'warning');
    },

    info: (title, message = '') => {
      return modalSystem.alert(title, message, 'info');
    }
  };
})();

// ===================================================================
// ลบการใช้ window.alert, window.confirm, window.prompt ออกไป
// ===================================================================
window.alert = modalSystem.alert;
window.confirm = modalSystem.confirm;
window.prompt = modalSystem.prompt;
