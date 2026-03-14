/**
 * Convert Guest Data Transfer Object
 * Validates and transforms input for guest account conversion
 */

class ConvertGuestDTO {
    constructor({ email, password, fullName }) {
        this.email = email?.toLowerCase().trim();
        this.password = password;
        this.fullName = fullName?.trim();
    }

    /**
     * Validate DTO
     * @returns {Object} { valid: boolean, errors: string[] }
     */
    validate() {
        const errors = [];

        if (!this.email) {
            errors.push('Email is required');
        } else if (!/^\\S+@\\S+\\.\\S+$/.test(this.email)) {
            errors.push('Invalid email format');
        }

        if (!this.password) {
            errors.push('Password is required');
        } else if (this.password.length < 6) {
            errors.push('Password must be at least 6 characters');
        }

        if (!this.fullName) {
            errors.push('Full name is required');
        } else if (this.fullName.length < 2) {
            errors.push('Full name must be at least 2 characters');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}

module.exports = ConvertGuestDTO;
