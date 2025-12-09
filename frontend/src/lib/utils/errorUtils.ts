/**
 * Extracts a standardized error message from an API error response.
 * Prioritizes the standardized format: error.response.data.error.message
 * Falls back to: error.response.data.message
 * Finally falls back to the provided default message.
 * 
 * @param error The error object from catch block or onError handler
 * @param defaultMessage The fallback message if no specific error is found
 * @returns The extracted error message
 */
export const getErrorMessage = (error: any, defaultMessage: string = 'An error occurred'): string => {
    if (error?.response?.data?.error?.message) {
        return error.response.data.error.message;
    }
    if (error?.response?.data?.message) {
        return error.response.data.message;
    }
    return defaultMessage;
};
