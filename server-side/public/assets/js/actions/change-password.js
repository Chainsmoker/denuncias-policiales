import ApiClient from './client.js';
import { endpoints } from './variables.js'

class ChangePassword extends ApiClient {
    constructor() {
        super();
        this.updating = false;
        this.resetPasswordForm = {
            old_password: '',
            new_password: '',
            confirm_password: ''
        };
    }

    async changePassword() {
        try {
            this.updating = true;

            const payload = {
                old_password: this.resetPasswordForm.old_password,
                new_password: this.resetPasswordForm.new_password,
                confirm_password: this.resetPasswordForm.confirm_password
            };

            const { success, errors } = await this.post(endpoints.changePassword, payload);

            if (success) {
                localStorage.clear();
                window.location.href = '/accounts/login?action=password_changed';
            } else {
                this.error = errors || {};
            }
        } catch (error) {
            console.error('Error changing password:', error);
            this.error = { non_field_errors: ['Error al cambiar la contraseña.'] };
        } finally {
            this.updating = false;
        }
    }
}

document.addEventListener('alpine:init', () => {
    Alpine.data('changePassword', () => new ChangePassword());
});