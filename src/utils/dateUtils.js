/**
 * Formats a date string or object into 'dd/mm/yyyy' format.
 * @param {string|Date|number} dateInput - The date to format.
 * @returns {string} The formatted date string or 'Fecha inválida' if input is invalid.
 */
export const formatDate = (dateInput) => {
    if (!dateInput) return '';

    const date = new Date(dateInput);

    // Check for invalid date
    if (isNaN(date.getTime())) {
        return 'Fecha inválida';
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
};
