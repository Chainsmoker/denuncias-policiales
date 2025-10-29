import ApiClient from './client.js';

import { endpoints } from './variables.js'

class Auth extends ApiClient {
    constructor() {
        super();
        this.loginForm = {
            email: '',
            password: '',
        };
        this.registerForm = {
            email: '',
            password: '',
            password2: '',
            dni: '',
            terms: false
        };
    }

    init() {
        const params = new URLSearchParams(window.location.search);
        const action = params.get('action');

        if (action === 'register') {
            this.success = 'Cuenta creada exitosamente, por favor inicia sesión.';
        }
        else if (action === 'reset') {
            this.success = 'Contraseña restablecida exitosamente, por favor inicia sesión.';
        }
        else if (action === 'password_changed') {
            this.success = 'Contraseña actualizada exitosamente, por favor inicia sesión.';
        }
    }
    
    async login() {
        try {
            const { success, data } = await this.post(endpoints.login, {
                email: this.loginForm.email,
                password: this.loginForm.password,
            });

            if (success) {
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('userData', JSON.stringify(data.user));
                window.location.href = '/dashboard';
            }
        } catch (error) {
            console.error('Login failed:', error);
            this.error = { non_field_errors: ['Error al iniciar sesión. Por favor, verifica tus credenciales e intenta de nuevo.'] };
        } finally {
            this.loginForm = {
                email: '',
                password: '',
            };
        }
    }

    async register() {
        try {
            if (!this.registerForm.terms) {
                this.error.non_field_errors = ['Debes aceptar los términos y condiciones.'];
                return;
            }

            const { success, errors } = await this.post(endpoints.register, {
                email: this.registerForm.email,
                password: this.registerForm.password,
                password_confirm: this.registerForm.password2,
                dni: this.registerForm.dni
            });

            if (success) {
                window.location.href = `/accounts/login?action=register`;
            } else {
                this.error = errors;
            }
        } catch (error) {
            console.error('Registration failed:', error);
            this.error = { non_field_errors: ['Error al registrar la cuenta. Por favor, intenta de nuevo más tarde.'] };
        } finally {
            this.registerForm = {
                email: '',
                password: '',
                password2: '',
                dni: '',
                terms: false
            };
        }
    }
}

document.addEventListener('alpine:init', () => {
    Alpine.data('auth', () => new Auth());
});