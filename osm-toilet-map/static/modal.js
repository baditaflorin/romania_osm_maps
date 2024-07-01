export const showModal = (onConfirm, isEdit = false, editUrl = '') => {
    const modal = document.getElementById('source-modal');
    modal.style.display = 'block';

    const confirmButton = document.getElementById('confirm-add-source');
    confirmButton.onclick = () => {
        if (isEdit) {
            window.open(editUrl, '_blank');
            Cookies.set('hasSeenEditModal', 'true', { expires: 365 });
        } else {
            onConfirm();
            Cookies.set('hasSeenAddModal', 'true', { expires: 365 });
        }
        hideModal();
    };

    const closeButton = document.getElementById('close-modal');
    closeButton.onclick = hideModal;

    window.onclick = (event) => {
        if (event.target === modal) {
            hideModal();
        }
    };
};

export const hideModal = () => {
    const modal = document.getElementById('source-modal');
    modal.style.display = 'none';
};

export { showModal, hideModal };
